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

  /** Account "Saved Designs" tab: the user's custom orders, newest first. */
  listByUser(userId: string, limit = 50): Promise<CustomOrder[]> {
    return prisma.customOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};
