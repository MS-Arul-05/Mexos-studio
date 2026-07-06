import { env } from '../../../config/env';
import { AppError } from '../../../utils/app-error';
import type { SmsProvider } from './sms-provider';

/**
 * MSG91 SMS provider (recommended for India OTP). Sends our generated OTP via the
 * MSG91 Flow API using a pre-approved DLT template. Requires SMS_PROVIDER_API_KEY
 * (authkey) + SMS_TEMPLATE_ID. The template's OTP variable name is configurable
 * via SMS_TEMPLATE_VAR (case-sensitive; matches the text between ## in the DLT
 * template, e.g. ##OTP## → "OTP").
 */
export function createMsg91Provider(): SmsProvider {
  const authkey = env.SMS_PROVIDER_API_KEY!;
  const templateId = env.SMS_TEMPLATE_ID!;
  const otpVar = env.SMS_TEMPLATE_VAR;

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
          // Key must match the DLT template variable name exactly (case-sensitive).
          recipients: [{ mobiles, [otpVar]: code }],
        }),
      });
      // MSG91 returns HTTP 200 even for logical failures, with { type: 'error' }
      // in the body — treat that as a failure too, not just non-2xx.
      const text = await res.text().catch(() => '');
      let msg91Type: string | undefined;
      try {
        msg91Type = (JSON.parse(text) as { type?: string }).type;
      } catch {
        /* non-JSON body — fall back to HTTP status only */
      }
      if (!res.ok || msg91Type === 'error') {
        throw AppError.internal(`MSG91 send failed: ${res.status} ${text}`, 'SMS_SEND_ERROR');
      }
    },
  };
}
