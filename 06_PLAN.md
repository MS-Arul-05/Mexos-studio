# Plan — Backend Timeline & Milestones

Target launch: **10 July**. Prepared: **1 July**. ~9 working days. Plan below maps to the client PRD's 4 phases, with backend-specific detail and buffer.

## Timeline Overview

| Days    | Phase                       | Backend Focus                                                                |
| ------- | --------------------------- | ---------------------------------------------------------------------------- |
| Day 1–2 | Phase 1 — Foundation        | Project setup, schema design, decision log resolution kickoff                |
| Day 3–5 | Phase 2 — Core Commerce     | Auth, catalog/offers/custom-order endpoints, file upload                     |
| Day 6–7 | Phase 3 — Integrations      | Payment gateway, WhatsApp click-to-chat + Business API setup, order tracking |
| Day 8–9 | Phase 4 — Ads & Launch Prep | Meta CAPI events, load testing, QA, bug fixes, deploy                        |

## Day-by-Day Plan

### Day 1 (1–2 July)

- Scaffold project (Epic 1, Tasks A)
- Draft Prisma schema for all core models (Epic 2)
- Send Decision Log items to client: pricing model, order status method, gateway preference, WhatsApp provider, SMS provider (`01_PRD.md` §12)
- Kick off WhatsApp Business API application process (has external lead time — start immediately regardless of other decisions)

### Day 2

- Finalize & migrate DB schema; write seed script
- Set up SMS/OTP provider account (once client confirms or use dev-team default to unblock)
- Implement OTP send/verify + JWT issuance (Epic 3)

### Day 3

- Implement auth guard, refresh/logout endpoints
- Implement product/category/offer read endpoints with filtering & pagination (Epic 6.1)
- Begin custom-order endpoints (draft creation)

### Day 4

- Finish custom-order endpoints: file upload (pre-signed S3), submit flow, WhatsApp chat-link generator (Epic 4.1)
- Implement order + order-item creation flow

### Day 5

- Implement order tracking (guest + authenticated) and account endpoints
- Implement contact inquiry endpoint
- Begin payment gateway integration once merchant account credentials available (Epic 5)

### Day 6

- Payment checkout session creation + webhook handling + idempotency (Epic 5)
- Wire payment success → order status → status history → notification hook

### Day 7

- WhatsApp Business API integration (if approved) or finalize pluggable no-op provider fallback (Epic 4.3–4.5)
- Admin endpoints: manual order status update, product/offer CRUD (Epic 6)
- Cross-module integration testing

### Day 8

- Meta Conversions API event dispatch on key actions (Epic 6.5)
- Load testing at estimated ad-traffic concurrency (Epic 7.2)
- Security pass: HTTPS enforcement, secret audit, rate limit verification

### Day 9 (10 July)

- Final bug fixes from frontend integration testing
- Production deploy + smoke test on all endpoints
- Handover: API docs shared with frontend/marketing team, monitoring dashboards confirmed live

## Buffer & Risk Notes

- **WhatsApp Business API approval** is the single highest-risk external dependency (business verification can take longer than 9 days). Mitigation: click-to-chat ships Day 4 as the guaranteed fallback; Business API features (auto status, invoice) can go live post-launch if approval lags, per the pluggable-provider design in `02_ARCHITECTURE.md`.
- **Payment gateway merchant account** approval can also take a few business days — start this the moment the client confirms a gateway (ideally Day 1).
- If any Decision Log item (`01_PRD.md` §12) is unresolved by end of Day 2, escalate — it blocks schema/API finalization for that area.

## Dependencies From Client (see `01_PRD.md` §13 / `07_GUIDE.md`)

Must arrive by Day 1–2 to stay on schedule: WhatsApp Business number, payment gateway choice + merchant account application started, SMS provider preference, Meta Business Manager access, and the 5 open decisions.

## Definition of Done (Backend, per phase)

- **Phase 1 done when:** project runs locally, schema migrated, decisions logged (even if some pending externally)
- **Phase 2 done when:** all catalog/custom-order/account endpoints pass integration tests against seeded data
- **Phase 3 done when:** a full test payment completes end-to-end and updates order status + triggers (or logs, if pending approval) a WhatsApp notification
- **Phase 4 done when:** load test passes at target concurrency, Meta events verified in Events Manager test tool, production deploy is live and smoke-tested
