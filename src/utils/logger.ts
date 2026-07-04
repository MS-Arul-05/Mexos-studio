import pino from 'pino';
import { env, isProduction } from '../config/env';

/**
 * App logger. Pretty output in dev, structured JSON in prod.
 * Redact anything sensitive (07_GUIDE.md §3: never log tokens/OTPs/card data).
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-admin-key"]',
      'req.headers["x-guest-token"]',
      'otp',
      'otpHash',
      '*.otp',
      '*.otpHash',
      'password',
      'token',
      'accessToken',
      'refreshToken',
      '*.accessToken',
      '*.refreshToken',
      'tokenHash',
      '*.tokenHash',
      'card',
      'cvv',
      // PII (GDPR) — keep contact details out of logs.
      'mobileNumber',
      '*.mobileNumber',
      'contactMobile',
      '*.contactMobile',
      'guestMobile',
      '*.guestMobile',
      'email',
      '*.email',
    ],
    censor: '[REDACTED]',
  },
  transport: isProduction
    ? undefined
    : {
        target: 'pino/file',
        options: { destination: 1 },
      },
});
