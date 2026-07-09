import type { OtpProvider } from './otp-provider';
import { logger } from '../../../utils/logger';

/**
 * Default dev provider: logs the OTP instead of sending it. No external calls,
 * no cost. The code is intentionally printed here (dev only) so frontend devs
 * can log in without a live WhatsApp Business account.
 */
export const consoleOtpProvider: OtpProvider = {
  name: 'console',
  async sendOtp(mobileNumber: string, code: string): Promise<void> {
    logger.info(`[console-otp] OTP for ${mobileNumber} is ${code}`);
  },
};
