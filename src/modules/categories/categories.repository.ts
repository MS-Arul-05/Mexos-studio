import type { Category } from '@prisma/client';
import { prisma } from '../../config/prisma';

export const categoriesRepository = {
  findAll(): Promise<Category[]> {
    return prisma.category.findMany({ orderBy: { name: 'asc' } });
  },
};
