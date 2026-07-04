# Going Live — Switch every integration from dev stub to real

Everything is pluggable via env. For each integration below: create the account →
put credentials in the server's environment (secret manager, **not** a committed file)
→ restart. No code changes needed (the SMS adapters are now implemented too).

> Rule of thumb: a provider stays in "dev/stub" mode until its credentials are present.
> The boot audit (`enforceProductionConfig`) warns about anything still on a stub.

---

## 1. Real database (managed Postgres)

1. Provision managed Postgres (Neon / Supabase / RDS / Railway).
2. Set the connection string:
   ```
   DATABASE_URL=postgresql://USER:PASS@HOST:5432/DBNAME?schema=public&sslmode=require
   ```
3. Apply the schema (not `migrate dev` — that's for local):
   ```
   npx prisma migrate deploy
   npm run seed        # optional: seed categories/products
   ```

That's it — the app already uses `DATABASE_URL` everywhere.

## 2. Real OTP (SMS)

Two adapters are implemented. Pick one.

**MSG91 (recommended, India):**

1. Create an MSG91 account, complete **DLT** registration, create a **Flow template**
   containing an `{{otp}}` variable, and copy the template id + authkey.
2. Env:
   ```
   SMS_PROVIDER=msg91
   SMS_PROVIDER_API_KEY=<authkey>
   SMS_TEMPLATE_ID=<flow template id>
   ```

**Twilio (alternative):**

```
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxx…
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_FROM=+1XXXXXXXXXX     # a Twilio number (or messaging service sender)
```

Restart → `POST /api/auth/otp/send` now sends a real SMS (no more console logging).
The 3/hour/number rate limit still applies.

## 3. Real payment gateway (Razorpay)

**Backend (already built):**

1. Create a Razorpay account, finish **KYC / activate** the account.
2. Dashboard → Settings → API Keys → generate **Key ID + Key Secret**.
3. Dashboard → Settings → Webhooks → add `https://YOUR_API/api/payments/webhook`,
   subscribe to `payment.captured` and `payment.failed`, set a **webhook secret**.
4. Env:
   ```
   PAYMENT_GATEWAY=razorpay
   PAYMENT_GATEWAY_KEY_ID=rzp_live_xxx     # (rzp_test_xxx for sandbox first)
   PAYMENT_GATEWAY_KEY_SECRET=xxxxx
   PAYMENT_WEBHOOK_SECRET=xxxxx
   ```

Now `POST /api/payments/checkout` creates a **real** Razorpay order and the webhook
confirms payment → order `CONFIRMED` (idempotent, signature-verified).

**Storefront (to actually collect card/UPI — lives in a separate repo; this repo
is backend-only):** whichever client consumes this API must open Razorpay
Checkout on its checkout page:

```html
<!-- storefront's index.html -->
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

```ts
// after POST /api/payments/checkout returns { keyId, gatewayOrderId, amount, currency }
const rzp = new (window as any).Razorpay({
  key: keyId,
  order_id: gatewayOrderId,
  amount,
  currency,
  name: 'Teeverse',
  handler: () => navigate(`/order/${orderId}`), // confirmation is via webhook
});
rzp.open();
```

(Say the word and I'll wire this into `Checkout.tsx`.)

## 4. Real file storage (S3 / R2) — design & invoice uploads

1. Create a bucket (AWS S3 or Cloudflare R2) + access keys; allow `PutObject`/`GetObject`.
2. Env:
   ```
   S3_BUCKET=your-bucket
   S3_REGION=ap-south-1
   S3_ACCESS_KEY=xxx
   S3_SECRET_KEY=xxx
   # R2/MinIO only — S3 needs no endpoint:
   S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
   ```

Now custom-order design uploads use real pre-signed PUT URLs and invoice PDFs are
stored for real. Configure a permissive-read/CORS policy so the browser can PUT.

## 5. Real WhatsApp (Business API — status updates + invoices)

1. Create a **WhatsApp Business Account** in Meta Business Manager, verify the business,
   add your number, and get a permanent **access token** + **phone number id**.
2. Create & get approval for **message templates** (status update, invoice caption).
3. Configure the webhook `https://YOUR_API/api/whatsapp/webhook` with a **verify token**
   and **app secret**.
4. Env:
   ```
   WHATSAPP_PROVIDER=meta
   WHATSAPP_API_TOKEN=xxx
   WHATSAPP_PHONE_NUMBER_ID=xxx
   WHATSAPP_VERIFY_TOKEN=xxx
   WHATSAPP_APP_SECRET=xxx
   WHATSAPP_BUSINESS_NUMBER=+91XXXXXXXXXX
   WHATSAPP_STATUS_TEMPLATE=order_status_update
   ```

Click-to-chat already works with zero setup; this enables automated sends. Until
approved, leave `WHATSAPP_PROVIDER=noop` and everything else keeps working.

## 6. Real Meta Ads tracking (Conversions API)

1. Meta Events Manager → your Pixel → **Conversions API** → generate an access token.
2. Env:
   ```
   META_PIXEL_ID=xxxxxxxxxx
   META_CONVERSIONS_API_TOKEN=xxx
   ```

`ViewProduct / ViewOffer / SubmitCustomDesign / Purchase` now fire server-side, deduped
with the client Pixel via the shared `eventId`.

## 7. Admin + security (production)

```
ADMIN_API_KEY=<strong random>              # required — boot fails in prod without it
JWT_ACCESS_SECRET=<strong random 32+>       # required — not the dev placeholder
JWT_REFRESH_SECRET=<strong random 32+>
NODE_ENV=production
TRUST_PROXY=true          # behind a load balancer
ENFORCE_HTTPS=true
CORS_ORIGINS=https://yourstore.com          # your real frontend origin(s)
```

On boot, `enforceProductionConfig()` **refuses to start** if any secret is a placeholder,
and warns about any integration still on a stub. Generate secrets with:
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

---

## Minimal "everything real" .env (production)

```
NODE_ENV=production
DATABASE_URL=postgresql://…?sslmode=require
JWT_ACCESS_SECRET=…       JWT_REFRESH_SECRET=…
ADMIN_API_KEY=…
CORS_ORIGINS=https://yourstore.com
TRUST_PROXY=true          ENFORCE_HTTPS=true

SMS_PROVIDER=msg91        SMS_PROVIDER_API_KEY=…   SMS_TEMPLATE_ID=…
PAYMENT_GATEWAY=razorpay  PAYMENT_GATEWAY_KEY_ID=…  PAYMENT_GATEWAY_KEY_SECRET=…  PAYMENT_WEBHOOK_SECRET=…
S3_BUCKET=…  S3_REGION=…  S3_ACCESS_KEY=…  S3_SECRET_KEY=…
WHATSAPP_PROVIDER=meta  WHATSAPP_API_TOKEN=…  WHATSAPP_PHONE_NUMBER_ID=…  WHATSAPP_VERIFY_TOKEN=…  WHATSAPP_APP_SECRET=…
META_PIXEL_ID=…  META_CONVERSIONS_API_TOKEN=…
```

Then: `npx prisma migrate deploy && npm run build && npm start`.
