import { randomUUID } from 'node:crypto';
import { env } from '../../../config/env';
import { hmacSha256Hex, safeEqualHex } from '../../../utils/crypto';
import type {
  CreateGatewayOrderArgs,
  GatewayOrder,
  PaymentProvider,
  WebhookEvent,
} from '../payment-provider';
import { parseRazorpayEvent } from './razorpay-format';

/**
 * Dev/test payment provider. Simulates the Razorpay contract so the full checkout +
 * webhook flow can be exercised without live keys. Webhook signatures use the same
 * HMAC-SHA256 scheme as Razorpay, so tests can compute a valid signature.
 * TODO: confirm with client — set Razorpay keys to switch to the real provider.
 */
// `||` so an empty PAYMENT_WEBHOOK_SECRET (e.g. blank in .env) also falls back.
const STUB_WEBHOOK_SECRET = env.PAYMENT_WEBHOOK_SECRET || 'stub_webhook_secret';

export const stubPaymentProvider: PaymentProvider = {
  name: 'stub',
  publicKey: 'stub_key',

  async createOrder(_args: CreateGatewayOrderArgs): Promise<GatewayOrder> {
    return { gatewayOrderId: `stub_order_${randomUUID()}` };
  },

  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
    if (!signature) return false;
    const expected = hmacSha256Hex(rawBody, STUB_WEBHOOK_SECRET);
    return safeEqualHex(expected, signature);
  },

  parseWebhookEvent(body: unknown): WebhookEvent {
    return parseRazorpayEvent(body);
  },
};
