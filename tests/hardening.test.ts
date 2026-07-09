import request from 'supertest';
import { createApp } from '../src/app';
import { auditConfig, type ConfigAuditInput } from '../src/config/production-check';

const app = createApp();

// Distinct, 32+ char secrets and all live-integration secrets present.
const strongCfg = (): ConfigAuditInput => ({
  jwtAccessSecret: 'access-secret-0123456789abcdef-strong',
  jwtRefreshSecret: 'refresh-secret-0123456789abcdef-strong',
  jwtGuestSecret: 'guest-secret-0123456789abcdef-strong',
  adminApiKey: 'admin-key-0123456789abcdef-strong-value',
  otpProvider: 'whatsapp',
  paymentGateway: 'razorpay',
  paymentKeyId: 'rzp_live_x',
  paymentKeySecret: 'rzp_secret_x',
  paymentWebhookSecret: 'whsec_0123456789abcdef',
  whatsappProvider: 'meta',
  whatsappApiToken: 'wa_token',
  whatsappPhoneNumberId: 'wa_phone_id',
  whatsappVerifyToken: 'wa_verify',
  whatsappAppSecret: 'wa_app_secret',
  metaToken: 'tok',
  corsOrigins: 'https://shop.example.com',
});

describe('auditConfig (secret/config audit — hardened)', () => {
  it('passes a fully-configured production config with no errors/warnings', () => {
    const audit = auditConfig(strongCfg());
    expect(audit.errors).toHaveLength(0);
    expect(audit.warnings).toHaveLength(0);
  });

  it('flags placeholder/weak JWT + admin secrets as fatal errors', () => {
    const audit = auditConfig({
      ...strongCfg(),
      jwtAccessSecret: 'dev-access-secret',
      jwtRefreshSecret: 'short',
      adminApiKey: 'change-me-admin-key',
    });
    expect(audit.errors.join(' ')).toMatch(/JWT_ACCESS_SECRET/);
    expect(audit.errors.join(' ')).toMatch(/JWT_REFRESH_SECRET/);
    expect(audit.errors.join(' ')).toMatch(/ADMIN_API_KEY/);
  });

  it('requires JWT secrets to be distinct', () => {
    const shared = 'the-same-secret-0123456789abcdef-strong';
    const audit = auditConfig({
      ...strongCfg(),
      jwtAccessSecret: shared,
      jwtRefreshSecret: shared,
      jwtGuestSecret: shared,
    });
    expect(audit.errors.join(' ')).toMatch(/distinct/i);
  });

  it('fails closed when CORS_ORIGINS is missing in production config', () => {
    const audit = auditConfig({ ...strongCfg(), corsOrigins: undefined });
    expect(audit.errors.join(' ')).toMatch(/CORS_ORIGINS/);
  });

  it('requires payment webhook + key secrets when a live gateway key is set', () => {
    const audit = auditConfig({
      ...strongCfg(),
      paymentKeySecret: undefined,
      paymentWebhookSecret: undefined,
    });
    expect(audit.errors.join(' ')).toMatch(/PAYMENT_WEBHOOK_SECRET/);
    expect(audit.errors.join(' ')).toMatch(/PAYMENT_GATEWAY_KEY_SECRET/);
  });

  it('requires WhatsApp app/verify/token secrets when provider=meta', () => {
    const audit = auditConfig({
      ...strongCfg(),
      whatsappAppSecret: undefined,
      whatsappVerifyToken: undefined,
      whatsappApiToken: undefined,
    });
    expect(audit.errors.join(' ')).toMatch(/WHATSAPP_APP_SECRET/);
    expect(audit.errors.join(' ')).toMatch(/WHATSAPP_VERIFY_TOKEN/);
    expect(audit.errors.join(' ')).toMatch(/WHATSAPP_API_TOKEN/);
  });

  it('warns (not errors) on stub/dev integrations when secrets are strong', () => {
    const audit = auditConfig({
      ...strongCfg(),
      otpProvider: 'console',
      paymentKeyId: undefined,
      paymentKeySecret: undefined,
      paymentWebhookSecret: undefined,
      whatsappProvider: 'noop',
      whatsappAppSecret: undefined,
      whatsappVerifyToken: undefined,
      whatsappApiToken: undefined,
      metaToken: undefined,
    });
    expect(audit.errors).toHaveLength(0);
    expect(audit.warnings.length).toBeGreaterThanOrEqual(3);
  });
});

describe('security headers + health under hardening middleware', () => {
  it('serves health and sets security headers (helmet)', async () => {
    const res = await request(app).get('/api/health');
    // 200 (db up) or 503 (db down) — both acceptable; headers must be present.
    expect([200, 503]).toContain(res.status);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-request-id']).toBeDefined();
    // Strict CSP + Permissions-Policy present.
    expect(res.headers['content-security-policy']).toMatch(/default-src 'none'/);
    expect(res.headers['permissions-policy']).toBeDefined();
  });

  it('liveness probe is always 200 and dependency-free', async () => {
    const res = await request(app).get('/api/health/live');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });

  it('readiness probe reports DB reachability', async () => {
    const res = await request(app).get('/api/health/ready');
    expect([200, 503]).toContain(res.status);
    expect(['ready', 'not_ready']).toContain(res.body.data.status);
  });
});
