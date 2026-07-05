import { Prisma, type CustomOrder, type Offer, type OrderStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { productInclude, type ProductWithRelations } from '../products/products.repository';
import type { OrderWithRelations } from '../orders/orders.repository';

export interface ProductImageInput {
  url: string;
  altText?: string;
  sortOrder?: number;
}
export interface ProductVariantInput {
  size: string;
  color: string;
  stock?: number;
  sku: string;
}

export const adminRepository = {
  // ── Products ──
  findProductById(id: string): Promise<ProductWithRelations | null> {
    return prisma.product.findUnique({ where: { id }, include: productInclude });
  },

  createProduct(
    data: Prisma.ProductCreateInput,
    images: ProductImageInput[] | undefined,
    variants: ProductVariantInput[] | undefined,
  ): Promise<ProductWithRelations> {
    return prisma.product.create({
      data: {
        ...data,
        ...(images ? { images: { create: images } } : {}),
        ...(variants ? { variants: { create: variants } } : {}),
      },
      include: productInclude,
    });
  },

  async updateProduct(
    id: string,
    data: Prisma.ProductUpdateInput,
    images: ProductImageInput[] | undefined,
    variants: ProductVariantInput[] | undefined,
  ): Promise<ProductWithRelations> {
    return prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data });
      if (images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (images.length) {
          await tx.productImage.createMany({ data: images.map((i) => ({ ...i, productId: id })) });
        }
      }
      if (variants) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
        if (variants.length) {
          await tx.productVariant.createMany({
            data: variants.map((v) => ({ ...v, productId: id })),
          });
        }
      }
      return tx.product.findUniqueOrThrow({ where: { id }, include: productInclude });
    });
  },

  /** Soft delete (keeps referential integrity with order items). */
  softDeleteProduct(id: string): Promise<ProductWithRelations> {
    return prisma.product.update({
      where: { id },
      data: { isActive: false },
      include: productInclude,
    });
  },

  // ── Offers ──
  findOfferById(id: string): Promise<Offer | null> {
    return prisma.offer.findUnique({ where: { id } });
  },
  createOffer(data: Prisma.OfferCreateInput): Promise<Offer> {
    return prisma.offer.create({ data });
  },
  updateOffer(id: string, data: Prisma.OfferUpdateInput): Promise<Offer> {
    return prisma.offer.update({ where: { id }, data });
  },
  deleteOffer(id: string): Promise<Offer> {
    return prisma.offer.delete({ where: { id } });
  },

  // ── Orders ──
  /**
   * Manual status transition: atomically guard against terminal states and
   * concurrent updates (TOCTOU-safe), then update status + append history.
   * Returns null if the order doesn't exist or is already terminal.
   */
  async setOrderStatus(
    id: string,
    status: OrderStatus,
    note: string | undefined,
    changedBy: string,
    terminalStates: OrderStatus[],
  ): Promise<OrderWithRelations | null> {
    return prisma.$transaction(async (tx) => {
      // Conditional update — only moves if NOT in a terminal state (TOCTOU-safe).
      const moved = await tx.order.updateMany({
        where: { id, status: { notIn: terminalStates } },
        data: { status },
      });
      if (moved.count === 0) return null;
      await tx.orderStatusHistory.create({
        data: { orderId: id, status, note: note ?? null, changedBy },
      });
      // Return the updated order within the same transaction.
      const order = await tx.order.findUnique({
        where: { id },
        include: {
          items: true,
          statusHistory: { orderBy: { createdAt: 'asc' } },
          payment: true,
          user: { select: { mobileNumber: true } },
        },
      });
      return order as OrderWithRelations & { user?: { mobileNumber: string } | null };
    });
  },

  // ── Custom orders queue ──
  async listCustomOrders(
    statuses: CustomOrder['status'][],
    page: number,
    limit: number,
  ): Promise<{ items: CustomOrder[]; total: number }> {
    const where: Prisma.CustomOrderWhereInput = { status: { in: statuses } };
    const [items, total] = await Promise.all([
      prisma.customOrder.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customOrder.count({ where }),
    ]);
    return { items, total };
  },
};
