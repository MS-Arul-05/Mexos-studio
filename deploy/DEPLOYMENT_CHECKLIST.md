# Production Deployment Checklist

Final gate before (and record of) go-live. Every box is verifiable — no box is
"should be fine". Pairs with [GOING_LIVE.md](../GOING_LIVE.md) (per-integration
credential setup), [RUNBOOK.md](../RUNBOOK.md), and
[BACKUP_AND_DR.md](BACKUP_AND_DR.md).

```
Deployment record: date=____ operator=____ git_sha=____ image_tag=____
```

## 1. Infrastructure

- [ ] Host/orchestrator provisioned; `docker compose -f docker-compose.prod.yml config` validates with the real `.env.production`
- [ ] Resource limits confirmed (api: 1 CPU / 512MB; scale plan from the load-test knee)
- [ ] Redis service healthy (`redis-cli ping` via compose exec); AOF + noeviction active
- [ ] Postgres slow-query logging live: `CREATE EXTENSION IF NOT EXISTS pg_stat_statements;` executed once

## 2. DNS & TLS

- [ ] DNS A/AAAA → load balancer; TTL lowered before cutover (rollback agility)
- [ ] Certificates issued for the apex + api hostnames; auto-renewal timer verified (RUNBOOK #certificate-renewal)
- [ ] `curl -sI https://<host>/api/health/live` → 200 over TLS 1.2/1.3, HSTS header present
- [ ] HTTP→HTTPS redirect confirmed; `ENFORCE_HTTPS=true`, `TRUST_PROXY=true`

## 3. Secrets

- [ ] All secrets in the orchestrator secret store / `.env.production` (never in the image or git — repo has it gitignored)
- [ ] Distinct 32+ char values for JWT_ACCESS/REFRESH/GUEST secrets; ADMIN_API_KEYS labeled per admin
- [ ] PAYMENT_WEBHOOK_SECRET + WHATSAPP_APP_SECRET set (boot refuses to start without them)
- [ ] CORS_ORIGINS set to the exact frontend origins (fail-closed otherwise)
- [ ] Boot passes: container starts with NO `enforceProductionConfig` warnings in logs

## 4. Database

- [ ] Managed Postgres provisioned (provider: ______) with TLS (`sslmode=require`)
- [ ] `npx prisma migrate deploy` clean; `migrate status` shows zero pending
- [ ] Seed applied if launching with catalog (`npm run seed`)
- [ ] Connection budget: replicas × pool_size < max_connections (record: __ × __ < __)

## 5. Redis

- [ ] `REDIS_URL` set (rediss:// + auth for managed Redis)
- [ ] Verified in logs: no "using in-memory rate limiting" warning; "Notification worker started"
- [ ] Outage behavior spot-checked on staging: kill Redis → API still 200s (verified pattern, RUNBOOK #redis-outage)

## 6. Storage

- [ ] S3/R2 bucket private; credentials scoped to that bucket only
- [ ] Presigned upload round-trip tested (upload → attach → URL serves)
- [ ] Bucket lifecycle rule for orphaned uploads (objects never attached) — 30d suggested

## 7. Monitoring & Logging

- [ ] Prometheus scraping api + postgres-exporter + redis-exporter (`up == 1` for all three jobs)
- [ ] METRICS_TOKEN set; `/metrics` returns 404 without it from a non-loopback source
- [ ] Grafana dashboard imported; Alertmanager routes to the on-call channel (send a test alert)
- [ ] All alert rules loaded: `promtool check rules deploy/prometheus/alerts.yml`
- [ ] Logs shipping with `x-request-id` visible; redaction spot-checked (no OTPs/tokens in logs)

## 8. Backups & DR

- [ ] Provider backup/PITR configured per [BACKUP_AND_DR.md](BACKUP_AND_DR.md) (provider section: ______)
- [ ] `BackupTooOld` alert wired (managed-provider native alert OR textfile metric)
- [ ] **One restore drill completed and filed** — RPO ≤ 5min, RTO ≤ 30min measured (date: ______)

## 9. Load-test evidence

- [ ] Ladder run executed against this instance class per [LOAD_TEST_GUIDE.md](LOAD_TEST_GUIDE.md)
- [ ] Verdict PASS at the target tier; knee + replica plan recorded (file: load-test-summary.json, date: ______)

## 10. Security validation

- [ ] `npm audit --audit-level=high` clean; CI green on the deployed SHA (lint, typecheck, 122 tests, gitleaks, docker build)
- [ ] Security headers verified live: `curl -sI https://<host>/api/health/live` shows CSP, HSTS, nosniff, frame-deny, Permissions-Policy
- [ ] Admin endpoints return 401 without `x-admin-key`; `/api/*` 404s don't leak stack traces
- [ ] Payment webhook rejects an unsigned POST (400 INVALID_SIGNATURE)
- [ ] Rate limiting live: burst > limit from one IP → 429 with `RateLimit-*` headers

## 11. Final smoke (production, post-cutover)

- [ ] `/api/health/ready` 200; `/api/v1/openapi.json` serves
- [ ] Real OTP delivered to a test number; login → refresh → logout-all
- [ ] End-to-end paid test order (smallest real amount) → CONFIRMED + WhatsApp notification received → refund via gateway dashboard
- [ ] Error rate & p95 at baseline for 30 minutes → announce go-live

```
Sign-off: operator ______ reviewer ______ date ______
```
