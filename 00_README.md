# Custom T-Shirt Brand — Backend

Backend service for the Custom T-Shirt Brand e-commerce platform. Powers product catalog, custom orders, OTP auth, payments, WhatsApp messaging, and order tracking for the responsive web frontend.

> Owner: Backend Engineer (Person 2) · Target launch: **10 July** · Status: Pre-development

## 1. What This Repo Covers

- REST API for all 8 site pages (Home, Offer, Product Showcase, Custom T-Shirt, Login, My Account, Order Tracking, Contact)
- Database schema + migrations
- Mobile OTP authentication
- WhatsApp integration (click-to-chat generation + Business API webhook handling)
- Payment gateway integration (checkout, webhooks, refunds)
- Admin-facing endpoints (offers, order status, product CRUD)

## 2. Tech Stack (Proposed — confirm before Phase 1 ends)

| Layer           | Choice                                           | Notes                                           |
| --------------- | ------------------------------------------------ | ----------------------------------------------- |
| Runtime         | Node.js 20 LTS                                   |                                                 |
| Framework       | Express.js (or NestJS if team prefers structure) |                                                 |
| Database        | PostgreSQL 16                                    | Relational data fits orders/products/users well |
| ORM             | Prisma                                           | Fast migrations, type-safe queries              |
| Auth            | Custom OTP flow + JWT (access + refresh)         | No stored passwords                             |
| File Storage    | S3-compatible bucket (AWS S3 / Cloudflare R2)    | For custom design uploads                       |
| Payment Gateway | Razorpay (proposed)                              | Confirm with client                             |
| WhatsApp        | Meta Cloud API or BSP (Twilio/Gupshup)           | Confirm provider                                |
| SMS/OTP         | MSG91 / Twilio Verify (proposed)                 | Confirm provider                                |
| Hosting         | Render / Railway / AWS (TBD)                     | Needs autoscaling for ad traffic spikes         |

## 3. Project Structure

```
backend/
├── src/
│   ├── config/            # env, db, third-party client config
│   ├── modules/
│   │   ├── auth/           # OTP send/verify, JWT
│   │   ├── users/
│   │   ├── products/
│   │   ├── offers/
│   │   ├── custom-orders/
│   │   ├── orders/
│   │   ├── payments/
│   │   ├── whatsapp/
│   │   └── tracking/
│   ├── middleware/         # auth guard, error handler, rate limiter
│   ├── jobs/               # webhook processors, notification queue
│   ├── utils/
│   └── app.js / server.js
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
├── docs/                    # this documentation set
├── .env.example
└── package.json
```

## 4. Getting Started

```bash
git clone <repo-url>
cd backend
cp .env.example .env        # fill in secrets
npm install
npx prisma migrate dev
npm run dev
```

## 5. Environment Variables (see `.env.example`)

```
DATABASE_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
SMS_PROVIDER_API_KEY=
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
PAYMENT_GATEWAY_KEY_ID=
PAYMENT_GATEWAY_KEY_SECRET=
PAYMENT_WEBHOOK_SECRET=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
META_PIXEL_ID=
META_CONVERSIONS_API_TOKEN=
```

## 6. Documentation Index

| File                      | Purpose                                        |
| ------------------------- | ---------------------------------------------- |
| `01_PRD.md`               | Backend-relevant product requirements          |
| `02_ARCHITECTURE.md`      | System architecture & tech decisions           |
| `03_DESIGN.md`            | Database schema & API design                   |
| `04_EPICS_AND_STORIES.md` | Epics broken into user stories                 |
| `05_TASKS.md`             | Granular task checklist                        |
| `06_PLAN.md`              | Timeline & milestones                          |
| `07_GUIDE.md`             | Setup, conventions, contribution guide         |
| `08_ORCHESTRATOR.md`      | How to sequence AI-assisted or team build work |
| `MASTER_PROMPT.md`        | Copy-paste prompt to drive AI-assisted build   |

## 7. Core API Domains

- `POST /api/auth/otp/send`, `POST /api/auth/otp/verify`
- `GET /api/products`, `GET /api/products/:id`, `GET /api/categories`
- `GET /api/offers`
- `POST /api/custom-orders`, `POST /api/custom-orders/:id/upload`
- `POST /api/orders`, `GET /api/orders/:id`, `GET /api/orders/track`
- `POST /api/payments/checkout`, `POST /api/payments/webhook`
- `POST /api/whatsapp/webhook`, `GET /api/whatsapp/chat-link`
- `GET /api/account/me`, `GET /api/account/orders`

## 8. Known Open Decisions

See `01_PRD.md` Section 12 — pricing model, order-status sync method, gateway choice, WhatsApp provider, SMS provider. These block final schema/API contracts and should be resolved in Phase 1.

## 9. Contact / Ownership

Backend Engineer: Person 2 — Backend project, DB schema, auth, WhatsApp research, payment gateway research, API structure.
