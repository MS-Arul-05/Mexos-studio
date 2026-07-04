# Guide — Developer Setup, Conventions & Contribution

## 1. Prerequisites

- Node.js 20 LTS, npm
- Docker + Docker Compose (for local Postgres)
- A code editor with ESLint/Prettier support
- Access to (once available): SMS provider sandbox keys, payment gateway test keys, WhatsApp Business test number

## 2. First-Time Setup

```bash
git clone <repo-url>
cd backend
cp .env.example .env
docker-compose up -d          # starts local Postgres
npm install
npx prisma migrate dev        # creates schema
npm run seed                  # optional sample data
npm run dev                   # starts API on localhost:4000
```

Verify: `curl http://localhost:4000/api/health` → `{"status":"ok"}`

## 3. Coding Conventions

- **Language**: JavaScript/TypeScript (recommend TypeScript for a project this integration-heavy — confirm with team)
- **Structure**: follow the module layering in `02_ARCHITECTURE.md` §3 — route → controller → service → repository. Business logic never lives in controllers.
- **Naming**: `camelCase` for variables/functions, `PascalCase` for classes/models, `kebab-case` for file names, plural nouns for route paths (`/products`, not `/product`).
- **Validation**: every route with a body/query must have a schema (Zod/Joi) applied via middleware — no manual `if (!req.body.x)` checks scattered in controllers.
- **Errors**: throw typed application errors (`AppError(code, message, httpStatus)`), caught by the centralized error handler. Never `res.status(500).send(err.message)` directly in a controller.
- **Money**: always `Decimal` in the DB and in calculations (never floating point). Server always recomputes totals; never trust client-submitted totals.
- **Secrets**: never commit `.env`. Never log tokens, OTPs, card data, or full webhook payloads containing sensitive fields.

## 4. Git Workflow

- Branch naming: `feature/<epic>-<short-desc>` (e.g., `feature/auth-otp-verify`)
- Commit messages: imperative mood, reference task where useful (`Add OTP verify endpoint (Epic 3.2)`)
- PRs: link to the relevant story/task in `04_EPICS_AND_STORIES.md` / `05_TASKS.md`; include how it was tested
- Keep PRs scoped to one module/epic where possible for easier review under a tight deadline

## 5. Testing

- Unit tests for services (business logic) — mock the repository layer
- Integration tests for critical flows: OTP login, custom order submission, checkout + webhook, order tracking
- Run `npm test` before every PR; CI should block merge on failing tests
- Webhook handlers (payment, WhatsApp) need dedicated tests for signature validation and idempotency — these are the highest-risk areas for silent bugs

## 6. Working With Third-Party Integrations

- **SMS/OTP**: use provider's sandbox/test mode locally; never fire real OTPs in automated tests
- **Payment gateway**: use test/sandbox API keys locally and in staging; verify webhook signatures using the provider's test webhook secret
- **WhatsApp**: click-to-chat links can be tested manually by opening the generated URL; Business API requires the approved test number and Meta's webhook verification challenge to be implemented before any inbound testing works
- **File uploads (S3)**: use a separate `dev/` prefix or bucket in non-prod to avoid mixing test uploads with real customer files

## 7. Environment Promotion

`local → staging → production`

- Staging uses sandbox/test credentials for all third parties but the same schema and code path as production
- Production secrets live only in the hosting provider's secret manager, never in `.env` files checked into any branch

## 8. Where to Find Things

| Need                                               | File                      |
| -------------------------------------------------- | ------------------------- |
| What are we building and why                       | `01_PRD.md`               |
| How is the system structured                       | `02_ARCHITECTURE.md`      |
| Exact schema & endpoint contracts                  | `03_DESIGN.md`            |
| What work exists, broken into stories              | `04_EPICS_AND_STORIES.md` |
| Checklist of concrete tasks                        | `05_TASKS.md`             |
| When things should happen                          | `06_PLAN.md`              |
| How to build with AI assistance in the right order | `08_ORCHESTRATOR.md`      |
| Copy-paste prompt to drive an AI coding assistant  | `MASTER_PROMPT.md`        |

## 9. Escalation

If a Decision Log item (`01_PRD.md` §12) is blocking you, don't guess — flag it in the team channel and move to the next unblocked task. Blocked-but-assumed decisions should be clearly marked with a `// TODO: confirm with client` comment and logged in `06_PLAN.md`'s risk notes.

## 10. Definition of "Done" for Any Task

1. Code implements the acceptance criteria in `04_EPICS_AND_STORIES.md`
2. Input validated, errors handled via standard envelope
3. Tests written and passing
4. No secrets/PII logged
5. Endpoint added to the API spec/Postman collection
6. PR reviewed (or self-reviewed against this checklist if solo)
