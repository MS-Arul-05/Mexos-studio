# Architecture — Custom T-Shirt Brand Backend

## 1. High-Level System Diagram (textual)

```
                    ┌─────────────────────┐
                    │   Frontend (Web)     │
                    │  Responsive Web App  │
                    └──────────┬───────────┘
                               │ HTTPS/REST (JSON)
                               ▼
                    ┌─────────────────────┐
                    │   Backend API        │
                    │  Node.js / Express   │
                    │  (this repo)         │
                    └──┬───┬───┬───┬───┬───┘
        ┌──────────────┘   │   │   │   └───────────────┐
        ▼                  ▼   ▼   ▼                    ▼
 ┌─────────────┐  ┌──────────┐ │ ┌───────────┐  ┌────────────────┐
 │ PostgreSQL   │  │ S3 Bucket│ │ │ SMS/OTP   │  │ Payment Gateway │
 │ (Prisma ORM) │  │ (uploads)│ │ │ Provider  │  │ (Razorpay etc.) │
 └─────────────┘  └──────────┘ │ └───────────┘  └────────────────┘
                                ▼
                       ┌─────────────────┐
                       │ WhatsApp         │
                       │ Business API /   │
                       │ Click-to-Chat    │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Meta Conversions │
                       │ API (server-side)│
                       └─────────────────┘
```

## 2. Architectural Style

- **Modular monolith** (not microservices) — appropriate for a 10-day build with one backend engineer. Each domain (auth, products, orders, payments, whatsapp) is a self-contained module with its own routes/controller/service/repository layers, but deployed as a single service.
- Rationale: microservices add operational overhead (multiple deploys, service discovery, network calls) that isn't justified at this scale or timeline. The modular structure keeps a clean path to splitting services later if needed (e.g., WhatsApp/notification worker).

## 3. Layered Structure (per module)

```
Route → Controller → Service (business logic) → Repository (Prisma queries) → Database
```

- **Route**: defines endpoint + middleware (auth guard, validation)
- **Controller**: parses request, calls service, shapes response
- **Service**: business rules (e.g., OTP expiry check, order state transitions)
- **Repository**: all Prisma/database access, isolated so it can be mocked in tests

## 4. Key Architectural Decisions

### 4.1 Authentication

- Mobile number + OTP, no passwords.
- OTP: 6-digit, 5–10 min expiry, rate-limited per number (max 3/hour) to prevent abuse and control SMS cost.
- On verify: issue short-lived JWT access token (15 min) + long-lived refresh token (30 days, stored hashed in DB) to balance security with "stay logged in" UX.

### 4.2 Custom Order & File Uploads

- Uploaded designs go directly to S3-compatible storage via pre-signed URL (backend issues the signed URL; frontend uploads directly to storage) — avoids routing large files through the API server.
- Custom order record created first (status `DRAFT`), file reference attached after upload confirms, then submitted (status `SUBMITTED`).

### 4.3 Orders Data Model Unification

- Both web-checkout orders and WhatsApp-initiated orders write to the **same `orders` table**, with an `order_source` field (`WEB`, `WHATSAPP`). This satisfies the PRD requirement that WhatsApp orders "still appear in Order Tracking and My Account."

### 4.4 Payments

- Gateway-hosted checkout page — the backend only creates a checkout session/order object and verifies webhook signatures; raw card data never touches our servers (PCI scope stays with gateway).
- Webhook handler is idempotent (keyed by gateway payment/order ID) to safely handle retries.

### 4.5 WhatsApp

- Two integration tiers:
  1. **Click-to-chat** (`https://wa.me/<number>?text=<encoded message>`) — zero backend infra, used for "Order via WhatsApp" and support button. Backend only needs a message-template builder function.
  2. **WhatsApp Business API** — required for automated status updates and invoice delivery. Runs as an outbound notification job triggered on order status change / payment success, plus an inbound webhook endpoint for delivery receipts.
- Because Business API approval has external lead time, the architecture treats it as a **pluggable notification provider** — the order-status-change event is provider-agnostic, so it can ship first with a no-op/logging provider and swap in the real WhatsApp provider once approved, without touching order logic.

### 4.6 Order Tracking

- Order has a `status` enum + a `status_history` table (append-only) so every transition is auditable and can independently re-trigger WhatsApp notifications.
- v1: status transitions triggered by an internal admin endpoint (manual), designed so a courier-webhook-driven transition can be added later without schema changes.

### 4.7 Meta Ads Readiness

- Server-side event dispatch (Meta Conversions API) fired from the same service layer as client-facing actions (e.g., `POST /custom-orders` dispatches `SubmitCustomDesign`), using an event ID shared with the client-side Pixel call for deduplication, per Meta's recommended dedup pattern.

## 5. Data Flow — Example: Custom Order via WhatsApp

1. Customer fills Custom T-Shirt form on frontend → `POST /api/custom-orders` (status `DRAFT`)
2. Optional file upload via pre-signed S3 URL → confirmed via `PATCH /api/custom-orders/:id/attach-file`
3. Customer clicks "Order via WhatsApp" → `GET /api/whatsapp/chat-link?customOrderId=...` returns a `wa.me` link with prefilled summary; custom order status → `SUBMITTED`
4. Brand replies/confirms in WhatsApp manually; internal team updates order status via admin API → `orders` + `custom_orders` rows updated, `status_history` appended
5. Status change triggers WhatsApp notification job (once Business API is live) and updates `My Account` / `Order Tracking` views

## 6. Environments

- **Local**: Docker Compose (Postgres + backend) for dev
- **Staging**: mirrors production, used for gateway/WhatsApp sandbox testing
- **Production**: autoscaled hosting, managed Postgres, environment secrets via hosting provider's secret manager

## 7. Security Architecture

- HTTPS everywhere (enforced at hosting/load-balancer level)
- JWT signed with rotating secrets; refresh tokens hashed at rest
- Rate limiting on OTP and auth endpoints
- Webhook signature verification for payment gateway and WhatsApp
- Input validation at controller layer (e.g., Zod/Joi schemas) before hitting service logic
- No card data or OTPs logged in plaintext

## 8. Scalability Considerations

- Stateless API layer → horizontal scaling behind a load balancer for Meta Ads traffic spikes
- Read-heavy endpoints (products, offers) cached (in-memory or Redis) with short TTL
- Notification jobs (WhatsApp, Meta CAPI) run async via a lightweight queue (e.g., BullMQ + Redis) so slow third-party calls never block the request/response cycle

## 9. Future Extension Points (explicitly deferred, per PRD out-of-scope)

- Multi-currency/multi-language fields reserved but unused in v1 schema where cheap to add now (e.g., `currency` column defaulting to INR)
- Admin dashboard: API-first design means a UI can be added later without backend rework
- Courier API sync: `status_history` design already supports a webhook-driven source
