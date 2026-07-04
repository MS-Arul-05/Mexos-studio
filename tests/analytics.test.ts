jest.mock('../src/analytics/index', () => ({
  metaEventsProvider: {
    name: 'test',
    enabled: true,
    track: jest.fn().mockResolvedValue(undefined),
  },
}));

import { analyticsService } from '../src/analytics/analytics.service';
import { metaEventsProvider } from '../src/analytics/index';

const provider = metaEventsProvider as unknown as { track: jest.Mock };

// Let the fire-and-forget dispatch microtask settle.
const flush = () => new Promise((r) => setImmediate(r));

describe('analyticsService (Epic 6.5)', () => {
  it('viewProduct returns a fresh eventId and dispatches ViewProduct with content id', async () => {
    const eventId = analyticsService.viewProduct({
      id: 'prod-1',
      price: '499.00',
      currency: 'INR',
    });
    await flush();

    expect(typeof eventId).toBe('string');
    expect(eventId.length).toBeGreaterThan(10);
    const event = provider.track.mock.calls[0][0];
    expect(event).toMatchObject({ eventName: 'ViewProduct', eventId });
    expect(event.customData).toMatchObject({
      content_ids: ['prod-1'],
      value: 499,
      currency: 'INR',
    });
    expect(typeof event.eventTimeSeconds).toBe('number');
  });

  it('viewOffer dispatches ViewOffer', async () => {
    const eventId = analyticsService.viewOffer();
    await flush();
    expect(provider.track.mock.calls[0][0]).toMatchObject({ eventName: 'ViewOffer', eventId });
  });

  it('submitCustomDesign dispatches with the custom order id', async () => {
    const eventId = analyticsService.submitCustomDesign({ id: 'co-1' });
    await flush();
    const event = provider.track.mock.calls[0][0];
    expect(event).toMatchObject({ eventName: 'SubmitCustomDesign', eventId });
    expect(event.customData).toMatchObject({ content_ids: ['co-1'] });
  });

  it('purchase uses a DETERMINISTIC eventId derived from the order id', async () => {
    const eventId = analyticsService.purchase({ id: 'order-9', value: 998, currency: 'INR' });
    await flush();
    expect(eventId).toBe('purchase_order-9'); // client can derive the same id → dedup
    expect(provider.track.mock.calls[0][0]).toMatchObject({
      eventName: 'Purchase',
      eventId: 'purchase_order-9',
      customData: { value: 998, currency: 'INR' },
    });
  });

  it('never throws when the provider fails (fire-and-forget)', async () => {
    provider.track.mockRejectedValueOnce(new Error('graph down'));
    expect(() => analyticsService.viewOffer()).not.toThrow();
    await flush();
  });
});
