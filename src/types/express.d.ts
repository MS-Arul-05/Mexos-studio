import 'express';

/**
 * Augment Express Request with fields set by our middleware.
 * `user` is populated by the auth guard in Step 3.
 */
declare global {
  namespace Express {
    interface Request {
      id: string;
      user?: {
        id: string;
        mobileNumber: string;
      };
      /** Set by adminGuard once a valid admin key is presented (label for attribution). */
      admin?: {
        label: string;
      };
    }
  }
}

export {};
