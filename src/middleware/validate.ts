import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { AppError } from '../utils/app-error';

interface RequestSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Request validation middleware (07_GUIDE.md §3: every route with a body/query
 * must have a schema — no scattered manual `if (!req.body.x)` checks).
 * Parsed+coerced values are written back so controllers get typed, clean input.
 * Validation failures surface as the standard error envelope with code VALIDATION_ERROR.
 */
export function validate(schemas: RequestSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) {
        // req.query has an accessor-only descriptor in Express 5; assign via defineProperty.
        const parsedQuery = schemas.query.parse(req.query);
        Object.defineProperty(req, 'query', { value: parsedQuery, configurable: true });
      }
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        }));
        next(new AppError('VALIDATION_ERROR', 'Request validation failed', 400, details));
        return;
      }
      next(err);
    }
  };
}
