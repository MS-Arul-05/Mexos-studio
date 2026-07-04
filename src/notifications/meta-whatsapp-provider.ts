import { env } from '../config/env';
import { logger } from '../utils/logger';
import { createGraphClient } from '../modules/whatsapp/graph-client';
import { whatsappRepository } from '../modules/whatsapp/whatsapp.repository';
import type {
  InvoiceNotification,
  NotificationProvider,
  OrderStatusNotification,
} from './notification-provider';

/** Human-readable status text for message bodies. */
const STATUS_TEXT: Record<string, string> = {
  CONFIRMED: 'confirmed',
  IN_PRODUCTION: 'in production',
  PACKED: 'packed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  PAYMENT_FAILED: 'payment failed',
};

/**
 * Meta Cloud API notification provider (Epic 4.3–4.4). Sends order-status template
 * messages and invoice documents, logging every send to WhatsAppMessageLog. Selected
 * via WHATSAPP_PROVIDER=meta with a token + phone number id (Decision #4). Untestable
 * without an approved WABA — behaviour verified via mocked graph client in unit tests.
 */
export function createMetaWhatsappProvider(): NotificationProvider {
  const graph = createGraphClient();

  return {
    name: 'meta',
    supportsInvoice: true,

    async sendOrderStatusUpdate(n: OrderStatusNotification): Promise<void> {
      if (!n.toNumber) {
        logger.warn({ orderId: n.orderId }, 'No recipient number for status update; skipping');
        return;
      }
      const statusText = STATUS_TEXT[n.status] ?? n.status;
      // Business-initiated messages require an approved template; body param = status.
      const payload = {
        to: n.toNumber.replace(/\D/g, ''),
        type: 'template',
        template: {
          name: env.WHATSAPP_STATUS_TEMPLATE,
          language: { code: 'en_US' },
          components: [{ type: 'body', parameters: [{ type: 'text', text: statusText }] }],
        },
      };

      try {
        const res = await graph.sendMessage(payload);
        await whatsappRepository.log({
          toNumber: n.toNumber,
          templateName: env.WHATSAPP_STATUS_TEMPLATE,
          payload: { messageId: res.id ?? null, status: n.status },
          status: 'sent',
          relatedOrderId: n.orderId,
        });
      } catch (err) {
        await whatsappRepository.log({
          toNumber: n.toNumber,
          templateName: env.WHATSAPP_STATUS_TEMPLATE,
          payload: { error: String((err as Error).message) },
          status: 'failed',
          relatedOrderId: n.orderId,
        });
        throw err;
      }
    },

    async sendInvoice(n: InvoiceNotification): Promise<void> {
      if (!n.toNumber) {
        logger.warn({ orderId: n.orderId }, 'No recipient number for invoice; skipping');
        return;
      }
      const payload = {
        to: n.toNumber.replace(/\D/g, ''),
        type: 'document',
        document: {
          link: n.documentUrl,
          filename: n.fileName,
          caption: n.caption ?? 'Your invoice',
        },
      };
      try {
        const res = await graph.sendMessage(payload);
        await whatsappRepository.log({
          toNumber: n.toNumber,
          templateName: 'invoice_document',
          payload: { messageId: res.id ?? null, documentUrl: n.documentUrl },
          status: 'sent',
          relatedOrderId: n.orderId,
        });
      } catch (err) {
        await whatsappRepository.log({
          toNumber: n.toNumber,
          templateName: 'invoice_document',
          payload: { error: String((err as Error).message) },
          status: 'failed',
          relatedOrderId: n.orderId,
        });
        throw err;
      }
    },
  };
}
