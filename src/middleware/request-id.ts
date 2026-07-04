import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

/**
 * Attach a request ID to every request (reuse an inbound X-Request-Id if the
 * load balancer / client supplied one) and echo it back on the response so logs
 * and clients can correlate a single request end-to-end.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const id = incoming && incoming.trim().length > 0 ? incoming : randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
