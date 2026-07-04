# Design — Database Schema & API Design

## 1. Database Schema (Prisma-style)

```prisma
// ── Users & Auth ──────────────────────────────────────────
model User {
  id            String   @id @default(uuid())
  mobileNumber  String   @unique
  countryCode   String   @default("+91")
  name          String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  addresses     Address[]
  orders        Order[]
  customOrders  CustomOrder[]
  refreshTokens RefreshToken[]
}

model OtpRequest {
  id           String   @id @default(uuid())
  mobileNumber String
  otpHash      String
  expiresAt    DateTime
  verified     Boolean  @default(false)
  attempts     Int      @default(0)
  createdAt    DateTime @default(now())

  @@index([mobileNumber])
}

model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  tokenHash String
  expiresAt DateTime
  revoked   Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}

model Address {
  id         String  @id @default(uuid())
  userId     String
  label      String? // "Home", "Office"
  line1      String
  line2      String?
  city       String
  state      String
  pincode    String
  isDefault  Boolean @default(false)

  user User @relation(fields: [userId], references: [id])
}

// ── Catalog ───────────────────────────────────────────────
model Category {
  id       String    @id @default(uuid())
  name     String
  slug     String    @unique
  parentId String?
  products Product[]
}

model Product {
  id           String   @id @default(uuid())
  name         String
  slug         String   @unique
  description  String?
  price        Decimal
  currency     String   @default("INR")
  fabric       String?
  careInfo     String?
  categoryId   String
  isFeatured   Boolean  @default(false)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())

  category   Category        @relation(fields: [categoryId], references: [id])
  images     ProductImage[]
  variants   ProductVariant[]
  orderItems OrderItem[]
}

model ProductImage {
  id        String  @id @default(uuid())
  productId String
  url       String
  altText   String?
  sortOrder Int     @default(0)

  product Product @relation(fields: [productId], references: [id])
}

model ProductVariant {
  id        String  @id @default(uuid())
  productId String
  size      String  // S, M, L, XL, XXL
  color     String
  stock     Int     @default(0)
  sku       String  @unique

  product Product @relation(fields: [productId], references: [id])
}

// ── Offers ────────────────────────────────────────────────
model Offer {
  id            String    @id @default(uuid())
  title         String
  description   String?
  bannerImageUrl String?
  couponCode    String?
  discountType  DiscountType
  discountValue Decimal
  minOrderValue Decimal?
  startsAt      DateTime
  endsAt        DateTime
  isActive      Boolean   @default(true)
}

enum DiscountType {
  PERCENTAGE
  FLAT
}

// ── Custom Orders ─────────────────────────────────────────
model CustomOrder {
  id                String   @id @default(uuid())
  userId            String?
  baseType          String   // T-shirt base type
  size              String
  quantity          Int      @default(1)
  color             String?
  printPlacement    String?
  printType         String?  // "print" | "embroidery"
  designDescription String?
  uploadedFileUrl   String?
  deliveryDeadline  DateTime?
  contactName       String
  contactMobile     String
  pricingMode       PricingMode @default(WHATSAPP_CONFIRMED)
  quotedPrice       Decimal?
  status            CustomOrderStatus @default(DRAFT)
  orderId           String?  // linked once converted to a formal Order
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user  User?  @relation(fields: [userId], references: [id])
  order Order? @relation(fields: [orderId], references: [id])
}

enum PricingMode {
  INSTANT
  WHATSAPP_CONFIRMED
}

enum CustomOrderStatus {
  DRAFT
  SUBMITTED
  QUOTED
  CONFIRMED
  REJECTED
}

// ── Orders ────────────────────────────────────────────────
model Order {
  id            String       @id @default(uuid())
  userId        String?
  orderSource   OrderSource
  status        OrderStatus  @default(PENDING_PAYMENT)
  subtotal      Decimal
  discount      Decimal      @default(0)
  total         Decimal
  currency      String       @default("INR")
  shippingAddressId String?
  guestMobile   String?      // for guest/WhatsApp orders without account
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  user          User?         @relation(fields: [userId], references: [id])
  items         OrderItem[]
  customOrders  CustomOrder[]
  payment       Payment?
  statusHistory OrderStatusHistory[]
}

enum OrderSource {
  WEB
  WHATSAPP
}

enum OrderStatus {
  PENDING_PAYMENT
  CONFIRMED
  IN_PRODUCTION
  PACKED
  SHIPPED
  DELIVERED
  CANCELLED
  PAYMENT_FAILED
}

model OrderItem {
  id         String  @id @default(uuid())
  orderId    String
  productId  String?
  variantId  String?
  name       String  // snapshot at time of order
  size       String?
  color      String?
  quantity   Int
  unitPrice  Decimal

  order   Order    @relation(fields: [orderId], references: [id])
  product Product? @relation(fields: [productId], references: [id])
}

model OrderStatusHistory (
) // see note below — modeled as OrderStatusHistory model
model OrderStatusHistory {
  id        String      @id @default(uuid())
  orderId   String
  status    OrderStatus
  note      String?
  changedBy String?     // admin user id or "system"
  createdAt DateTime    @default(now())

  order Order @relation(fields: [orderId], references: [id])
}

// ── Payments ──────────────────────────────────────────────
model Payment {
  id              String        @id @default(uuid())
  orderId         String        @unique
  gateway         String        // "razorpay" | "payu" | "stripe"
  gatewayOrderId  String
  gatewayPaymentId String?
  status          PaymentStatus @default(CREATED)
  amount          Decimal
  currency        String        @default("INR")
  rawWebhookPayload Json?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  order Order @relation(fields: [orderId], references: [id])
}

enum PaymentStatus {
  CREATED
  PENDING
  SUCCESS
  FAILED
  REFUNDED
}

// ── WhatsApp / Notifications ─────────────────────────────
model WhatsAppMessageLog {
  id          String   @id @default(uuid())
  toNumber    String
  templateName String?
  payload     Json
  status      String   // "sent" | "delivered" | "failed" | "queued"
  relatedOrderId String?
  createdAt   DateTime @default(now())
}

// ── Contact / Inquiries ──────────────────────────────────
model ContactInquiry {
  id        String   @id @default(uuid())
  name      String
  email     String?
  mobile    String?
  message   String
  createdAt DateTime @default(now())
}
```

