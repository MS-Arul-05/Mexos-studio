import type { Prisma, WhatsAppMessageLog } from '@prisma/client';
import { prisma } from '../../config/prisma';

/** Persistence for WhatsApp message/delivery logs (Epic 4.3–4.5). */
export const whatsappRepository = {
  log(data: {
    toNumber: string;
    templateName?: string | null;
    payload: unknown;
    status: string; // "sent" | "delivered" | "read" | "failed" | "queued"
    relatedOrderId?: string | null;
  }): Promise<WhatsAppMessageLog> {
    return prisma.whatsAppMessageLog.create({
      data: {
        toNumber: data.toNumber,
        templateName: data.templateName ?? null,
        payload: (data.payload ?? {}) as Prisma.InputJsonValue,
        status: data.status,
        relatedOrderId: data.relatedOrderId ?? null,
      },
    });
  },
};
