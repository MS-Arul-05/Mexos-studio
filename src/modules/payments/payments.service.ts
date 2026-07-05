import type { Prisma } from '@prisma/client';
import { paymentsRepository } from './payments.repository';
import { ordersRepository, type OrderWithRelations } from '../orders/orders.repository';
import { paymentProvider } from './providers';
import { notificationDispatcher } from '../../jobs/notification-queue';
import { generateAndStoreInvoice } from '../whatsapp/invoice';
import { analyticsService } from '../../analytics/analytics.service';
import { AppError } from '../../utils/app-error';
import { logger } from '../../utils/logger';
import { recordAudit } from '../../utils/audit';
import { paymentsTotal } from '../../observability/metrics';
import type { PaymentWithOrderItems } from './payments.repository';

/** Resolve the notification phone number from a payment's order (guest or user). */
function resolveNotificationNumber(payment: PaymentWithOrderItems): string | null {
  return payment.order.guestMobile ?? payment.order.user?.mobileNumber ?? null;
}

export interface PaymentRequester {
  userId?: string;
  guestOrderId?: string;
}

export interface CheckoutResult {
  paymentId: string;
  gateway: string;
  gatewayOrderId: string;
  keyId: string | null;
  amount: number; // paise
  currency: string;
}

/** Owner or guest-order-token access; 404 (not 403) on no-access to avoid leaks. */
function assertOrderAccess(order: OrderWithRelations, requester: PaymentRequester): void {
  const isOwner = !!order.userId && order.userId === requester.userId;
  const isGuestToken = !order.userId && requester.guestOrderId === order.id;
  if (!isOwner && !isGuestToken) {
    throw AppError.notFound('Order not found', 'ORDER_NOT_FOUND');
  }
}

function toPaise(total: Prisma.Decimal): number {
  return Math.round(total.mul(100).toNumber());
}

async function createGatewayCheckout(order: OrderWithRelations): Promise<CheckoutResult> {
  const gwOrder = await paymentProvider.createOrder({
    orderId: order.id,
    amountInPaise: toPaise(order.total),
    currency: order.currency,
  });
  const payment = await paymentsRepository.upsertForCheckout({
    orderId: order.id,
    gateway: paymentProvider.name,
    gatewayOrderId: gwOrder.gatewayOrderId,
    amount: order.total,
    currency: order.currency,
  });
  return {
    paymentId: payment.id,
    gateway: paymentProvider.name,
    gatewayOrderId: gwOrder.gatewayOrderId,
    keyId: paymentProvider.publicKey,
    amount: toPaise(order.total),
    currency: order.currency,
  };
}

