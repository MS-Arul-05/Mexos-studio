import { env } from '../../../config/env';
import { logger } from '../../../utils/logger';
import type { PaymentProvider } from '../payment-provider';
import { createRazorpayProvider } from './razorpay-provider';
import { stubPaymentProvider } from './stub-provider';

/**
 * Payment provider factory. Uses the real Razorpay adapter only when the gateway is
 * razorpay and key id + secret are configured; otherwise the stub (dev/test).
 */
function resolveProvider(): PaymentProvider {
  const hasRazorpayKeys = !!env.PAYMENT_GATEWAY_KEY_ID && !!env.PAYMENT_GATEWAY_KEY_SECRET;

  if (env.PAYMENT_GATEWAY === 'razorpay' && hasRazorpayKeys) {
    return createRazorpayProvider();
  }

  logger.warn(
    `Payment keys not set (gateway="${env.PAYMENT_GATEWAY}") — using stub payment provider (dev/test only).`,
  );
  return stubPaymentProvider;
}

export const paymentProvider: PaymentProvider = resolveProvider();
