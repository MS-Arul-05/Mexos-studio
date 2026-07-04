# WhatsApp Business API Provider Comparison & Recommendation (Task D / Epic 4.2)

**Purpose:** help the client choose a WhatsApp Business API path for **automated order
status updates** and **invoice delivery**. Business verification has external lead time —
**start the application immediately** (click-to-chat already ships as the guaranteed
fallback). Deliverable, not code.

## What needs the Business API (vs click-to-chat)

- Click-to-chat (`wa.me`) — already built (Step 8). Covers "Order via WhatsApp" + support.
  No approval needed.
- **Business API** — required for _business-initiated_ messages: automated status
  updates and invoice (document) delivery. Requires an approved WhatsApp Business
  Account (WABA), a verified business, and **pre-approved message templates** for
  business-initiated (out-of-24h-session) messages.

## Comparison

| Criteria            | **Meta Cloud API (direct)** — recommended          | Twilio                       | Gupshup                 | Interakt            |
| ------------------- | -------------------------------------------------- | ---------------------------- | ----------------------- | ------------------- |
| Hosting             | Meta-hosted (no infra)                             | Twilio-hosted                | Gupshup-hosted          | Interakt-hosted     |
| Pricing             | Meta conversation pricing only (no per-msg markup) | Conversation + Twilio markup | Conversation + markup   | Conversation + plan |
| Setup speed         | Fast if you have Meta Business Manager             | Fast, guided                 | Fast, India-focused     | Fast, SMB-focused   |
| Templates           | Managed in Meta / WhatsApp Manager                 | Twilio console               | Gupshup console         | Interakt UI         |
| Webhooks            | Native (verify + delivery statuses)                | Twilio-normalized            | Gupshup-normalized      | Interakt-normalized |
| Media (invoice PDF) | Supported (document message)                       | Supported                    | Supported               | Supported           |
| Best for            | Cost control + direct integration                  | Multi-channel (SMS+WA) shops | India SMB, quick launch | Non-technical teams |
| Lock-in             | Low (raw Graph API)                                | Medium                       | Medium                  | Higher (UI-centric) |

## Recommendation: **Meta Cloud API (direct)**

- Lowest cost (no BSP markup), no extra infra, native webhooks, and we already need
  **Meta Business Manager** for the Conversions API (Step 11) — so the client is set up
  in Meta anyway. BSPs (Gupshup/Interakt) are a good fallback if the team wants a UI to
  manage templates without touching Meta; Twilio is best only if SMS+WhatsApp share one
  vendor.

## As built (pluggable, ships no-op until approval)

- **Provider-agnostic notification interface** (`src/notifications/`) — order-status
  changes emit through it. Default **`noop`** provider logs (no send) so nothing blocks
  launch. Set `WHATSAPP_PROVIDER=meta` (+ token/phone id) to activate the **Meta Cloud
  API** adapter with **zero changes to order/payment logic** (Architecture §4.5).
- **Inbound webhook** `GET/POST /api/whatsapp/webhook`: GET does Meta's verify handshake
  (`hub.challenge`); POST verifies `X-Hub-Signature-256` (if `WHATSAPP_APP_SECRET` set)
  and logs delivery statuses to `WhatsAppMessageLog`.
- **Outbound** (meta adapter): template message for status updates, document message for
  invoices (PDF generated + stored), each logged to `WhatsAppMessageLog`.

## Action items for the client

1. Confirm the provider — **Meta Cloud API** recommended (Decision #4).
2. Start **WhatsApp Business Account + business verification now** (lead time).
3. Provide the **WhatsApp Business number** and grant Meta Business Manager access.
4. Create + submit **message templates** (status update; invoice caption) for approval.
5. Supply `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`,
   `WHATSAPP_APP_SECRET` via the secret manager once available.
