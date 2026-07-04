# Production Operations Handbook

Operational procedures for running the T-shirt API in production. Pairs with
[`GOING_LIVE.md`](GOING_LIVE.md) (first-time cutover) and [`ARCHITECTURE.md`](ARCHITECTURE.md).

> Deploy targets are intentionally generic here — provider-specific manifests are
> generated once the hosting environment is chosen (see "Open infra decisions").

## 1. Service Level Objectives (SLOs)

| SLI             | SLO                      | Source metric                        |
| --------------- | ------------------------ | ------------------------------------ |
| Availability    | 99.9% monthly            | `up{job="tshirt-api"}`               |
| Latency (p95)   | < 500 ms                 | `http_request_duration_seconds`      |
| Error rate      | < 1% of requests are 5xx | `http_requests_total{status=~"5.."}` |
| Payment success | > 98% of attempts        | `payments_total{outcome}`            |

**Error budget:** 0.1% downtime ≈ 43 min/month. If burned, freeze feature deploys
and prioritize reliability work.

## 2. Deployment

- **Image:** [`Dockerfile`](Dockerfile) (multi-stage, non-root, healthcheck).
- **Migrations:** `prisma migrate deploy` runs on container start (forward-only).
  Migrations must be **backward compatible** (expand-then-contract) so a rolling
  deploy where old+new run together stays healthy.
- **Rolling update (default):** replicas cycle one at a time; readiness probe
  (`/api/health/ready`) gates traffic; `/api/health/live` gates restarts.
- **Blue/green or canary:** run the new version alongside old, shift a small % of
  traffic, watch `http_requests_total{status=~"5.."}` + p95 for 10–15 min, then cut over.
- **Zero downtime checklist:** DB migration is expand-only ✔ · readiness gates LB ✔ ·
  `SIGTERM` graceful shutdown drains in-flight (server.ts) ✔ · Redis limits shared ✔.

### Rollback

1. Redeploy the previous image tag (fastest; app is stateless).
2. **Do not** auto-run down-migrations. If the new release added a
   non-backward-compatible migration, roll back the schema by **restoring the
   pre-deploy DB snapshot** (see §4), not by reversing SQL.
3. Verify `/api/health/ready` = 200 and error rate returns to baseline.

## 3. Secrets & TLS

- Secrets come from the orchestrator's secret store / `.env.production` (never the image).
- Boot refuses to start on placeholder/weak secrets (`enforceProductionConfig`).
- TLS terminates at the edge ([`deploy/nginx.conf`](deploy/nginx.conf)); auto-renew via
  ACME/Let's Encrypt or the platform's managed certs. Rotate JWT/admin/webhook secrets
  quarterly (rolling: accept old+new during the window where feasible).

## 4. Backup & Disaster Recovery

> Requires a managed Postgres or a backup sidecar — **provider decision needed**.

- **Backups:** automated daily full + WAL archiving for **Point-In-Time Recovery**.
- **Retention:** 7 daily / 4 weekly / 3 monthly (tune to compliance).
- **Restore verification (monthly, mandatory):** restore the latest snapshot into a
  scratch instance, run `prisma migrate status` + a smoke read, record RTO.
- **RPO target:** ≤ 5 min (WAL). **RTO target:** ≤ 30 min (documented restore).
- **DR runbook:** (1) provision new DB from latest PITR; (2) point `DATABASE_URL` at
  it; (3) `prisma migrate deploy`; (4) redeploy API; (5) verify `/api/health/ready`
  - a test order; (6) post-incident review.

## 5. Capacity planning

- Each instance: 512MB / 1 vCPU (see `docker-compose.prod.yml` limits). Node is
  single-threaded — scale **horizontally** (more replicas) not vertically.
- Watch `nodejs_eventloop_lag_p99_seconds` and CPU; add replicas when p99 lag > 100ms
  sustained or CPU > 70%.
- Postgres connection budget: Prisma pool default ≈ `num_physical_cpus*2+1` per
  instance — ensure `replicas * pool_size < max_connections` (use PgBouncer if tight).
- Redis is provisioned in `docker-compose.prod.yml` and wired via `REDIS_URL` —
  shared rate limits + the notification queue work across replicas out of the box.
  If you move to managed Redis, keep `noeviction` (queue jobs must not be dropped).
- **1,000-concurrent-user validation:** `k6 run -e SCENARIO=stress1k -e BASE_URL=<edge>
deploy/load/load-test.js` against the composed stack. Thresholds encode the SLOs;
  a breach exits non-zero. Re-run after capacity-relevant changes.

