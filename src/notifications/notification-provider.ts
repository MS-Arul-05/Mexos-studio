import type { OrderStatus } from '@prisma/client';

/**
 * Provider-agnostic notification interface (02_ARCHITECTURE.md §4.5). Order-status
 * changes emit through this so the code doesn't depend on WhatsApp Business API
 * approval timing — ships with a no-op provider and swaps in WhatsApp later
 * without touching order/payment logic.
 */
export interface OrderStatusNotification {
  orderId: string;
  status: OrderStatus;
  toNumber?: string | null;
  note?: string | null;
}

export interface InvoiceNotification {
  orderId: string;
  toNumber?: string | null;
  documentUrl: string;
  fileName: string;
  caption?: string;
}

export interface NotificationProvider {
  readonly name: string;
  /** Whether this provider can deliver invoice documents (gates PDF generation). */
  readonly supportsInvoice: boolean;
  sendOrderStatusUpdate(notification: OrderStatusNotification): Promise<void>;
  sendInvoice(notification: InvoiceNotification): Promise<void>;
}
