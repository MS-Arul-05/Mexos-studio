import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import { seed } from '../prisma/seed';

/**
 * Integration tests for the catalog read APIs (Epic 6.1) against a real Postgres.
 * Seeds idempotent fixtures first so assertions are stable. Requires the DB to be
 * up (docker compose) and migrated.
 */
const app = createApp();

beforeAll(async () => {
  await seed();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/products', () => {
  it('returns a paginated list with the standard envelope + meta', async () => {
    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20 });
    expect(res.body.meta.total).toBeGreaterThanOrEqual(12);

    const product = res.body.data[0];
    expect(typeof product.price).toBe('string'); // money as string, never float
    expect(product).toHaveProperty('images');
    expect(product).toHaveProperty('variants');
    expect(product.category).toHaveProperty('slug');
  });

  it('paginates with page + limit', async () => {
    const res = await request(app).get('/api/products?page=1&limit=5');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 5 });
  });

  it('filters by category slug', async () => {
    const res = await request(app).get('/api/products?category=graphic-tees');
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(3);
    for (const p of res.body.data) {
      expect(p.category.slug).toBe('graphic-tees');
    }
  });

  it('filters by price range', async () => {
    const res = await request(app).get('/api/products?minPrice=800&maxPrice=1000');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const p of res.body.data) {
      expect(Number(p.price)).toBeGreaterThanOrEqual(800);
      expect(Number(p.price)).toBeLessThanOrEqual(1000);
    }
  });

  it('searches by name/description (case-insensitive)', async () => {
    const res = await request(app).get('/api/products?q=oversized');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  it('filters by variant size', async () => {
    const res = await request(app).get('/api/products?size=XXL');
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBeGreaterThan(0);
  });

  it('rejects an invalid limit with the validation envelope', async () => {
    const res = await request(app).get('/api/products?limit=500');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects maxPrice < minPrice', async () => {
    const res = await request(app).get('/api/products?minPrice=900&maxPrice=100');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/products/:slug', () => {
  it('returns product detail with images, variants and category', async () => {
    const res = await request(app).get('/api/products/classic-crew-neck');
    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe('classic-crew-neck');
    expect(res.body.data.variants.length).toBeGreaterThan(0);
    expect(res.body.data.category.slug).toBe('plain-basics');
    expect(typeof res.body.data.price).toBe('string');
    expect(typeof res.body.meta.eventId).toBe('string'); // ViewProduct dedup id (Epic 6.5)
  });

  it('returns 404 for an unknown slug', async () => {
    const res = await request(app).get('/api/products/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });
});

describe('GET /api/categories', () => {
  it('returns the category tree', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const slugs = res.body.data.map((c: { slug: string }) => c.slug);
    expect(slugs).toContain('graphic-tees');
    expect(res.body.data[0]).toHaveProperty('children');
  });
});

describe('GET /api/offers', () => {
  it('returns currently-active offers', async () => {
    const res = await request(app).get('/api/offers');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.meta.eventId).toBe('string'); // ViewOffer dedup id (Epic 6.5)
    const codes = res.body.data.map((o: { couponCode: string }) => o.couponCode);
    expect(codes).toContain('LAUNCH20');
    const offer = res.body.data.find((o: { couponCode: string }) => o.couponCode === 'LAUNCH20');
    expect(typeof offer.discountValue).toBe('string');
  });
});
