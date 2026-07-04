jest.mock('../src/modules/whatsapp/whatsapp.repository', () => ({
  whatsappRepository: { log: jest.fn().mockResolvedValue({ id: 'log1' }) },
}));

import request from 'supertest';
import { createApp } from '../src/app';
import { whatsappRepository } from '../src/modules/whatsapp/whatsapp.repository';
import { hmacSha256Hex } from '../src/utils/crypto';

const repo = whatsappRepository as jest.Mocked<typeof whatsappRepository>;
const app = createApp();

const VERIFY_TOKEN = 'test_verify_token';
const APP_SECRET = 'test_app_secret';

describe('GET /api/whatsapp/webhook (Meta verify handshake, Epic 4.5)', () => {
  it('echoes hub.challenge when the verify token matches', async () => {
    const res = await request(app).get(
      `/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=CHALLENGE123`,
    );
    expect(res.status).toBe(200);
    expect(res.text).toBe('CHALLENGE123');
  });

  it('rejects a wrong verify token with 403', async () => {
    const res = await request(app).get(
      '/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=X',
    );
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('WEBHOOK_VERIFY_FAILED');
  });
});

describe('POST /api/whatsapp/webhook (inbound, Epic 4.5)', () => {
  const body = {
    object: 'whatsapp_business_account',
    entry: [
      {
        changes: [
          {
            value: {
              statuses: [
                { id: 'wamid.1', status: 'delivered', recipient_id: '919876543210' },
                { id: 'wamid.2', status: 'read', recipient_id: '919876543210' },
              ],
            },
          },
        ],
      },
    ],
  };

  const sign = (raw: string) => `sha256=${hmacSha256Hex(raw, APP_SECRET)}`;

  it('logs delivery statuses when the signature is valid', async () => {
    const raw = JSON.stringify(body);
    const res = await request(app)
      .post('/api/whatsapp/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', sign(raw))
      .send(raw);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ received: true, logged: 2 });
    expect(repo.log).toHaveBeenCalledTimes(2);
  });

  it('rejects an invalid signature with 401 and logs nothing', async () => {
    const raw = JSON.stringify(body);
    const res = await request(app)
      .post('/api/whatsapp/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', 'sha256=deadbeef')
      .send(raw);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_SIGNATURE');
    expect(repo.log).not.toHaveBeenCalled();
  });
});
