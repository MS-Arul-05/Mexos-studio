import type { NextFunction, Request, Response } from 'express';
import { sendError } from '../utils/response';
import { env, isTest } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Fail-securely on stuck requests. If a handler hasn't started responding within
 * REQUEST_TIMEOUT_MS, we return 503 and stop holding the client open — protecting
 * the connection pool / event loop from slow or hung downstreams (a cheap DoS
 * guard that complements upstream proxy timeouts). Disabled in tests.
 */
export function requestTimeout(req: Request, res: Response, next: NextFunction): void {
  if (isTest) {
    next();
    return;
  }

  const timer = setTimeout(() => {
    if (res.headersSent) return;
    logger.warn({ method: req.method, path: req.path, id: req.id }, 'Request timed out');
    sendError(res, 'REQUEST_TIMEOUT', 'The request timed out. Please try again.', 503);
  }, env.REQUEST_TIMEOUT_MS);
  timer.unref?.(); // don't keep the process alive for this timer

  const clear = (): void => clearTimeout(timer);
  res.on('finish', clear);
  res.on('close', clear);
  next();
}
