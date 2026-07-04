import type { Prisma } from '@prisma/client';

/**
 * Serialize a Prisma Decimal (money) to a fixed 2-decimal string for JSON
 * responses. Money is always exchanged as a string so no float precision is lost
 * on the wire, and the scale is fixed so the frontend gets a consistent contract
 * (e.g. "749.00", not "749"). All Decimal columns in this schema are currency.
 */
export function decimalToString(value: Prisma.Decimal | null | undefined): string | null {
  return value == null ? null : value.toFixed(2);
}
