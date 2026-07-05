import type { CustomOrder, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

export const customOrdersRepository = {
  create(data: Prisma.CustomOrderCreateInput): Promise<CustomOrder> {
    return prisma.customOrder.create({ data });
  },

  findById(id: string): Promise<CustomOrder | null> {
    return prisma.customOrder.findUnique({ where: { id } });
  },

  update(id: string, data: Prisma.CustomOrderUpdateInput): Promise<CustomOrder> {
    return prisma.customOrder.update({ where: { id }, data });
  },

  /**
   * Update only if the order is still in DRAFT status (TOCTOU-safe).
   * Returns null if the order moved out of DRAFT concurrently.
   */
  async updateIfDraft(id: string, data: Prisma.CustomOrderUpdateInput): Promise<CustomOrder | null> {
    const result = await prisma.customOrder.updateMany({
      where: { id, status: 'DRAFT' },
      data: data as Prisma.CustomOrderUpdateManyMutationInput,
    });
    if (result.count === 0) return null;
    return prisma.customOrder.findUnique({ where: { id } });
  },

  /** Account "Saved Designs" tab: the user's custom orders, newest first. */
  async listByUser(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: CustomOrder[]; total: number }> {
    const where = { userId };
    const [items, total] = await Promise.all([
      prisma.customOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customOrder.count({ where }),
    ]);
    return { items, total };
  },
};
