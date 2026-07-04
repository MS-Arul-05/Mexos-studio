import type {
  InvoiceNotification,
  NotificationProvider,
  OrderStatusNotification,
} from './notification-provider';
import { logger } from '../utils/logger';

/**
 * Default notification provider until the WhatsApp Business API is approved
 * (Decision #4). Logs the intended notification instead of sending it, so the
 * order-status → notification wiring is exercised end-to-end pre-approval.
 * TODO: confirm with client — swap for the WhatsApp provider once approved.
 */
export const noopNotificationProvider: NotificationProvider = {
  name: 'noop',
  supportsInvoice: false,
  async sendOrderStatusUpdate(n: OrderStatusNotification): Promise<void> {
    logger.info(
      { orderId: n.orderId, status: n.status },
      `[notify:noop] order ${n.orderId} → ${n.status}`,
    );
  },
  async sendInvoice(n: InvoiceNotification): Promise<void> {
    logger.info({ orderId: n.orderId }, `[notify:noop] invoice for order ${n.orderId} (not sent)`);
  },
};
