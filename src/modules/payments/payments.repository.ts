import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/app-error';

const withOrder = { order: true } satisfies Prisma.PaymentInclude;
const withOrderItems = {
  order: { include: { items: true, user: { select: { mobileNumber: true } } } },
} satisfies Prisma.PaymentInclude;

export type PaymentWithOrder = Prisma.PaymentGetPayload<{ include: typeof withOrder }>;
export type PaymentWithOrderItems = Prisma.PaymentGetPayload<{ include: typeof withOrderItems }>;

export const paymentsRepository = {
  findById(id: string): Promise<PaymentWithOrder | null> {
    return prisma.payment.findUnique({ where: { id }, include: withOrder });
  },

  /** Payment + order + items — needed to re-reserve stock on retry. */
  findByIdWithItems(id: string): Promise<PaymentWithOrderItems | null> {
    return prisma.payment.findUnique({ where: { id }, include: withOrderItems });
  },

  findByOrderId(orderId: string): Promise<PaymentWithOrder | null> {
    return prisma.payment.findUnique({ where: { orderId }, include: withOrder });
  },

  findByGatewayOrderId(gatewayOrderId: string): Promise<PaymentWithOrderItems | null> {
    return prisma.payment.findFirst({
      where: { gatewayOrderId },
      include: withOrderItems,
    });
  },

  /** Create or reset a payment for checkout (one Payment per order — orderId is unique). */
  upsertForCheckout(args: {
    orderId: string;
    gateway: string;
    gatewayOrderId: string;
    amount: Prisma.Decimal;
    currency: string;
  }): Promise<PaymentWithOrder> {
    return prisma.payment.upsert({
      where: { orderId: args.orderId },
      create: {
        orderId: args.orderId,
        gateway: args.gateway,
        gatewayOrderId: args.gatewayOrderId,
        amount: args.amount,
        currency: args.currency,
        status: 'CREATED',
      },
      update: {
        gateway: args.gateway,
        gatewayOrderId: args.gatewayOrderId,
        amount: args.amount,
        status: 'CREATED',
        gatewayPaymentId: null,
      },
      include: withOrder,
    });
  },

  /**
   * Payment success → confirm order + append history. Stock was already reserved
   * atomically at order creation (see ordersRepository.createWithReservation), so
   * we must NOT decrement again here — doing so would double-count. All in one
   * transaction so the order can never be CONFIRMED without the audit entry.
   */
  async applySuccess(
    payment: PaymentWithOrderItems,
    gatewayPaymentId: string | undefined,
    rawPayload: Prisma.InputJsonValue,
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          gatewayPaymentId: gatewayPaymentId ?? null,
          rawWebhookPayload: rawPayload,
        },
      });
      const moved = await tx.order.updateMany({
        where: { id: payment.orderId, status: 'PENDING_PAYMENT' },
        data: { status: 'CONFIRMED' },
      });
      if (moved.count === 0) return; // already terminal or cancelled — don't re-confirm
      await tx.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          status: 'CONFIRMED',
          changedBy: 'system',
          note: 'Payment captured',
        },
      });
    });
  },

  /**
   * Payment failed → mark payment + order failed, append history, and RELEASE the
   * stock reserved at order creation back to inventory (so a failed payment never
   * strands units). Guarded by the transition out of PENDING_PAYMENT so a duplicate
   * failed webhook can't double-release.
   */
  async applyFailed(
    payment: PaymentWithOrderItems,
    gatewayPaymentId: string | undefined,
    rawPayload: Prisma.InputJsonValue,
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          gatewayPaymentId: gatewayPaymentId ?? null,
          rawWebhookPayload: rawPayload,
        },
      });
      const moved = await tx.order.updateMany({
        where: { id: payment.orderId, status: 'PENDING_PAYMENT' },
        data: { status: 'PAYMENT_FAILED' },
      });
      if (moved.count === 0) return; // already terminal — don't release twice
      await tx.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          status: 'PAYMENT_FAILED',
          changedBy: 'system',
          note: 'Payment failed',
        },
      });
      for (const item of payment.order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
    });
  },

  /**
   * Retry: new gateway order for the same order, reset payment to payable. If the
   * order had failed (stock was released), we RE-RESERVE stock atomically before
   * making it payable again — retry can legitimately fail if the item sold out in
   * the meantime.
   */
  async regenerate(
    payment: PaymentWithOrderItems,
    gateway: string,
    gatewayOrderId: string,
  ): Promise<PaymentWithOrder> {
    return prisma.$transaction(async (tx) => {
      if (payment.order.status === 'PAYMENT_FAILED') {
        for (const item of payment.order.items) {
          if (!item.variantId) continue;
          const res = await tx.productVariant.updateMany({
            where: { id: item.variantId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (res.count === 0) {
            throw AppError.conflict('Insufficient stock to retry payment', 'INSUFFICIENT_STOCK');
          }
        }
        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: 'PENDING_PAYMENT' },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: payment.orderId,
            status: 'PENDING_PAYMENT',
            changedBy: 'system',
            note: 'Payment retry',
          },
        });
      }
      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: { gateway, gatewayOrderId, status: 'CREATED', gatewayPaymentId: null },
        include: withOrder,
      });
      return updated;
    });
  },

  /**
   * Release reserved stock for an order being cancelled from a still-reserved state
   * (admin cancel). Idempotent: only releases on the transition INTO CANCELLED from
   * a state that still holds the reservation.
   */
  async releaseOnCancel(orderId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order) return;
      // Reservation is held while not already released/terminal-without-stock.
      const HOLDS_RESERVATION = [
        'PENDING_PAYMENT',
        'CONFIRMED',
        'IN_PRODUCTION',
        'PACKED',
        'SHIPPED',
      ];
      if (!HOLDS_RESERVATION.includes(order.status)) return;
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
    });
  },
};
