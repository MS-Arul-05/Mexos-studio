import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from './logger';

/**
 * Append-only security & audit trail (OWASP A09 / ASVS V7). Records WHO did WHAT
 * to WHICH resource with WHAT outcome — never secrets, tokens, OTPs, or card data.
 * Writes are best-effort and MUST never break the request flow, so failures are
 * swallowed (and surfaced to the app log for ops).
 */
export interface AuditEntry {
  event: string; // e.g. "auth.login", "admin.order.status", "payment.success"
  actorType: 'user' | 'guest' | 'admin' | 'system';
  actorId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  ip?: string | null;
  outcome?: 'success' | 'failure' | 'denied';
  metadata?: Record<string, unknown>;
}

export function recordAudit(entry: AuditEntry): void {
  // Fire-and-forget: don't await in request handlers; never throw.
  void prisma.auditLog
    .create({
      data: {
        event: entry.event,
        actorType: entry.actorType,
        actorId: entry.actorId ?? null,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        ip: entry.ip ?? null,
        outcome: entry.outcome ?? 'success',
        ...(entry.metadata !== undefined
          ? { metadata: entry.metadata as Prisma.InputJsonValue }
          : {}),
      },
    })
    .catch((err: unknown) => {
      logger.error({ err, event: entry.event }, 'Failed to write audit log');
    });
}

/** Best-effort client IP for audit records (honours trust-proxy config). */
export function clientIp(req: Request): string | null {
  return req.ip ?? null;
}
