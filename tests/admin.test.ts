jest.mock('../src/modules/admin/admin.repository', () => ({
  adminRepository: {
    findProductById: jest.fn(),
    createProduct: jest.fn(),
    updateProduct: jest.fn(),
    softDeleteProduct: jest.fn(),
    findOfferById: jest.fn(),
    createOffer: jest.fn(),
    updateOffer: jest.fn(),
    deleteOffer: jest.fn(),
    setOrderStatus: jest.fn(),
    listCustomOrders: jest.fn(),
  },
}));
jest.mock('../src/modules/orders/orders.repository', () => ({
  ordersRepository: { findById: jest.fn() },
}));

import request from 'supertest';
import { Prisma } from '@prisma/client';
import { createApp } from '../src/app';
import { adminRepository } from '../src/modules/admin/admin.repository';
import { ordersRepository } from '../src/modules/orders/orders.repository';

const adminRepo = adminRepository as jest.Mocked<typeof adminRepository>;
const orderRepo = ordersRepository as jest.Mocked<typeof ordersRepository>;
const app = createApp();

const KEY = { 'X-Admin-Key': 'test_admin_key' };
const CAT_ID = '55555555-5555-4555-8555-555555555555';
const PROD_ID = '66666666-6666-4666-8666-666666666666';
const ORDER_ID = '77777777-7777-4777-8777-777777777777';

const productRecord = (o: Record<string, unknown> = {}) => ({
  id: PROD_ID,
  name: 'Tee',
  slug: 'tee',
  description: null,
  price: new Prisma.Decimal('499.00'),
  currency: 'INR',
  fabric: null,
  careInfo: null,
  categoryId: CAT_ID,
  isFeatured: false,
  isActive: true,
  createdAt: new Date(),
  category: { id: CAT_ID, name: 'Basics', slug: 'basics' },
  images: [],
  variants: [],
  ...o,
});

const orderRecord = (o: Record<string, unknown> = {}) => ({
  id: ORDER_ID,
  userId: null,
  orderSource: 'WEB',
  status: 'CONFIRMED',
  subtotal: new Prisma.Decimal('499.00'),
  discount: new Prisma.Decimal('0.00'),
  total: new Prisma.Decimal('499.00'),
  currency: 'INR',
  shippingAddressId: null,
  guestMobile: '+919800000006',
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [],
  statusHistory: [],
  payment: null,
  ...o,
});

describe('admin guard', () => {
  it('rejects requests with no admin key', async () => {
    const res = await request(app).get('/api/admin/custom-orders');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('ADMIN_UNAUTHORIZED');
  });

  it('rejects a wrong admin key', async () => {
    const res = await request(app).get('/api/admin/custom-orders').set('X-Admin-Key', 'nope');
    expect(res.status).toBe(401);
  });
});

