# Decision Log & Running Assumptions

Tracks the 5 open decisions from `01_PRD.md` §12 and any assumptions made while
building, so they can be reviewed against `06_PLAN.md`'s risk notes. Each item is
implemented against the documented default, marked `// TODO: confirm with client`
in code, and kept swappable.

## Open Decisions (`01_PRD.md` §12)

| #   | Decision                                             | Status                                   | Default in use                                                                                | How it's kept swappable                                                                                                      |
| --- | ---------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | Custom order pricing (instant vs WhatsApp-confirmed) | ⏳ Assumed                               | `WHATSAPP_CONFIRMED` (`PricingMode` default)                                                  | Per-record `pricingMode`; `INSTANT` rule engine to be stubbed behind a pricing service                                       |
| 2   | Order status sync (manual vs courier API)            | ⏳ Assumed                               | Manual via `PATCH /api/admin/orders/:id/status`                                               | `OrderStatusHistory` append-only table supports a courier-webhook source later without schema change                         |
| 3   | Payment gateway                                      | ⏳ Assumed (recommended: Razorpay)       | **Razorpay** (`PAYMENT_GATEWAY=razorpay`)                                                     | `PaymentProvider` interface + razorpay/stub adapters (built). See `research/payment-gateway-comparison.md`                   |
| 4   | WhatsApp Business API provider                       | ⏳ Assumed (recommended: Meta Cloud API) | Click-to-chat now; Business API as **no-op** (`WHATSAPP_PROVIDER=noop`); `meta` adapter built | `NotificationProvider` interface + noop/meta adapters, swapped by env config. See `research/whatsapp-provider-comparison.md` |
| 5   | OTP delivery channel                                 | ✅ Confirmed (2026-07-09): WhatsApp only | `console` provider — logs OTP, no external calls (`OTP_PROVIDER=console`) until WA creds set  | `OtpProvider` interface (console/whatsapp adapters), swapped by env config. SMS (MSG91/Twilio) removed per client decision   |

Legend: ⏳ Assumed (using documented default, awaiting client confirmation) · ✅ Confirmed

## Foundational Choices (settled)

| Topic      | Choice                              | Source / Rationale                                                                    |
| ---------- | ----------------------------------- | ------------------------------------------------------------------------------------- |
| Language   | **TypeScript**                      | `07_GUIDE.md` §3 recommendation for an integration-heavy project; confirmed with team |
| Framework  | Express.js                          | Stack in `09_MASTER_PROMPT.md`                                                        |
| ORM / DB   | Prisma + PostgreSQL 16              | `00_README.md` §2                                                                     |
| Validation | Zod                                 | `07_GUIDE.md` §3                                                                      |
| Logging    | pino + `pino-http` with request IDs | `05_TASKS.md` A                                                                       |
| Tests      | Jest + supertest                    | `07_GUIDE.md` §5                                                                      |

## Build Progress (against `08_ORCHESTRATOR.md` §2)

- [x] Step 0 — Decision Log review (this file)
- [x] Step 1 — Project scaffold (Tasks A)
- [x] Step 2 — Database schema + migration (Tasks B)
- [x] Step 3 — Auth (Tasks C)
- [x] Step 4 — Catalog read APIs
- [x] Step 5 — Custom orders + upload
- [x] Step 6 — Orders + checkout skeleton
- [x] Step 7 — Payment gateway
- [x] Step 8 — WhatsApp click-to-chat
- [x] Step 9 — WhatsApp Business API (pluggable, may ship post-launch)
- [x] Step 10 — Admin endpoints
- [x] Step 11 — Meta Conversions API events
- [x] Step 12 — Non-functional hardening

## Assumptions Made While Building

- **Repo layout:** the 9 docs live at the repo root, so the backend was scaffolded
  at the root (root = the backend project) rather than in a nested `backend/`
  folder as sketched in `00_README.md` §3. Module structure inside `src/` still
  follows `02_ARCHITECTURE.md` §3.
- **Health check semantics:** `GET /api/health` returns `200` when the DB is
  reachable and `503` (API alive, DB down) otherwise, so monitoring can tell
  "process up" from "fully healthy". Body still uses the standard success envelope.

