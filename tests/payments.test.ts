jest.mock('../src/modules/payments/payments.repository', () => ({
  paymentsRepository: {
    findById: jest.fn(),
    findByIdWithItems: jest.fn(),
    findByOrderId: jest.fn(),
    findByGatewayOrderId: jest.fn(),
    upsertForCheckout: jest.fn(),
    applySuccess: jest.fn(),
    applyFailed: jest.fn(),
    regenerate: jest.fn(),
  },
}));
jest.mock('../src/modules/orders/orders.repository', () => ({
  ordersRepository: { findById: jest.fn() },
}));

import request from 'supertest';
import { Prisma } from '@prisma/client';
import { createApp } from '../src/app';
import { paymentsRepository } from '../src/modules/payments/payments.repository';
import { ordersRepository } from '../src/modules/orders/orders.repository';
import { hmacSha256Hex } from '../src/utils/crypto';
import { signGuestOrderToken } from '../src/utils/jwt';

const payRepo = paymentsRepository as jest.Mocked<typeof paymentsRepository>;
const orderRepo = ordersRepository as jest.Mocked<typeof ordersRepository>;
const app = createApp();

const ORDER_ID = '22222222-2222-4222-8222-222222222222';
const PAYMENT_ID = '33333333-3333-4333-8333-333333333333';
const GW_ORDER = 'stub_order_abc';
const WEBHOOK_SECRET = 'test_webhook_secret';

const orderRecord = (overrides: Record<string, unknown> = {}) => ({
  id: ORDER_ID,
  userId: null,
  orderSource: 'WEB',
  status: 'PENDING_PAYMENT',
  subtotal: new Prisma.Decimal('998.00'),
  discount: new Prisma.Decimal('0.00'),
  total: new Prisma.Decimal('998.00'),
  currency: 'INR',
  shippingAddressId: null,
  guestMobile: '+919800000006',
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    {
      id: 'i1',
      variantId: 'v1',
      quantity: 2,
      productId: 'p1',
      name: 'x',
      size: 'L',
      color: 'Black',
      unitPrice: new Prisma.Decimal('499.00'),
    },
  ],
  statusHistory: [],
  payment: null,
  ...overrides,
});

const webhookBody = (event: string) => ({
  event,
  payload: { payment: { entity: { id: 'pay_123', order_id: GW_ORDER, status: 'captured' } } },
});

const signed = (body: object) => {
  const raw = JSON.stringify(body);
  return { raw, sig: hmacSha256Hex(raw, WEBHOOK_SECRET) };
};

const guestToken = signGuestOrderToken(ORDER_ID);

