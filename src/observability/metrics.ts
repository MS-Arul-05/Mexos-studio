import client from 'prom-client';
import type { NextFunction, Request, Response } from 'express';
import { env, isProduction } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Prometheus metrics registry. Exposes default process metrics (CPU, memory, GC,
 * event-loop lag) plus HTTP request timing and a few business/security counters.
 * Scrape at GET /metrics (token-guarded — see metricsEndpoint).
 */
export const registry = new client.Registry();
registry.setDefaultLabels({ app: 'tshirt-api' });
client.collectDefaultMetrics({ register: registry });

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [registry],
});

// ── Business / security counters ──
export const ordersCreatedTotal = new client.Counter({
  name: 'orders_created_total',
  help: 'Orders successfully created (stock reserved)',
  registers: [registry],
});

export const paymentsTotal = new client.Counter({
  name: 'payments_total',
  help: 'Payment webhook outcomes',
  labelNames: ['outcome'] as const, // success | failed
  registers: [registry],
});

export const authAttemptsTotal = new client.Counter({
  name: 'auth_attempts_total',
  help: 'OTP verification outcomes',
  labelNames: ['outcome'] as const, // success | failure | denied
  registers: [registry],
});

export const rateLimitTripsTotal = new client.Counter({
  name: 'rate_limit_trips_total',
  help: 'Requests rejected by a rate limiter',
  labelNames: ['limiter'] as const, // api | otp_send | otp_verify
  registers: [registry],
});

export const notificationJobsTotal = new client.Counter({
  name: 'notification_jobs_total',
  help: 'Notification dispatch outcomes (queued worker or inline fallback)',
  labelNames: ['outcome'] as const, // enqueued | delivered | retried | dead_letter | inline | error
  registers: [registry],
});

// Collapse high-cardinality ids so route labels stay bounded.
const ID_SEGMENT = /\/(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d+)/gi;
function routeLabel(req: Request): string {
  if (req.route && typeof req.route.path === 'string') {
    return (req.baseUrl || '') + req.route.path;
  }
  return (req.path || 'unknown').replace(ID_SEGMENT, '/:id');
}

/** Middleware: record duration + count for every request once the response ends. */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const labels = { method: req.method, route: routeLabel(req), status: String(res.statusCode) };
    end(labels);
    httpRequestsTotal.inc(labels);
  });
  next();
}

/**
 * GET /metrics handler. Guarded by a bearer token when METRICS_TOKEN is set; when
 * unset it is served only to loopback (dev) and refused otherwise, so metrics are
 * never exposed publicly by default.
 */
export async function metricsEndpoint(req: Request, res: Response): Promise<void> {
  if (env.METRICS_TOKEN) {
    if (req.header('authorization') !== `Bearer ${env.METRICS_TOKEN}`) {
      res.status(404).end();
      return;
    }
  } else {
    const loopback = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
    if (!loopback) {
      res.status(404).end();
      return;
    }
  }
  res.setHeader('Content-Type', registry.contentType);
  res.end(await registry.metrics());
}

if (isProduction && !env.METRICS_TOKEN) {
  logger.warn(
    'METRICS_TOKEN not set — /metrics is restricted to loopback only. Set a token for remote scraping.',
  );
}
