import type { OtpRequest, RefreshToken, User } from '@prisma/client';
import { prisma } from '../../config/prisma';

/**
 * All DB access for auth lives here (02_ARCHITECTURE.md §3) so the service can be
 * unit-tested with this module mocked.
 */
export const authRepository = {
  // ── OTP ──
  countOtpRequestsSince(mobileNumber: string, since: Date): Promise<number> {
    return prisma.otpRequest.count({
      where: { mobileNumber, createdAt: { gte: since } },
    });
  },

  createOtpRequest(data: {
    mobileNumber: string;
    otpHash: string;
    expiresAt: Date;
  }): Promise<OtpRequest> {
    return prisma.otpRequest.create({ data });
  },

  /** Most recent not-yet-verified OTP for a number (may be expired — caller checks). */
  findLatestUnverifiedOtp(mobileNumber: string): Promise<OtpRequest | null> {
    return prisma.otpRequest.findFirst({
      where: { mobileNumber, verified: false },
      orderBy: { createdAt: 'desc' },
    });
  },

  markOtpVerified(id: string): Promise<OtpRequest> {
    return prisma.otpRequest.update({ where: { id }, data: { verified: true } });
  },

  incrementOtpAttempts(id: string): Promise<OtpRequest> {
    return prisma.otpRequest.update({ where: { id }, data: { attempts: { increment: 1 } } });
  },

  // ── Users ──
  findUserByMobile(mobileNumber: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { mobileNumber } });
  },

  createUser(data: { mobileNumber: string; countryCode: string; name?: string }): Promise<User> {
    return prisma.user.create({ data });
  },

  // ── Refresh tokens ──
  createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    return prisma.refreshToken.create({ data });
  },

  findRefreshTokenByHash(tokenHash: string): Promise<(RefreshToken & { user: User }) | null> {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  },

  revokeRefreshToken(id: string): Promise<RefreshToken> {
    return prisma.refreshToken.update({ where: { id }, data: { revoked: true } });
  },

  /** Idempotent revoke by hash (logout). Returns count revoked (0 if not found). */
  async revokeRefreshTokenByHash(tokenHash: string): Promise<number> {
    const result = await prisma.refreshToken.updateMany({
      where: { tokenHash, revoked: false },
      data: { revoked: true },
    });
    return result.count;
  },

  /** Revoke every active refresh token for a user (logout-all / breach response). */
  async revokeAllForUser(userId: string): Promise<number> {
    const result = await prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
    return result.count;
  },

  /**
   * Atomically rotate a refresh token (single transaction — no check-then-act race).
   * Detects reuse of an already-rotated token and, per OWASP refresh-token best
   * practice, revokes the whole token family as a breach response.
   */
  async rotateRefreshToken(
    oldHash: string,
    newTokenHash: string,
    expiresAt: Date,
  ): Promise<
    { status: 'ok'; user: User } | { status: 'reuse'; userId: string } | { status: 'invalid' }
  > {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.refreshToken.findUnique({
        where: { tokenHash: oldHash },
        include: { user: true },
      });
      if (!existing) return { status: 'invalid' };
      if (existing.revoked) {
        await tx.refreshToken.updateMany({
          where: { userId: existing.userId, revoked: false },
          data: { revoked: true },
        });
        return { status: 'reuse', userId: existing.userId };
      }
      if (existing.expiresAt.getTime() < Date.now()) return { status: 'invalid' };

      await tx.refreshToken.update({ where: { id: existing.id }, data: { revoked: true } });
      await tx.refreshToken.create({
        data: { userId: existing.userId, tokenHash: newTokenHash, expiresAt },
      });
      return { status: 'ok', user: existing.user };
    });
  },
};
