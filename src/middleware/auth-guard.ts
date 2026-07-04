import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from '../utils/app-error';

/**
 * Auth guard (Epic 3.4): require a valid Bearer access token on protected routes.
 * Expired/invalid/missing tokens → 401 via the standard error envelope. On success
 * populates req.user for downstream handlers.
 */
export function authGuard(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    next(AppError.unauthorized('Authentication required', 'MISSING_TOKEN'));
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyAccessToken(token); // throws typed AppError on failure
    req.user = { id: payload.sub, mobileNumber: payload.mobileNumber };
    next();
  } catch (err) {
    next(err);
  }
}
