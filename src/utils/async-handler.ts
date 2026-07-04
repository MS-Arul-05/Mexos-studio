import type { NextFunction, Request, Response, RequestHandler } from 'express';

/**
 * Wrap an async controller so rejected promises are forwarded to the centralized
 * error handler instead of crashing the process (Express 4 doesn't await handlers).
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
