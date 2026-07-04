import { env } from '../config/env';
import { logger } from '../utils/logger';
import type { NotificationProvider } from './notification-provider';
import { noopNotificationProvider } from './noop-notification-provider';
import { createMetaWhatsappProvider } from './meta-whatsapp-provider';

/**
 * Notification provider factory. `meta` (WhatsApp Cloud API) activates when a token +
 * phone number id are configured; otherwise (and for unimplemented BSPs) falls back to
 * `noop` so nothing blocks launch (Step 9 / Decision #4).
 */
function resolveProvider(): NotificationProvider {
  const hasMetaCreds = !!env.WHATSAPP_API_TOKEN && !!env.WHATSAPP_PHONE_NUMBER_ID;

  switch (env.WHATSAPP_PROVIDER) {
    case 'noop':
      return noopNotificationProvider;
    case 'meta':
      if (hasMetaCreds) return createMetaWhatsappProvider();
      logger.warn('WHATSAPP_PROVIDER=meta but token/phone id missing; using noop.');
      return noopNotificationProvider;
    default:
      logger.warn(
        `WHATSAPP_PROVIDER="${env.WHATSAPP_PROVIDER}" notification adapter not implemented yet; using noop.`,
      );
      return noopNotificationProvider;
  }
}

export const notificationProvider: NotificationProvider = resolveProvider();
export type { NotificationProvider, OrderStatusNotification } from './notification-provider';