> Note: `model OrderStatusHistory ()` stray line above is a placeholder artifact of drafting — the real model is the second `OrderStatusHistory` block. Remove the empty stub when pasting into `schema.prisma`.

## 2. Entity Relationship Summary

- `User` 1—N `Order`, `CustomOrder`, `Address`, `RefreshToken`
- `Order` 1—N `OrderItem`, `OrderStatusHistory`; 1—1 `Payment`; 0—N `CustomOrder` (a custom order becomes part of a formal order once confirmed)
- `Product` 1—N `ProductImage`, `ProductVariant`, `OrderItem`
- `Category` 1—N `Product`

## 3. API Design (REST, JSON)

### 3.1 Auth

| Method | Endpoint               | Description                                                                    |
| ------ | ---------------------- | ------------------------------------------------------------------------------ |
| POST   | `/api/auth/otp/send`   | body: `{mobileNumber}` → sends OTP                                             |
| POST   | `/api/auth/otp/verify` | body: `{mobileNumber, otp}` → returns `{accessToken, refreshToken, isNewUser}` |
| POST   | `/api/auth/refresh`    | body: `{refreshToken}` → new access token                                      |
| POST   | `/api/auth/logout`     | revokes refresh token                                                          |

### 3.2 Catalog

| Method | Endpoint              | Description                                                        |
| ------ | --------------------- | ------------------------------------------------------------------ |
| GET    | `/api/products`       | query: `category, size, color, minPrice, maxPrice, q, page, limit` |
| GET    | `/api/products/:slug` | product detail with images/variants                                |
| GET    | `/api/categories`     | category tree                                                      |
| GET    | `/api/offers`         | active offers                                                      |

### 3.3 Custom Orders

| Method | Endpoint                             | Description                                        |
| ------ | ------------------------------------ | -------------------------------------------------- |
| POST   | `/api/custom-orders`                 | create draft custom order                          |
| PATCH  | `/api/custom-orders/:id`             | update fields (before submission)                  |
| POST   | `/api/custom-orders/:id/upload-url`  | returns pre-signed S3 upload URL                   |
| PATCH  | `/api/custom-orders/:id/attach-file` | confirm uploaded file URL                          |
| POST   | `/api/custom-orders/:id/submit`      | mark `SUBMITTED`, optionally compute instant price |
| GET    | `/api/whatsapp/chat-link`            | query: `customOrderId` → returns `wa.me` deep link |

### 3.4 Orders & Checkout

| Method | Endpoint              | Description                                      |
| ------ | --------------------- | ------------------------------------------------ |
| POST   | `/api/orders`         | create order from cart (auth optional for guest) |
| GET    | `/api/orders/:id`     | order detail (auth or guest token)               |
| GET    | `/api/orders/track`   | query: `orderId, mobile` → guest tracking lookup |
| GET    | `/api/account/orders` | authenticated order history                      |

### 3.5 Payments

| Method | Endpoint                  | Description                                                                |
| ------ | ------------------------- | -------------------------------------------------------------------------- |
| POST   | `/api/payments/checkout`  | body: `{orderId}` → creates gateway session, returns redirect/session data |
| POST   | `/api/payments/webhook`   | gateway server-to-server webhook (signature verified)                      |
| POST   | `/api/payments/:id/retry` | regenerate checkout session for failed payment                             |

### 3.6 WhatsApp

| Method     | Endpoint                | Description                                                 |
| ---------- | ----------------------- | ----------------------------------------------------------- |
| POST       | `/api/whatsapp/webhook` | inbound webhook (delivery receipts, verification handshake) |
| (internal) | notification job        | triggered on order status change, sends template message    |

### 3.7 Admin (internal, protected by admin auth — scope: API only)

| Method   | Endpoint                       | Description                                                   |
| -------- | ------------------------------ | ------------------------------------------------------------- |
| POST/PUT | `/api/admin/products`          | product CRUD                                                  |
| POST/PUT | `/api/admin/offers`            | offer CRUD                                                    |
| PATCH    | `/api/admin/orders/:id/status` | manual status transition (triggers history + WhatsApp notify) |
| GET      | `/api/admin/custom-orders`     | queue of submitted custom orders needing quote/confirmation   |

## 4. Standard Response Envelope

```json
{
  "success": true,
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 134 }
}
```

Errors:

```json
{
  "success": false,
  "error": { "code": "INVALID_OTP", "message": "The OTP entered is incorrect or expired." }
}
```

## 5. Auth Header Convention

`Authorization: Bearer <accessToken>` on all authenticated routes. Guest order tracking uses a signed short-lived token returned at order creation instead of full auth.

## 6. Validation Rules (examples)

- `mobileNumber`: E.164-style, country code required
- `otp`: 6 digits, single-use, invalidated after verify or expiry
- `CustomOrder.quantity`: min 1
- `Order.total` always recomputed server-side from `OrderItem` rows — never trusted from client
