import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Unified WhatsApp business number for all customer-facing links. */
export const WHATSAPP_NUMBER = '919876543210';
