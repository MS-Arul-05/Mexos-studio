import { z } from 'zod';

export const checkoutSchema = z.object({
  orderId: z.string().uuid('orderId must be a valid UUID'),
});

export const paymentIdSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
