import { Prisma } from '@prisma/client';

/**
 * Instant pricing engine (Decision #1 — swappable). Only used when a custom order
 * has pricingMode = INSTANT; the default WHATSAPP_CONFIRMED path returns null so a
 * human quotes it over WhatsApp.
 *
 * TODO: confirm with client — this is a placeholder rule table. Replace with the
 * real pricing matrix (or keep WHATSAPP_CONFIRMED as the only mode) once decided.
 */
const BASE_PRICE_BY_TYPE: Record<string, number> = {
  'round-neck': 399,
  polo: 549,
  oversized: 599,
  'full-sleeve': 499,
};
const DEFAULT_BASE_PRICE = 449;
const EMBROIDERY_SURCHARGE = 100;

export interface PricingInput {
  baseType: string;
  quantity: number;
  printType?: string | null;
}

export function computeInstantPrice(input: PricingInput): Prisma.Decimal {
  const base = BASE_PRICE_BY_TYPE[input.baseType.toLowerCase()] ?? DEFAULT_BASE_PRICE;
  const surcharge = input.printType === 'embroidery' ? EMBROIDERY_SURCHARGE : 0;
  const unit = base + surcharge;
  return new Prisma.Decimal(unit).mul(input.quantity);
}
