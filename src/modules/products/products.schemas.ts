import { z } from 'zod';
import { paginationFields } from '../../utils/pagination';

/**
 * Query params for GET /api/products (03_DESIGN.md §3.2).
 * All numeric params are coerced from strings; page/limit have safe defaults.
 */
export const listProductsSchema = z
  .object({
    category: z.string().trim().min(1).optional(), // category slug
    size: z.string().trim().min(1).optional(),
    color: z.string().trim().min(1).optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    q: z.string().trim().min(1).optional(),
    ...paginationFields,
  })
  .refine((v) => v.minPrice == null || v.maxPrice == null || v.maxPrice >= v.minPrice, {
    message: 'maxPrice must be greater than or equal to minPrice',
    path: ['maxPrice'],
  });

export const productSlugSchema = z.object({
  slug: z.string().trim().min(1),
});

export type ListProductsQuery = z.infer<typeof listProductsSchema>;
export type ProductSlugParams = z.infer<typeof productSlugSchema>;
