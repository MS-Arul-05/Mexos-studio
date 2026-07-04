/**
 * Storefront checkout rules: shipping fee below the free threshold, inline
 * shipping address snapshot, and COD confirmation at placement.
 *
 * SHIPPING_FEE must be set BEFORE src/config/env loads — Jest gives each test
 * file a fresh module registry, and require() below makes the ordering explicit
 * (setup-env.ts only defaults the var when unset).
 */
process.env.SHIPPING_FEE = '79';
process.env.FREE_SHIPPING_THRESHOLD = '999';

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
const request = require('supertest');
const { createApp } = require('../src/app');
const { prisma } = require('../src/config/prisma');
const { seed } = require('../prisma/seed');

const app = createApp();
const GUEST_MOBILE = '+919800000042';

const ADDRESS = {
  name: 'Fee Tester',
  phone: '+919800000042',
  line1: '42 Test Street',
  city: 'Chennai',
  state: 'TN',
  pincode: '600001',
};

let variantId: string;
let unitPrice: number;

beforeAll(async () => {
  await seed();
  const variant = await prisma.productVariant.findFirstOrThrow({
    where: { product: { slug: 'classic-crew-neck' } }, // 499.00 fixture
    include: { product: true },
  });
  variantId = variant.id;
  unitPrice = Number(variant.product.price);
});

afterAll(async () => {
  await prisma.order.deleteMany({ where: { guestMobile: GUEST_MOBILE } });
  await prisma.$disconnect();
});

describe('storefront checkout (shipping fee + COD + address)', () => {
  it('adds the flat fee below the free-shipping threshold', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        items: [{ variantId, quantity: 1 }], // 499 < 999
        guestMobile: GUEST_MOBILE,
        shippingAddress: ADDRESS,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.shippingFee).toBe('79.00');
    expect(res.body.data.total).toBe((unitPrice + 79).toFixed(2));
    expect(res.body.data.shippingAddress).toMatchObject({ name: 'Fee Tester', city: 'Chennai' });
    expect(res.body.data.paymentMethod).toBe('ONLINE');
    expect(res.body.data.status).toBe('PENDING_PAYMENT');
  });

  it('ships free at/above the threshold', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        items: [{ variantId, quantity: 3 }], // 1497 >= 999
        guestMobile: GUEST_MOBILE,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.shippingFee).toBe('0.00');
    expect(res.body.data.total).toBe((unitPrice * 3).toFixed(2));
  });

  it('confirms a COD order at placement (stock reserved, no gateway)', async () => {
    const before = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });

    const res = await request(app)
      .post('/api/orders')
      .send({
        items: [{ variantId, quantity: 1 }],
        guestMobile: GUEST_MOBILE,
        shippingAddress: ADDRESS,
        paymentMethod: 'COD',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.paymentMethod).toBe('COD');
    expect(res.body.data.status).toBe('CONFIRMED');
    expect(res.body.data.statusHistory[0].status).toBe('CONFIRMED');

    // Stock was still reserved atomically.
    const after = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(after.stock).toBe(before.stock - 1);

    // A COD order is not payable online.
    const pay = await request(app)
      .post('/api/payments/checkout')
      .set('X-Guest-Token', res.body.data.guestToken ?? '')
      .send({ orderId: res.body.data.id });
    expect([400, 401, 409]).toContain(pay.status);
  });
});
