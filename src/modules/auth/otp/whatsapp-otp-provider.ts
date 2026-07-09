import { env } from '../../../config/env';
import { createGraphClient } from '../../whatsapp/graph-client';
import type { OtpProvider } from './otp-provider';

/**
 * WhatsApp OTP via the Meta Cloud API. Requires WHATSAPP_API_TOKEN +
 * WHATSAPP_PHONE_NUMBER_ID and a pre-approved AUTHENTICATION-category template
 * (WHATSAPP_OTP_TEMPLATE). Meta's authentication templates take the code twice:
 * once in the body text and once in the copy-code button.
 */
export function createWhatsappOtpProvider(): OtpProvider {
  const graph = createGraphClient();

  return {
    name: 'whatsapp',
    async sendOtp(mobileNumber: string, code: string): Promise<void> {
      await graph.sendMessage({
        to: mobileNumber,
        type: 'template',
        template: {
          name: env.WHATSAPP_OTP_TEMPLATE,
          language: { code: env.WHATSAPP_OTP_LANGUAGE },
          components: [
            { type: 'body', parameters: [{ type: 'text', text: code }] },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [{ type: 'text', text: code }],
            },
          ],
        },
      });
    },
  };
}
