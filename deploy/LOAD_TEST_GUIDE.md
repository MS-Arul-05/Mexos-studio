# Production Load-Test Execution Guide

How to produce the capacity evidence for the 1,000-concurrent-user goal using
[load/load-test.js](load/load-test.js). The script encodes the SLOs as k6
thresholds — **a breach exits non-zero and prints `SLO VERDICT: FAIL`**, so
pass/fail is automatic, not judged by eye.

## Prerequisites (all mandatory — otherwise the numbers are fiction)

1. **Target a production-like deployment**, never `npm run dev` and never
   localhost on a laptop: `docker compose -f docker-compose.prod.yml up -d`
   behind nginx on the real (or staging) host class.
2. **Seed data + write path:** `npm run seed`, then note a variant id
   (`SELECT id FROM "ProductVariant" LIMIT 1`) and give it ample stock
   (`UPDATE "ProductVariant" SET stock = 1000000 WHERE id = '<id>'`) so the
   order write path is exercised without exhausting inventory (409s are counted
   as valid contention outcomes, but a permanently empty variant tests nothing).
3. **Rate limits:** the app limiter (`RATE_LIMIT_MAX`, default 300/15min/IP) and
   the nginx `api` zone (20r/s/IP) will throttle a single-source load test long
   before real capacity. For the test window either raise them
   (`RATE_LIMIT_MAX=100000`, nginx `rate=2000r/s`) or run k6 from multiple
   source IPs (k6 cloud / distributed). **Record which you did.**
4. **Load generator sizing:** 1500 VUs needs ~4 CPUs / 4GB on the k6 machine and
   `ulimit -n 65535`. Run k6 from a SEPARATE machine than the API host.
5. **Monitoring up:** Prometheus + Grafana from `deploy/` scraping the API,
   postgres-exporter, and redis-exporter, so per-stage resource data is captured.

## Execution ladder

One command per tier — do NOT skip tiers; the goal is finding the knee, not
passing 1500 once:

```bash
BASE=https://staging.yourstore.com
for S in load spike stress1k ladder; do :; done   # available scenarios

k6 run -e BASE_URL=$BASE -e VARIANT_ID=<uuid> deploy/load/load-test.js                    # 20 VU baseline
k6 run -e BASE_URL=$BASE -e VARIANT_ID=<uuid> -e SCENARIO=ladder deploy/load/load-test.js # 100→250→500→1000→1500
```

The `ladder` scenario holds ~2 minutes at each of **100 / 250 / 500 / 1000 /
1500 VUs**. Each run ends with the automatic verdict block and writes
`load-test-summary.json`.

## Per-stage evidence to record

k6 reports latency/error/RPS (overall + per-stage via Grafana's time axis).
Capture the rest from Prometheus **for each stage window**:

| Metric                  | Source (PromQL)                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| Avg / p95 / p99 latency | `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[1m])) by (le))` (0.5/0.95/0.99) |
| Error rate              | `sum(rate(http_requests_total{status=~"5.."}[1m])) / sum(rate(http_requests_total[1m]))`                |
| Requests/s              | `sum(rate(http_requests_total[1m]))`                                                                    |
| API CPU                 | `rate(process_cpu_seconds_total{job="tshirt-api"}[1m])`                                                 |
| API memory              | `process_resident_memory_bytes`                                                                         |
| Event-loop lag          | `nodejs_eventloop_lag_p99_seconds`                                                                      |
| Postgres connections    | `sum(pg_stat_activity_count)` vs `pg_settings_max_connections`                                          |
| Postgres TPS            | `rate(pg_stat_database_xact_commit{datname="tshirt"}[1m])`                                              |
| Redis ops & memory      | `rate(redis_commands_processed_total[1m])`, `redis_memory_used_bytes`                                   |
| Queue depth             | `notification_queue_depth{state="waiting"}`                                                             |

Template (fill one row per stage, attach to the ops log with the summary JSON):

| VUs  | avg ms | p95 ms | p99 ms | err % | req/s | CPU | RSS MB | PG conns | Redis MB | queue | SLO |
| ---- | ------ | ------ | ------ | ----- | ----- | --- | ------ | -------- | -------- | ----- | --- |
| 100  |        |        |        |       |       |     |        |          |          |       |     |
| 250  |        |        |        |       |       |     |        |          |          |       |     |
| 500  |        |        |        |       |       |     |        |          |          |       |     |
| 1000 |        |        |        |       |       |     |        |          |          |       |     |
| 1500 |        |        |        |       |       |     |        |          |          |       |     |

## Interpreting results

- **Pass criteria per stage:** p95 < 500ms, p99 < 1500ms, transport errors < 1%,
  business errors < 2% (encoded as thresholds — the exit code is the verdict).
- **The knee:** the first stage where p95 bends upward sharply. Capacity per
  instance = the stage _before_ the knee; plan replicas = peak-concurrency ÷
  that, +1 for headroom.
- **CPU-bound** (event-loop lag rises with CPU >85%): add API replicas
  (RUNBOOK §scaling-api). **DB-bound** (PG conns saturate / TPS flat while
  latency climbs): PgBouncer + check `pg_stat_statements`. **Limiter-bound**
  (429s dominate): revisit prerequisite 3 — the test, not the app, is limited.
- A single 512MB/1-CPU instance is NOT expected to pass 1500 VUs alone — the
  1500 tier exists to prove _graceful_ degradation (rising latency, no crashes,
  no 5xx storm) and to size the replica count. Record the replica count used.

## After the run

1. Commit `load-test-summary.json` results into the ops log (not the repo).
2. Restore any limiter overrides from prerequisite 3.
3. If run against staging with production sizing, note instance class + replica
   count next to the verdict — evidence is meaningless without the hardware it
   ran on.
4. Re-run after any capacity-relevant change (Node/Prisma major upgrade, new
   heavy endpoint, instance class change).
