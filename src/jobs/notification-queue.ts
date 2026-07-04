import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { env, isTest } from '../config/env';
import { logger } from '../utils/logger';
import { notificationProvider } from '../notifications';
import type {
  InvoiceNotification,
  OrderStatusNotification,
} from '../notifications/notification-provider';
import client from 'prom-client';
import { notificationJobsTotal, registry } from '../observability/metrics';

/**
 * Durable notification dispatch (G2). With REDIS_URL set, sends are enqueued to a
 * BullMQ queue and delivered by an in-process worker with exponential-backoff
 * retries; jobs that exhaust their attempts stay in BullMQ's failed set, which
 * serves as the dead-letter queue (inspect/retry via RUNBOOK §"notification-dlq").
 * Without Redis (single-instance dev/test) delivery falls back to the previous
 * inline behavior.
 *
 * Dispatch NEVER throws: a notification failure must not fail the money path
 * (payment webhook / admin status change) that triggered it.
 */
const QUEUE_NAME = 'notifications';

type NotificationJobData =
  | { kind: 'order-status'; payload: OrderStatusNotification }
  | { kind: 'invoice'; payload: InvoiceNotification };

async function deliver(data: NotificationJobData): Promise<void> {
  if (data.kind === 'order-status') {
    await notificationProvider.sendOrderStatusUpdate(data.payload);
  } else {
    await notificationProvider.sendInvoice(data.payload);
  }
}

let queue: Queue<NotificationJobData> | null = null;
let worker: Worker<NotificationJobData> | null = null;

// Worker connection: BullMQ requires maxRetriesPerRequest: null (its blocking
// commands must not time out).
function makeWorkerConnection(): IORedis {
  return new IORedis(env.REDIS_URL as string, { maxRetriesPerRequest: null });
}

// Producer connection: the opposite trade-off. enableOfflineQueue: false makes
// q.add() REJECT immediately while Redis is down instead of buffering the
// command and leaving the awaiting caller (e.g. the payment webhook) hung until
// the request timeout. dispatch() then falls back to inline delivery.
function makeProducerConnection(): IORedis {
  return new IORedis(env.REDIS_URL as string, {
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false,
  });
}

const queueEnabled = (): boolean => !!env.REDIS_URL && !isTest;

function getQueue(): Queue<NotificationJobData> | null {
  if (!queueEnabled()) return null;
  if (!queue) {
    queue = new Queue<NotificationJobData>(QUEUE_NAME, {
      connection: makeProducerConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5_000 }, // 5s → 10s → 20s → 40s
        removeOnComplete: { age: 24 * 3600, count: 1000 },
        removeOnFail: false, // exhausted jobs remain in the failed set (= DLQ)
      },
    });
    // warn (not error): connection errors during a Redis outage recur every ~1s
    // while ioredis reconnects; dispatch degrades to inline delivery meanwhile.
    queue.on('error', (err) => logger.warn({ err: err.message }, 'Notification queue error'));
  }
  return queue;
}

// Queue depth by state, sampled at Prometheus scrape time. Alert on a growing
// `failed` count (dead-letter — see RUNBOOK "notification-dlq") or a sustained
// `waiting` backlog (worker can't keep up / is down).
new client.Gauge({
  name: 'notification_queue_depth',
  help: 'Notification queue job counts by state (0 when queue disabled)',
  labelNames: ['state'] as const, // waiting | active | delayed | failed
  registers: [registry],
  async collect() {
    if (!queue) return;
    try {
      const counts = await queue.getJobCounts('waiting', 'active', 'delayed', 'failed');
      for (const state of ['waiting', 'active', 'delayed', 'failed'] as const) {
        this.set({ state }, counts[state] ?? 0);
      }
    } catch {
      // Redis briefly unreachable — keep the last sample rather than failing the scrape.
    }
  },
});

/** Start the in-process delivery worker. Called once at boot (server.ts). */
export function startNotificationWorker(): void {
  if (!queueEnabled() || worker) return;
  worker = new Worker<NotificationJobData>(QUEUE_NAME, (job) => deliver(job.data), {
    connection: makeWorkerConnection(),
    concurrency: 5,
  });
  worker.on('completed', () => notificationJobsTotal.inc({ outcome: 'delivered' }));
  worker.on('failed', (job, err) => {
    const exhausted = !!job && job.attemptsMade >= (job.opts.attempts ?? 1);
    if (exhausted) {
      notificationJobsTotal.inc({ outcome: 'dead_letter' });
      logger.error(
        { err, jobId: job?.id, kind: job?.data.kind, orderId: job?.data.payload.orderId },
        'Notification exhausted retries — moved to dead-letter (failed set)',
      );
    } else {
      notificationJobsTotal.inc({ outcome: 'retried' });
      logger.warn(
        { err, jobId: job?.id, attempt: job?.attemptsMade },
        'Notification delivery failed — will retry',
      );
    }
  });
  worker.on('error', (err) => logger.error({ err }, 'Notification worker error'));
  logger.info('Notification worker started (BullMQ, queue=notifications)');
}

// Max time dispatch will wait for the broker. BullMQ's add() awaits connection
// readiness internally (it does NOT reject while Redis is down), so a hard race
// is the only way to keep the caller (payment webhook) from hanging.
const ENQUEUE_TIMEOUT_MS = 2_000;

async function tryEnqueue(
  q: Queue<NotificationJobData>,
  data: NotificationJobData,
): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const add = q.add(data.kind, data);
  const enqueued = await Promise.race([
    add.then(() => true),
    new Promise<false>((resolve) => {
      timer = setTimeout(() => resolve(false), ENQUEUE_TIMEOUT_MS);
    }),
  ]).catch(() => false);
  clearTimeout(timer);
  if (!enqueued) {
    // We're falling back to inline delivery. If the add() later succeeds once
    // Redis returns, remove the job so the customer isn't notified twice.
    add.then((job) => job.remove()).catch(() => undefined);
  }
  return enqueued;
}

async function dispatch(data: NotificationJobData): Promise<void> {
  const q = getQueue();
  if (q) {
    if (await tryEnqueue(q, data)) {
      notificationJobsTotal.inc({ outcome: 'enqueued' });
      return;
    }
    // Redis unavailable — degrade to inline delivery rather than losing the
    // notification or blocking the caller.
    logger.warn(
      { kind: data.kind, orderId: data.payload.orderId },
      'Notification enqueue timed out — attempting inline delivery',
    );
  }
  try {
    await deliver(data);
    notificationJobsTotal.inc({ outcome: 'inline' });
  } catch (err) {
    notificationJobsTotal.inc({ outcome: 'error' });
    logger.error(
      { err, kind: data.kind, orderId: data.payload.orderId },
      'Notification dispatch failed (non-fatal)',
    );
  }
}

/**
 * Drop-in replacement for calling the notification provider directly. Same
 * surface as NotificationProvider, but durable when Redis is available and
 * guaranteed not to throw.
 */
export const notificationDispatcher = {
  get supportsInvoice(): boolean {
    return notificationProvider.supportsInvoice;
  },
  sendOrderStatusUpdate: (payload: OrderStatusNotification) =>
    dispatch({ kind: 'order-status', payload }),
  sendInvoice: (payload: InvoiceNotification) => dispatch({ kind: 'invoice', payload }),
};

/** Graceful shutdown: stop taking jobs, finish in-flight deliveries, close connections. */
export async function closeNotificationQueue(): Promise<void> {
  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
}
