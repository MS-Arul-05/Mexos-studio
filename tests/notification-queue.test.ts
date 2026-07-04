/**
 * Notification dispatcher (G2). In test/dev (no Redis) it must fall back to
 * inline provider delivery, and a provider failure must NEVER propagate to the
 * caller (payment webhook / admin action must not fail because of a notification).
 */
jest.mock('../src/notifications', () => ({
  notificationProvider: {
    name: 'mock',
    supportsInvoice: true,
    sendOrderStatusUpdate: jest.fn().mockResolvedValue(undefined),
    sendInvoice: jest.fn().mockResolvedValue(undefined),
  },
}));

import { notificationProvider } from '../src/notifications';
import { notificationDispatcher, closeNotificationQueue } from '../src/jobs/notification-queue';

const provider = notificationProvider as jest.Mocked<typeof notificationProvider>;

describe('notificationDispatcher (inline fallback, no Redis)', () => {
  afterAll(async () => {
    await closeNotificationQueue();
  });

  beforeEach(() => jest.clearAllMocks());

  it('delivers order-status updates inline through the provider', async () => {
    await notificationDispatcher.sendOrderStatusUpdate({
      orderId: 'order-1',
      status: 'CONFIRMED',
      toNumber: '+919800000000',
    });
    expect(provider.sendOrderStatusUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-1', status: 'CONFIRMED' }),
    );
  });

  it('delivers invoices inline through the provider', async () => {
    await notificationDispatcher.sendInvoice({
      orderId: 'order-2',
      toNumber: '+919800000000',
      documentUrl: 'https://storage.example.com/inv.pdf',
      fileName: 'inv.pdf',
    });
    expect(provider.sendInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-2', fileName: 'inv.pdf' }),
    );
  });

  it('never throws when the provider fails (money path must not break)', async () => {
    provider.sendOrderStatusUpdate.mockRejectedValueOnce(new Error('provider down'));
    await expect(
      notificationDispatcher.sendOrderStatusUpdate({ orderId: 'order-3', status: 'CONFIRMED' }),
    ).resolves.toBeUndefined();
  });

  it('passes through the provider invoice capability', () => {
    expect(notificationDispatcher.supportsInvoice).toBe(true);
  });
});
