import { Prisma, type CustomOrderStatus, type OrderStatus } from '@prisma/client';
import { adminRepository } from './admin.repository';
import { ordersRepository } from '../orders/orders.repository';
import { paymentsRepository } from '../payments/payments.repository';
import { serializeProduct } from '../products/products.service';
import { serializeOffer } from '../offers/offers.service';
import { serializeOrder, type SerializedOrder } from '../orders/orders.service';
import {
  serializeCustomOrder,
  type SerializedCustomOrder,
} from '../custom-orders/custom-orders.service';
import { notificationDispatcher } from '../../jobs/notification-queue';
import { AppError } from '../../utils/app-error';
import { logger } from '../../utils/logger';
import type { PaginationMeta } from '../../utils/response';
import type {
  CreateOfferInput,
  CreateProductInput,
  UpdateOfferInput,
  UpdateOrderStatusInput,
  UpdateProductInput,
} from './admin.schemas';

const dec = (n: number): Prisma.Decimal => new Prisma.Decimal(n.toString());
const TERMINAL: OrderStatus[] = ['DELIVERED', 'CANCELLED'];

export const adminService = {
  // ── Products ──
  async createProduct(input: CreateProductInput) {
    const { images, variants, categoryId, price, ...rest } = input;
    const data: Prisma.ProductCreateInput = {
      ...rest,
      price: dec(price),
      category: { connect: { id: categoryId } },
    };
    const product = await adminRepository.createProduct(data, images, variants);
    return serializeProduct(product);
  },

  async updateProduct(id: string, input: UpdateProductInput) {
    const existing = await adminRepository.findProductById(id);
    if (!existing) throw AppError.notFound('Product not found', 'PRODUCT_NOT_FOUND');

    const { images, variants, categoryId, price, ...rest } = input;
    const data: Prisma.ProductUpdateInput = {
      ...rest,
      ...(price != null ? { price: dec(price) } : {}),
      ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
    };
    const product = await adminRepository.updateProduct(id, data, images, variants);
    return serializeProduct(product);
  },

  async deleteProduct(id: string) {
    const existing = await adminRepository.findProductById(id);
    if (!existing) throw AppError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
    const product = await adminRepository.softDeleteProduct(id);
    return serializeProduct(product);
  },

  // ── Offers ──
  async createOffer(input: CreateOfferInput) {
    const data: Prisma.OfferCreateInput = {
      title: input.title,
      description: input.description ?? null,
      bannerImageUrl: input.bannerImageUrl ?? null,
      couponCode: input.couponCode ?? null,
      discountType: input.discountType,
      discountValue: dec(input.discountValue),
      minOrderValue: input.minOrderValue != null ? dec(input.minOrderValue) : null,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      ...(input.isActive != null ? { isActive: input.isActive } : {}),
    };
    return serializeOffer(await adminRepository.createOffer(data));
  },

  async updateOffer(id: string, input: UpdateOfferInput) {
    const existing = await adminRepository.findOfferById(id);
    if (!existing) throw AppError.notFound('Offer not found', 'OFFER_NOT_FOUND');
    const data: Prisma.OfferUpdateInput = {
      ...(input.title != null ? { title: input.title } : {}),
      ...(input.description != null ? { description: input.description } : {}),
      ...(input.bannerImageUrl != null ? { bannerImageUrl: input.bannerImageUrl } : {}),
      ...(input.couponCode != null ? { couponCode: input.couponCode } : {}),
      ...(input.discountType != null ? { discountType: input.discountType } : {}),
      ...(input.discountValue != null ? { discountValue: dec(input.discountValue) } : {}),
      ...(input.minOrderValue != null ? { minOrderValue: dec(input.minOrderValue) } : {}),
      ...(input.startsAt != null ? { startsAt: input.startsAt } : {}),
      ...(input.endsAt != null ? { endsAt: input.endsAt } : {}),
      ...(input.isActive != null ? { isActive: input.isActive } : {}),
    };
    return serializeOffer(await adminRepository.updateOffer(id, data));
  },

  async deleteOffer(id: string) {
    const existing = await adminRepository.findOfferById(id);
    if (!existing) throw AppError.notFound('Offer not found', 'OFFER_NOT_FOUND');
    await adminRepository.deleteOffer(id);
    return { id, deleted: true };
  },

  // ── Order status (Decision #2: manual admin transition) ──
  async setOrderStatus(
    id: string,
    input: UpdateOrderStatusInput,
    changedBy: string,
  ): Promise<SerializedOrder> {
    const order = await ordersRepository.findById(id);
    if (!order) throw AppError.notFound('Order not found', 'ORDER_NOT_FOUND');
    if (TERMINAL.includes(order.status)) {
      throw AppError.conflict(
        `Order is in a terminal state (${order.status}) and cannot be changed`,
        'ORDER_TERMINAL',
      );
    }

    // Cancelling an order that still holds a reservation → return the units to
    // stock BEFORE flipping the status (releaseOnCancel is idempotent + guarded).
    if (input.status === 'CANCELLED') {
      await paymentsRepository.releaseOnCancel(id);
    }

    const updated = await adminRepository.setOrderStatus(
      id,
      input.status as OrderStatus,
      input.note,
      changedBy,
    );
    if (!updated) throw AppError.notFound('Order not found', 'ORDER_NOT_FOUND');

    // Fire the notification hook (Epic 4.3) — best-effort, never fails the admin action.
    try {
      await notificationDispatcher.sendOrderStatusUpdate({
        orderId: updated.id,
        status: updated.status,
        toNumber: updated.guestMobile,
        note: input.note,
      });
    } catch (err) {
      logger.error({ err, orderId: id }, 'Status-change notification failed (non-fatal)');
    }

    return serializeOrder(updated);
  },

  // ── Custom orders queue (Task F) ──
  async listCustomOrders(
    status: CustomOrderStatus | undefined,
    page: number,
    limit: number,
  ): Promise<{ items: SerializedCustomOrder[]; meta: PaginationMeta }> {
    // Default queue = orders needing a quote/confirmation.
    const statuses: CustomOrderStatus[] = status ? [status] : ['SUBMITTED', 'QUOTED'];
    const { items, total } = await adminRepository.listCustomOrders(statuses, page, limit);
    return { items: items.map(serializeCustomOrder), meta: { page, limit, total } };
  },
};
