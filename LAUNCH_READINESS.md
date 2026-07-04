# Launch Readiness (Backend) — Step 12

Cross-cutting non-functional checklist (Tasks G) and the outstanding client dependencies
that must be resolved before/around the **10 July** launch.

## Hardening implemented

- **HTTPS:** HSTS + secure headers via `helmet`; `httpsRedirect` middleware redirects
  http→https when `ENFORCE_HTTPS=true` behind a proxy (`TRUST_PROXY=true`). Terminate TLS
  at the load balancer.
- **CORS allowlist:** `CORS_ORIGINS` (comma-separated). Unset = allow all (dev only); a
  production warning fires if left open.
- **Rate limiting:** global per-IP limiter across `/api` (`RATE_LIMIT_MAX` /
  `RATE_LIMIT_WINDOW_MIN`) plus the tighter OTP per-number (3/hr) + per-IP limits.
- **Secret/config audit:** `enforceProductionConfig()` runs at boot — **throws in
  production** on placeholder/weak `JWT_*` or `ADMIN_API_KEY`; warns on stub integrations.
- **Input validation** (Zod) + standard error envelope on every endpoint; secrets/OTPs/
  tokens redacted in logs.
- **Graceful shutdown:** SIGTERM/SIGINT drain the HTTP server then close the DB pool.
- **Health/readiness:** `GET /api/health` returns 200 (DB up) / 503 (DB down) for probes.

## Before deploy — env checklist

- [ ] Strong `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (16+ chars, random)
- [ ] `ADMIN_API_KEY` set to a strong value (not the placeholder)
- [ ] `DATABASE_URL` → managed Postgres
- [ ] `CORS_ORIGINS` = the frontend origin(s)
- [ ] `TRUST_PROXY=true`, `ENFORCE_HTTPS=true`
- [ ] Secrets stored in the hosting provider's secret manager — never in a committed file
- [ ] `npx prisma migrate deploy` run against the production DB

## Load testing (Epic 7.2)

- Tools: `k6` / `autocannon`. Target the read-heavy paths (`GET /api/products`,
  `/api/products/:slug`, `/api/offers`) at estimated ad-campaign peak concurrency.
- Pass criteria: p95 < 300ms on seeded data; no error-rate spike; stable memory.
- The API layer is stateless → scale horizontally behind the load balancer. Consider a
  short-TTL cache (Redis) for catalog reads and a job queue (BullMQ) for notifications
  (Architecture §8) if load testing shows pressure — deferred, not required for launch.

## Outstanding client dependencies (from the Decision Log — `01_PRD.md` §12)

| #   | Item                                                | Impact if unresolved                       | Current fallback              |
| --- | --------------------------------------------------- | ------------------------------------------ | ----------------------------- |
| 1   | Custom order pricing                                | INSTANT pricing uses a placeholder table   | `WHATSAPP_CONFIRMED` default  |
| 2   | Order status sync                                   | Manual admin only (no courier auto-sync)   | Manual `PATCH .../status`     |
| 3   | Payment gateway + merchant KYC + keys               | Real payments can't run (stub only)        | Stub provider (dev/CI)        |
| 4   | WhatsApp Business API approval + number + templates | No automated status/invoice sends          | Click-to-chat + noop provider |
| 5   | SMS/OTP provider keys                               | OTPs only logged, not delivered            | `console` provider            |
| —   | S3/R2 credentials                                   | Uploads/invoices not stored in real bucket | Stub storage                  |
| —   | Meta Business Manager + Pixel/CAPI token            | No server-side conversion events           | Noop events provider          |

All of the above are **pluggable via env** — supplying credentials switches each from the
dev fallback to the real integration with no code change.