### Step 2 — Schema deviations from `03_DESIGN.md` §1 (all additive, no shape change)

- **Removed the documented drafting artifact:** the stray `model OrderStatusHistory ()`
  stub (the doc's Note explicitly says to remove it). Only the real model kept.
- **Money precision:** all `Decimal` money fields annotated `@db.Decimal(10, 2)`
  instead of Prisma's default `Decimal(65,30)`. Reason: correct currency type and
  aligns with the "money is always Decimal" rule. Refinement, not a shape change.
- **Indexes added** on foreign keys and common query columns (e.g. `Product.categoryId`,
  `Product(isFeatured, isActive)`, `Order.guestMobile`/`status`, `Payment.gatewayPaymentId`,
  `RefreshToken.tokenHash @unique`) to meet the <300ms catalog and idempotent-webhook
  requirements. No fields added/removed vs the doc.
- **`onDelete: Cascade`** added on child→parent relations that are logically owned
  (RefreshToken/Address→User, ProductImage/Variant→Product, OrderItem/StatusHistory/Payment→Order).
- **Left as scalar per the doc (not converted to FK relations):** `Order.shippingAddressId`
  and `Category.parentId`. Candidates to promote to real relations later if needed.
- **`ScaffoldPlaceholder` model removed** — it existed only so the client could
  generate during Step 1.

### Step 2 — Local environment assumptions

- **DB host port 5544 (not 5432):** this machine already runs another project's
  Postgres on 5432, so `docker-compose.yml` maps host port `${DB_HOST_PORT:-5544}`
  → container 5432, and `.env.example` `DATABASE_URL` uses 5544. Change `DB_HOST_PORT`
  if 5544 is also taken. Migration `20260702025954_init` applied cleanly; seed loaded
  4 categories / 12 products / 180 variants / 1 offer.

### Step 3 — Auth decisions & assumptions

- **`mobileNumber` stored as full E.164** (e.g. `+919876543210`) in `User.mobileNumber`
  (the unique key). `countryCode` defaults to `+91` and is informational for now —
  splitting national number vs code needs a phone lib; deferred. Marked
  `// TODO: confirm with client` in `auth.service.ts`.
- **First-login name capture:** `POST /api/auth/otp/verify` accepts an optional
  `name` (extends the `03_DESIGN.md` body `{mobileNumber, otp}`) to satisfy Task C
  "first-time user name capture on verify". Ignored for returning users.
- **Refresh rotation returns a new pair:** `POST /api/auth/refresh` revokes the
  presented token and returns BOTH a new access and a new refresh token (Epic 3.3
  "rotated on use"), slightly richer than the doc's "new access token".
- **OTP storage:** 6-digit code, bcrypt-hashed, single-use (marked `verified` on
  success), expiry `OTP_TTL_MINUTES` (default 10), max 5 wrong attempts per code.
  Never returned in any API response; the `console` SMS provider logs it (dev only).
- **Rate limiting is two-layer:** per-number `OTP_MAX_PER_HOUR` (default 3/hr,
  enforced in the service via `OtpRequest` counts — the Epic 3.1 AC) plus a per-IP
  limiter (20/hr) as defense-in-depth. The per-IP limiter is **skipped in test env**
  for deterministic tests.
- **Refresh tokens:** high-entropy opaque tokens, stored SHA-256-hashed at rest,
  looked up by unique hash; access tokens are JWT (HS256, 15m). Verified end-to-end
  against live Postgres (send → verify → rotate → old-token 401 → logout → single-use).

### Step 4 — Catalog read APIs decisions & assumptions

- **Money serialized as fixed 2-decimal strings** (e.g. `"749.00"`) via
  `decimalToString` → `Decimal.toFixed(2)`. Every Decimal column is currency, so
  the scale is fixed for a consistent frontend contract; still a string (no float).
- **Product list default sort:** featured first, then newest (`isFeatured desc,
createdAt desc`). No `sort` query param yet — add if the frontend needs it.
- **Only active products** are returned by list and detail; an inactive/unknown
  slug → `404 PRODUCT_NOT_FOUND`.
- **Filters:** `category` (by slug), `size`/`color` (product has a matching variant),
  `minPrice`/`maxPrice` (with `maxPrice >= minPrice` validation), `q` (case-insensitive
  contains on name+description). Pagination `page`/`limit` (limit max 100, default 20).
- **Category tree** built in the service from the flat `parentId`; dangling/missing
  parents are treated as roots so no category is dropped.
- **Offers "active"** = `isActive AND startsAt <= now <= endsAt`.
- **Testing against the real DB:** catalog integration tests run against the running
  Postgres (dev DB `tshirt` on 5544 locally, `tshirt_test` in CI). `prisma/seed.ts`
  was refactored to export an idempotent `seed()` (shared client) that tests call in
  `beforeAll`, so fixtures are guaranteed without depending on manual seeding. CI now
  runs `prisma migrate deploy` before tests. Measured `/api/products` ~16ms locally
  (AC: <300ms). NOTE: tests currently share the dev DB and only upsert (idempotent) /
  read — a dedicated isolated test DB would be cleaner if writes grow.

### Step 5 — Custom orders + file upload decisions & assumptions

- **Pluggable storage provider** (`src/storage/`): real S3-compatible provider
  (`@aws-sdk/client-s3` pre-signed PUT) used only when `S3_BUCKET`/`S3_ACCESS_KEY`/
  `S3_SECRET_KEY` are all set; otherwise a **stub provider** returns deterministic
  fake URLs so dev/tests work without AWS. AC 6.2 ("works end-to-end with a real
  bucket") is code-complete but its live-bucket verification is **pending S3 creds**
  (a client dependency — flagged as a plan risk). `S3_ENDPOINT` supports R2/MinIO
  (path-style).
- **Upload flow:** `POST /:id/upload-url` returns `{uploadUrl, fileUrl, key,
expiresInSeconds}` (15-min TTL); key = `custom-orders/<id>/<uuid>-<sanitized-name>`.
  Client PUTs directly to storage, then `PATCH /:id/attach-file` records `fileUrl`.
- **Ownership model:** user-owned custom orders (userId set) require the same
  authenticated user (403 otherwise); guest orders (userId null) are **capability-based**
  — anyone with the id can act on them. All routes use `optionalAuth` (new middleware:
  attaches `req.user` if a token is present, never rejects).
- **Editability:** update / upload-url / attach-file allowed only in `DRAFT`
  (else 409 `CUSTOM_ORDER_NOT_EDITABLE`). `submit` only from `DRAFT`.
- **Submit + pricing (Decision #1):** `WHATSAPP_CONFIRMED` (default) → `SUBMITTED`,
  no price (human quotes over WhatsApp). `INSTANT` → computes `quotedPrice` via the
  **stubbed rule table** in `pricing.ts` and moves to `QUOTED`. Rule table is marked
  `// TODO: confirm with client` and fully swappable.
- **`GET /api/whatsapp/chat-link`** (listed under §3.3) is intentionally deferred to
  **Step 8** (WhatsApp), per the orchestrator sequence — not built here.

### Step 6 — Orders + checkout skeleton decisions & assumptions

- **Server recomputes every amount** from DB prices. Order create takes only
  `items: [{variantId, quantity}]` (+ optional `couponCode`); `unitPrice` comes from
  the variant's product, `subtotal`/`discount`/`total` are computed server-side with
  Prisma `Decimal`. Client-sent `subtotal`/`total`/`discount` are ignored (tested).
- **Cart references variants** (price lives on Product). Each item snapshots
  name/size/color/unitPrice at order time. Stock is validated (409 `INSUFFICIENT_STOCK`)
  but **not decremented at creation** — decrement belongs on payment success (Step 7),
  to avoid holding stock for unpaid orders.
- **Coupon discount** is optional and recomputed server-side from the matching active
  offer (percentage/flat, `minOrderValue` enforced → 400 `COUPON_MIN_ORDER_NOT_MET`,
  unknown/expired → 400 `INVALID_COUPON`, capped at subtotal).
- **orderSource = WEB** for this endpoint; WhatsApp-sourced orders will be created via
  a separate admin/WhatsApp path but land in the same table (Architecture §4.3).
- **Guest checkout:** `guestMobile` required when unauthenticated (400
  `GUEST_MOBILE_REQUIRED`). On create, guests receive a **signed guest-order token**
  (30-day, scoped to the orderId) so they can view `GET /api/orders/:id` without an
  account (03_DESIGN.md §5); passed via `X-Guest-Token` header or `?guestToken=`.
- **`GET /api/orders/:id` access:** owner (matching userId) OR valid guest-order
  token; otherwise returns **404** (not 403) to avoid leaking order existence.
- **`GET /api/orders/track`** matches orderId + mobile against `guestMobile` OR the
  owner's `user.mobileNumber`. Registered before `/:id` so `track` isn't captured as an id.
- **Initial `OrderStatusHistory`** row (`PENDING_PAYMENT`, changedBy `system`) is
  written atomically with the order via a nested create (append-only, Epic 2.5).
- **New `account` module:** `GET /api/account/orders` (authGuard, paginated history).
  `GET /api/account/me` (profile) and saved custom designs are deferred to a later
  account step — only order history is required for Epic 6.3 here.

### Step 7 — Payment gateway decisions & assumptions

- **Research deliverable:** `research/payment-gateway-comparison.md` (Task E) — recommends
  **Razorpay** (India/UPI, hosted checkout, signed webhooks). Merchant KYC + keys are a
  client dependency (plan risk).
- **Pluggable `PaymentProvider`:** real `razorpay` adapter (REST `POST /v1/orders`,
  amount in **paise**, HMAC-SHA256 webhook verify) + `stub` adapter used when keys are
  absent, so dev/CI run the full flow without live keys. Selected by factory
  (gateway=razorpay AND keys present → razorpay, else stub).
- **Checkout** (`POST /api/payments/checkout`): server sends the order's **authoritative
  `total`** to the gateway (client can't set the amount). One `Payment` per order
  (unique `orderId`), upserted to `CREATED`. Returns `{paymentId, gatewayOrderId, keyId,
amount(paise), currency}` for the hosted checkout. Access = owner or guest-order token.
- **Webhook** (`POST /api/payments/webhook`): **no auth — signature is the auth.**
  Raw body captured via an `express.json` `verify` hook; `X-Razorpay-Signature` checked
  with a constant-time HMAC compare (bad sig → 400 `INVALID_SIGNATURE`). Processing is
  **idempotent** — terminal payment states (SUCCESS/FAILED) are never re-processed;
  unknown gateway orders are acked but ignored. Only a verified `payment.captured`
  confirms the order.
- **On success (single DB transaction):** payment→SUCCESS (+ raw payload), order→
  `CONFIRMED`, append `OrderStatusHistory`, **decrement variant stock** (the deferred
  decrement from Step 6), then fire the notification hook. On `payment.failed`:
  payment→FAILED, order→`PAYMENT_FAILED`, history appended.
- **Retry** (`POST /api/payments/:id/retry`): regenerates a gateway order for a
  non-succeeded payment; if the order was `PAYMENT_FAILED` it resets to
  `PENDING_PAYMENT` (with history). 409 if already paid.
- **Notification hook (Architecture §4.5 / Decision #4):** new `src/notifications/`
  provider-agnostic layer with a **no-op provider** (logs) selected by
  `WHATSAPP_PROVIDER`. Order-status changes emit through it now, so Step 9 swaps in the
  WhatsApp provider without touching payment/order logic.
- **Verified end-to-end against live Postgres:** checkout (₹998.00 → 99800 paise) →
  signed webhook → order CONFIRMED → replay idempotent → bad-sig 400 → **stock 25→23**.
- **CORS is currently open** (`cors()` with no allowlist) for the public storefront API
  — flagged by SonarLint. To be tightened to an origin allowlist in Step 12 hardening.

### Step 8 — WhatsApp click-to-chat decisions & assumptions

- **`GET /api/whatsapp/chat-link`** builds a `wa.me/<digits>?text=<url-encoded>` deep
  link. Supports `customOrderId` (custom-order summary), `orderId` (order summary), or
  neither (generic support message). Number = `WHATSAPP_BUSINESS_NUMBER` normalized to
  digits. Message URL-encoded via `encodeURIComponent` (newlines/`&`/`+`/spaces verified).
- **Access reuse:** the endpoint delegates to `customOrdersService.getById` /
  `ordersService.getById`, so their existing access rules apply (owner / capability-by-id
  / guest-order token). A 404 on an inaccessible record propagates unchanged.
- **Deviation from Architecture §5 (data-flow step 3):** the doc says clicking
  "Order via WhatsApp" flips the custom order `DRAFT → SUBMITTED` as a side effect of
  this GET. **Intentionally NOT done** — a `GET` must be side-effect-free (prefetchers/
  crawlers could trigger it). Submission stays on the dedicated `POST
/api/custom-orders/:id/submit` (Step 5), which the frontend calls alongside fetching
  the link. Logged here as the deliberate engineering choice.
- **Support link:** the no-id branch returns a static support message; the frontend's
  floating support button can also hardcode a `wa.me` link (Task D) — the endpoint is
  provided for parity.
- **Business API webhook + outbound notifications** remain **Step 9** (needs Meta
  approval; ships behind the pluggable notification provider from Step 7).

### Step 9 — WhatsApp Business API decisions & assumptions

- **Research deliverable:** `research/whatsapp-provider-comparison.md` (Task D) — recommends
  **Meta Cloud API (direct)** (lowest cost, native webhooks, and we already need Meta
  Business Manager for the Conversions API). WABA verification + templates are a client
  dependency (plan risk).
- **Webhook** (`GET/POST /api/whatsapp/webhook`, Epic 4.5): `GET` does Meta's verify
  handshake (echoes `hub.challenge` as plain text when `WHATSAPP_VERIFY_TOKEN` matches,
  else 403). `POST` verifies `X-Hub-Signature-256` (HMAC-SHA256 with `WHATSAPP_APP_SECRET`
  over the raw body) when a secret is set — else logs a warning and skips — then logs
  delivery statuses + inbound messages to `WhatsAppMessageLog`. Verified live against DB.
- **Meta notification adapter** (Epic 4.3): real `meta` provider sends order-status
  **template** messages via the Graph API and logs each send/failure. Selected by
  `WHATSAPP_PROVIDER=meta` + token/phone id; **falls back to noop** otherwise so nothing
  blocks launch. Order/payment code is unchanged — it only calls the provider interface.
- **Invoice delivery** (Epic 4.4): `pdfkit` generates a PDF from the order snapshot,
  stored via the new `storageProvider.putObject` (stub in dev, real S3 in prod), then the
  meta provider sends it as a WhatsApp **document** message, logged to `WhatsAppMessageLog`.
  Wired into payment success **best-effort and gated by `supportsInvoice`** — the noop
  provider (dev/CI) skips PDF generation entirely; a send failure never fails the webhook.
- **Business-initiated templates:** status messages use an approved template name
  (`WHATSAPP_STATUS_TEMPLATE`, default `order_status_update`) with the status as a body
  parameter. Exact template shape must be finalized against the client's approved template
  (marked in code). Cannot be verified live without an approved WABA — behaviour is unit-
  tested via a mocked Graph client.
- **No async queue yet:** notifications/invoice run inline (best-effort). Architecture §8
  envisions BullMQ+Redis; deferred as a post-launch improvement (noted for Step 12/ops).

### Step 10 — Admin endpoints decisions & assumptions

- **Admin auth = shared API key** (`X-Admin-Key` ↔ `ADMIN_API_KEY`, constant-time compare)
  via a new `adminGuard`. There's no admin user/role model yet, so this is the pragmatic
  v1. Missing key config → 503 `ADMIN_DISABLED`; wrong key → 401 `ADMIN_UNAUTHORIZED`.
  Marked `// TODO: confirm with client` — replace with **role-based admin users** when
  the admin auth model is decided.
- **Products CRUD:** `POST/PUT/DELETE /api/admin/products`. Create/update support nested
  `images`/`variants` (update **replaces** them in a transaction). **DELETE is a soft
  delete** (`isActive=false`) to preserve referential integrity with existing order items.
  Public product serializer now also exposes `isActive` (catalog lists still return only
  active products).
- **Offers CRUD:** `POST/PUT/DELETE /api/admin/offers`. Offers have no inbound FKs, so
  DELETE is a hard delete. `endsAt > startsAt` validated.
- **Order status transition (Decision #2 — manual):** `PATCH /api/admin/orders/:id/status`
  accepts only fulfillment statuses (`CONFIRMED, IN_PRODUCTION, PACKED, SHIPPED, DELIVERED,
CANCELLED`) — payment-driven statuses are rejected at validation. Updates status +
  appends `OrderStatusHistory` (changedBy `admin`) **in one transaction**, then fires the
  notification hook (best-effort). Terminal orders (`DELIVERED`/`CANCELLED`) → 409
  `ORDER_TERMINAL`. Verified live: 3 history rows after 2 transitions (initial + 2).
- **Custom-order queue:** `GET /api/admin/custom-orders` returns `SUBMITTED`+`QUOTED` by
  default (needing quote/confirmation), or a specific `?status=`; paginated.
- **Serializers exported** from product/offer/order/custom-order services for admin reuse
  (avoids response-shape drift between public and admin endpoints).

### Step 11 — Meta Conversions API events decisions & assumptions

- **Pluggable CAPI provider** (`src/analytics/`): real `meta` adapter (Graph API
  `/{pixel}/events`) used only when `META_PIXEL_ID` + `META_CONVERSIONS_API_TOKEN` are
  set; otherwise a **no-op** provider logs. Nothing blocks launch (client dependency:
  Meta Business Manager access + Pixel/CAPI token).
- **Events wired** (Epic 6.5): `ViewProduct` (GET product detail), `ViewOffer` (GET
  offers), `SubmitCustomDesign` (custom-order submit), `Purchase` (payment webhook
  success). Each carries a **shared `eventId`** returned in the response `meta.eventId`
  so the client Pixel can send the same id → Meta dedup.
- **Deterministic Purchase eventId** = `purchase_<orderId>`. Because Purchase fires
  server-side from the webhook (no client round-trip), the client thank-you-page Pixel
  derives the same id from the order id and dedupes. View/Submit events use a random UUID
  returned to the caller.
- **Fire-and-forget dispatch:** events are sent without `await` (errors caught + logged),
  so a slow/failed Meta call never blocks or fails the request — keeps read endpoints
  within the <300ms budget.
- **Response envelope `meta` widened** to `ResponseMeta` (pagination fields + optional
  `eventId`), a superset of `PaginationMeta` — existing paginated callers unaffected.

### Step 12 — Non-functional hardening decisions & assumptions

- **CORS allowlist** via `CORS_ORIGINS` (comma-separated). Unset = allow all (dev); a
  production warning fires so it isn't shipped open. Verified: allowed origin gets ACAO,
  disallowed origin blocked. Resolves the open-CORS note from Step 7.
- **HTTPS:** `helmet` HSTS + secure headers; `httpsRedirect` redirects http→https when
  `ENFORCE_HTTPS=true` (TLS terminated at the LB). `trust proxy` gated by `TRUST_PROXY`
  so `req.ip` isn't spoofable when not behind a proxy.
- **Rate limiting:** general per-IP limiter across `/api` (`RATE_LIMIT_MAX` /
  `RATE_LIMIT_WINDOW_MIN`, default 300/15min) on top of the OTP limits. Skipped in tests.
- **Boot config audit** (`enforceProductionConfig`): **throws in production** on
  placeholder/weak `JWT_*` or `ADMIN_API_KEY`; warns on stub integrations (console SMS,
  stub payments, noop WhatsApp, missing Meta token, open CORS). In dev it only warns.
- **Launch readiness doc** `LAUNCH_READINESS.md`: env checklist, load-test guidance
  (k6/autocannon, p95<300ms, horizontal scaling; Redis cache + BullMQ queue as deferred
  options per Architecture §8), and the outstanding client dependencies — all pluggable
  via env with dev fallbacks.
- **Deferred (documented, not blocking launch):** Redis short-TTL cache for catalog reads
  and a BullMQ notification queue (Architecture §8) — add only if load testing shows
  pressure. `GET /api/account/me` profile + saved custom designs (a small account step).
