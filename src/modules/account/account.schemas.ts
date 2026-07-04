import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const createAddressSchema = z.object({
  label: z.string().trim().max(40).optional(),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  pincode: z.string().trim().min(4).max(12),
  isDefault: z.coerce.boolean().optional(),
});

export const addressIdSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
