import type { ContactInquiry, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

export const contactRepository = {
  create(data: Prisma.ContactInquiryCreateInput): Promise<ContactInquiry> {
    return prisma.contactInquiry.create({ data });
  },
};
