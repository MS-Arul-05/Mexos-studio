import type { Offer } from '@prisma/client';
import { prisma } from '../../config/prisma';

export const offersRepository = {
  /** Offers that are active and currently within their [startsAt, endsAt] window. */
  findActive(now: Date, limit = 50): Promise<Offer[]> {
    return prisma.offer.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      orderBy: { startsAt: 'desc' },
      take: limit,
    });
  },

  /** A single active offer matching a coupon code (for checkout discount). */
  findActiveByCouponCode(couponCode: string, now: Date): Promise<Offer | null> {
    return prisma.offer.findFirst({
      where: {
        couponCode,
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
    });
  },
};
