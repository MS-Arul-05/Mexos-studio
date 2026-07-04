// k6 load / stress / spike / soak test for the T-shirt API.
//   Load:      k6 run deploy/load/load-test.js
//   Spike:     k6 run -e SCENARIO=spike deploy/load/load-test.js
//   Soak:      k6 run -e SCENARIO=soak deploy/load/load-test.js
//   1k users:  k6 run -e SCENARIO=stress1k deploy/load/load-test.js
//     — validates the "1,000 concurrent users" goal; run it against the composed
//       stack behind nginx (docker-compose.prod.yml), not `npm run dev`.
//   Target a real base URL + (optional) a seeded variant for write load:
//     k6 run -e BASE_URL=https://api.example.com -e VARIANT_ID=<uuid> deploy/load/load-test.js
//
// Thresholds encode the SLOs — the run FAILS (non-zero exit) if they're breached,
// so this doubles as a CI performance gate.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost:4000';
const VARIANT_ID = __ENV.VARIANT_ID || '';
const errors = new Rate('business_errors');

const SCENARIOS = {
  load: { executor: 'ramping-vus', startVUs: 0, stages: [
    { duration: '30s', target: 20 }, { duration: '2m', target: 20 }, { duration: '30s', target: 0 },
  ] },
  spike: { executor: 'ramping-vus', startVUs: 0, stages: [
    { duration: '10s', target: 5 }, { duration: '20s', target: 200 }, { duration: '20s', target: 5 }, { duration: '10s', target: 0 },
  ] },
  soak: { executor: 'constant-vus', vus: 15, duration: '30m' },
  // 1,000 concurrent users: ramp up, hold 5 minutes at full load, ramp down.
  // The SLO thresholds below still apply — a breach fails the run.
  stress1k: { executor: 'ramping-vus', startVUs: 0, stages: [
    { duration: '1m', target: 250 }, { duration: '2m', target: 1000 },
    { duration: '5m', target: 1000 }, { duration: '1m', target: 0 },
  ] },
  // Concurrency ladder: hold at each step to find the knee of the latency curve
  // (where does p95 start degrading?) — including 1500 = 1.5x the stated goal.
  ladder: { executor: 'ramping-vus', startVUs: 0, stages: [
    { duration: '1m', target: 100 },  { duration: '2m', target: 100 },
    { duration: '1m', target: 250 },  { duration: '2m', target: 250 },
    { duration: '1m', target: 500 },  { duration: '2m', target: 500 },
    { duration: '1m', target: 1000 }, { duration: '2m', target: 1000 },
    { duration: '1m', target: 1500 }, { duration: '2m', target: 1500 },
    { duration: '1m', target: 0 },
  ] },
};

export const options = {
  scenarios: { main: SCENARIOS[__ENV.SCENARIO || 'load'] },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1500'], // SLO: p95 < 500ms
    http_req_failed: ['rate<0.01'],                  // < 1% transport errors
    business_errors: ['rate<0.02'],
  },
};

export default function main() {
  // 1. Catalog read (cache-friendly hot path)
  const products = http.get(`${BASE}/api/products?limit=20`);
  check(products, { 'products 200': (r) => r.status === 200 }) || errors.add(1);

  // 2. Readiness probe (LB gate)
  check(http.get(`${BASE}/api/health/ready`), { 'ready 200|503': (r) => [200, 503].includes(r.status) });

  // 3. Optional write load: create a guest order for a seeded variant.
  if (VARIANT_ID) {
    const res = http.post(
      `${BASE}/api/orders`,
      JSON.stringify({ items: [{ variantId: VARIANT_ID, quantity: 1 }], guestMobile: '+919800000000' }),
      { headers: { 'Content-Type': 'application/json' } },
    );
    // 201 (created) or 409 (out of stock under contention) are both valid outcomes.
    check(res, { 'order 201|409': (r) => [201, 409].includes(r.status) }) || errors.add(1);
  }

  sleep(1);
}

// SLO verdict, printed at the end of every run and written to
// load-test-summary.json for the ops record (deploy/LOAD_TEST_GUIDE.md).
export function handleSummary(data) {
  const d = data.metrics.http_req_duration.values;
  const failRate = data.metrics.http_req_failed.values.rate;
  const rps = data.metrics.http_reqs.values.rate;
  const thresholdsPassed = Object.values(data.metrics).every(
    (m) => !m.thresholds || Object.values(m.thresholds).every((t) => t.ok),
  );
  const line = (k, v) => `  ${k.padEnd(18)} ${v}\n`;
  const text =
    `\n════ SLO VERDICT: ${thresholdsPassed ? '✅ PASS' : '❌ FAIL'} ════\n` +
    line('avg latency', `${d.avg.toFixed(1)} ms`) +
    line('p95 latency', `${d['p(95)'].toFixed(1)} ms  (SLO < 500)`) +
    line('p99 latency', `${d['p(99)'].toFixed(1)} ms  (SLO < 1500)`) +
    line('error rate', `${(failRate * 100).toFixed(2)} %  (SLO < 1%)`) +
    line('throughput', `${rps.toFixed(1)} req/s`) +
    line('requests', `${data.metrics.http_reqs.values.count}`) +
    `═══════════════════════════════\n`;
  return {
    stdout: text,
    'load-test-summary.json': JSON.stringify(
      { verdict: thresholdsPassed ? 'PASS' : 'FAIL', scenario: __ENV.SCENARIO || 'load',
        avg_ms: d.avg, p95_ms: d['p(95)'], p99_ms: d['p(99)'],
        error_rate: failRate, rps, requests: data.metrics.http_reqs.values.count },
      null, 2,
    ),
  };
}
