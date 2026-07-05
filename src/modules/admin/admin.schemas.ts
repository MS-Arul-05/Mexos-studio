import { z } from 'zod';
import { paginationFields } from '../../utils/pagination';

const money = z.coerce.number().nonnegative();

const productImage = z.object({
  url: z.string().url(),
  altText: z.string().trim().max(200).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});
const productVariant = z.object({
  size: z.string().trim().min(1),
  color: z.string().trim().min(1),
  stock: z.coerce.number().int().min(0).optional(),
  sku: z.string().trim().min(1),
});

const slugFormat = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase alphanumeric with hyphens');

export const createProductSchema = z.object({
  name: z.string().trim().min(1),
  slug: slugFormat,
  description: z.string().trim().optional(),
  price: money,
  currency: z.string().trim().default('INR'),
  fabric: z.string().trim().optional(),
  careInfo: z.string().trim().optional(),
  categoryId: z.string().uuid(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  images: z.array(productImage).optional(),
  variants: z.array(productVariant).optional(),
});

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    slug: slugFormat.optional(),
    description: z.string().trim().optional(),
    price: money.optional(),
    currency: z.string().trim().optional(),
    fabric: z.string().trim().optional(),
    careInfo: z.string().trim().optional(),
    categoryId: z.string().uuid().optional(),
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().optional(),
    images: z.array(productImage).optional(),
    variants: z.array(productVariant).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

export const createOfferSchema = z
  .object({
    title: z.string().trim().min(1),
    description: z.string().trim().optional(),
    bannerImageUrl: z.string().url().optional(),
    couponCode: z.string().trim().min(1).optional(),
    discountType: z.enum(['PERCENTAGE', 'FLAT']),
    discountValue: money,
    minOrderValue: money.optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.endsAt > v.startsAt, {
    message: 'endsAt must be after startsAt',
    path: ['endsAt'],
  });

export const updateOfferSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
    bannerImageUrl: z.string().url().nullable().optional(),
    couponCode: z.string().trim().min(1).nullable().optional(),
    discountType: z.enum(['PERCENTAGE', 'FLAT']).optional(),
    discountValue: money.optional(),
    minOrderValue: money.nullable().optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' })
  .refine(
    (v) => {
      if (v.startsAt && v.endsAt) return v.endsAt > v.startsAt;
      return true;
    },
    { message: 'endsAt must be after startsAt', path: ['endsAt'] },
  );

// Admin can only set fulfillment statuses (payment-driven statuses excluded).
export const updateOrderStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'IN_PRODUCTION', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  note: z.string().trim().max(500).optional(),
});

export const customOrderQuerySchema = z.object({
  status: z.enum(['DRAFT', 'SUBMITTED', 'QUOTED', 'CONFIRMED', 'REJECTED']).optional(),
  ...paginationFields,
});

export const idParamSchema = z.object({ id: z.string().uuid('id must be a valid UUID') });

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type UpdateOfferInput = z.infer<typeof updateOfferSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type CustomOrderQuery = z.infer<typeof customOrderQuerySchema>;
