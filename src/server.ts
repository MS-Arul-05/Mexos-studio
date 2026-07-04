// MUST be first: starts OpenTelemetry (no-op unless OTEL_ENABLED) before any
// instrumented module (http/express/pg) is loaded.
import './observability/tracing';
import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { enforceProductionConfig } from './config/production-check';
import { startNotificationWorker, closeNotificationQueue } from './jobs/notification-queue';
import { logger } from './utils/logger';

// Fail fast on placeholder/weak secrets in production (Step 12 hardening).
enforceProductionConfig();

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

// Durable notification delivery (no-op unless REDIS_URL is set).
startNotificationWorker();

/** Graceful shutdown: stop accepting connections, drain the queue worker, close the DB pool. */
async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    await closeNotificationQueue();
    await prisma.$disconnect();
    logger.info('Closed HTTP server, queue worker, and DB connections');
    process.exit(0);
  });

  // Force-exit if graceful shutdown hangs.
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});
