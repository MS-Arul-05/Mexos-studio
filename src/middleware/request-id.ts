import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

/**
 * Attach a request ID to every request (reuse an inbound X-Request-Id if the
 * load balancer / client supplied one) and echo it back on the response so logs
 * and clients can correlate a single request end-to-end.
 */
const MAX_ID_LENGTH = 64;
const ID_PATTERN = /^[a-zA-Z0-9\-_.]+$/;

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id')?.trim();
  const id =
    incoming && incoming.length > 0 && incoming.length <= MAX_ID_LENGTH && ID_PATTERN.test(incoming)
      ? incoming
      : randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
