import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

/**
 * Redirect http→https when running behind a TLS-terminating proxy (Step 12 / Epic
 * 7.1). Relies on X-Forwarded-Proto, so `TRUST_PROXY` must be enabled. No-op unless
 * ENFORCE_HTTPS is set. HSTS itself is added by helmet.
 */
export function httpsRedirect(req: Request, res: Response, next: NextFunction): void {
  if (env.ENFORCE_HTTPS && req.header('x-forwarded-proto') === 'http') {
    res.redirect(301, `https://${req.header('host')}${req.originalUrl}`);
    return;
  }
  next();
}
