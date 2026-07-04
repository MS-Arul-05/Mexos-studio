import { env } from '../../../config/env';
import { AppError } from '../../../utils/app-error';
import type { SmsProvider } from './sms-provider';

/**
 * MSG91 SMS provider (recommended for India OTP). Sends our generated OTP via the
 * MSG91 Flow API using a pre-approved DLT template. Requires SMS_PROVIDER_API_KEY
 * (authkey) + SMS_TEMPLATE_ID. The template must have an {{otp}} variable.
 */
export function createMsg91Provider(): SmsProvider {
  const authkey = env.SMS_PROVIDER_API_KEY!;
  const templateId = env.SMS_TEMPLATE_ID!;

  return {
    name: 'msg91',
    async sendOtp(mobileNumber: string, code: string): Promise<void> {
      const mobiles = mobileNumber.replace(/\D/g, '');
      const res = await fetch('https://control.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: { authkey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: templateId,
          short_url: '0',
          recipients: [{ mobiles, otp: code }],
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw AppError.internal(`MSG91 send failed: ${res.status} ${text}`, 'SMS_SEND_ERROR');
      }
    },
  };
}
