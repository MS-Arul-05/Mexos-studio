# Backup, PITR & Disaster Recovery

Provider-specific backup automation for the T-shirt API's PostgreSQL database, plus
the repeatable restore-verification drill. Pairs with [RUNBOOK.md](../RUNBOOK.md) §4
(DR runbook) and the `BackupTooOld` alert in [prometheus/alerts.yml](prometheus/alerts.yml).

**Targets (acceptance criteria — a drill FAILS if either is missed):**

| Objective               | Target       | Measured as                                                        |
| ----------------------- | ------------ | ------------------------------------------------------------------ |
| **RPO** (max data loss) | ≤ 5 minutes  | newest committed row recoverable vs. incident time                 |
| **RTO** (max downtime)  | ≤ 30 minutes | incident declared → `/api/health/ready` returns 200 on restored DB |

Redis needs no restore plan beyond AOF persistence (already configured:
`appendonly yes`, `noeviction`): it holds only rate-limit counters (TTL-bound,
safe to lose) and queued notifications (retryable; loss = missed notifications,
never money). **Postgres is the only system of record.**

---

## Task 1 — Provider configurations

Pick ONE. All satisfy RPO ≤ 5min via WAL-based PITR.

### A. AWS RDS PostgreSQL

- **PITR:** automated backups enable continuous WAL archiving. Set
  `BackupRetentionPeriod=7` (days) minimum. Restore granularity: 5 minutes.
- **Snapshots:** daily automated (retention window above) + take a **manual
  snapshot before every schema migration** (`aws rds create-db-snapshot`).
- **Restore:** `aws rds restore-db-instance-to-point-in-time
--source-db-instance-identifier tshirt-db --target-db-instance-identifier
tshirt-db-restore --restore-time <ISO8601>` → new instance; repoint
  `DATABASE_URL`.
- **Cost:** backup storage free up to DB size; cross-region copies billed.
  Single-AZ db.t4g.small ≈ $25/mo; Multi-AZ doubles it (recommended for HA).
- **Security:** enable storage encryption (KMS), `rds.force_ssl=1`, place in a
  private subnet, security group allows only the API hosts.

### B. Google Cloud SQL for PostgreSQL

- **PITR:** enable automated backups + **point-in-time recovery** (WAL retained
  7 days by default): `gcloud sql instances patch tshirt-db
--enable-point-in-time-recovery --retained-transaction-log-days=7`.
- **Snapshots:** daily automated backup window + `gcloud sql backups create`
  before migrations.
- **Restore:** `gcloud sql instances clone tshirt-db tshirt-db-restore
--point-in-time <ISO8601>` → clone instance; repoint `DATABASE_URL`.
- **Cost:** PITR log storage billed as disk; db-g1-small ≈ $30/mo + HA doubles.
- **Security:** CMEK optional, require SSL, private IP + Serverless VPC access;
  IAM database authentication where possible.

### C. Azure Database for PostgreSQL (Flexible Server)

- **PITR:** built-in — all servers do continuous WAL backup. Set retention 7–35
  days (`--backup-retention 7`). Restore granularity: any point in retention.
- **Restore:** `az postgres flexible-server restore --source-server tshirt-db
--name tshirt-db-restore --restore-time <ISO8601>` → new server.
- **Cost:** backup storage free up to provisioned size; B1ms ≈ $25/mo;
  zone-redundant HA ≈ 2×.
- **Security:** enforce TLS 1.2 (`require_secure_transport=ON`), private access
  (VNet), Entra ID auth for admins.

### D. Neon

- **PITR:** built-in "history retention" (restore window). Free tier: 6h —
  **insufficient for RPO/RTO targets**; set ≥ 7 days on a paid plan
  (Project settings → History retention).
- **Restore:** create a **branch** from a timestamp (Console or
  `neon branches create --parent tshirt-main@<ISO8601>`) → instant copy-on-write
  branch; repoint `DATABASE_URL` at the branch. Fastest RTO of all options
  (seconds, no data copy).
- **Cost:** usage-based; history retention billed as storage delta. Typically
  cheapest at this app's scale.
- **Security:** TLS enforced by default (`sslmode=require`), IP allowlist on
  paid plans; scoped API keys for branch automation.

### E. Supabase

- **PITR:** Pro plan + PITR add-on (WAL-G under the hood, per-2min granularity).
  Free tier has daily snapshots ONLY (RPO = 24h — **does not meet the 5min
  target; do not launch production on free tier**).
- **Restore:** Dashboard → Database → Backups → PITR → pick timestamp. Restores
  **in place** (overwrites!) — for drills, restore into a second project or use
  `pg_dump`/`pg_restore` against the drill instance instead.
- **Cost:** Pro $25/mo + PITR add-on (~$100/mo per 7-day window) — price it
  against RDS before committing.
- **Security:** TLS enforced; network restrictions on Pro; keep the service_role
  key out of this backend (it uses plain `DATABASE_URL`).

### F. Self-hosted PostgreSQL + pgBackRest (pairs with docker-compose.prod.yml)

