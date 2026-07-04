import { env } from '../../../config/env';
import { logger } from '../../../utils/logger';
import type { SmsProvider } from './sms-provider';
import { consoleSmsProvider } from './console-sms-provider';
import { createMsg91Provider } from './msg91-sms-provider';
import { createTwilioProvider } from './twilio-sms-provider';

/**
 * Provider factory. Selects the SMS provider from config. Real providers activate
 * only when their credentials are present; otherwise fall back to console with a
 * warning so dev/CI keeps working (Decision #5).
 */
function resolveProvider(): SmsProvider {
  switch (env.SMS_PROVIDER) {
    case 'msg91':
      if (env.SMS_PROVIDER_API_KEY && env.SMS_TEMPLATE_ID) return createMsg91Provider();
      logger.warn('SMS_PROVIDER=msg91 but authkey/template id missing; using console provider.');
      return consoleSmsProvider;
    case 'twilio':
      if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM) {
        return createTwilioProvider();
      }
      logger.warn('SMS_PROVIDER=twilio but credentials missing; using console provider.');
      return consoleSmsProvider;
    case 'console':
    default:
      return consoleSmsProvider;
  }
}

export const smsProvider: SmsProvider = resolveProvider();
export type { SmsProvider };
