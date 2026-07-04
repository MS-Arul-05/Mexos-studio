import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

const withAddresses = { addresses: true } satisfies Prisma.UserInclude;
export type UserWithAddresses = Prisma.UserGetPayload<{ include: typeof withAddresses }>;

export interface NewAddress {
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

export const accountRepository = {
  findById(id: string): Promise<UserWithAddresses | null> {
    return prisma.user.findUnique({ where: { id }, include: withAddresses });
  },

  updateName(id: string, name: string) {
    return prisma.user.update({ where: { id }, data: { name } });
  },

  /** First address (or an explicit default) becomes default; demotes the previous one. */
  createAddress(userId: string, data: NewAddress) {
    return prisma.$transaction(async (tx) => {
      const count = await tx.address.count({ where: { userId } });
      const isDefault = !!data.isDefault || count === 0;
      if (isDefault) {
        await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      }
      return tx.address.create({
        data: { ...data, isDefault, user: { connect: { id: userId } } },
      });
    });
  },

  /** Delete only if owned by this user. Returns true when a row was removed. */
  async deleteAddress(userId: string, addressId: string): Promise<boolean> {
    const res = await prisma.address.deleteMany({ where: { id: addressId, userId } });
    return res.count > 0;
  },
};