- **Setup:** run pgBackRest on the DB host with an S3-compatible repo:
  ```ini
  # /etc/pgbackrest/pgbackrest.conf
  [global]
  repo1-type=s3
  repo1-s3-bucket=tshirt-db-backups
  repo1-s3-endpoint=s3.ap-south-1.amazonaws.com
  repo1-s3-region=ap-south-1
  repo1-retention-full=4          # 4 weekly fulls
  repo1-retention-diff=7
  repo1-cipher-type=aes-256-cbc   # encrypt at rest; key in secret store
  process-max=2
  [tshirt]
  pg1-path=/var/lib/postgresql/data
  ```
  Postgres must archive WAL (add to the compose `command:` list):
  `-c archive_mode=on -c archive_command='pgbackrest --stanza=tshirt archive-push %p'`
- **Schedule (cron):**
  ```cron
  0 2 * * 0   pgbackrest --stanza=tshirt --type=full backup && date +%s > /var/lib/node_exporter/textfile/backup_ok
  0 2 * * 1-6 pgbackrest --stanza=tshirt --type=diff backup && date +%s > /var/lib/node_exporter/textfile/backup_ok
  ```
  Expose the success timestamp for the `BackupTooOld` alert via node_exporter's
  textfile collector:
  `echo "backup_last_success_timestamp_seconds $(date +%s)" > .../backup.prom`
- **PITR restore:** `pgbackrest --stanza=tshirt --type=time
"--target=<ISO8601>" restore` into an empty data dir, start Postgres, it
  replays WAL to the target.
- **Cost:** S3 storage only (pennies at this DB size) — cheapest, but YOU are
  the DBA: test monthly without fail.
- **Security:** encrypt the repo (`repo1-cipher-type`), scoped IAM key with
  write-only + lifecycle rules, never store the cipher key beside the repo.

> **WAL archiving summary:** managed providers (A–E) archive WAL automatically
> when PITR is enabled; only option F requires configuring `archive_command`.

---

## Task 2 — Restore verification drill (run MONTHLY; record results)

Never drill against production. Restore into an **isolated instance** and point a
scratch API at it.

```
Drill record: date=____ operator=____ provider=____ restore_point=____
```

1. **[ ] Pick a restore point** 10–30 minutes in the past. Note the newest known
   order id created before that point (from admin or logs).
2. **[ ] Restore into isolation** using the provider procedure above (new
   instance/branch/clone — NEVER in place). ⏱ start the RTO clock at step 1.
3. **[ ] Schema integrity:** `DATABASE_URL=<restored> npx prisma migrate status`
   → must report all migrations applied, none pending/failed.
4. **[ ] Data integrity:**
   ```sql
   SELECT count(*) FROM "Order";                          -- plausible count
   SELECT id, status, total FROM "Order" ORDER BY "createdAt" DESC LIMIT 5;
   SELECT count(*) FROM "Payment" p JOIN "Order" o ON o.id = p."orderId"
     WHERE p.status='SUCCESS' AND o.status NOT IN ('CONFIRMED','IN_PRODUCTION','PACKED','SHIPPED','DELIVERED');
   -- ^ must be 0: every successful payment has a confirmed-or-later order
   SELECT count(*) FROM "ProductVariant" WHERE stock < 0;  -- must be 0 (CHECK)
   ```
   Confirm the noted order id from step 1 exists.
5. **[ ] Application startup:** run the API against the restored DB
   (`DATABASE_URL=<restored> PORT=4020 npm start`) → boot config audit passes,
   `GET /api/health/ready` = 200.
6. **[ ] Authentication:** `POST /api/auth/otp/send` (console SMS provider) →
   verify OTP → tokens issued; `POST /api/auth/refresh` rotates.
7. **[ ] Payment flow (stub gateway):** create an order (`POST /api/orders`) →
   stock decrements atomically; `POST /api/payments/checkout` returns a session;
   simulate the signed webhook → order CONFIRMED.
8. **[ ] Queue:** with a scratch Redis (`REDIS_URL` set), trigger an admin order
   status change → `notification_jobs_total{outcome="enqueued"}` then
   `delivered` increments. Without Redis → `inline` increments. Either passes.
9. **[ ] Measure & record:** RTO = step 1 → step 5 ready-200. RPO = restore
   point vs. newest recoverable row. **PASS requires RTO ≤ 30min, RPO ≤ 5min.**
10. **[ ] Rollback/teardown:** destroy the drill instance and scratch API;
    confirm production `DATABASE_URL` was never touched (it never should be —
    the drill uses only copies).
11. **[ ] File the record** (date, timings, any deviation) in the ops log. A
    failed step = incident-priority follow-up, not a note.

**Real-incident rollback:** if a restore into production is ever required,
follow RUNBOOK §4 (provision from PITR → repoint `DATABASE_URL` → `prisma
migrate deploy` → redeploy → verify ready + one test order). Never down-migrate;
never restore in place while the old instance may still be needed for forensics.