## 6. On-call incident response

**Sev definitions:** SEV1 = outage/payment loss; SEV2 = degraded (high latency/errors);
SEV3 = minor. **Flow:** acknowledge alert → assess blast radius via Grafana → mitigate
(rollback/scale/disable feature) → communicate → fix → blameless post-mortem.

### Per-alert runbooks

#### api-instance-down

`up == 0`. Check orchestrator (crashloop? OOM?) and container logs. If boot fails,
suspect a config error — `enforceProductionConfig` logs the exact missing/weak var.
Roll back if a bad deploy.

#### high-error-rate

5xx > 5%. Grep logs by `x-request-id`; check DB reachability (`/api/health/ready`),
recent deploy, and dependency (gateway/storage) errors. Roll back if deploy-correlated.

#### high-latency

p95 > 1s. Check `nodejs_eventloop_lag`, DB slow queries (`pg_stat_statements` —
enabled in the prod compose; run `CREATE EXTENSION IF NOT EXISTS pg_stat_statements;`
once per database; statements > 500ms are also logged), and downstream latency.
Scale replicas; consider a read cache for catalog.

#### payment-failures

Failures > successes. Verify gateway status page, `PAYMENT_WEBHOOK_SECRET`, and that
the webhook URL is reachable. Signature failures → 401s in logs; check secret drift.
Payments are idempotent + stock is released on failure — no manual reconciliation for
failed attempts, but audit `AuditLog` for `payment.failed` clusters.

#### auth-brute-force

High `auth_attempts_total{outcome="failure"}`. Inspect `AuditLog` for source IPs;
tighten edge rate limits (`deploy/nginx.conf` `auth` zone) or block at WAF. OTP is
bcrypt-hashed + attempt-capped, so accounts aren't directly at risk.

#### rate-limit-storm

Sustained `rate_limit_trips_total`. Distinguish attack vs. a misbehaving client
(check IPs/keys). Raise limits only if legitimate; otherwise block upstream.

#### event-loop-lag

p99 lag > 200ms = CPU saturation. Add replicas; profile for sync hotspots; ensure
bcrypt rounds/PDF generation aren't blocking (they're already async/offloaded).

#### memory-pressure

RSS approaching the 512MB limit. Capture a heap snapshot; check for leaks
(unbounded caches). Restart the instance to mitigate; the orchestrator healthcheck
will cycle it.

#### notification-dlq

`notification_jobs_total{outcome="dead_letter"}` increasing — order-status/invoice
messages exhausted their 5 retries. Check the WhatsApp provider status + token
expiry (`WHATSAPP_API_TOKEN`), then inspect and replay from the failed set:

```
docker compose -f docker-compose.prod.yml exec redis redis-cli \
  LRANGE bull:notifications:failed 0 -1        # inspect job ids
```

Replay programmatically: `Queue('notifications').getFailed()` → `job.retry()`
(one-off script), or requeue after fixing the provider. Customer impact is
notification-only — orders/payments are unaffected (dispatch is decoupled).

## 6b. Operational procedures

#### redis-outage

