import { env } from '../../../config/env';
import { AppError } from '../../../utils/app-error';
import type { SmsProvider } from './sms-provider';

/**
 * Twilio SMS provider. Sends our generated OTP as a plain SMS via the Twilio
 * Messages API. Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM.
 */
export function createTwilioProvider(): SmsProvider {
  const sid = env.TWILIO_ACCOUNT_SID!;
  const token = env.TWILIO_AUTH_TOKEN!;
  const from = env.TWILIO_FROM!;
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');

  return {
    name: 'twilio',
    async sendOtp(mobileNumber: string, code: string): Promise<void> {
      const body = new URLSearchParams({
        To: mobileNumber,
        From: from,
        Body: `Your verification code is ${code}. It expires in ${env.OTP_TTL_MINUTES} minutes.`,
      });
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw AppError.internal(`Twilio send failed: ${res.status} ${text}`, 'SMS_SEND_ERROR');
      }
    },
  };
}