describe('POST /api/payments/checkout (Epic 5.2)', () => {
  it('creates a gateway session for a payable order (guest token)', async () => {
    orderRepo.findById.mockResolvedValue(orderRecord() as never);
    payRepo.upsertForCheckout.mockResolvedValue({ id: PAYMENT_ID } as never);

    const res = await request(app)
      .post('/api/payments/checkout')
      .set('X-Guest-Token', guestToken)
      .send({ orderId: ORDER_ID });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ paymentId: PAYMENT_ID, amount: 99800, currency: 'INR' });
    expect(res.body.data.gatewayOrderId).toBeDefined();
  });

  it('rejects an already-paid order with 409', async () => {
    orderRepo.findById.mockResolvedValue(orderRecord({ status: 'CONFIRMED' }) as never);
    const res = await request(app)
      .post('/api/payments/checkout')
      .set('X-Guest-Token', guestToken)
      .send({ orderId: ORDER_ID });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ORDER_ALREADY_PAID');
  });

  it('returns 404 without access (no guest token)', async () => {
    orderRepo.findById.mockResolvedValue(orderRecord() as never);
    const res = await request(app).post('/api/payments/checkout').send({ orderId: ORDER_ID });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/payments/webhook (Epic 5.3)', () => {
  it('confirms the order on a signed payment.captured event', async () => {
    payRepo.findByGatewayOrderId.mockResolvedValue({
      id: PAYMENT_ID,
      orderId: ORDER_ID,
      status: 'CREATED',
      order: { ...orderRecord() },
    } as never);
    payRepo.applySuccess.mockResolvedValue(undefined);

    const { raw, sig } = signed(webhookBody('payment.captured'));
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Razorpay-Signature', sig)
      .send(raw);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ received: true, handled: true });
    expect(payRepo.applySuccess).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid signature and does not touch the order', async () => {
    const { raw } = signed(webhookBody('payment.captured'));
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Razorpay-Signature', 'deadbeef')
      .send(raw);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_SIGNATURE');
    expect(payRepo.applySuccess).not.toHaveBeenCalled();
  });

  it('is idempotent — a already-SUCCESS payment is not re-processed', async () => {
    payRepo.findByGatewayOrderId.mockResolvedValue({
      id: PAYMENT_ID,
      orderId: ORDER_ID,
      status: 'SUCCESS',
      order: { ...orderRecord({ status: 'CONFIRMED' }) },
    } as never);

    const { raw, sig } = signed(webhookBody('payment.captured'));
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Razorpay-Signature', sig)
      .send(raw);

    expect(res.status).toBe(200);
    expect(res.body.data.handled).toBe(true);
    expect(payRepo.applySuccess).not.toHaveBeenCalled();
  });

  it('marks the order failed on payment.failed', async () => {
    payRepo.findByGatewayOrderId.mockResolvedValue({
      id: PAYMENT_ID,
      orderId: ORDER_ID,
      status: 'CREATED',
      order: { ...orderRecord() },
    } as never);
    payRepo.applyFailed.mockResolvedValue(undefined);

    const { raw, sig } = signed(webhookBody('payment.failed'));
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Razorpay-Signature', sig)
      .send(raw);

    expect(res.status).toBe(200);
    expect(payRepo.applyFailed).toHaveBeenCalledTimes(1);
  });

  it('acks but ignores a webhook for an unknown gateway order', async () => {
    payRepo.findByGatewayOrderId.mockResolvedValue(null);
    const { raw, sig } = signed(webhookBody('payment.captured'));
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Razorpay-Signature', sig)
      .send(raw);

    expect(res.status).toBe(200);
    expect(res.body.data.handled).toBe(false);
    expect(payRepo.applySuccess).not.toHaveBeenCalled();
  });
});

describe('POST /api/payments/:id/retry (Epic 5.4)', () => {
  it('regenerates a checkout session for a failed payment', async () => {
    payRepo.findByIdWithItems.mockResolvedValue({
      id: PAYMENT_ID,
      orderId: ORDER_ID,
      status: 'FAILED',
      order: { ...orderRecord({ status: 'PAYMENT_FAILED' }) },
    } as never);
    orderRepo.findById.mockResolvedValue(orderRecord({ status: 'PAYMENT_FAILED' }) as never);
    payRepo.regenerate.mockResolvedValue({ id: PAYMENT_ID } as never);

    const res = await request(app)
      .post(`/api/payments/${PAYMENT_ID}/retry`)
      .set('X-Guest-Token', guestToken)
      .send();

    expect(res.status).toBe(201);
    expect(res.body.data.gatewayOrderId).toBeDefined();
    expect(payRepo.regenerate).toHaveBeenCalledTimes(1);
  });

  it('rejects retry on an already-succeeded payment', async () => {
    payRepo.findByIdWithItems.mockResolvedValue({
      id: PAYMENT_ID,
      orderId: ORDER_ID,
      status: 'SUCCESS',
      order: { ...orderRecord({ status: 'CONFIRMED' }) },
    } as never);
    orderRepo.findById.mockResolvedValue(orderRecord({ status: 'CONFIRMED' }) as never);

    const res = await request(app)
      .post(`/api/payments/${PAYMENT_ID}/retry`)
      .set('X-Guest-Token', guestToken)
      .send();

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ORDER_ALREADY_PAID');
  });
});
