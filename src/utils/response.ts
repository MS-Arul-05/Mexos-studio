import type { Response } from 'express';

/**
 * Standard response envelope (03_DESIGN.md §4). Every controller returns via
 * these helpers so success/error shapes are identical across all endpoints.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

/**
 * Envelope meta: pagination and/or a shared `eventId` for Meta Pixel/CAPI
 * deduplication (Epic 6.5). All fields optional so callers pass what applies.
 */
export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  eventId?: string;
}

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

export interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  httpStatus = 200,
  meta?: ResponseMeta,
): Response {
  const body: SuccessEnvelope<T> = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(httpStatus).json(body);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  httpStatus = 400,
  details?: unknown,
): Response {
  const body: ErrorEnvelope = { success: false, error: { code, message } };
  if (details !== undefined) body.error.details = details;
  return res.status(httpStatus).json(body);
}
