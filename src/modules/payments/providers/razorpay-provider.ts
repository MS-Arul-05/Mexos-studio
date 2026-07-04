import { env } from '../../../config/env';
import { hmacSha256Hex, safeEqualHex } from '../../../utils/crypto';
import { AppError } from '../../../utils/app-error';
import type {
  CreateGatewayOrderArgs,
  GatewayOrder,
  PaymentProvider,
  WebhookEvent,
} from '../payment-provider';
import { parseRazorpayEvent } from './razorpay-format';

const RAZORPAY_ORDERS_URL = 'https://api.razorpay.com/v1/orders';

/**
 * Real Razorpay adapter. Creates a gateway Order via the REST API and verifies
 * webhook signatures (HMAC-SHA256 of the raw body with the webhook secret). Only
 * constructed when key id + secret are present (see factory in ./index.ts).
 */
export function createRazorpayProvider(): PaymentProvider {
  const keyId = env.PAYMENT_GATEWAY_KEY_ID!;
  const keySecret = env.PAYMENT_GATEWAY_KEY_SECRET!;
  const webhookSecret = env.PAYMENT_WEBHOOK_SECRET ?? '';

  return {
    name: 'razorpay',
    publicKey: keyId,

    async createOrder(args: CreateGatewayOrderArgs): Promise<GatewayOrder> {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const res = await fetch(RAZORPAY_ORDERS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: args.amountInPaise,
          currency: args.currency,
          receipt: args.orderId,
          payment_capture: 1,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw AppError.internal(
          `Razorpay order creation failed: ${res.status} ${text}`,
          'GATEWAY_ERROR',
        );
      }
      const data = (await res.json()) as { id: string };
      return { gatewayOrderId: data.id };
    },

    verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
      if (!signature || !webhookSecret) return false;
      const expected = hmacSha256Hex(rawBody, webhookSecret);
      return safeEqualHex(expected, signature);
    },

    parseWebhookEvent(body: unknown): WebhookEvent {
      return parseRazorpayEvent(body);
    },
  };
}
