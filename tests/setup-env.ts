// Runs before the test framework (jest `setupFiles`).
// Load .env first so DB-backed tests target the real (running) Postgres, then
// force NODE_ENV=test and provide safe fallbacks so env validation passes in CI
// even without a .env file. dotenv does not override already-set vars.
import { config } from 'dotenv';

config();

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent'; // force quiet test output regardless of .env
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/tshirt_test?schema=public';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret';
// Use || so an empty value from .env is also replaced (needed for HMAC/handshake).
process.env.PAYMENT_WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || 'test_webhook_secret';
process.env.WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'test_verify_token';
process.env.WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET || 'test_app_secret';
process.env.ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'test_admin_key';
// Shipping fee off in tests: existing money-path assertions compute totals as
// subtotal - discount. The fee rule has its own dedicated coverage.
process.env.SHIPPING_FEE = process.env.SHIPPING_FEE ?? '0';
process.env.FREE_SHIPPING_THRESHOLD = process.env.FREE_SHIPPING_THRESHOLD ?? '999';
