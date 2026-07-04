import { z } from 'zod';

export const createContactSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().optional(),
  mobile: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, 'mobile must be E.164 format')
    .optional(),
  message: z.string().trim().min(1).max(2000),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