export const paymentsService = {
  /** Create a gateway checkout session for a payable order (Epic 5.2). */
  async checkout(orderId: string, requester: PaymentRequester): Promise<CheckoutResult> {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw AppError.notFound('Order not found', 'ORDER_NOT_FOUND');
    assertOrderAccess(order, requester);

    if (order.status === 'CONFIRMED' || order.payment?.status === 'SUCCESS') {
      throw AppError.conflict('Order is already paid', 'ORDER_ALREADY_PAID');
    }
    if (order.status !== 'PENDING_PAYMENT') {
      throw AppError.conflict(
        `Order is not payable (status: ${order.status})`,
        'ORDER_NOT_PAYABLE',
      );
    }

    return createGatewayCheckout(order);
  },

  /** Regenerate a checkout session for a failed/pending payment (Epic 5.4). */
  async retry(paymentId: string, requester: PaymentRequester): Promise<CheckoutResult> {
    const payment = await paymentsRepository.findByIdWithItems(paymentId);
    if (!payment) throw AppError.notFound('Payment not found', 'PAYMENT_NOT_FOUND');

    const order = await ordersRepository.findById(payment.orderId);
    if (!order) throw AppError.notFound('Order not found', 'ORDER_NOT_FOUND');
    assertOrderAccess(order, requester);

    if (payment.status === 'SUCCESS') {
      throw AppError.conflict('Payment already succeeded', 'ORDER_ALREADY_PAID');
    }

    const gwOrder = await paymentProvider.createOrder({
      orderId: order.id,
      amountInPaise: toPaise(order.total),
      currency: order.currency,
    });
    const updated = await paymentsRepository.regenerate(
      payment,
      paymentProvider.name,
      gwOrder.gatewayOrderId,
    );

    return {
      paymentId: updated.id,
      gateway: paymentProvider.name,
      gatewayOrderId: gwOrder.gatewayOrderId,
      keyId: paymentProvider.publicKey,
      amount: toPaise(order.total),
      currency: order.currency,
    };
  },

  /**
   * Process a gateway webhook (Epic 5.3): signature-verified, idempotent by gateway
   * payment/order id. Only a verified success confirms the order. Returns whether it
   * was handled (webhooks always ack 200 unless the signature is invalid).
   */
  async handleWebhook(
    rawBody: Buffer,
    signature: string | undefined,
    parsedBody: unknown,
  ): Promise<{ handled: boolean }> {
    if (!paymentProvider.verifyWebhookSignature(rawBody, signature)) {
      throw AppError.badRequest('Invalid webhook signature', 'INVALID_SIGNATURE');
    }

    const event = paymentProvider.parseWebhookEvent(parsedBody);
    if (event.status === 'IGNORED' || !event.gatewayOrderId) {
      logger.info({ type: event.type }, 'Ignoring unhandled payment webhook event');
      return { handled: false };
    }

    const payment = await paymentsRepository.findByGatewayOrderId(event.gatewayOrderId);
    if (!payment) {
      logger.warn({ gatewayOrderId: event.gatewayOrderId }, 'Webhook for unknown gateway order');
      return { handled: false };
    }

    // Idempotency: terminal states are never re-processed.
    if (payment.status === 'SUCCESS' || payment.status === 'FAILED') {
      return { handled: true };
    }

    const rawPayload = parsedBody as Prisma.InputJsonValue;
    if (event.status === 'SUCCESS') {
      await paymentsRepository.applySuccess(payment, event.gatewayPaymentId, rawPayload);
      recordAudit({
        event: 'payment.success',
        actorType: 'system',
        targetType: 'order',
        targetId: payment.orderId,
        metadata: { gateway: payment.gateway, amount: Number(payment.amount) },
      });
      paymentsTotal.inc({ outcome: 'success' });
      await notificationDispatcher.sendOrderStatusUpdate({
        orderId: payment.orderId,
        status: 'CONFIRMED',
        toNumber: resolveNotificationNumber(payment),
      });
      // Purchase event (Epic 6.5) — deterministic eventId (purchase_<orderId>) so the
      // client thank-you-page Pixel dedupes without a round-trip. Fire-and-forget.
      analyticsService.purchase({
        id: payment.orderId,
        value: Number(payment.order.total),
        currency: payment.order.currency,
      });
      // Invoice delivery (Epic 4.4). Best-effort + gated: only providers that can
      // deliver documents generate/send a PDF, and a failure never fails the webhook.
      if (notificationDispatcher.supportsInvoice) {
        try {
          const invoice = await generateAndStoreInvoice(payment.order);
          await notificationDispatcher.sendInvoice({
            orderId: payment.orderId,
            toNumber: resolveNotificationNumber(payment),
            documentUrl: invoice.fileUrl,
            fileName: invoice.fileName,
          });
        } catch (err) {
          logger.error({ err, orderId: payment.orderId }, 'Invoice send failed (non-fatal)');
        }
      }
    } else if (event.status === 'FAILED') {
      await paymentsRepository.applyFailed(payment, event.gatewayPaymentId, rawPayload);
      recordAudit({
        event: 'payment.failed',
        actorType: 'system',
        targetType: 'order',
        targetId: payment.orderId,
        metadata: { gateway: payment.gateway },
      });
      paymentsTotal.inc({ outcome: 'failed' });
      await notificationDispatcher.sendOrderStatusUpdate({
        orderId: payment.orderId,
        status: 'PAYMENT_FAILED',
        toNumber: resolveNotificationNumber(payment),
      });
    }

    return { handled: true };
  },
};
