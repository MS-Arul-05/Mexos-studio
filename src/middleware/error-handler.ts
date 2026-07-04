import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/app-error';
import { sendError } from '../utils/response';
import { isProduction } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Centralized error handler (Epic 1.3). All thrown/forwarded errors land here and
 * are shaped into the standard error envelope. Unhandled/unknown errors return a
 * generic 500 without leaking stack traces in production.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  // Known, intentional application errors.
  if (err instanceof AppError) {
    if (err.httpStatus >= 500) {
      logger.error({ err, reqId: req.id }, err.message);
    } else {
      logger.warn({ code: err.code, reqId: req.id }, err.message);
    }
    sendError(res, err.code, err.message, err.httpStatus, err.details);
    return;
  }

  // Prisma known request errors → map the most common ones to clean envelopes.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      sendError(res, 'CONFLICT', 'A record with this value already exists', 409);
      return;
    }
    if (err.code === 'P2025') {
      sendError(res, 'NOT_FOUND', 'Requested record was not found', 404);
      return;
    }
    logger.error({ err, reqId: req.id }, 'Prisma known request error');
    sendError(res, 'DATABASE_ERROR', 'A database error occurred', 500);
    return;
  }

  // Malformed JSON body from express.json().
  if (err instanceof SyntaxError && 'body' in err) {
    sendError(res, 'INVALID_JSON', 'Request body is not valid JSON', 400);
    return;
  }

  // Anything else is unexpected — log full detail, return opaque 500.
  logger.error({ err, reqId: req.id }, 'Unhandled error');
  const message = isProduction ? 'Something went wrong' : String((err as Error)?.message ?? err);
  sendError(res, 'INTERNAL_ERROR', message, 500);
}
