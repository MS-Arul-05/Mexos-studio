/**
 * D6: /api/v1 is the canonical versioned base path; /api stays as a
 * backward-compatible alias. Both mount the same router.
 */
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('API versioning (/api/v1 alias)', () => {
  it('serves the liveness probe on both base paths', async () => {
    const legacy = await request(app).get('/api/health/live');
    const v1 = await request(app).get('/api/v1/health/live');
    expect(legacy.status).toBe(200);
    expect(v1.status).toBe(200);
  });

  it('serves the OpenAPI contract on /api/v1/openapi.json', async () => {
    const res = await request(app).get('/api/v1/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toContain('T-Shirt');
    expect(Object.keys(res.body.paths).length).toBeGreaterThan(30);
    // Canonical + alias servers are both advertised.
    expect(res.body.servers.map((s: { url: string }) => s.url)).toEqual(['/api/v1', '/api']);
  });

  it('returns the same contract on the legacy /api base path', async () => {
    const legacy = await request(app).get('/api/openapi.json');
    expect(legacy.status).toBe(200);
    expect(legacy.body.openapi).toBe('3.0.3');
  });

  it('still 404s unknown routes under both prefixes', async () => {
    expect((await request(app).get('/api/v1/nope')).status).toBe(404);
    expect((await request(app).get('/api/nope')).status).toBe(404);
  });
});
