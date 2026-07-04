import type { WebhookEvent } from '../payment-provider';

/**
 * Parse a Razorpay webhook body into our normalized WebhookEvent.
 * Razorpay shape: { event, payload: { payment: { entity: { id, order_id, status } } } }.
 * Shared by the razorpay adapter and the stub adapter (which simulates the same shape).
 */
export function parseRazorpayEvent(body: unknown): WebhookEvent {
  const b = (body ?? {}) as {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
  };
  const type = b.event ?? 'unknown';
  const entity = b.payload?.payment?.entity;

  let status: WebhookEvent['status'] = 'IGNORED';
  if (type === 'payment.captured' || type === 'order.paid') status = 'SUCCESS';
  else if (type === 'payment.failed') status = 'FAILED';

  return {
    type,
    gatewayOrderId: entity?.order_id,
    gatewayPaymentId: entity?.id,
    status,
  };
}
