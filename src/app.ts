import path from 'node:path';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { apiRouter } from './routes';
import { requestId } from './middleware/request-id';
import { requestTimeout } from './middleware/request-timeout';
import { httpsRedirect } from './middleware/https-redirect';
import { apiRateLimiter } from './middleware/rate-limit';
import { notFound } from './middleware/not-found';
import { errorHandler } from './middleware/error-handler';
import { buildCorsOptions } from './config/cors';
import { env, isProduction } from './config/env';
import { logger } from './utils/logger';
import { metricsMiddleware, metricsEndpoint } from './observability/metrics';
import { asyncHandler } from './utils/async-handler';

/**
 * Build the Express app. Kept separate from server.ts so tests can import the
 * app without binding a port (supertest).
 */
export function createApp(): Express {
  const app = express();

  // Behind a load balancer? Trust the proxy so req.ip / X-Forwarded-Proto are correct
  // (needed for accurate rate limiting + HTTPS enforcement).
  app.set('trust proxy', env.TRUST_PROXY ? 1 : false);

  // Security + parsing
  app.disable('x-powered-by');
  app.use(httpsRedirect); // no-op unless ENFORCE_HTTPS
  // Helmet with an explicit, strict policy. This is a JSON API (no first-party HTML),
  // so the CSP locks everything to 'none'/'self' and blocks framing + object embeds.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'none'"],
          baseUri: ["'none'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          connectSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
        },
      },
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-site' },
      referrerPolicy: { policy: 'no-referrer' },
      // HSTS: 180 days, include subdomains + preload (only meaningful over HTTPS).
      hsts: { maxAge: 15552000, includeSubDomains: true, preload: true },
      frameguard: { action: 'deny' },
    }),
  );
  // Permissions-Policy isn't set by Helmet — lock down powerful features explicitly.
  app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    next();
  });
  app.use(cors(buildCorsOptions())); // origin allowlist via CORS_ORIGINS
  // Capture the raw body so webhook signatures can be verified over the exact bytes
  // the gateway signed (payments webhook). Parsed JSON is still available as req.body.
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  // extended:false → native querystring parser (no qs), sidestepping the
  // prototype-pollution surface. The API consumes JSON; this is belt-and-braces.
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  // Correlation ID + request logging (reuses req.id)
  app.use(requestId);
  // Fail-securely on stuck requests (after we have a correlation id to log).
  app.use(requestTimeout);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as express.Request).id,
      // Don't log high-frequency probe traffic.
      autoLogging: { ignore: (req) => req.url.startsWith('/api/health') },
    }),
  );

  // Per-request metrics (duration + count). Cheap; runs for every route.
  app.use(metricsMiddleware);

  // Prometheus scrape endpoint (token-guarded / loopback-only). Not under /api so
  // it isn't subject to the API rate limiter or CORS.
  app.get('/metrics', asyncHandler(metricsEndpoint));

  // General per-IP rate limiting across the API (baseline abuse guard).
  // The '/api' mount prefix-matches '/api/v1/...' too, so both mounts share it.
  app.use('/api', apiRateLimiter);

  // API routes. '/api/v1' is the canonical versioned base path (D6); '/api' is
  // kept as a backward-compatible alias for existing clients. Same router — a
  // breaking v2 would mount a new router at '/api/v2'.
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter);

  // Static testing console (dev only) — served at "/" from public/.
  // Not shipped in production (it's a manual QA tool, not the real frontend).
  if (!isProduction) {
    app.use(express.static(path.join(process.cwd(), 'public')));
  }

  // 404 + centralized error handling (must be last)
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
