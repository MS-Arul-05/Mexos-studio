import { env, isProduction } from './env';
import { logger } from '../utils/logger';

export interface ConfigAuditInput {
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtGuestSecret: string;
  adminApiKey?: string;
  smsProvider: string;
  paymentGateway: string;
  paymentKeyId?: string;
  paymentKeySecret?: string;
  paymentWebhookSecret?: string;
  whatsappProvider: string;
  whatsappApiToken?: string;
  whatsappVerifyToken?: string;
  whatsappAppSecret?: string;
  metaToken?: string;
  corsOrigins?: string;
}

export interface ConfigAudit {
  errors: string[];
  warnings: string[];
}

const WEAK_SECRETS = new Set([
  '',
  'dev-access-secret',
  'dev-refresh-secret',
  'dev-guest-secret',
  'change-me-access-secret',
  'change-me-refresh-secret',
  'change-me-guest-secret',
]);

// NIST SP 800-131A: HMAC keys should be ≥ the hash output (256 bits / 32 bytes).
const MIN_SECRET_LEN = 32;

/** A secret is unsafe if it's a known placeholder, empty, or below the min length. */
function secretIssue(name: string, value: string): string | null {
  if (WEAK_SECRETS.has(value) || value.length < MIN_SECRET_LEN) {
    return `${name} is a placeholder or too short (need a strong ${MIN_SECRET_LEN}+ char secret).`;
  }
  return null;
}

/**
 * Pure config audit. `errors` are fatal in production (placeholder/weak secrets);
 * `warnings` flag stub/dev integrations that are acceptable but should be resolved
 * (Decision Log dependencies).
 */
export function auditConfig(cfg: ConfigAuditInput): ConfigAudit {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── Secrets: distinct, strong signing keys per audience ──
  for (const [name, value] of [
    ['JWT_ACCESS_SECRET', cfg.jwtAccessSecret],
    ['JWT_REFRESH_SECRET', cfg.jwtRefreshSecret],
    ['JWT_GUEST_SECRET', cfg.jwtGuestSecret],
  ] as const) {
    const issue = secretIssue(name, value);
    if (issue) errors.push(issue);
  }
  // Distinct secrets — reusing one key across audiences defeats the separation.
  const secrets = [cfg.jwtAccessSecret, cfg.jwtRefreshSecret, cfg.jwtGuestSecret];
  if (new Set(secrets).size !== secrets.length) {
    errors.push('JWT access/refresh/guest secrets must be distinct values.');
  }
  if (
    !cfg.adminApiKey ||
    cfg.adminApiKey === 'change-me-admin-key' ||
    cfg.adminApiKey.length < MIN_SECRET_LEN
  ) {
    errors.push(
      `ADMIN_API_KEY is unset, a placeholder, or too short (need ${MIN_SECRET_LEN}+ chars).`,
    );
  }

  // ── Fail-closed: production must have an explicit CORS allowlist ──
  if (!cfg.corsOrigins) {
    errors.push('CORS_ORIGINS is not set — refusing to allow all origins in production.');
  }

  // ── Payment gateway: if live keys are present, the webhook MUST be verifiable ──
  if (cfg.paymentKeyId) {
    if (!cfg.paymentKeySecret) {
      errors.push('PAYMENT_GATEWAY_KEY_ID set but PAYMENT_GATEWAY_KEY_SECRET is missing.');
    }
    if (!cfg.paymentWebhookSecret) {
      errors.push(
        'PAYMENT_GATEWAY_KEY_ID set but PAYMENT_WEBHOOK_SECRET is missing — webhooks would be unverifiable.',
      );
    }
  } else {
    warnings.push(
      `Payment keys missing for gateway "${cfg.paymentGateway}" — using stub. Set live keys.`,
    );
  }

  // ── WhatsApp: a live Business API integration MUST verify inbound webhooks ──
  if (cfg.whatsappProvider === 'meta') {
    if (!cfg.whatsappAppSecret) {
      errors.push(
        'WHATSAPP_PROVIDER=meta but WHATSAPP_APP_SECRET is missing — inbound webhooks would be unverified.',
      );
    }
    if (!cfg.whatsappApiToken)
      errors.push('WHATSAPP_PROVIDER=meta but WHATSAPP_API_TOKEN is missing.');
    if (!cfg.whatsappVerifyToken)
      errors.push('WHATSAPP_PROVIDER=meta but WHATSAPP_VERIFY_TOKEN is missing.');
  } else if (cfg.whatsappProvider === 'noop') {
    warnings.push(
      'WHATSAPP_PROVIDER=noop — status updates/invoices are not sent (awaiting Business API).',
    );
  }

  if (cfg.smsProvider === 'console') {
    warnings.push(
      'SMS_PROVIDER=console — OTPs are only logged, not sent. Configure a real provider.',
    );
  }
  if (!cfg.metaToken) {
    warnings.push('META_CONVERSIONS_API_TOKEN missing — server-side conversion events are no-op.');
  }

  return { errors, warnings };
}

/**
 * Run the audit at boot. Logs warnings always; throws in production if any fatal
 * config errors exist (fail-fast so we never launch with placeholder secrets).
 */
export function enforceProductionConfig(): void {
  const audit = auditConfig({
    jwtAccessSecret: env.JWT_ACCESS_SECRET,
    jwtRefreshSecret: env.JWT_REFRESH_SECRET,
    jwtGuestSecret: env.JWT_GUEST_SECRET,
    adminApiKey: env.ADMIN_API_KEY,
    smsProvider: env.SMS_PROVIDER,
    paymentGateway: env.PAYMENT_GATEWAY,
    paymentKeyId: env.PAYMENT_GATEWAY_KEY_ID,
    paymentKeySecret: env.PAYMENT_GATEWAY_KEY_SECRET,
    paymentWebhookSecret: env.PAYMENT_WEBHOOK_SECRET,
    whatsappProvider: env.WHATSAPP_PROVIDER,
    whatsappApiToken: env.WHATSAPP_API_TOKEN,
    whatsappVerifyToken: env.WHATSAPP_VERIFY_TOKEN,
    whatsappAppSecret: env.WHATSAPP_APP_SECRET,
    metaToken: env.META_CONVERSIONS_API_TOKEN,
    corsOrigins: env.CORS_ORIGINS,
  });

  for (const w of audit.warnings) logger.warn(`[config] ${w}`);

  if (isProduction && audit.errors.length > 0) {
    for (const e of audit.errors) logger.error(`[config] ${e}`);
    throw new Error(`Refusing to start in production with ${audit.errors.length} config error(s).`);
  }
  // In non-production, surface errors as warnings so devs are aware without blocking.
  if (!isProduction) {
    for (const e of audit.errors) logger.warn(`[config] (prod would fail) ${e}`);
  }
}
