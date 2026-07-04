# Tasks — Backend Engineer Checklist

Granular, checkable tasks derived from the Epics. Organized by the 6 responsibility areas assigned to Person 2 (Backend).

## A. Create Backend Project

- [ ] Initialize repo (Node.js 20, package.json, `.gitignore`)
- [ ] Choose & install framework (Express or NestJS)
- [ ] Set up folder structure per `02_ARCHITECTURE.md` Section 3
- [ ] Configure ESLint + Prettier
- [ ] Set up environment config loader (`dotenv` or equivalent) + `.env.example`
- [ ] Add `docker-compose.yml` for local Postgres
- [ ] Add `GET /api/health` endpoint (server + DB connectivity check)
- [ ] Set up centralized error-handling middleware + standard response envelope
- [ ] Set up request validation middleware (Zod/Joi)
- [ ] Set up logging (e.g., pino/winston) with request IDs
- [ ] Set up basic test runner (Jest/Vitest) + CI pipeline stub

## B. Database Schema

- [ ] Install Prisma, initialize `schema.prisma`
- [ ] Model: User, OtpRequest, RefreshToken, Address
- [ ] Model: Category, Product, ProductImage, ProductVariant
- [ ] Model: Offer
- [ ] Model: CustomOrder
- [ ] Model: Order, OrderItem, OrderStatusHistory
- [ ] Model: Payment
- [ ] Model: WhatsAppMessageLog
- [ ] Model: ContactInquiry
- [ ] Run and verify initial migration (`prisma migrate dev`)
- [ ] Write seed script (categories, sample products, one sample offer)
- [ ] Document schema decisions & confirm with team/client (pricing model, order status method — see Decision Log in `01_PRD.md`)

## C. Authentication Setup

- [ ] Select SMS/OTP provider (compare MSG91, Twilio Verify, Firebase Auth) — deliverable: short comparison note
- [ ] Implement `POST /api/auth/otp/send` (generate, hash, store OTP; call SMS provider)
- [ ] Implement rate limiting on OTP send (per number + per IP)
- [ ] Implement `POST /api/auth/otp/verify` (validate, issue JWT access + refresh tokens)
- [ ] Implement first-time user name capture on verify
- [ ] Implement `POST /api/auth/refresh`
- [ ] Implement `POST /api/auth/logout` (revoke refresh token)
- [ ] Implement auth guard middleware for protected routes
- [ ] Write tests: OTP expiry, invalid OTP, rate limit trigger, token refresh flow

## D. WhatsApp API Research/Setup

- [ ] Research Meta Cloud API direct vs BSPs (Twilio, Gupshup, Interakt) — cost, approval time, template message limits
- [ ] Produce comparison doc/recommendation for client decision
- [ ] Confirm WhatsApp Business number with client
- [ ] Implement click-to-chat link generator (`wa.me` + URL-encoded prefilled message) for Custom T-Shirt Page and Product Showcase
- [ ] Implement floating "Support" click-to-chat link (static, frontend-facing spec)
- [ ] (Pending approval) Set up WhatsApp Business API sandbox / test number
- [ ] (Pending approval) Implement inbound webhook (`POST /api/whatsapp/webhook`) incl. Meta verification handshake
- [ ] (Pending approval) Implement outbound notification job (order status → template message)
- [ ] (Pending approval) Implement invoice delivery via WhatsApp media message
- [ ] Design provider-agnostic notification interface so status-update code doesn't depend on approval timing
- [ ] Write tests: chat-link message formatting/URL-encoding correctness

## E. Payment Gateway Research

- [ ] Compare Razorpay, PayU, Stripe — UPI support, fees, webhook reliability, India readiness
- [ ] Produce recommendation doc for client
- [ ] Confirm chosen gateway + merchant account status/timeline with client
- [ ] Set up sandbox/test credentials once chosen
- [ ] Implement `POST /api/payments/checkout` (create gateway session/order)
- [ ] Implement `POST /api/payments/webhook` with signature verification
- [ ] Implement idempotent webhook processing (dedupe by gateway payment ID)
- [ ] Implement `POST /api/payments/:id/retry`
- [ ] Wire payment success → order status `CONFIRMED` → status history entry → notification job trigger
- [ ] Write tests: webhook signature validation, idempotency, failed payment handling

## F. Create API Structure

- [ ] Define OpenAPI/Swagger spec (or Postman collection) for all endpoints in `03_DESIGN.md`
- [ ] Implement product/category/offer read endpoints incl. filtering, search, pagination
- [ ] Implement custom-order endpoints (create/update/upload/submit)
- [ ] Implement pre-signed S3 upload URL generation
- [ ] Implement order creation + guest/authenticated order retrieval
- [ ] Implement order tracking lookup (`orderId` + mobile for guests)
- [ ] Implement account endpoints (profile, order history, saved custom designs)
- [ ] Implement contact inquiry endpoint
- [ ] Implement admin endpoints (product/offer CRUD, manual order status update)
- [ ] Implement Meta Conversions API event dispatch on key actions
- [ ] Write integration tests for critical paths (auth → browse → custom order → checkout → track)

## G. Launch Readiness (cross-cutting)

- [ ] Confirm hosting provider + autoscaling plan
- [ ] Enforce HTTPS across all environments
- [ ] Load test at estimated ad-campaign peak concurrency
- [ ] Verify no secrets committed to repo; secrets stored in hosting secret manager
- [ ] Final review of Decision Log (pricing model, status sync, gateway, WhatsApp provider, SMS provider) — all resolved before Phase 3 integration work
