import type { Offer } from '@prisma/client';
import { offersRepository } from './offers.repository';
import { decimalToString } from '../../utils/serialize';

export function serializeOffer(o: Offer) {
  return {
    id: o.id,
    title: o.title,
    description: o.description,
    bannerImageUrl: o.bannerImageUrl,
    couponCode: o.couponCode,
    discountType: o.discountType,
    discountValue: decimalToString(o.discountValue),
    minOrderValue: decimalToString(o.minOrderValue),
    startsAt: o.startsAt,
    endsAt: o.endsAt,
  };
}

export type SerializedOffer = ReturnType<typeof serializeOffer>;

export const offersService = {
  async listActive(now: Date): Promise<SerializedOffer[]> {
    const offers = await offersRepository.findActive(now);
    return offers.map(serializeOffer);
  },
};
