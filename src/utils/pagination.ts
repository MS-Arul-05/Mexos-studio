import { z } from 'zod';

/**
 * Canonical pagination params, shared by every list endpoint so the page/limit
 * contract (defaults + the hard cap that bounds query cost — OWASP API4) is
 * defined once and can't drift between modules.
 */
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

/** Spread into a query schema: `z.object({ ...paginationFields, ... })`. */
export const paginationFields = {
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
} as const;

/** Standalone pagination object for endpoints that take only page/limit. */
export const paginationSchema = z.object(paginationFields);
export type Pagination = z.infer<typeof paginationSchema>;
