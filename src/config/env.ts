import 'dotenv/config';
import { z } from 'zod';

/**
 * Central, validated environment config. Fail fast at boot if required vars are
 * missing/malformed rather than discovering it deep in a request handler.
 * (07_GUIDE.md §3: all secrets come from env, never hard-coded.)
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  // Hardening (Step 12)
  CORS_ORIGINS: z.string().optional(), // comma-separated allowlist; unset = allow all (dev)
  TRUST_PROXY: z.coerce.boolean().default(false), // true when behind a load balancer
  ENFORCE_HTTPS: z.coerce.boolean().default(false), // redirect http→https (behind proxy)
  RATE_LIMIT_WINDOW_MIN: z.coerce.number().int().positive().default(15),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  // Max time a request may take before we fail-securely with 503 (DoS guard).
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  // Optional: distributed rate-limit store (needs ioredis + rate-limit-redis).
  REDIS_URL: z.string().optional(),
  // Optional: bearer token guarding GET /metrics (unset → loopback-only).
  METRICS_TOKEN: z.string().optional(),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Auth / JWT (consumed in Step 3). Separate secrets per token audience so a
  // compromise of one signing key can't forge another (access vs guest). Refresh
  // tokens are opaque (random + hashed at rest), but the secret is still validated
  // to keep the config contract uniform.
  JWT_ACCESS_SECRET: z.string().min(1).default('dev-access-secret'),
  JWT_REFRESH_SECRET: z.string().min(1).default('dev-refresh-secret'),
  JWT_GUEST_SECRET: z.string().min(1).default('dev-guest-secret'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  JWT_GUEST_TTL: z.string().default('7d'), // shortened from 30d (MED-7)

  // Checkout shipping rule (storefront): flat fee below the free threshold.
  // Server-authoritative — the client-displayed fee is never trusted.
  SHIPPING_FEE: z.coerce.number().nonnegative().default(79),
  FREE_SHIPPING_THRESHOLD: z.coerce.number().nonnegative().default(999),

  // OTP
  OTP_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  OTP_MAX_PER_HOUR: z.coerce.number().int().positive().default(3),

  // SMS provider — console (dev), MSG91 or Twilio (production)
  SMS_PROVIDER: z.enum(['console', 'msg91', 'twilio']).default('console'),
  SMS_PROVIDER_API_KEY: z.string().optional(), // MSG91 authkey
  SMS_TEMPLATE_ID: z.string().optional(), // MSG91 flow template id
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(), // Twilio sender number, E.164

  // WhatsApp — TODO: confirm with client (Meta Cloud API vs BSP)
  WHATSAPP_PROVIDER: z.enum(['noop', 'meta', 'twilio', 'gupshup']).default('noop'),
  WHATSAPP_BUSINESS_NUMBER: z.string().default('+910000000000'),
  WHATSAPP_API_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(), // Meta webhook GET handshake
  WHATSAPP_APP_SECRET: z.string().optional(), // Meta webhook POST signature (X-Hub-Signature-256)
  WHATSAPP_STATUS_TEMPLATE: z.string().default('order_status_update'),
  WHATSAPP_GRAPH_VERSION: z.string().default('v21.0'),

  // Payment gateway — TODO: confirm with client (Razorpay default)
  PAYMENT_GATEWAY: z.enum(['razorpay', 'payu', 'stripe']).default('razorpay'),
  PAYMENT_GATEWAY_KEY_ID: z.string().optional(),
  PAYMENT_GATEWAY_KEY_SECRET: z.string().optional(),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),

  // Virus scan for user uploads — noop (accept all) until an engine is chosen
  // (clamav planned). A real provider failing/erroring REJECTS the file.
  VIRUS_SCAN_PROVIDER: z.enum(['noop', 'clamav']).default('noop'),

  // S3-compatible storage
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('ap-south-1'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  // Meta Conversions API
  META_PIXEL_ID: z.string().optional(),
  META_CONVERSIONS_API_TOKEN: z.string().optional(),

  // Admin API — TODO: replace shared key with role-based admin users when defined.
  // ADMIN_API_KEY is the single-key fallback; ADMIN_API_KEYS enables per-admin
  // attribution + rotation as "label:key,label2:key2".
  ADMIN_API_KEY: z.string().optional(),
  ADMIN_API_KEYS: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  // eslint-disable-next-line no-console
  console.error(`❌ Invalid environment configuration:\n${issues}`);
  throw new Error('Environment validation failed');
}

export const env = parsed.data;
export type Env = typeof env;

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
