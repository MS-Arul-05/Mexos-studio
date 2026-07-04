import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import { seed } from '../prisma/seed';
import { signAccessToken } from '../src/utils/jwt';

/**
 * Integration tests for orders + tracking (Epic 6.3) against real Postgres.
 * Focus: the server recomputes totals from DB prices and never trusts the client.
 */
const app = createApp();

const GUEST_MOBILE = '+919800000006';
const USER_MOBILE = '+919800000007';

let variantId: string;
let unitPrice: number; // seeded price of classic-crew-neck (499.00)
let userId: string;
let userToken: string;
const createdOrderIds: string[] = [];

beforeAll(async () => {
  await seed();

  const variant = await prisma.productVariant.findFirstOrThrow({
    where: { product: { slug: 'classic-crew-neck' } },
    include: { product: true },
  });
  variantId = variant.id;
  unitPrice = Number(variant.product.price);

  const user = await prisma.user.upsert({
    where: { mobileNumber: USER_MOBILE },
    update: {},
    create: { mobileNumber: USER_MOBILE, name: 'Order Tester' },
  });
  userId = user.id;
  userToken = signAccessToken({ sub: userId, mobileNumber: USER_MOBILE });
});

afterAll(async () => {
  await prisma.order.deleteMany({
    where: { OR: [{ guestMobile: GUEST_MOBILE }, { userId }] },
  });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

describe('POST /api/orders', () => {
  it('creates a guest order and recomputes the total server-side', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: [{ variantId, quantity: 2 }], guestMobile: GUEST_MOBILE });

    expect(res.status).toBe(201);
    createdOrderIds.push(res.body.data.id);

    const expectedSubtotal = (unitPrice * 2).toFixed(2);
    expect(res.body.data.subtotal).toBe(expectedSubtotal);
    expect(res.body.data.discount).toBe('0.00');
    expect(res.body.data.total).toBe(expectedSubtotal);
    expect(res.body.data.status).toBe('PENDING_PAYMENT');
    expect(res.body.data.statusHistory).toHaveLength(1);
    expect(res.body.data.items[0].unitPrice).toBe(unitPrice.toFixed(2));
    expect(typeof res.body.data.guestToken).toBe('string'); // guests get a tracking token
  });

  it('ignores client-sent amounts (server is authoritative)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        items: [{ variantId, quantity: 1 }],
        guestMobile: GUEST_MOBILE,
        subtotal: '1',
        total: '1',
        discount: '999',
      });

    expect(res.status).toBe(201);
    createdOrderIds.push(res.body.data.id);
    expect(res.body.data.total).toBe(unitPrice.toFixed(2)); // not '1'
    expect(res.body.data.discount).toBe('0.00'); // not '999'
  });

  it('applies a valid coupon discount computed server-side', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        items: [{ variantId, quantity: 2 }],
        guestMobile: GUEST_MOBILE,
        couponCode: 'LAUNCH20',
      });

    expect(res.status).toBe(201);
    createdOrderIds.push(res.body.data.id);

    const subtotal = unitPrice * 2;
    expect(res.body.data.subtotal).toBe(subtotal.toFixed(2));
    expect(res.body.data.discount).toBe((subtotal * 0.2).toFixed(2));
    expect(res.body.data.total).toBe((subtotal * 0.8).toFixed(2));
  });

  it('rejects a guest checkout with no guestMobile', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: [{ variantId, quantity: 1 }] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('GUEST_MOBILE_REQUIRED');
  });

  it('rejects an unknown variant', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        items: [{ variantId: '00000000-0000-4000-8000-000000000000', quantity: 1 }],
        guestMobile: GUEST_MOBILE,
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ITEM');
  });

  it('rejects an invalid coupon', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: [{ variantId, quantity: 1 }], guestMobile: GUEST_MOBILE, couponCode: 'NOPE' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_COUPON');
  });
});

describe('GET /api/orders/:id', () => {
  it('allows the guest to view via the guest-order token, and 404s without it', async () => {
    const create = await request(app)
      .post('/api/orders')
      .send({ items: [{ variantId, quantity: 1 }], guestMobile: GUEST_MOBILE });
    const { id, guestToken } = create.body.data as { id: string; guestToken: string };
    createdOrderIds.push(id);

    const withToken = await request(app).get(`/api/orders/${id}`).set('X-Guest-Token', guestToken);
    expect(withToken.status).toBe(200);
    expect(withToken.body.data.id).toBe(id);

    const withoutToken = await request(app).get(`/api/orders/${id}`);
    expect(withoutToken.status).toBe(404);
  });

  it('allows the owner to view their order', async () => {
    const create = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ items: [{ variantId, quantity: 1 }] });
    const id = create.body.data.id as string;
    createdOrderIds.push(id);

    const res = await request(app)
      .get(`/api/orders/${id}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
  });
});

describe('GET /api/orders/track', () => {
  it('finds a guest order by orderId + mobile', async () => {
    const create = await request(app)
      .post('/api/orders')
      .send({ items: [{ variantId, quantity: 1 }], guestMobile: GUEST_MOBILE });
    const id = create.body.data.id as string;
    createdOrderIds.push(id);

    const ok = await request(app).get(
      `/api/orders/track?orderId=${id}&mobile=${encodeURIComponent(GUEST_MOBILE)}`,
    );
    expect(ok.status).toBe(200);
    expect(ok.body.data.id).toBe(id);

    const wrong = await request(app).get(
      `/api/orders/track?orderId=${id}&mobile=${encodeURIComponent('+919800000099')}`,
    );
    expect(wrong.status).toBe(404);
  });
});

describe('GET /api/account/orders', () => {
  it('returns the authenticated user history and rejects anonymous access', async () => {
    const anon = await request(app).get('/api/account/orders');
    expect(anon.status).toBe(401);

    const res = await request(app)
      .get('/api/account/orders')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20 });
    // At least the owner order created above should be present.
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
