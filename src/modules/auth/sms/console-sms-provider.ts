import type { SmsProvider } from './sms-provider';
import { logger } from '../../../utils/logger';

/**
 * Default dev provider: logs the OTP instead of sending a real SMS. No external
 * calls, no cost. The code is intentionally printed here (dev only) so frontend
 * devs can log in without a live SMS gateway.
 * TODO: confirm with client — replace default with MSG91 / Twilio in production.
 */
export const consoleSmsProvider: SmsProvider = {
  name: 'console',
  async sendOtp(mobileNumber: string, code: string): Promise<void> {
    logger.info(`[console-sms] OTP for ${mobileNumber} is ${code}`);
  },
};
