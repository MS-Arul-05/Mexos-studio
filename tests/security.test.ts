import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import { seed } from '../prisma/seed';
import { signAccessToken } from '../src/utils/jwt';

/**
 * Security-hardening integration tests (real Postgres):
 *  - inventory reservation is atomic → no oversell, stock never negative
 *  - CHECK (stock >= 0) constraint is enforced at the DB
 *  - coupon redemption is capped per user
 */
const app = createApp();

const GUEST = '+919800000123';
let categoryId: string;
let productId: string;
let variantId: string;
const cleanupOfferIds: string[] = [];

beforeAll(async () => {
  await seed();
  // Fully isolated category + product/variant so we never perturb catalog counts
  // in other suites (important when suites run in parallel).
  const stamp = Date.now();
  const category = await prisma.category.create({
    data: { name: 'Race Test Cat', slug: `race-test-cat-${stamp}` },
  });
  categoryId = category.id;
  const product = await prisma.product.create({
    data: {
      name: 'Race Test Tee',
      slug: `race-test-tee-${stamp}`,
      price: '100.00',
      category: { connect: { id: categoryId } },
      variants: { create: { size: 'M', color: 'Black', stock: 1, sku: `RACE-${stamp}` } },
    },
    include: { variants: true },
  });
  productId = product.id;
  variantId = product.variants[0]!.id;
});

afterAll(async () => {
  await prisma.order.deleteMany({ where: { guestMobile: GUEST } });
  await prisma.couponRedemption.deleteMany({ where: { offerId: { in: cleanupOfferIds } } });
  await prisma.offer.deleteMany({ where: { id: { in: cleanupOfferIds } } });
  await prisma.productVariant.deleteMany({ where: { productId } });
  await prisma.product.deleteMany({ where: { id: productId } });
  await prisma.category.deleteMany({ where: { id: categoryId } });
  await prisma.$disconnect();
});

describe('inventory reservation (CWE-362)', () => {
  it('never oversells under concurrent orders for the last unit', async () => {
    await prisma.productVariant.update({ where: { id: variantId }, data: { stock: 1 } });

    // Fire 8 concurrent orders for the single remaining unit.
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        request(app)
          .post('/api/orders')
          .send({ items: [{ variantId, quantity: 1 }], guestMobile: GUEST }),
      ),
    );

    const created = results.filter((r) => r.status === 201);
    const conflicts = results.filter((r) => r.status === 409);

    expect(created).toHaveLength(1); // exactly one winner
    expect(conflicts.length).toBe(7); // the rest get INSUFFICIENT_STOCK
    conflicts.forEach((r) => expect(r.body.error.code).toBe('INSUFFICIENT_STOCK'));

    const after = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(after.stock).toBe(0); // never negative, never oversold
  });

  it('enforces the stock >= 0 CHECK constraint at the database', async () => {
    await prisma.productVariant.update({ where: { id: variantId }, data: { stock: 0 } });
    await expect(
      prisma.productVariant.update({ where: { id: variantId }, data: { stock: { decrement: 1 } } }),
    ).rejects.toThrow();
  });
});

describe('coupon redemption caps', () => {
  it('rejects a second redemption by the same user', async () => {
    // Coupon capped to one redemption per user.
    const now = Date.now();
    const offer = await prisma.offer.create({
      data: {
        title: 'One Per User',
        couponCode: `ONCE-${now}`,
        discountType: 'PERCENTAGE',
        discountValue: '10.00',
        startsAt: new Date(now - 60_000),
        endsAt: new Date(now + 3_600_000),
        isActive: true,
        maxRedemptionsPerUser: 1,
      },
    });
    cleanupOfferIds.push(offer.id);

    // Give the race variant plenty of stock for this test.
    await prisma.productVariant.update({ where: { id: variantId }, data: { stock: 10 } });
    const userMobile = '+919800000124';
    const user = await prisma.user.upsert({
      where: { mobileNumber: userMobile },
      update: {},
      create: { mobileNumber: userMobile, name: 'Coupon Tester' },
    });
    const token = signAccessToken({ sub: user.id, mobileNumber: userMobile });
    const order = () =>
      request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [{ variantId, quantity: 1 }], couponCode: offer.couponCode });

    const first = await order();
    expect(first.status).toBe(201);

    const second = await order();
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('COUPON_ALREADY_USED');

    await prisma.order.deleteMany({ where: { userId: user.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });
  });
});
