import { createRequire } from 'node:module';
import rateLimit, { type Store } from 'express-rate-limit';
import type { Request } from 'express';
import { sendError } from '../utils/response';
import { env, isTest } from '../config/env';
import { logger } from '../utils/logger';
import { rateLimitTripsTotal } from '../observability/metrics';

// Resolve optional peer deps at runtime without a compile-time module dependency.
const optionalRequire = createRequire(__filename);

/**
 * Optional distributed store. When REDIS_URL is set AND the optional deps
 * (`ioredis` + `rate-limit-redis`) are installed, limits are shared across all
 * app instances (so a multi-replica deployment can't be bypassed by spraying
 * requests across pods). Otherwise we fall back to the in-memory store with a
 * warning. Loaded via a runtime require so the packages stay optional.
 */
function makeStore(prefix: string): Store | undefined {
  if (!env.REDIS_URL) return undefined;
  try {
    // Non-literal ids so TypeScript doesn't require the optional packages to build.
    const redisStorePkg = 'rate-limit-redis';
    const ioredisPkg = 'ioredis';
    const mod = optionalRequire(redisStorePkg);
    const RedisStore = mod.default ?? mod;
    const Redis = optionalRequire(ioredisPkg);
    // Fail FAST when Redis is unreachable: no offline buffering and minimal
    // retries, so store commands reject immediately and passOnStoreError lets
    // the request through (fail-open) instead of hanging it until the request
    // timeout. ioredis still reconnects in the background.
    const client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });
    client.on('error', (err: Error) =>
      logger.warn({ err: err.message, prefix }, 'Rate-limit Redis error (failing open)'),
    );
    return new RedisStore({
      prefix,
      sendCommand: (...args: string[]) => client.call(...args),
    });
  } catch {
    logger.warn(
      'REDIS_URL is set but ioredis/rate-limit-redis are not installed — using in-memory rate limiting. ' +
        'Run `npm i ioredis rate-limit-redis` for distributed limits.',
    );
    return undefined;
  }
}

// Key by authenticated user when present, else by client IP — so a single user
// can't multiply their budget by rotating IPs, and shared NATs aren't over-limited.
function userOrIpKey(req: Request): string {
  return req.user?.id ? `u:${req.user.id}` : `ip:${req.ip}`;
}

/**
 * Per-IP rate limiter for OTP send (defense-in-depth on top of the per-number
 * limit in the auth service). Disabled in tests for determinism.
 */
export const otpSendIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  // Fail OPEN if the Redis store errors: a Redis outage must degrade rate
  // limiting (nginx edge zones still apply), not 500 every API request.
  passOnStoreError: true,
  store: makeStore('rl:otp-send:'),
  handler: (_req, res) => {
    rateLimitTripsTotal.inc({ limiter: 'otp_send' });
    sendError(res, 'IP_RATE_LIMITED', 'Too many requests from this IP. Please try later.', 429);
  },
});

/**
 * Per-IP rate limiter for OTP verify — blunts distributed brute-force of the
 * 6-digit code across many source IPs (the per-number attempt cap handles the
 * single-number case).
 */
export const otpVerifyIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  passOnStoreError: true, // see otpSendIpLimiter
  store: makeStore('rl:otp-verify:'),
  handler: (_req, res) => {
    rateLimitTripsTotal.inc({ limiter: 'otp_verify' });
    sendError(res, 'IP_RATE_LIMITED', 'Too many attempts from this IP. Please try later.', 429);
  },
});

/**
 * General API rate limiter (baseline abuse guard) keyed by user-or-IP. Disabled
 * in tests. Configurable via RATE_LIMIT_WINDOW_MIN / RATE_LIMIT_MAX.
 */
export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MIN * 60 * 1000,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  keyGenerator: userOrIpKey,
  passOnStoreError: true, // see otpSendIpLimiter
  store: makeStore('rl:api:'),
  handler: (_req, res) => {
    rateLimitTripsTotal.inc({ limiter: 'api' });
    sendError(res, 'RATE_LIMITED', 'Too many requests. Please slow down.', 429);
  },
});
