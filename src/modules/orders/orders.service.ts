import { Prisma } from '@prisma/client';
import { ordersRepository, type OrderWithRelations } from './orders.repository';
import { offersRepository } from '../offers/offers.repository';
import { env } from '../../config/env';
import { signGuestOrderToken } from '../../utils/jwt';
import { AppError } from '../../utils/app-error';
import { decimalToString } from '../../utils/serialize';
import { ordersCreatedTotal } from '../../observability/metrics';
import type { PaginationMeta } from '../../utils/response';
import type { CreateOrderInput } from './orders.schemas';

export interface OrderRequester {
  userId?: string;
  /** Guest-order token (from X-Guest-Token / ?guestToken) for guest access to :id. */
  guestOrderId?: string;
}

export function serializeOrder(o: OrderWithRelations) {
  return {
    id: o.id,
    orderSource: o.orderSource,
    status: o.status,
    subtotal: decimalToString(o.subtotal),
    discount: decimalToString(o.discount),
    shippingFee: decimalToString(o.shippingFee),
    total: decimalToString(o.total),
    currency: o.currency,
    paymentMethod: o.paymentMethod,
    guestMobile: o.guestMobile,
    shippingAddressId: o.shippingAddressId,
    shippingAddress: o.shippingAddress,
    items: o.items.map((it) => ({
      id: it.id,
      productId: it.productId,
      variantId: it.variantId,
      name: it.name,
      size: it.size,
      color: it.color,
      quantity: it.quantity,
      unitPrice: decimalToString(it.unitPrice),
    })),
    statusHistory: o.statusHistory.map((h) => ({
      status: h.status,
      note: h.note,
      changedBy: h.changedBy,
      createdAt: h.createdAt,
    })),
    payment: o.payment
      ? {
          status: o.payment.status,
          gateway: o.payment.gateway,
          amount: decimalToString(o.payment.amount),
        }
      : null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

export type SerializedOrder = ReturnType<typeof serializeOrder>;

/** Compute a coupon discount against the server-computed subtotal. */
function computeDiscount(
  offer: {
    discountType: 'PERCENTAGE' | 'FLAT';
    discountValue: Prisma.Decimal;
    minOrderValue: Prisma.Decimal | null;
  },
  subtotal: Prisma.Decimal,
): Prisma.Decimal {
  if (offer.minOrderValue && subtotal.lessThan(offer.minOrderValue)) {
    throw AppError.badRequest(
      'Order value does not meet the minimum for this coupon',
      'COUPON_MIN_ORDER_NOT_MET',
    );
  }
  // Reject corrupt offers: a discount must be strictly positive, and a percentage
  // must be ≤ 100 (prevents negative totals / free-money underflow — MED-3).
  if (offer.discountValue.lessThanOrEqualTo(0)) {
    throw AppError.badRequest('Invalid coupon configuration', 'INVALID_COUPON');
  }
  const pct =
    offer.discountType === 'PERCENTAGE'
      ? Prisma.Decimal.min(offer.discountValue, new Prisma.Decimal(100))
      : offer.discountValue;
  const raw = offer.discountType === 'PERCENTAGE' ? subtotal.mul(pct).div(100) : pct;
  // Clamp into [0, subtotal] — never negative, never more than the order.
  if (raw.lessThan(0)) return new Prisma.Decimal(0);
  return raw.greaterThan(subtotal) ? subtotal : raw;
}

export const ordersService = {
  /**
   * Create a WEB order from a cart. The server recomputes every amount from DB
   * prices — client-submitted totals are never trusted (07_GUIDE.md §3).
   */
  async create(
    input: CreateOrderInput,
    requester: OrderRequester,
  ): Promise<SerializedOrder & { guestToken?: string }> {
    if (!requester.userId && !input.guestMobile) {
      throw AppError.badRequest(
        'guestMobile is required for guest checkout',
        'GUEST_MOBILE_REQUIRED',
      );
    }

    // Load variants + products for the requested items.
    const variantIds = [...new Set(input.items.map((i) => i.variantId))];
    const variants = await ordersRepository.findVariantsWithProduct(variantIds);
    const byId = new Map(variants.map((v) => [v.id, v]));

    let subtotal = new Prisma.Decimal(0);
    const itemData: Prisma.OrderItemCreateWithoutOrderInput[] = [];
    const reservations: { variantId: string; quantity: number }[] = [];

    for (const line of input.items) {
      const variant = byId.get(line.variantId);
      if (!variant || !variant.product.isActive) {
        throw AppError.badRequest(`Invalid or unavailable item: ${line.variantId}`, 'INVALID_ITEM');
      }
      // Fast, friendly pre-check for UX; the authoritative guarantee is the atomic
      // conditional decrement in createWithReservation (prevents the oversell race).
      if (line.quantity > variant.stock) {
        throw AppError.conflict(
          `Insufficient stock for ${variant.product.name} (${variant.size}/${variant.color})`,
          'INSUFFICIENT_STOCK',
        );
      }
      reservations.push({ variantId: variant.id, quantity: line.quantity });
      const unitPrice = variant.product.price;
      subtotal = subtotal.add(unitPrice.mul(line.quantity));
      itemData.push({
        product: { connect: { id: variant.productId } },
        variantId: variant.id,
        name: variant.product.name,
        size: variant.size,
        color: variant.color,
        quantity: line.quantity,
        unitPrice,
      });
    }

    // Optional coupon discount (recomputed server-side) + redemption record.
    let discount = new Prisma.Decimal(0);
    let redemption: Parameters<typeof ordersRepository.createWithReservation>[2];
    if (input.couponCode) {
      const offer = await offersRepository.findActiveByCouponCode(input.couponCode, new Date());
      if (!offer) {
        throw AppError.badRequest('Invalid or expired coupon code', 'INVALID_COUPON');
      }
      discount = computeDiscount(offer, subtotal);
      redemption = {
        offerId: offer.id,
        couponCode: input.couponCode,
        userId: requester.userId,
        discountAmount: discount,
        maxPerUser: offer.maxRedemptionsPerUser,
        maxTotal: offer.maxRedemptionsTotal,
      };
    }

    // Server-authoritative shipping rule: flat fee below the free threshold,
    // computed on the discounted goods value.
    const goodsValue = subtotal.sub(discount);
    const shippingFee = goodsValue.greaterThanOrEqualTo(env.FREE_SHIPPING_THRESHOLD)
      ? new Prisma.Decimal(0)
      : new Prisma.Decimal(env.SHIPPING_FEE);
    const total = goodsValue.add(shippingFee);

    // COD confirms at placement (stock is reserved atomically below); ONLINE
    // stays PENDING_PAYMENT until the signature-verified webhook confirms it.
    const isCod = input.paymentMethod === 'COD';
    const initialStatus = isCod ? ('CONFIRMED' as const) : ('PENDING_PAYMENT' as const);

    const data: Prisma.OrderCreateInput = {
      orderSource: 'WEB',
      status: initialStatus,
      subtotal,
      discount,
      shippingFee,
      total,
      currency: 'INR',
      paymentMethod: input.paymentMethod,
      guestMobile: input.guestMobile ?? null,
      shippingAddressId: input.shippingAddressId ?? null,
      shippingAddress: input.shippingAddress
        ? (input.shippingAddress as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      ...(requester.userId ? { user: { connect: { id: requester.userId } } } : {}),
      items: { create: itemData },
      // Append-only initial status entry (Epic 2.5).
      statusHistory: {
        create: {
          status: initialStatus,
          changedBy: 'system',
          note: isCod ? 'COD order placed — confirmed, payable on delivery' : 'Order created',
        },
      },
    };

    // Reserve stock + record coupon redemption atomically as part of order creation.
    const order = await ordersRepository.createWithReservation(data, reservations, redemption);
    ordersCreatedTotal.inc();
    const serialized = serializeOrder(order);

    // Guests get a scoped token so they can view the order without an account.
    if (!order.userId) {
      return { ...serialized, guestToken: signGuestOrderToken(order.id) };
    }
    return serialized;
  },

  /** Order detail: accessible by the owner or via a matching guest-order token. */
  async getById(id: string, requester: OrderRequester): Promise<SerializedOrder> {
    const order = await ordersRepository.findById(id);
    // Return 404 (not 403) on no-access to avoid leaking existence.
    if (!order) throw AppError.notFound('Order not found', 'ORDER_NOT_FOUND');

    const isOwner = !!order.userId && order.userId === requester.userId;
    const isGuestToken = !order.userId && requester.guestOrderId === order.id;
    if (!isOwner && !isGuestToken) {
      throw AppError.notFound('Order not found', 'ORDER_NOT_FOUND');
    }

    return serializeOrder(order);
  },

  /** Guest tracking by orderId + mobile (Epic 6.3). */
  async track(orderId: string, mobile: string): Promise<SerializedOrder> {
    const order = await ordersRepository.findForTracking(orderId, mobile);
    if (!order) throw AppError.notFound('Order not found', 'ORDER_NOT_FOUND');
    return serializeOrder(order);
  },

  /** Authenticated order history (Epic 6.3). */
  async listForUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: SerializedOrder[]; meta: PaginationMeta }> {
    const { items, total } = await ordersRepository.listByUser(userId, page, limit);
    return { items: items.map(serializeOrder), meta: { page, limit, total } };
  },
};
