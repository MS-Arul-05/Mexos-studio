jest.mock('../src/modules/custom-orders/custom-orders.repository', () => ({
  customOrdersRepository: {
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    updateIfDraft: jest.fn(),
  },
}));
jest.mock('../src/storage', () => ({
  storageProvider: {
    name: 'test',
    createUploadUrl: jest.fn(),
    publicUrl: (key: string) => `https://stub-storage.local/files/${key}`,
    ownsUrl: (url: string) => url.startsWith('https://stub-storage.local/files/'),
  },
}));
jest.mock('../src/storage/virus-scan', () => ({
  virusScanProvider: { name: 'test', scan: jest.fn().mockResolvedValue({ clean: true }) },
}));

import request from 'supertest';
import { Prisma } from '@prisma/client';
import { createApp } from '../src/app';
import { customOrdersRepository } from '../src/modules/custom-orders/custom-orders.repository';
import { storageProvider } from '../src/storage';
import { virusScanProvider } from '../src/storage/virus-scan';
import { signAccessToken, signGuestCustomOrderToken } from '../src/utils/jwt';

const repo = customOrdersRepository as jest.Mocked<typeof customOrdersRepository>;
const storage = storageProvider as unknown as { createUploadUrl: jest.Mock };
const scanner = virusScanProvider as unknown as { scan: jest.Mock };
const app = createApp();

const ID = '11111111-1111-4111-8111-111111111111';
const MOBILE = '+919876543210';
// Guest orders are capability-scoped: mutations require the signed token issued at create.
const GUEST_TOKEN_HEADER = 'X-Guest-Custom-Order-Token';
const guestToken = signGuestCustomOrderToken(ID);

