# Mexos Studio — Custom T-Shirt E-Commerce

Full-stack custom T-shirt e-commerce: a production-grade REST API (this directory)
plus the Next.js storefront in [`frontend/`](frontend/). Catalog, custom-design
orders, server-authoritative checkout (online via Razorpay + COD), OTP auth,
coupons, WhatsApp notifications, and Meta Ads conversion tracking.

**Backend:** Node 20 · Express 4 · TypeScript (strict) · Prisma 5 · PostgreSQL 16 · Zod · Jest
**Frontend:** Next.js 16 · React 19 · Tailwind 4 · Zustand

> Engineering decisions live in [`DECISIONS.md`](DECISIONS.md). Runtime architecture is in
> [`ARCHITECTURE.md`](ARCHITECTURE.md). Going-live runbook: [`GOING_LIVE.md`](GOING_LIVE.md).

---

## Quick start

```bash
# 1. Start Postgres (Docker)
docker compose up -d                 # postgres on ${DB_HOST_PORT:-5544}

# 2. Configure env
cp .env.example .env                 # fill in secrets (see "Environment")

# 3. Install + migrate + seed
npm ci
npm run prisma:generate
npx prisma migrate deploy
npm run seed:storefront              # Mexos catalog (10 products, 317 variants, coupons)

# 4. Run the API
npm run dev                          # http://localhost:4000  (tsx watch)
curl localhost:4000/api/health/ready

# 5. Run the storefront (second terminal)
cd frontend && npm ci && npm run dev # http://localhost:3000
```

> **Seeds:** `npm run seed:storefront` loads the storefront catalog + working coupon
> codes (SUMMER40, WELCOME25, B2G1FREE, BULK100, COMBO500) and hides the test
> fixtures. `npm run seed` loads the test fixtures (the Jest suite runs it itself and
> re-activates them) — **re-run `seed:storefront` after `npm test`** to restore a
> clean shop catalog. Dev OTPs are printed to the API console (`SMS_PROVIDER=console`).

## Scripts

| Script                                       | Purpose                                                   |
| -------------------------------------------- | --------------------------------------------------------- |
| `npm run dev`                                | Watch-mode dev server (tsx)                               |
| `npm run build` / `npm start`                | Compile to `dist/` / run compiled server                  |
| `npm test`                                   | Jest suite (serial, real Postgres for integration suites) |
| `npm run lint` / `npm run typecheck`         | ESLint / `tsc --noEmit`                                   |
| `npm run seed`                               | Idempotent catalog seed                                   |
| `npm run prisma:generate` / `prisma:migrate` | Prisma client / dev migration                             |
| `npm run openapi`                            | Export the OpenAPI contract to `docs/openapi.json`        |

## API base path & contract

The canonical base path is **`/api/v1`**; `/api` remains a backward-compatible alias
(same router). The OpenAPI 3.0 contract — generated from the same Zod schemas that
validate requests, so it cannot drift — is served at `GET /api/v1/openapi.json` and
committed at [`docs/openapi.json`](docs/openapi.json) (import into Postman/Swagger UI).

## Environment

All config is validated at boot by [`src/config/env.ts`](src/config/env.ts) (Zod) — the process
**fails fast** on invalid config. In production, [`production-check.ts`](src/config/production-check.ts)
additionally **refuses to start** on placeholder/weak secrets, missing webhook secrets, or an
unset CORS allowlist. See [`.env.example`](.env.example) for the full list; the essentials:

| Group                     | Vars                                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Core                      | `NODE_ENV`, `PORT`, `DATABASE_URL`, `LOG_LEVEL`                                                                       |
| Hardening                 | `CORS_ORIGINS`, `TRUST_PROXY`, `ENFORCE_HTTPS`, `RATE_LIMIT_*`, `REQUEST_TIMEOUT_MS`                                  |
| Auth (distinct, 32+ char) | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_GUEST_SECRET`, TTLs                                                   |
| OTP/SMS                   | `SMS_PROVIDER` (`console`/`msg91`/`twilio`) + provider creds                                                          |
| Payments                  | `PAYMENT_GATEWAY`, `PAYMENT_GATEWAY_KEY_ID/SECRET`, `PAYMENT_WEBHOOK_SECRET`                                          |
| Storage                   | `S3_BUCKET/REGION/ACCESS_KEY/SECRET_KEY` (`S3_ENDPOINT` for R2)                                                       |
| WhatsApp                  | `WHATSAPP_PROVIDER`, `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` |
| Meta CAPI                 | `META_PIXEL_ID`, `META_CONVERSIONS_API_TOKEN`                                                                         |
| Admin/Ops                 | `ADMIN_API_KEY` or `ADMIN_API_KEYS` (`label:key,…`), `REDIS_URL`, `METRICS_TOKEN`                                     |

Generate a secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## API surface

Base path `/api`. Standard envelope: `{ success, data, meta? }` or `{ success:false, error:{ code, message } }`.

| Area                  | Endpoints                                                                                                         |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Health                | `GET /health` · `GET /health/live` · `GET /health/ready`                                                          |
| Metrics               | `GET /metrics` (token-guarded / loopback-only)                                                                    |
| Auth                  | `POST /auth/otp/send` · `/otp/verify` · `/refresh` · `/logout` · `/logout-all`                                    |
| Catalog               | `GET /products` · `/products/:slug` · `/categories` · `/offers`                                                   |
| Custom orders         | `POST /custom-orders` · `GET/PATCH /:id` · `POST /:id/upload-url` · `PATCH /:id/attach-file` · `POST /:id/submit` |
| Orders                | `POST /orders` · `GET /orders/:id` · `GET /orders/track`                                                          |
| Account               | `GET /account/me` · `GET /account/orders`                                                                         |
| Payments              | `POST /payments/checkout` · `POST /payments/:id/retry` · `POST /payments/webhook`                                 |
| WhatsApp              | `GET /whatsapp/chat-link` · `GET                                                                                  | POST /whatsapp/webhook` |
| Contact               | `POST /contact`                                                                                                   |
| Admin (`X-Admin-Key`) | products/offers CRUD · `PATCH /admin/orders/:id/status` · `GET /admin/custom-orders`                              |

## Testing

```bash
npm test              # 112 tests / 14 suites, serial (--runInBand)
```

Unit suites mock the repository layer; catalog/orders/security suites run against **real Postgres**
(including an 8-way concurrency race proving no oversell). See [`tests/`](tests/).

## Deployment

- **Container:** multi-stage [`Dockerfile`](Dockerfile) → non-root, healthcheck, `migrate deploy` on start.
- **Compose (prod):** [`docker-compose.prod.yml`](docker-compose.prod.yml) — read-only rootfs, `cap_drop: ALL`, resource limits, DB on private network.
- **Edge:** [`deploy/nginx.conf`](deploy/nginx.conf) — TLS, HSTS, rate zones, raw-body webhook passthrough.
- **CI:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — lint, typecheck, tests, `npm audit`, gitleaks, dependency-review.

Full runbook: [`GOING_LIVE.md`](GOING_LIVE.md). Architecture & diagrams: [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Security highlights

Server-authoritative money · atomic stock reservation (no oversell) · OTP (bcrypt, single-use,
rate-limited) · JWT access + rotating opaque refresh with reuse detection · coupon redemption caps ·
HMAC-verified webhooks (raw body, constant-time) · strict Helmet CSP · audit log · secret-strength
boot enforcement. Details: [`ARCHITECTURE.md#security-architecture`](ARCHITECTURE.md#security-architecture).
