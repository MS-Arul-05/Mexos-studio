import { env } from '../../../config/env';
import { logger } from '../../../utils/logger';
import type { OtpProvider } from './otp-provider';
import { consoleOtpProvider } from './console-otp-provider';
import { createWhatsappOtpProvider } from './whatsapp-otp-provider';

/**
 * Provider factory. WhatsApp activates only when its credentials are present;
 * otherwise fall back to console with a warning so dev/CI keeps working
 * (Decision #5).
 */
function resolveProvider(): OtpProvider {
  switch (env.OTP_PROVIDER) {
    case 'whatsapp':
      if (env.WHATSAPP_API_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID) {
        return createWhatsappOtpProvider();
      }
      logger.warn(
        'OTP_PROVIDER=whatsapp but token/phone number id missing; using console provider.',
      );
      return consoleOtpProvider;
    case 'console':
    default:
      return consoleOtpProvider;
  }
}

export const otpProvider: OtpProvider = resolveProvider();
export type { OtpProvider };
