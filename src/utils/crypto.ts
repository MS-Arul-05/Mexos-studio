import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 10;

/**
 * Generate a numeric OTP of the given length (default 6), using a CSPRNG.
 * Zero-padded so leading zeros are preserved (e.g. "004213").
 */
export function generateNumericOtp(digits = 6): string {
  const max = 10 ** digits;
  return randomInt(0, max).toString().padStart(digits, '0');
}

/** Hash an OTP for storage (bcrypt — OTPs are low-entropy, so never store plaintext). */
export function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, BCRYPT_ROUNDS);
}

export function verifyOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

/** High-entropy opaque token (for refresh tokens). Returned raw to the client. */
export function generateOpaqueToken(bytes = 40): string {
  return randomBytes(bytes).toString('hex');
}

/**
 * SHA-256 hex digest. Used to store refresh tokens hashed at rest — the raw token
 * is high-entropy so a fast hash is sufficient and lets us look up by @unique hash.
 */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** HMAC-SHA256 hex digest (payment/WhatsApp webhook signatures). */
export function hmacSha256Hex(data: string | Buffer, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('hex');
}

/** Constant-time comparison of two hex strings (signature verification). */
export function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Constant-time comparison of two utf8 strings (e.g. admin API key). */
export function safeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
