import { randomUUID } from 'node:crypto';
import { metaEventsProvider } from './index';
import type { MetaEvent, MetaEventName } from './events-provider';
import { logger } from '../utils/logger';

/**
 * High-level server-side event dispatch (Epic 6.5). Each method returns the shared
 * `eventId` (so the endpoint can hand it to the client Pixel for dedup) and fires
 * the CAPI event fire-and-forget — a slow/failed third-party call never blocks or
 * fails the request (keeps read endpoints under the <300ms budget).
 */
function dispatch(
  eventName: MetaEventName,
  eventId: string,
  customData?: Record<string, unknown>,
): void {
  const event: MetaEvent = {
    eventName,
    eventId,
    eventTimeSeconds: Math.floor(Date.now() / 1000),
    ...(customData ? { customData } : {}),
  };
  void metaEventsProvider.track(event).catch((err) => {
    logger.warn({ err, eventName, eventId }, 'CAPI event dispatch failed (non-fatal)');
  });
}

export const analyticsService = {
  viewOffer(): string {
    const eventId = randomUUID();
    dispatch('ViewOffer', eventId);
    return eventId;
  },

  viewProduct(product: { id: string; price: string; currency: string }): string {
    const eventId = randomUUID();
    dispatch('ViewProduct', eventId, {
      content_ids: [product.id],
      content_type: 'product',
      value: Number(product.price),
      currency: product.currency,
    });
    return eventId;
  },

  submitCustomDesign(customOrder: { id: string }): string {
    const eventId = randomUUID();
    dispatch('SubmitCustomDesign', eventId, { content_ids: [customOrder.id] });
    return eventId;
  },

  /**
   * Purchase uses a DETERMINISTIC event id (`purchase_<orderId>`) so the client
   * thank-you-page Pixel can derive the same id from the order id and dedupe,
   * even though this fires server-side from the payment webhook (no round-trip).
   */
  purchase(order: { id: string; value: number; currency: string }): string {
    const eventId = `purchase_${order.id}`;
    dispatch('Purchase', eventId, { value: order.value, currency: order.currency });
    return eventId;
  },
};
