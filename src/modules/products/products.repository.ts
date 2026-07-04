import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import type { ListProductsQuery } from './products.schemas';

// Product with the relations we always return for cards / detail.
export const productInclude = {
  images: { orderBy: { sortOrder: 'asc' } },
  variants: true,
  category: true,
} satisfies Prisma.ProductInclude;

export type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function buildWhere(q: ListProductsQuery): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { isActive: true };

  if (q.category) where.category = { slug: q.category };

  if (q.minPrice != null || q.maxPrice != null) {
    where.price = {
      ...(q.minPrice != null ? { gte: q.minPrice } : {}),
      ...(q.maxPrice != null ? { lte: q.maxPrice } : {}),
    };
  }

  if (q.size || q.color) {
    where.variants = {
      some: {
        ...(q.size ? { size: q.size } : {}),
        ...(q.color ? { color: q.color } : {}),
      },
    };
  }

  if (q.q) {
    where.OR = [
      { name: { contains: q.q, mode: 'insensitive' } },
      { description: { contains: q.q, mode: 'insensitive' } },
    ];
  }

  return where;
}

export const productsRepository = {
  /** Paginated product list with filters (Epic 6.1). Returns items + total count. */
  async list(q: ListProductsQuery): Promise<{ items: ProductWithRelations[]; total: number }> {
    const where = buildWhere(q);
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      prisma.product.count({ where }),
    ]);
    return { items, total };
  },

  /** Active product detail by slug (returns null if missing/inactive). */
  findActiveBySlug(slug: string): Promise<ProductWithRelations | null> {
    return prisma.product.findFirst({
      where: { slug, isActive: true },
      include: productInclude,
    });
  },
};
