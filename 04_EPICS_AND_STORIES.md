# Epics & User Stories — Backend

Format: Epic → Stories, each with acceptance criteria. Scoped to Backend Engineer (Person 2) responsibilities.

---

## EPIC 1 — Backend Project Foundation

**Goal:** A running, configured backend project ready for feature development.

- **1.1** As a developer, I need a scaffolded Node.js/Express project with folder structure, linting, and env config, so feature work can start immediately.
  - AC: `npm run dev` starts server; `.env.example` documents all required vars; ESLint/Prettier configured.
- **1.2** As a developer, I need Docker Compose for local Postgres, so the whole team can run the same environment.
  - AC: `docker-compose up` starts Postgres; connection string works out of the box.
- **1.3** As a developer, I need centralized error handling and request validation middleware, so all endpoints behave consistently.
  - AC: invalid input returns standard error envelope with 400; unhandled errors return 500 without leaking stack traces in production.
- **1.4** As a developer, I need a health-check endpoint, so uptime/monitoring can verify the service is alive.
  - AC: `GET /api/health` returns `{status: "ok"}` and DB connectivity check.

## EPIC 2 — Database Schema

**Goal:** All data models needed for catalog, orders, users, payments, and WhatsApp are defined and migrated.

- **2.1** As a developer, I need Prisma schema for Users/Auth so OTP login can persist sessions.
  - AC: `User`, `OtpRequest`, `RefreshToken` models migrate cleanly; unique constraint on mobile number.
- **2.2** As a developer, I need Product/Category/Offer schema so the catalog can be populated and queried.
  - AC: Products support multiple images, variants (size/color/stock); offers support date ranges and coupon codes.
- **2.3** As a developer, I need Order/OrderItem/Payment schema unifying WEB and WHATSAPP sourced orders.
  - AC: `orderSource` field present; guest orders supported via `guestMobile`; totals stored as `Decimal`.
- **2.4** As a developer, I need CustomOrder schema capturing all requirement-form fields and file upload reference.
  - AC: supports draft → submitted → quoted → confirmed lifecycle; links to `Order` once confirmed.
- **2.5** As a developer, I need an append-only OrderStatusHistory table so every status change is auditable and can retrigger notifications.
  - AC: writing a new status always inserts a history row; never overwrites.
- **2.6** As a developer, I need seed scripts for categories/sample products, so frontend devs can develop against realistic data early.
  - AC: `npm run seed` populates at least 3 categories and 10 sample products.

## EPIC 3 — Authentication (Mobile OTP)

**Goal:** Passwordless, secure login flow matching the PRD's OTP requirement.

- **3.1** As a customer, I want to enter my mobile number and receive an OTP, so I can log in without a password.
  - AC: `POST /api/auth/otp/send` sends a 6-digit OTP via chosen SMS provider; rate-limited to 3 requests/hour/number.
- **3.2** As a customer, I want to enter the OTP and get logged in, so I can access my account.
  - AC: `POST /api/auth/otp/verify` validates OTP (expiry 5–10 min, single use), issues access + refresh tokens, creates `User` on first login.
- **3.3** As a customer, I want my session to persist reasonably, so I don't have to re-verify OTP every visit.
  - AC: refresh token valid 30 days, rotated on use, revocable on logout.
- **3.4** As a developer, I need an auth guard middleware, so protected routes reject invalid/expired tokens.
  - AC: expired/invalid token → 401 with standard error envelope.

## EPIC 4 — WhatsApp Integration

**Goal:** Orders and support can flow through WhatsApp, both simple (click-to-chat) and advanced (Business API).

- **4.1** As a customer, I want to click "Order via WhatsApp" and have my custom design summary prefilled, so the brand gets structured info.
  - AC: `GET /api/whatsapp/chat-link` returns a valid `wa.me` URL with URL-encoded order summary text.
- **4.2** As a backend engineer, I need to research and document WhatsApp Business API providers (Meta Cloud API vs BSPs), so the client can choose one with confidence.
  - AC: comparison doc covering cost, approval time, feature parity for automated status + invoice delivery (deliverable, not code).