describe('Admin products CRUD', () => {
  it('creates a product', async () => {
    adminRepo.createProduct.mockResolvedValue(productRecord() as never);
    const res = await request(app)
      .post('/api/admin/products')
      .set(KEY)
      .send({ name: 'Tee', slug: 'tee', price: 499, categoryId: CAT_ID });
    expect(res.status).toBe(201);
    expect(res.body.data.slug).toBe('tee');
    expect(res.body.data.price).toBe('499.00');
  });

  it('rejects invalid product input', async () => {
    const res = await request(app).post('/api/admin/products').set(KEY).send({ name: 'Tee' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('updates a product', async () => {
    adminRepo.findProductById.mockResolvedValue(productRecord() as never);
    adminRepo.updateProduct.mockResolvedValue(productRecord({ name: 'Tee 2' }) as never);
    const res = await request(app)
      .put(`/api/admin/products/${PROD_ID}`)
      .set(KEY)
      .send({ name: 'Tee 2' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Tee 2');
  });

  it('soft-deletes a product', async () => {
    adminRepo.findProductById.mockResolvedValue(productRecord() as never);
    adminRepo.softDeleteProduct.mockResolvedValue(productRecord({ isActive: false }) as never);
    const res = await request(app).delete(`/api/admin/products/${PROD_ID}`).set(KEY);
    expect(res.status).toBe(200);
    expect(res.body.data.isFeatured).toBe(false);
    expect(adminRepo.softDeleteProduct).toHaveBeenCalledWith(PROD_ID);
  });

  it('404s updating a missing product', async () => {
    adminRepo.findProductById.mockResolvedValue(null);
    const res = await request(app)
      .put(`/api/admin/products/${PROD_ID}`)
      .set(KEY)
      .send({ name: 'X' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });
});

describe('Admin offers CRUD', () => {
  it('creates an offer', async () => {
    adminRepo.createOffer.mockResolvedValue({
      id: 'o1',
      title: 'Sale',
      description: null,
      bannerImageUrl: null,
      couponCode: 'SALE',
      discountType: 'PERCENTAGE',
      discountValue: new Prisma.Decimal('10.00'),
      minOrderValue: null,
      startsAt: new Date('2026-07-01'),
      endsAt: new Date('2026-08-01'),
      isActive: true,
    } as never);

    const res = await request(app).post('/api/admin/offers').set(KEY).send({
      title: 'Sale',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      startsAt: '2026-07-01',
      endsAt: '2026-08-01',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.discountValue).toBe('10.00');
  });

  it('rejects an offer where endsAt <= startsAt', async () => {
    const res = await request(app).post('/api/admin/offers').set(KEY).send({
      title: 'Bad',
      discountType: 'FLAT',
      discountValue: 100,
      startsAt: '2026-08-01',
      endsAt: '2026-07-01',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PATCH /api/admin/orders/:id/status (Decision #2)', () => {
  it('transitions status, appends history, and returns the order', async () => {
    orderRepo.findById.mockResolvedValue(orderRecord({ status: 'CONFIRMED' }) as never);
    adminRepo.setOrderStatus.mockResolvedValue(
      orderRecord({
        status: 'SHIPPED',
        statusHistory: [
          { status: 'SHIPPED', note: null, changedBy: 'admin', createdAt: new Date() },
        ],
      }) as never,
    );

    const res = await request(app)
      .patch(`/api/admin/orders/${ORDER_ID}/status`)
      .set(KEY)
      .send({ status: 'SHIPPED', note: 'Dispatched via BlueDart' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('SHIPPED');
    // changedBy is now the admin key label (attribution) — 'default' for the single-key fallback.
    expect(adminRepo.setOrderStatus).toHaveBeenCalledWith(
      ORDER_ID,
      'SHIPPED',
      'Dispatched via BlueDart',
      'default',
    );
  });

  it('rejects transitioning a terminal (DELIVERED) order with 409', async () => {
    orderRepo.findById.mockResolvedValue(orderRecord({ status: 'DELIVERED' }) as never);
    const res = await request(app)
      .patch(`/api/admin/orders/${ORDER_ID}/status`)
      .set(KEY)
      .send({ status: 'SHIPPED' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ORDER_TERMINAL');
    expect(adminRepo.setOrderStatus).not.toHaveBeenCalled();
  });

  it('rejects a payment-driven status (not admin-settable)', async () => {
    const res = await request(app)
      .patch(`/api/admin/orders/${ORDER_ID}/status`)
      .set(KEY)
      .send({ status: 'PENDING_PAYMENT' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/admin/custom-orders', () => {
  it('returns the submitted/quoted queue by default', async () => {
    adminRepo.listCustomOrders.mockResolvedValue({
      items: [
        {
          id: 'co1',
          userId: null,
          baseType: 'polo',
          size: 'M',
          quantity: 1,
          color: null,
          printPlacement: null,
          printType: null,
          designDescription: null,
          uploadedFileUrl: null,
          deliveryDeadline: null,
          contactName: 'A',
          contactMobile: '+919876543210',
          pricingMode: 'WHATSAPP_CONFIRMED',
          quotedPrice: null,
          status: 'SUBMITTED',
          orderId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      total: 1,
    } as never);

    const res = await request(app).get('/api/admin/custom-orders').set(KEY);
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20, total: 1 });
    expect(res.body.data[0].status).toBe('SUBMITTED');
    expect(adminRepo.listCustomOrders).toHaveBeenCalledWith(['SUBMITTED', 'QUOTED'], 1, 20);
  });
});
