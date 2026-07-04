import { z } from 'zod';

/**
 * Query for GET /api/whatsapp/chat-link (03_DESIGN.md §3.3).
 * - customOrderId → prefilled custom-order summary
 * - orderId       → prefilled order summary
 * - neither       → generic support message
 */
export const chatLinkQuerySchema = z
  .object({
    customOrderId: z.string().uuid().optional(),
    orderId: z.string().uuid().optional(),
  })
  .refine((v) => !(v.customOrderId && v.orderId), {
    message: 'Provide only one of customOrderId or orderId',
    path: ['customOrderId'],
  });

export type ChatLinkQuery = z.infer<typeof chatLinkQuerySchema>;
