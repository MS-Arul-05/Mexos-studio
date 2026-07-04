import { z } from 'zod';
import { paginationSchema } from '../../utils/pagination';

const mobileNumber = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, 'mobile must be E.164 format, e.g. +919876543210');

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: z.coerce.number().int().min(1),
      }),
    )
    .min(1, 'At least one item is required'),
  couponCode: z.string().trim().min(1).optional(),
  // Required for guests (enforced in the service once auth state is known).
  guestMobile: mobileNumber.optional(),
  guestName: z.string().trim().min(1).max(80).optional(),
  shippingAddressId: z.string().uuid().optional(),
  // Inline address snapshot from storefront checkout (guest or user).
  shippingAddress: z
    .object({
      name: z.string().trim().min(1).max(80),
      phone: z.string().trim().min(8).max(20),
      line1: z.string().trim().min(1).max(200),
      line2: z.string().trim().max(200).optional(),
      city: z.string().trim().min(1).max(80),
      state: z.string().trim().min(1).max(80),
      pincode: z.string().trim().min(4).max(12),
    })
    .optional(),
  // COD confirms at placement (stock reserved); ONLINE goes through the gateway.
  paymentMethod: z.enum(['ONLINE', 'COD']).default('ONLINE'),
});

export const orderIdSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export const trackOrderSchema = z.object({
  orderId: z.string().uuid('orderId must be a valid UUID'),
  mobile: mobileNumber,
});

export const orderHistoryQuerySchema = paginationSchema;

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type TrackOrderQuery = z.infer<typeof trackOrderSchema>;
export type OrderHistoryQuery = z.infer<typeof orderHistoryQuerySchema>;