const coRecord = (overrides: Record<string, unknown> = {}) => ({
  id: ID,
  userId: null,
  baseType: 'round-neck',
  size: 'L',
  quantity: 1,
  color: 'Black',
  printPlacement: 'front',
  printType: 'print',
  designDescription: 'Logo center',
  uploadedFileUrl: null,
  deliveryDeadline: null,
  contactName: 'Asha',
  contactMobile: MOBILE,
  pricingMode: 'WHATSAPP_CONFIRMED',
  quotedPrice: null,
  status: 'DRAFT',
  orderId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const validCreateBody = {
  baseType: 'round-neck',
  size: 'L',
  quantity: 2,
  contactName: 'Asha',
  contactMobile: MOBILE,
};

describe('POST /api/custom-orders', () => {
  it('creates a DRAFT custom order for a guest', async () => {
    repo.create.mockResolvedValue(coRecord({ quantity: 2 }) as never);

    const res = await request(app).post('/api/custom-orders').send(validCreateBody);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: 'DRAFT', id: ID });
    // Guests receive a signed capability token for follow-up requests.
    expect(typeof res.body.data.guestToken).toBe('string');
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it('attaches userId when a valid token is present', async () => {
    repo.create.mockResolvedValue(coRecord({ userId: 'user-1' }) as never);
    const token = signAccessToken({ sub: 'user-1', mobileNumber: MOBILE });

    const res = await request(app)
      .post('/api/custom-orders')
      .set('Authorization', `Bearer ${token}`)
      .send(validCreateBody);

    expect(res.status).toBe(201);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ user: { connect: { id: 'user-1' } } }),
    );
  });

  it('rejects a missing contactMobile with the validation envelope', async () => {
    const { contactMobile, ...bad } = validCreateBody;
    void contactMobile;
    const res = await request(app).post('/api/custom-orders').send(bad);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PATCH /api/custom-orders/:id', () => {
  it('updates a DRAFT order', async () => {
    repo.findById.mockResolvedValue(coRecord() as never);
    repo.update.mockResolvedValue(coRecord({ color: 'White' }) as never);

    const res = await request(app)
      .patch(`/api/custom-orders/${ID}`)
      .set(GUEST_TOKEN_HEADER, guestToken)
      .send({ color: 'White' });

    expect(res.status).toBe(200);
    expect(res.body.data.color).toBe('White');
  });

  it('returns 404 when a guest lacks the capability token', async () => {
    repo.findById.mockResolvedValue(coRecord() as never);

    const res = await request(app).patch(`/api/custom-orders/${ID}`).send({ color: 'White' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CUSTOM_ORDER_NOT_FOUND');
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('rejects editing a non-DRAFT order with 409', async () => {
    repo.findById.mockResolvedValue(coRecord({ status: 'SUBMITTED' }) as never);

    const res = await request(app)
      .patch(`/api/custom-orders/${ID}`)
      .set(GUEST_TOKEN_HEADER, guestToken)
      .send({ color: 'White' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CUSTOM_ORDER_NOT_EDITABLE');
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown id', async () => {
    repo.findById.mockResolvedValue(null);
    const res = await request(app).patch(`/api/custom-orders/${ID}`).send({ color: 'White' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CUSTOM_ORDER_NOT_FOUND');
  });

  it('returns 403 when a guest touches a user-owned order', async () => {
    repo.findById.mockResolvedValue(coRecord({ userId: 'someone-else' }) as never);
    const res = await request(app).patch(`/api/custom-orders/${ID}`).send({ color: 'White' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

describe('POST /api/custom-orders/:id/upload-url', () => {
  it('returns a pre-signed upload URL for a DRAFT order', async () => {
    repo.findById.mockResolvedValue(coRecord() as never);
    storage.createUploadUrl.mockResolvedValue({
      uploadUrl: 'https://stub-storage.local/upload/k?token=dev',
      fileUrl: 'https://stub-storage.local/files/k',
      key: 'k',
      expiresInSeconds: 900,
    });

    const res = await request(app)
      .post(`/api/custom-orders/${ID}/upload-url`)
      .set(GUEST_TOKEN_HEADER, guestToken)
      .send({ fileName: 'my design.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('uploadUrl');
    expect(res.body.data).toHaveProperty('fileUrl');
    const keyArg = storage.createUploadUrl.mock.calls[0][0].key as string;
    expect(keyArg).toContain(`custom-orders/${ID}/`);
    expect(keyArg).toContain('my-design.png'); // sanitized (space → dash)
  });

  it('rejects a disallowed content type', async () => {
    repo.findById.mockResolvedValue(coRecord() as never);
    const res = await request(app)
      .post(`/api/custom-orders/${ID}/upload-url`)
      .send({ fileName: 'x.exe', contentType: 'application/x-msdownload' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PATCH /api/custom-orders/:id/attach-file', () => {
  it('attaches an uploaded file URL', async () => {
    repo.findById.mockResolvedValue(coRecord() as never);
    const fileUrl = 'https://stub-storage.local/files/custom-orders/x/design.png';
    repo.updateIfDraft.mockResolvedValue(coRecord({ uploadedFileUrl: fileUrl }) as never);

    const res = await request(app)
      .patch(`/api/custom-orders/${ID}/attach-file`)
      .set(GUEST_TOKEN_HEADER, guestToken)
      .send({ uploadedFileUrl: fileUrl });

    expect(res.status).toBe(200);
    expect(res.body.data.uploadedFileUrl).toBe(fileUrl);
  });

  it('reconstructs the URL from a server-issued key scoped to the order', async () => {
    repo.findById.mockResolvedValue(coRecord() as never);
    const key = `custom-orders/${ID}/abc-design.png`;
    const expected = `https://stub-storage.local/files/${key}`;
    repo.updateIfDraft.mockResolvedValue(coRecord({ uploadedFileUrl: expected }) as never);

    const res = await request(app)
      .patch(`/api/custom-orders/${ID}/attach-file`)
      .set(GUEST_TOKEN_HEADER, guestToken)
      .send({ uploadedFileKey: key });

    expect(res.status).toBe(200);
    expect(res.body.data.uploadedFileUrl).toBe(expected);
  });

  it('rejects a third-party file URL (untrusted origin)', async () => {
    repo.findById.mockResolvedValue(coRecord() as never);
    const res = await request(app)
      .patch(`/api/custom-orders/${ID}/attach-file`)
      .set(GUEST_TOKEN_HEADER, guestToken)
      .send({ uploadedFileUrl: 'https://evil.example/malware.png' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_URL_NOT_ALLOWED');
  });

  it('rejects a key that belongs to a different order', async () => {
    repo.findById.mockResolvedValue(coRecord() as never);
    const res = await request(app)
      .patch(`/api/custom-orders/${ID}/attach-file`)
      .set(GUEST_TOKEN_HEADER, guestToken)
      .send({ uploadedFileKey: 'custom-orders/99999999-9999-4999-8999-999999999999/x.png' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_KEY_INVALID');
  });

  it('rejects a file flagged by the malware scanner', async () => {
    repo.findById.mockResolvedValue(coRecord() as never);
    scanner.scan.mockResolvedValueOnce({ clean: false, reason: 'EICAR' });

    const res = await request(app)
      .patch(`/api/custom-orders/${ID}/attach-file`)
      .set(GUEST_TOKEN_HEADER, guestToken)
      .send({ uploadedFileUrl: 'https://stub-storage.local/files/custom-orders/x/design.png' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_REJECTED');
    expect(repo.updateIfDraft).not.toHaveBeenCalled();
  });

  it('rejects the file when the scanner errors (fail-closed)', async () => {
    repo.findById.mockResolvedValue(coRecord() as never);
    scanner.scan.mockRejectedValueOnce(new Error('scanner down'));

    const res = await request(app)
      .patch(`/api/custom-orders/${ID}/attach-file`)
      .set(GUEST_TOKEN_HEADER, guestToken)
      .send({ uploadedFileUrl: 'https://stub-storage.local/files/custom-orders/x/design.png' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_REJECTED');
  });
});

describe('POST /api/custom-orders/:id/submit', () => {
  it('submits a WHATSAPP_CONFIRMED order → SUBMITTED with no price', async () => {
    repo.findById.mockResolvedValue(coRecord({ pricingMode: 'WHATSAPP_CONFIRMED' }) as never);
    repo.update.mockResolvedValue(coRecord({ status: 'SUBMITTED' }) as never);

    const res = await request(app)
      .post(`/api/custom-orders/${ID}/submit`)
      .set(GUEST_TOKEN_HEADER, guestToken)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('SUBMITTED');
    expect(res.body.data.quotedPrice).toBeNull();
    expect(repo.update).toHaveBeenCalledWith(ID, { status: 'SUBMITTED' });
  });

  it('submits an INSTANT order → QUOTED with a computed price', async () => {
    repo.findById.mockResolvedValue(
      coRecord({
        pricingMode: 'INSTANT',
        baseType: 'round-neck',
        quantity: 2,
        printType: 'print',
      }) as never,
    );
    repo.update.mockResolvedValue(
      coRecord({ status: 'QUOTED', quotedPrice: new Prisma.Decimal('798.00') }) as never,
    );

    const res = await request(app)
      .post(`/api/custom-orders/${ID}/submit`)
      .set(GUEST_TOKEN_HEADER, guestToken)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('QUOTED');
    expect(res.body.data.quotedPrice).toBe('798.00');
    // round-neck base 399 * qty 2 = 798
    const updateArg = repo.update.mock.calls[0]![1] as { quotedPrice: Prisma.Decimal };
    expect(updateArg.quotedPrice.toString()).toBe('798');
  });

  it('rejects submitting a non-DRAFT order with 409', async () => {
    repo.findById.mockResolvedValue(coRecord({ status: 'SUBMITTED' }) as never);
    const res = await request(app)
      .post(`/api/custom-orders/${ID}/submit`)
      .set(GUEST_TOKEN_HEADER, guestToken)
      .send();
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CUSTOM_ORDER_NOT_SUBMITTABLE');
  });
});
