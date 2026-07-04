import type { Request, Response } from 'express';
import { sendError } from '../utils/response';

/**
 * Catch-all for unmatched routes → standard 404 envelope.
 * Registered after all route mounts, before the error handler.
 */
export function notFound(req: Request, res: Response): void {
  sendError(res, 'NOT_FOUND', `Route not found: ${req.method} ${req.originalUrl}`, 404);
}
