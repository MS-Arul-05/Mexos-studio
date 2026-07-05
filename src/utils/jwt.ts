import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { parseDurationSeconds } from './duration';
import { AppError } from './app-error';

export interface AccessTokenPayload {
  sub: string; // user id
  mobileNumber: string;
}

/** Sign a short-lived access token (TTL from JWT_ACCESS_TTL). */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: parseDurationSeconds(env.JWT_ACCESS_TTL),
  });
}

/** Verify/decode an access token. Throws a typed AppError on any failure. */
export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (typeof decoded === 'string' || !decoded.sub) {
      throw new Error('Malformed token payload');
    }
    return { sub: String(decoded.sub), mobileNumber: String(decoded.mobileNumber ?? '') };
  } catch {
    throw AppError.unauthorized('Invalid or expired access token', 'TOKEN_INVALID');
  }
}

const GUEST_ORDER_SCOPE = 'guest-order';

export interface GuestOrderTokenPayload {
  orderId: string;
  scope: typeof GUEST_ORDER_SCOPE;
}

/**
 * Signed token returned to guests at order creation so they can view their order
 * without a full account (03_DESIGN.md §5). Scoped to a single orderId and signed
 * with a DEDICATED secret (JWT_GUEST_SECRET) so it can never be used to mint or
 * forge user access tokens even if the guest key leaks.
 */
export function signGuestOrderToken(orderId: string): string {
  return jwt.sign({ orderId, scope: GUEST_ORDER_SCOPE }, env.JWT_GUEST_SECRET, {
    expiresIn: parseDurationSeconds(env.JWT_GUEST_TTL),
  });
}

/** Verify a guest-order token. Returns null on any failure (non-throwing). */
export function verifyGuestOrderToken(token: string): GuestOrderTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_GUEST_SECRET);
    if (typeof decoded === 'string' || decoded.scope !== GUEST_ORDER_SCOPE || !decoded.orderId) {
      return null;
    }
    return { orderId: String(decoded.orderId), scope: GUEST_ORDER_SCOPE };
  } catch {
    return null;
  }
}

// ── Guest Custom Order Tokens ──

const GUEST_CUSTOM_ORDER_SCOPE = 'guest-custom-order';

export interface GuestCustomOrderTokenPayload {
  customOrderId: string;
  scope: typeof GUEST_CUSTOM_ORDER_SCOPE;
}

/**
 * Signed token for guests accessing their custom order (same pattern as guest
 * order tokens). Prevents IDOR by requiring possession of a signed capability.
 */
export function signGuestCustomOrderToken(customOrderId: string): string {
  return jwt.sign(
    { customOrderId, scope: GUEST_CUSTOM_ORDER_SCOPE },
    env.JWT_GUEST_SECRET,
    { expiresIn: parseDurationSeconds(env.JWT_GUEST_TTL) },
  );
}

/** Verify a guest-custom-order token. Returns null on any failure (non-throwing). */
export function verifyGuestCustomOrderToken(token: string): GuestCustomOrderTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_GUEST_SECRET);
    if (
      typeof decoded === 'string' ||
      decoded.scope !== GUEST_CUSTOM_ORDER_SCOPE ||
      !decoded.customOrderId
    ) {
      return null;
    }
    return { customOrderId: String(decoded.customOrderId), scope: GUEST_CUSTOM_ORDER_SCOPE };
  } catch {
    return null;
  }
}
