import request from 'supertest';

// Mock the repository so the health check doesn't need a live DB in CI.
jest.mock('../src/modules/health/health.repository', () => ({
  healthRepository: { ping: jest.fn() },
}));

import { createApp } from '../src/app';
import { healthRepository } from '../src/modules/health/health.repository';

const pingMock = healthRepository.ping as jest.Mock;
const app = createApp();

describe('GET /api/health (Epic 1.4)', () => {
  it('returns 200 with status ok and db up when the DB is reachable', async () => {
    pingMock.mockResolvedValueOnce(true);

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: { status: 'ok', db: 'up' },
    });
    expect(typeof res.body.data.uptimeSeconds).toBe('number');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('returns 503 with db down when the DB is unreachable but the API is alive', async () => {
    pingMock.mockRejectedValueOnce(new Error('connection refused'));

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      success: true,
      data: { status: 'ok', db: 'down' },
    });
  });
});

describe('Unknown routes', () => {
  it('returns the standard 404 error envelope', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    });
  });
});
