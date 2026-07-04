/**
 * Typed application error. Thrown from any layer and caught by the centralized
 * error handler, which shapes it into the standard error envelope
 * (03_DESIGN.md §4). Never `res.status(500).send(err.message)` in a controller.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly details?: unknown;
  public readonly isOperational = true;

  constructor(code: string, message: string, httpStatus = 400, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  // Common factory helpers for consistent codes across modules.
  static badRequest(message: string, code = 'BAD_REQUEST', details?: unknown): AppError {
    return new AppError(code, message, 400, details);
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED'): AppError {
    return new AppError(code, message, 401);
  }

  static forbidden(
    message = 'You do not have access to this resource',
    code = 'FORBIDDEN',
  ): AppError {
    return new AppError(code, message, 403);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND'): AppError {
    return new AppError(code, message, 404);
  }

  static conflict(message: string, code = 'CONFLICT'): AppError {
    return new AppError(code, message, 409);
  }

  static tooManyRequests(message: string, code = 'RATE_LIMITED'): AppError {
    return new AppError(code, message, 429);
  }

  static internal(message = 'Something went wrong', code = 'INTERNAL_ERROR'): AppError {
    return new AppError(code, message, 500);
  }
}
