jest.mock('../src/modules/custom-orders/custom-orders.service', () => ({
  customOrdersService: { getById: jest.fn() },
}));
jest.mock('../src/modules/orders/orders.service', () => ({
  ordersService: { getById: jest.fn() },
}));

import request from 'supertest';
import { createApp } from '../src/app';
import { customOrdersService } from '../src/modules/custom-orders/custom-orders.service';
import { buildWaMeLink } from '../src/modules/whatsapp/chat-link';
import { AppError } from '../src/utils/app-error';

const coService = customOrdersService as jest.Mocked<typeof customOrdersService>;
const app = createApp();

const CUSTOM_ORDER_ID = '44444444-4444-4444-8444-444444444444';
const PHONE = '910000000000'; // WHATSAPP_BUSINESS_NUMBER default +910000000000 → digits

const sampleCustomOrder = {
  id: CUSTOM_ORDER_ID,
  userId: null,
  baseType: 'round-neck',
  size: 'L',
  quantity: 2,
  color: 'Black & White',
  printPlacement: 'front',
  printType: 'print',
  designDescription: 'Logo + text "Team #1"',
  uploadedFileUrl: 'https://stub-storage.local/files/x/logo.png',
  deliveryDeadline: null,
  contactName: 'Asha',
  contactMobile: '+919876543210',
  pricingMode: 'WHATSAPP_CONFIRMED',
  quotedPrice: null,
  status: 'DRAFT',
  orderId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('buildWaMeLink (unit — encoding correctness)', () => {
  it('normalizes the number to digits and URL-encodes the message', () => {
    const { url, phone, message } = buildWaMeLink('+91 00000-00000', 'Hi there & welcome!');
    expect(phone).toBe('910000000000');
    expect(url.startsWith('https://wa.me/910000000000?text=')).toBe(true);
    // spaces and & must be percent-encoded, not raw
    expect(url).not.toContain(' ');
    expect(url).toContain('%20');
    expect(url).toContain('%26'); // &
    // round-trips back to the original message
    const text = decodeURIComponent(url.split('?text=')[1]!);
    expect(text).toBe(message);
  });
});

describe('GET /api/whatsapp/chat-link (Epic 4.1)', () => {
  it('builds a wa.me link with a prefilled custom-order summary', async () => {
    coService.getById.mockResolvedValue(sampleCustomOrder as never);

    const res = await request(app).get(`/api/whatsapp/chat-link?customOrderId=${CUSTOM_ORDER_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.phone).toBe(PHONE);
    expect(res.body.data.url.startsWith(`https://wa.me/${PHONE}?text=`)).toBe(true);
    expect(res.body.data.url).not.toContain(' '); // fully encoded

    const text = decodeURIComponent(res.body.data.url.split('?text=')[1]);
    expect(text).toContain(`Ref: ${CUSTOM_ORDER_ID}`);
    expect(text).toContain('Base: round-neck | Size: L | Qty: 2');
    expect(text).toContain('Color: Black & White'); // special chars survive round-trip
    expect(text).toContain('Contact: Asha (+919876543210)');
    expect(coService.getById).toHaveBeenCalledWith(CUSTOM_ORDER_ID, { userId: undefined });
  });

  it('builds a generic support link when no id is given', async () => {
    const res = await request(app).get('/api/whatsapp/chat-link');
    expect(res.status).toBe(200);
    expect(res.body.data.url.startsWith(`https://wa.me/${PHONE}?text=`)).toBe(true);
    const text = decodeURIComponent(res.body.data.url.split('?text=')[1]);
    expect(text.toLowerCase()).toContain('help');
  });

  it('propagates a 404 when the referenced custom order is inaccessible', async () => {
    coService.getById.mockRejectedValue(
      AppError.notFound('Custom order not found', 'CUSTOM_ORDER_NOT_FOUND'),
    );

    const res = await request(app).get(`/api/whatsapp/chat-link?customOrderId=${CUSTOM_ORDER_ID}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CUSTOM_ORDER_NOT_FOUND');
  });

  it('rejects providing both customOrderId and orderId', async () => {
    const res = await request(app).get(
      `/api/whatsapp/chat-link?customOrderId=${CUSTOM_ORDER_ID}&orderId=${CUSTOM_ORDER_ID}`,
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
