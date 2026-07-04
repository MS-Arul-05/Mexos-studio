import type { CorsOptions } from 'cors';
import { env, isProduction } from './env';
import { logger } from '../utils/logger';

/**
 * Build CORS options from CORS_ORIGINS (comma-separated allowlist). When unset,
 * all origins are allowed (dev convenience) — warned in production so it isn't
 * shipped open by accident (Step 12 hardening).
 */
export function buildCorsOptions(): CorsOptions {
  const raw = env.CORS_ORIGINS?.trim();
  if (!raw) {
    if (isProduction) {
      // Fail-closed: never reflect arbitrary origins in production. (Boot also
      // errors in production-check, so this is a defense-in-depth net.)
      logger.error('CORS_ORIGINS not set in production — denying all cross-origin requests.');
      return { origin: false };
    }
    // Dev convenience only: reflect any origin so localhost tooling works.
    return { origin: true };
  }

  const allowlist = raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  return {
    origin(origin, callback) {
      // Allow non-browser clients (no Origin header) and allowlisted origins.
      if (!origin || allowlist.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
  };
}
