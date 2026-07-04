/**
 * Pluggable payment gateway interface (Decision #3). A `razorpay` adapter is used
 * when credentials are present; otherwise a `stub` adapter lets dev/CI run the full
 * checkout + webhook flow without live keys.
 */
export interface CreateGatewayOrderArgs {
  orderId: string; // our internal order id (used as gateway receipt)
  amountInPaise: number; // gateway expects the smallest currency unit
  currency: string;
}

export interface GatewayOrder {
  gatewayOrderId: string;
}

export type NormalizedPaymentStatus = 'SUCCESS' | 'FAILED' | 'PENDING' | 'IGNORED';

export interface WebhookEvent {
  type: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  status: NormalizedPaymentStatus;
}

export interface PaymentProvider {
  readonly name: string;
  /** Public key id safe to hand to the frontend to open the hosted checkout. */
  readonly publicKey: string | null;
  createOrder(args: CreateGatewayOrderArgs): Promise<GatewayOrder>;
  /** True iff the raw request body matches the provider signature. */
  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean;
  /** Normalize a provider webhook body into a common event shape. */
  parseWebhookEvent(body: unknown): WebhookEvent;
}