- **4.3** As a system, I need to send automated order status updates via WhatsApp once Business API is approved, so customers stay informed without visiting the site.
  - AC: notification job triggered on `OrderStatusHistory` insert; pluggable provider interface so it can ship with a no-op provider pre-approval.
- **4.4** As a system, I need to deliver invoices via WhatsApp on successful payment.
  - AC: PDF invoice generated and sent as a media message once Business API is live; logged in `WhatsAppMessageLog`.
- **4.5** As a developer, I need an inbound WhatsApp webhook endpoint, so delivery receipts and verification handshakes are handled.
  - AC: `POST /api/whatsapp/webhook` verifies Meta's challenge on setup and logs delivery status updates.

## EPIC 5 — Payment Gateway

**Goal:** Real, secure online payments for both catalog and custom orders.

- **5.1** As a backend engineer, I need to research and recommend a payment gateway (Razorpay/PayU/Stripe), so the client can set up a merchant account early.
  - AC: comparison doc covering UPI support, fees, webhook reliability, India-readiness (deliverable).
- **5.2** As a customer, I want to pay securely at checkout, so my order is confirmed.
  - AC: `POST /api/payments/checkout` creates a gateway session; card data never touches our servers.
- **5.3** As a system, I need to confirm payment via webhook (not just client redirect), so orders aren't falsely marked paid.
  - AC: webhook signature verified; idempotent processing keyed by gateway payment ID; order status updates to `CONFIRMED` only on verified webhook.
- **5.4** As a customer, I want a clear retry path if my payment fails, so I don't have to restart checkout from scratch.
  - AC: `POST /api/payments/:id/retry` regenerates a session for the same order.

## EPIC 6 — API Structure & Core Commerce Endpoints

**Goal:** All endpoints required by the 8 frontend pages exist, documented, and tested.

- **6.1** As a frontend developer, I need product/category/offer read endpoints, so I can build Home, Offer, and Product Showcase pages.
  - AC: pagination, filtering (category/size/color/price), and search supported; response time <300ms on seeded data.
- **6.2** As a frontend developer, I need custom-order endpoints with file upload support, so I can build the Custom T-Shirt page.
  - AC: pre-signed upload flow works end-to-end with a real S3-compatible bucket.
- **6.3** As a frontend developer, I need order + tracking endpoints, so I can build My Account and Order Tracking pages.
  - AC: guest tracking (`orderId` + mobile) and authenticated history both return consistent order shape.
- **6.4** As a frontend developer, I need a Contact inquiry endpoint, so the Contact page form can submit.
  - AC: `POST /api/contact` persists inquiry and returns success confirmation.
- **6.5** As a marketer, I need server-side Meta Conversions API events dispatched alongside key actions, so ad performance is measurable.
  - AC: `ViewOffer`, `ViewProduct`, `SubmitCustomDesign`, `Purchase` events fire with a shared event ID for Pixel dedup.

## EPIC 7 — Non-Functional / Launch Readiness

- **7.1** As a business owner, I need HTTPS enforced everywhere, so customer data and payments are secure.
- **7.2** As a business owner, I need the API to handle traffic spikes from ad campaigns without downtime.
  - AC: load test at estimated peak concurrency; stateless API confirmed scalable behind load balancer.
- **7.3** As a developer, I need basic automated tests on auth, orders, and payment webhook handling, so regressions are caught before launch.
  - AC: critical-path integration tests pass in CI.

---

## Story Point / Priority Guide (for planning)

| Epic                              | Priority                               | Relative Size |
| --------------------------------- | -------------------------------------- | ------------- |
| 1. Foundation                     | P0                                     | S             |
| 2. Database Schema                | P0                                     | M             |
| 3. Auth (OTP)                     | P0                                     | M             |
| 6. API Structure (read endpoints) | P0                                     | M             |
| 5. Payment Gateway                | P0                                     | L             |
| 4. WhatsApp                       | P1 (click-to-chat P0, Business API P1) | M–L           |
| 7. Non-functional                 | P1                                     | M             |
