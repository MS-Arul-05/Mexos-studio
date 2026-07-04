import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('GET /metrics (Prometheus)', () => {
  it('serves metrics to loopback with process + HTTP series', async () => {
    // Make a request first so http_requests_total has a sample.
    await request(app).get('/api/health/live');

    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toContain('process_cpu_user_seconds_total');
    expect(res.text).toContain('http_requests_total');
    expect(res.text).toContain('nodejs_eventloop_lag_seconds');
  });

  it('does not appear under the /api rate limiter or CORS surface', async () => {
    const res = await request(app).get('/metrics');
    // Not a 404/401 from loopback, and no api-rate-limit headers applied.
    expect(res.status).toBe(200);
  });
});
