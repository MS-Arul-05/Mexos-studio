import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt';

/**
 * Optional auth: if a valid Bearer token is present, populate req.user; otherwise
 * continue as a guest. Used on endpoints that serve both logged-in users and
 * guests (e.g. custom orders from the Custom T-Shirt page). Never rejects.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim();
    try {
      const payload = verifyAccessToken(token);
      req.user = { id: payload.sub, mobileNumber: payload.mobileNumber };
    } catch {
      // Invalid token on an optional route → treat as guest, don't block.
    }
  }
  next();
}
