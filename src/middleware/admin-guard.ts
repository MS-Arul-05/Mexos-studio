import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/app-error';
import { safeEqualStr, sha256 } from '../utils/crypto';
import { recordAudit } from '../utils/audit';

/**
 * Admin guard for internal admin endpoints (03_DESIGN.md §3.7). Uses shared API
 * key(s) via the X-Admin-Key header. ADMIN_API_KEYS ("label:key,label2:key2")
 * gives each operator a distinct key for attribution + rotation; ADMIN_API_KEY is
 * the single-key fallback. Comparison is constant-time and evaluated against ALL
 * configured keys (no early-exit timing oracle). Every allow/deny is audited.
 * TODO: confirm with client — migrate to role-based admin user accounts.
 */
interface AdminKey {
  label: string;
  key: string;
}

function configuredKeys(): AdminKey[] {
  const keys: AdminKey[] = [];
  if (env.ADMIN_API_KEYS) {
    for (const pair of env.ADMIN_API_KEYS.split(',')) {
      const idx = pair.indexOf(':');
      if (idx <= 0) continue;
      const label = pair.slice(0, idx).trim();
      const key = pair.slice(idx + 1).trim();
      if (label && key) keys.push({ label, key });
    }
  }
  if (env.ADMIN_API_KEY) keys.push({ label: 'default', key: env.ADMIN_API_KEY });
  return keys;
}

export function adminGuard(req: Request, _res: Response, next: NextFunction): void {
  const keys = configuredKeys();
  if (keys.length === 0) {
    next(new AppError('ADMIN_DISABLED', 'Admin API is not configured', 503));
    return;
  }

  const provided = req.header('x-admin-key') ?? '';
  // Evaluate against every key so timing doesn't reveal which (if any) matched.
  let matched: AdminKey | null = null;
  for (const k of keys) {
    if (safeEqualStr(provided, k.key)) matched = k;
  }

  if (!matched) {
    recordAudit({
      event: 'admin.auth',
      actorType: 'admin',
      ip: req.ip,
      outcome: 'denied',
      metadata: {
        path: req.path,
        method: req.method,
        keyFingerprint: provided ? sha256(provided).slice(0, 8) : null,
      },
    });
    next(AppError.unauthorized('Invalid admin credentials', 'ADMIN_UNAUTHORIZED'));
    return;
  }

  req.admin = { label: matched.label };
  next();
}
