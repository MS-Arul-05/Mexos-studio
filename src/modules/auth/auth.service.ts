import { authRepository } from './auth.repository';
import { smsProvider } from './sms';
import { env } from '../../config/env';
import { AppError } from '../../utils/app-error';
import { parseDurationMs } from '../../utils/duration';
import {
  generateNumericOtp,
  generateOpaqueToken,
  hashOtp,
  sha256,
  verifyOtp,
} from '../../utils/crypto';
import { signAccessToken } from '../../utils/jwt';
import { recordAudit } from '../../utils/audit';
import { authAttemptsTotal } from '../../observability/metrics';

const MAX_OTP_ATTEMPTS = 5;

/** Optional request context for audit records (never affects control flow). */
export interface AuthContext {
  ip?: string | null;
}

// Single generic OTP failure — identical for "no request", "expired", and "wrong
// code" so the endpoint never reveals which state a number is in (CWE-204).
const OTP_GENERIC = new AppError('INVALID_OTP', 'The OTP entered is incorrect or expired.', 400);

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface VerifyResult extends AuthTokens {
  isNewUser: boolean;
}

/** Issue an access token + a fresh, persisted (hashed) refresh token for a user. */
async function issueTokens(user: { id: string; mobileNumber: string }): Promise<AuthTokens> {
  const accessToken = signAccessToken({ sub: user.id, mobileNumber: user.mobileNumber });

  const refreshToken = generateOpaqueToken();
  await authRepository.createRefreshToken({
    userId: user.id,
    tokenHash: sha256(refreshToken),
    expiresAt: new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_TTL)),
  });

  return { accessToken, refreshToken };
}

export const authService = {
  /**
   * Generate + store a hashed OTP and dispatch it via the SMS provider.
   * Rate-limited to OTP_MAX_PER_HOUR requests/hour/number (Epic 3.1).
   * Returns the TTL so the client can show a countdown. Never returns the code.
   */
  async sendOtp(mobileNumber: string): Promise<{ expiresInSeconds: number }> {
    const windowStart = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await authRepository.countOtpRequestsSince(mobileNumber, windowStart);
    if (recentCount >= env.OTP_MAX_PER_HOUR) {
      throw AppError.tooManyRequests(
        'Too many OTP requests. Please try again later.',
        'OTP_RATE_LIMITED',
      );
    }

    const code = generateNumericOtp(6);
    const otpHash = await hashOtp(code);
    const ttlMs = env.OTP_TTL_MINUTES * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttlMs);

    await authRepository.createOtpRequest({ mobileNumber, otpHash, expiresAt });
    await smsProvider.sendOtp(mobileNumber, code);

    return { expiresInSeconds: Math.floor(ttlMs / 1000) };
  },

  /**
   * Validate an OTP (single-use, expiry-checked, attempt-limited), create the user
   * on first login, and issue tokens (Epic 3.2).
   */
  async verifyOtp(
    mobileNumber: string,
    otp: string,
    name?: string,
    ctx?: AuthContext,
  ): Promise<VerifyResult> {
    const record = await authRepository.findLatestUnverifiedOtp(mobileNumber);
    // No record OR expired → the SAME generic error (no enumeration oracle).
    if (!record || record.expiresAt.getTime() < Date.now()) {
      recordAudit({ event: 'auth.login', actorType: 'guest', ip: ctx?.ip, outcome: 'failure' });
      authAttemptsTotal.inc({ outcome: 'failure' });
      throw OTP_GENERIC;
    }

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      recordAudit({ event: 'auth.login', actorType: 'guest', ip: ctx?.ip, outcome: 'denied' });
      authAttemptsTotal.inc({ outcome: 'denied' });
      throw AppError.tooManyRequests(
        'Too many incorrect attempts. Please request a new OTP.',
        'OTP_ATTEMPTS_EXCEEDED',
      );
    }

    const matches = await verifyOtp(otp, record.otpHash);
    if (!matches) {
      await authRepository.incrementOtpAttempts(record.id);
      recordAudit({ event: 'auth.login', actorType: 'guest', ip: ctx?.ip, outcome: 'failure' });
      authAttemptsTotal.inc({ outcome: 'failure' });
      throw OTP_GENERIC;
    }

    // Single-use: consume the OTP.
    await authRepository.markOtpVerified(record.id);

    // Create user on first login (isNewUser), else fetch existing.
    let user = await authRepository.findUserByMobile(mobileNumber);
    const isNewUser = !user;
    if (!user) {
      user = await authRepository.createUser({
        mobileNumber,
        // TODO: confirm with client — countryCode currently defaults; mobileNumber
        // is stored as full E.164. Split into national number + code if needed later.
        countryCode: '+91',
        ...(name ? { name } : {}),
      });
    }

    recordAudit({ event: 'auth.login', actorType: 'user', actorId: user.id, ip: ctx?.ip });
    authAttemptsTotal.inc({ outcome: 'success' });
    const tokens = await issueTokens(user);
    return { ...tokens, isNewUser };
  },

  /**
   * Rotate a refresh token: validate, revoke the presented one, issue a new pair
   * (Epic 3.3 — 30-day refresh, rotated on use, revocable).
   */
  async refresh(rawToken: string, ctx?: AuthContext): Promise<AuthTokens> {
    const refreshToken = generateOpaqueToken();
    const result = await authRepository.rotateRefreshToken(
      sha256(rawToken),
      sha256(refreshToken),
      new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_TTL)),
    );

    if (result.status === 'reuse') {
      // A previously-rotated token was replayed — likely theft. Whole family already
      // revoked in the transaction; force re-authentication.
      recordAudit({
        event: 'auth.refresh.reuse',
        actorType: 'user',
        actorId: result.userId,
        ip: ctx?.ip,
        outcome: 'denied',
      });
      throw AppError.unauthorized('Refresh token is invalid or expired', 'REFRESH_TOKEN_INVALID');
    }
    if (result.status !== 'ok') {
      throw AppError.unauthorized('Refresh token is invalid or expired', 'REFRESH_TOKEN_INVALID');
    }

    const accessToken = signAccessToken({
      sub: result.user.id,
      mobileNumber: result.user.mobileNumber,
    });
    return { accessToken, refreshToken };
  },

  /** Revoke a refresh token (logout). Idempotent — unknown tokens succeed silently. */
  async logout(rawToken: string, ctx?: AuthContext & { userId?: string }): Promise<void> {
    await authRepository.revokeRefreshTokenByHash(sha256(rawToken));
    recordAudit({
      event: 'auth.logout',
      actorType: 'user',
      actorId: ctx?.userId ?? null,
      ip: ctx?.ip,
    });
  },

  /** Revoke ALL refresh tokens for a user (logout from every device). */
  async logoutAll(userId: string, ctx?: AuthContext): Promise<{ revoked: number }> {
    const revoked = await authRepository.revokeAllForUser(userId);
    recordAudit({ event: 'auth.logout_all', actorType: 'user', actorId: userId, ip: ctx?.ip });
    return { revoked };
  },
};
