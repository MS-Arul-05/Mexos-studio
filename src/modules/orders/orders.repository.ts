import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/app-error';

/** A stock reservation line: how many units of a variant an order holds. */
export interface StockReservation {
  variantId: string;
  quantity: number;
}

/** Coupon redemption to record atomically with the order (reuse/stacking guard). */
export interface CouponRedemptionInput {
  offerId: string;
  couponCode: string;
  userId?: string;
  discountAmount: Prisma.Decimal;
  maxPerUser: number | null;
  maxTotal: number | null;
}

const orderInclude = {
  items: true,
  statusHistory: { orderBy: { createdAt: 'asc' } },
  payment: true,
} satisfies Prisma.OrderInclude;

export type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

// Variant + its product, for server-side price/name/size/color snapshotting.
const variantInclude = { product: true } satisfies Prisma.ProductVariantInclude;
export type VariantWithProduct = Prisma.ProductVariantGetPayload<{
  include: typeof variantInclude;
}>;

/** Enforce coupon caps inside the order transaction (DB uniques are the backstop). */
async function enforceRedemptionCaps(
  tx: Prisma.TransactionClient,
  redemption: CouponRedemptionInput,
): Promise<void> {
  if (redemption.maxTotal !== null) {
    const total = await tx.couponRedemption.count({ where: { offerId: redemption.offerId } });
    if (total >= redemption.maxTotal) {
      throw AppError.conflict('This coupon has reached its redemption limit', 'COUPON_EXHAUSTED');
    }
  }
  if (redemption.userId && redemption.maxPerUser !== null) {
    const used = await tx.couponRedemption.count({
      where: { offerId: redemption.offerId, userId: redemption.userId },
    });
    if (used >= redemption.maxPerUser) {
      throw AppError.conflict('You have already used this coupon', 'COUPON_ALREADY_USED');
    }
  }
}

/** Record a redemption; the partial unique index converts a concurrent double-redeem to a conflict. */
async function recordRedemption(
  tx: Prisma.TransactionClient,
  orderId: string,
  redemption: CouponRedemptionInput,
): Promise<void> {
  try {
    await tx.couponRedemption.create({
      data: {
        offerId: redemption.offerId,
        orderId,
        userId: redemption.userId ?? null,
        couponCode: redemption.couponCode,
        discountAmount: redemption.discountAmount,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw AppError.conflict('You have already used this coupon', 'COUPON_ALREADY_USED');
    }
    throw e;
  }
}

export const ordersRepository = {
  findVariantsWithProduct(variantIds: string[]): Promise<VariantWithProduct[]> {
    return prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: variantInclude,
    });
  },

  create(data: Prisma.OrderCreateInput): Promise<OrderWithRelations> {
    return prisma.order.create({ data, include: orderInclude });
  },

  /**
   * Create an order AND reserve stock atomically (CWE-362 fix). Each variant is
   * decremented with a conditional guard (`stock >= quantity`); if any line can't
   * be satisfied the whole transaction rolls back — no order, no partial reserve,
   * and inventory can never go negative. This replaces the old check-then-write
   * flow where concurrent orders could oversell the same stock.
   */
  async createWithReservation(
    data: Prisma.OrderCreateInput,
    reservations: StockReservation[],
    redemption?: CouponRedemptionInput,
  ): Promise<OrderWithRelations> {
    return prisma.$transaction(async (tx) => {
      for (const r of reservations) {
        const res = await tx.productVariant.updateMany({
          where: { id: r.variantId, stock: { gte: r.quantity } },
          data: { stock: { decrement: r.quantity } },
        });
        if (res.count === 0) {
          throw AppError.conflict('Insufficient stock', 'INSUFFICIENT_STOCK');
        }
      }

      if (redemption) await enforceRedemptionCaps(tx, redemption);
      const order = await tx.order.create({ data, include: orderInclude });
      if (redemption) await recordRedemption(tx, order.id, redemption);

      return order;
    });
  },

  findById(id: string): Promise<OrderWithRelations | null> {
    return prisma.order.findUnique({ where: { id }, include: orderInclude });
  },

  /** Guest tracking: match by order id AND (guestMobile OR the owner's mobile). */
  findForTracking(orderId: string, mobile: string): Promise<OrderWithRelations | null> {
    return prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [{ guestMobile: mobile }, { user: { mobileNumber: mobile } }],
      },
      include: orderInclude,
    });
  },

  async listByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: OrderWithRelations[]; total: number }> {
    const where: Prisma.OrderWhereInput = { userId };
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);
    return { items, total };
  },
};
