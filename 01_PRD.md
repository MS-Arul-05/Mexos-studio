# PRD — Custom T-Shirt Brand E-Commerce Website

**Backend Engineering Edition** · Source: Client PRD v1.0 (prepared 1 July, target launch 10 July)

> This is the backend-relevant distillation of the client-facing PRD. It keeps every requirement that has a backend implication and strips pure UI/copy detail. Refer to the original PDF for visual/content specifics.

## 1. Project Summary

A responsive e-commerce web app for a custom T-shirt brand. Customers browse ready-made collections, design custom T-shirts, pay online, track orders, and can complete/support orders via WhatsApp. The site must be Meta Ads–ready from launch.

## 2. Business Objectives (Backend Implications)

| Objective                          | What Backend Must Enable                                                                |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| Sell online 24/7                   | Reliable product catalog API, cart/checkout, payment processing                         |
| Reduce order friction via WhatsApp | Orders created from WhatsApp must land in the same order system as web orders           |
| Scale with Meta Ads                | Server-side/CAPI event tracking, fast API responses, stable uptime under traffic spikes |

## 3. User Types & Backend-Relevant Needs

- **New Visitor** — needs fast, cached product/offer reads; no auth required to browse.
- **Returning Customer** — OTP login, session/token persistence, order history.
- **Custom Order Customer** — file upload handling, structured requirement capture, optional instant pricing logic.
- **Bulk/Corporate Buyer** — same custom order pipeline, but flagged for manual WhatsApp handling (larger quantity, negotiated pricing).

## 4. In Scope (Backend Owns)

1. Backend project setup (framework, environment config, folder structure)
2. Database schema (users, products, orders, custom orders, payments, WhatsApp logs)
3. Authentication (Mobile OTP based, session/JWT)
4. WhatsApp integration (click-to-chat links now; Business API research for automated status/invoice later)
5. Payment gateway integration (live gateway — Razorpay/PayU/Stripe candidate research + integration)
6. REST API structure serving the frontend for all 8 pages

## 5. Explicitly Out of Scope (v1)

- Multi-language / multi-currency
- Full inventory/warehouse management system
- Admin dashboard UI (API endpoints for admin actions are in scope; UI is not)
- Courier/shipping API integration (manual status update is the v1 default — see Decision Log)

## 6. Core Backend-Relevant Features by Page

| Page                | Backend Responsibility                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| Home                | Serve featured products, active offers                                                                |
| Offer Page          | CRUD for offers/banners (admin-editable, no-code updates), support multiple concurrent offers         |
| Product Showcase    | Product catalog CRUD, categories, filters, search, images, stock                                      |
| Custom T-Shirt Page | Requirements form persistence, file upload storage, WhatsApp handoff payload, optional pricing engine |
| Login               | Mobile OTP send/verify, session issuance                                                              |
| My Account          | Profile, order history, saved custom designs                                                          |
| Order Tracking      | Order status state machine, lookup by ID+mobile (guest) or by session                                 |
| Contact             | Inquiry form persistence, WhatsApp support link generation                                            |

## 7. WhatsApp Integration Requirements

| Use Case             | Technical Path                                                    | Backend Work                                                        |
| -------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| Order via WhatsApp   | Click-to-chat link (`wa.me`) with prefilled URL-encoded message   | Build message-template generator from order data                    |
| Customer Support     | Static click-to-chat, no backend needed                           | N/A                                                                 |
| Order Status Updates | WhatsApp Business API (Meta Cloud API or BSP like Twilio/Gupshup) | Webhook + template message sender, triggered by order status change |
| Invoice Delivery     | WhatsApp Business API, media message                              | PDF/invoice generation + delivery via API on payment success        |

**Note:** Automated updates/invoices require WhatsApp Business API approval (business verification). This has an external lead time — start immediately (see Decision Log & Plan).

## 8. Payment Gateway Requirements

- Must be a **live** gateway (cards, UPI, net banking, wallets) — no "pay on delivery only."
- Use gateway-hosted payment page (PCI-DSS scope stays with gateway, not our servers).
- Must support: checkout session creation, webhook-based payment confirmation, refund/retry handling, idempotent order status updates.
- Candidate: **Razorpay** (strong India/UPI support, good docs, webhooks) — confirm with client; PayU/Stripe as alternates.

## 9. Order Tracking Requirements

- Stages: `CONFIRMED → IN_PRODUCTION (custom only) → PACKED → SHIPPED → DELIVERED`
- Lookup by logged-in session OR guest lookup via Order ID + mobile number.
- Every status change triggers a WhatsApp notification (Section 7).
- v1 default: **manual status updates** via internal admin API (no courier API sync) — confirm with client.

## 10. Meta Ads Readiness (Backend Piece)

- Server-side conversion tracking (Meta Conversions API) as a complement/backup to client-side Pixel, keyed by order/event ID for deduplication.
- Events to emit: `ViewOffer`, `ViewProduct`, `SubmitCustomDesign`, `Purchase`.
- API responses must be fast (<300ms typical) to not hurt page speed scores.

## 11. Non-Functional Requirements (Backend)

- HTTPS everywhere; no card data touches our servers.
- OTP-based auth only, no stored passwords.
- Target API p95 latency low enough to keep page loads <3s on mobile.
- Stable uptime for ad-campaign traffic spikes — plan for horizontal scaling or a managed platform with autoscaling.
- All secrets (gateway keys, WhatsApp tokens, SMS provider keys) in environment config, never in code.

## 12. Open Decisions Owned/Co-Owned by Backend

1. Custom order pricing: instant (rule-based pricing table) vs. always WhatsApp-confirmed?
2. Order status updates: manual admin action vs. courier API sync?
3. Payment gateway: confirm Razorpay vs. alternative + merchant account timeline.
4. WhatsApp Business API provider: Meta Cloud API direct vs. BSP (Twilio/Gupshup/Interakt)?
5. SMS/OTP provider selection (e.g. MSG91, Twilio Verify, Firebase Auth OTP)?

## 13. Deadline Context

Target launch: **10 July**. Backend setup (project, schema, auth skeleton, API structure) should be substantially complete in the first 3–4 days to leave room for integration and QA (see `06_PLAN.md`).