Verified behavior (fault-injected): API keeps serving (rate limits fail open —
nginx edge zones still apply), notifications deliver inline within 2s, payments
unaffected. **Recovery is automatic** — ioredis reconnects; shared limits and
queueing resume without restart. Actions: confirm `RedisDown` alert, check the
container (`docker compose -f docker-compose.prod.yml ps redis`, `logs redis`),
restart if crashed (`up -d redis` — AOF replays state). Afterward check
`notification_queue_depth{state="failed"}` for jobs to replay (#notification-dlq).

#### database-outage

`/api/health/ready` → 503, LB stops routing (expected). Check the DB
(provider status page / `docker compose logs postgres`). Managed: fail over to
the standby (Multi-AZ/HA) or restore per [deploy/BACKUP_AND_DR.md](deploy/BACKUP_AND_DR.md).
Self-hosted: restart the container; if the volume is lost → PITR restore (§4).
The API needs no restart — readiness recovers on the next probe once the DB is back.
Afterward: audit `AuditLog` and `payments_total` for the gap window; gateway
webhooks retry automatically, so missed payment confirmations self-heal.

#### storage-outage

S3/R2 down affects ONLY design-file presign/attach (`FILE_*` errors) and invoice
delivery — orders and payments continue. No action usually required beyond
confirming provider status; failed invoice sends land in the notification DLQ
for replay. If prolonged, tell support staff to collect design files over
WhatsApp (the description field already captures the design intent).

#### node-crash / container-restart

The orchestrator healthcheck (`/api/health/live`) auto-restarts a dead
container; state is external (DB/Redis) so restart is always safe. In-flight
requests get connection resets — clients retry; payment webhooks are retried by
the gateway and are idempotent. Investigate WHY: `docker inspect` exit code,
last log lines, `ProcessMemoryHigh`/`EventLoopLagHigh` alerts preceding the
crash. Crash-looping = probably `enforceProductionConfig` refusing bad config —
the log names the exact variable.

#### certificate-renewal

Edge TLS terminates at nginx ([deploy/nginx.conf](deploy/nginx.conf)). With
certbot: `certbot renew` (systemd timer does this) → `nginx -s reload`
(zero-downtime). Verify: `openssl s_client -connect yourstore.com:443 | openssl
x509 -noout -dates`. Alert 14 days before expiry (via blackbox_exporter probe or
the platform's managed-cert expiry notice).

#### secret-rotation (quarterly, or immediately on suspicion)

Rolling-safe order, one secret at a time:

1. **ADMIN_API_KEYS** (zero-downtime by design): append `newlabel:newkey` to the
   list → deploy → distribute new key → remove old entry → deploy. Audit log
   attributes requests per label throughout.
2. **JWT_ACCESS_SECRET / JWT_GUEST_SECRET:** deploy new value — access tokens
   are 15m TTL, so users re-auth transparently via refresh within minutes.
   Rotating **JWT_REFRESH_SECRET** does not invalidate stored refresh tokens
   (they're opaque hashes), so it can rotate freely.
3. **PAYMENT_WEBHOOK_SECRET / WHATSAPP_APP_SECRET:** rotate in the provider
   dashboard first, update env, deploy — do it inside one deploy window;
   webhooks failing signature during the seconds between are retried by the
   gateway.
4. **DATABASE_URL / REDIS_URL passwords:** create the new credential
   provider-side, deploy, then revoke the old one.
   Never log secret values; the boot audit re-validates strength on every deploy.

#### scaling-api

Stateless — scale horizontally: `docker compose -f docker-compose.prod.yml up -d
--scale api=3` (or the orchestrator equivalent) behind the LB. Preconditions
(both already satisfied): Redis provisioned (shared rate limits) and
`replicas × prisma_pool < max_connections` (§5). Scale triggers: `ApiCpuHigh`,
`EventLoopLagHigh`, or p95 approaching SLO.

#### scaling-workers

Notification delivery currently runs in-process (worker concurrency 5 per
instance) — scaling API replicas scales workers with it, and BullMQ guarantees
each job is processed once across all instances. If job volume ever justifies
dedicated workers, run extra instances with the HTTP port unexposed — no code
change needed; the queue distributes work. Watch `notification_queue_depth{state="waiting"}`.

#### rolling-deployment

Covered in §2 — image build → `up -d` one replica at a time; readiness gates
traffic; migrations are expand-then-contract and run on container start.
**Verify after every deploy:** `/api/health/ready` 200, error rate at baseline
for 10–15 min, one synthetic order on staging.

#### rollback-deployment

§2 Rollback: redeploy the previous image tag (stateless, fast). Schema rollback
= snapshot restore per BACKUP_AND_DR.md, never down-migrations.

#### disaster-recovery

Full procedure in §4; provider-specific restore commands and the monthly drill
checklist live in [deploy/BACKUP_AND_DR.md](deploy/BACKUP_AND_DR.md). RPO ≤ 5min,
RTO ≤ 30min — measured by drill, not assumed.

## 7. Routine maintenance

- **Weekly:** review `npm audit` / Dependabot; check error-budget burn.
- **Monthly:** restore-verification drill (§4); rotate any near-expiry certs.
- **Quarterly:** secret rotation; dependency major-version review; capacity review.

## Open infra decisions (needed to generate provider-specific artifacts)

1. Orchestrator: Kubernetes / Docker Compose / PaaS → determines k8s/Helm vs compose.
2. Managed Postgres provider → backup/PITR + connection pooling specifics.
3. Monitoring stack: self-hosted Prometheus/Grafana (configs provided here) vs
   Datadog/Grafana Cloud → OTLP exporter + scrape auth differ.
4. CDN/WAF (e.g. Cloudflare) + expected traffic profile → cache + autoscale policy.
