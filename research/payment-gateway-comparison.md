# Payment Gateway Comparison & Recommendation (Task E / Epic 5.1)

**Purpose:** help the client pick and set up a live payment gateway (merchant account
has external lead time — start immediately). Deliverable, not code.

## Requirements (from PRD §8)

- Live gateway: cards, **UPI**, net banking, wallets (no COD-only).
- **Gateway-hosted** payment page (PCI-DSS scope stays with the gateway).
- Checkout session creation, **webhook-based** confirmation, refunds/retries,
  idempotent status updates.
- India-first (INR, strong UPI).

## Comparison

| Criteria        | **Razorpay** (recommended)                                         | PayU                                 | Stripe                            |
| --------------- | ------------------------------------------------------------------ | ------------------------------------ | --------------------------------- |
| UPI support     | Excellent (UPI, UPI intent, QR, autopay)                           | Excellent                            | Limited in India / evolving       |
| Payment methods | Cards, UPI, netbanking, wallets, EMI, pay-later                    | Cards, UPI, netbanking, wallets, EMI | Cards strong; India UPI weaker    |
| Hosted checkout | Yes (Razorpay Checkout / Payment Pages)                            | Yes                                  | Yes (Checkout)                    |
| Webhooks        | Reliable, signed (HMAC-SHA256), replayable                         | Signed webhooks                      | Excellent, signed                 |
| Docs / DX       | Very good, India-focused                                           | Adequate                             | Best-in-class (but India nuances) |
| Fees (standard) | ~2% cards/netbanking; **UPI often 0%** (subject to current policy) | ~2%, negotiable                      | ~2.9%+ intl-oriented pricing      |
| Settlement      | T+2 default (configurable)                                         | T+1/T+2                              | T+ varies                         |
| Onboarding time | Fast (a few business days w/ KYC)                                  | Moderate                             | Moderate; India entity needed     |
| India readiness | ✅ Built for India                                                 | ✅ India-native                      | ⚠️ Better for global              |

## Recommendation: **Razorpay**

- Strongest India/UPI coverage, hosted checkout keeps us out of PCI scope, signed
  webhooks with a clean HMAC scheme, and the best India-focused docs for a tight
  timeline. PayU is a viable alternate; Stripe is better suited to global-first.

## Integration notes (as built)

- Backend creates a Razorpay **Order** (`POST /v1/orders`, amount in **paise**),
  stores a `Payment` row, and returns `{gatewayOrderId, keyId, amount, currency}`
  for the frontend to open Razorpay Checkout. **We never take card data.**
- **Webhook** (`POST /api/payments/webhook`) verifies `X-Razorpay-Signature`
  (HMAC-SHA256 of the raw body with the webhook secret), then processes
  **idempotently** (keyed by gateway order/payment id). Only a verified
  `payment.captured` moves the order to `CONFIRMED`.
- Implemented behind a **`PaymentProvider` interface** with a `razorpay` adapter
  and a `stub` adapter (used when keys are absent) so dev/CI works without live keys.

## Action items for the client

1. Confirm **Razorpay** (or alternate) — Decision #3.
2. Start **merchant account KYC** now (external lead time).
3. Provide **test (sandbox) keys** first, then live keys via the secret manager.
4. Configure the **webhook URL** + webhook secret in the Razorpay dashboard
   (events: `payment.captured`, `payment.failed`).
