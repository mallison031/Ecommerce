# Render Deployment Guide — Aura Storefront & Admin API

End-to-end instructions for deploying this Next.js 14 application to **[Render](https://render.com)**.

---

## Architecture Summary
- **Framework**: Next.js 14 (App Router)
- **Runtime**: Node.js 20 LTS (`.nvmrc` pins `20.20.2`)
- **Database**: **Neon** PostgreSQL, AWS `us-east-2` (Ohio), reached over the pooled PgBouncer endpoint
- **ORM**: Prisma Client
- **Payments**: Paystack (webhook-driven transactional confirmation)
- **Notifications**: Resend (email) & Meta WhatsApp Cloud API
- **Monitoring**: `/api/health` liveness probe

> The database was moved from Supabase (`eu-central-1`) to Neon (`us-east-2`). The Render
> service region is `ohio` so compute sits next to the database. Do not provision this service in
> Frankfurt — every query would cross an ocean and you pay for that egress on Neon.

---

## Option 1: One-Click Deploy via Render Blueprint (the supported path)

The repository contains a [`render.yaml`](../render.yaml) blueprint that is the source of truth for
the service definition. **Use this rather than the manual route**, otherwise `render.yaml` edits in
later pull requests change nothing about what is actually deployed.

1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Blueprint**.
3. Connect the GitHub account owning `mallison031/Ecommerce` and select that repository.
4. Render parses `render.yaml` and discovers `aura-ecommerce-store`.
5. Fill in the environment variables (every one is `sync: false`, so each needs a value from you).
6. Click **Apply** to build and deploy.
7. After the first deploy, subsequent merges to `main` auto-deploy (`autoDeploy: true`).

---

## Option 2: Manual Web Service Setup

Only if you deliberately want the service decoupled from the blueprint.

1. **New +** → **Web Service**, select `mallison031/Ecommerce`.
2. Configure:
   - **Name**: `aura-ecommerce-store`
   - **Region**: `Ohio (AWS us-east-2)` — matches the Neon database region
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install --include=dev && npx prisma generate && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: see *Free plan caveats* below before choosing `Free`
3. **Advanced Settings**:
   - **Health Check Path**: `/api/health`
   - **Auto-Deploy**: `Yes`
4. Add the environment variables below, then **Create Web Service**.

---

## Environment Variables

| Variable | Required | Notes |
| :--- | :---: | :--- |
| `NODE_ENV` | **Yes** | `production` |
| `NODE_VERSION` | **Yes** | `20.20.2` |
| `DATABASE_URL` | **Yes** | Neon **pooled** URL (hostname ends in `-pooler`), e.g. `postgresql://...@ep-XXXX-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require` |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Your live origin, e.g. `https://aura-ecommerce-store.onrender.com` — **set before the first build** (see below) |
| `PAYSTACK_SECRET_KEY` | **Yes** | `sk_live_...` for real payments (`sk_test_...` while testing) |
| `PAYSTACK_PUBLIC_KEY` | Optional | `pk_live_...` |
| `CRON_SECRET` | **Yes** | Bearer token for the `/api/cron/*` sweeps — `openssl rand -hex 24` |
| `RESEND_API_KEY` | Optional | `re_...` — without it, customer emails silently fail and only WhatsApp notifications are attempted |
| `RESEND_FROM_EMAIL` | Optional | Must be a domain you verified in Resend |
| `WHATSAPP_ACCESS_TOKEN` | Optional | Permanent System User token (temporary tokens expire) |
| `WHATSAPP_PHONE_NUMBER_ID` | Optional | From the Meta app's WhatsApp setup |
| `WHATSAPP_APP_SECRET` | Optional | Verifies inbound webhook signatures |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Optional | Must match the value you type in the Meta callback config |
| `ADMIN_WHATSAPP_PHONE` | Optional | Owner number for order alerts |

### `NEXT_PUBLIC_APP_URL` is baked at build time

Next.js inlines `NEXT_PUBLIC_*` into the bundle during `next build`, and this app reads it for
Paystack redirect targets, emailed links, canonical URLs and Open Graph images. Setting it after a
deploy leaves the old value inside the artifact — **add it before the first build**, then trigger a
redeploy if you change it. Leaving it as `http://localhost:3000` sends customers and webhooks to
your laptop.

### Pooled versus direct Neon URLs

`DATABASE_URL` is the pooled PgBouncer endpoint and is right for application traffic. PgBouncer runs
in transaction mode, which does not carry session state, so **schema operations must use the direct
URL** (`DATABASE_URL_UNPOOLED`, no `-pooler` in the hostname). Running `prisma migrate deploy` or
`prisma db push` over the pooled URL fails in ways that never mention pooling — typically
`prepared statement "s0" already exists` or a `relation ... does not exist` immediately after a
`SET search_path` that did not persist.

### The database schema is not created by the deploy

`render.yaml` runs `npx prisma generate` (client codegen) — it applies **no** schema. A fresh Neon
branch therefore deploys a service with no tables. See [`../prisma/migrations/README.md`](../prisma/migrations/README.md)
for the baseline procedure that makes schema application reproducible.

---

## Free plan caveats

`render.yaml` currently specifies `plan: free`. Known limits: **512 MB RAM, ~0.1 CPU, no persistent
disk, one instance**, and the service **spins down after 15 minutes of inactivity with a ~30 second
cold start** on the next request.

That interacts badly with the parts of this store that are not a person clicking around:

- **Paystack webhooks** — the first confirmation event after a quiet period waits out the cold start.
  Paystack retries, so a payment is not lost, but the order sits unpaid for minutes.
- **Meta WhatsApp webhook verification** — Meta's callback handshake does not wait ~30 seconds, so
  subscribing the webhook can fail while the service is asleep.
- **Cron sweeps** (`/api/cron/abandoned-sweep`, `review-reminders`, `marketing-drips`,
  `delivery-surveys`) — a sleeping instance turns each scheduled ping into a cold start.
- **Memory** — a 3,500-line admin bundle plus Prisma under real traffic can hit the 512 MB ceiling;
  there is no vertical headroom on Free.

The health probe deliberately answers `200` even when the database is unreachable (see
`app/api/health/route.ts`), so a cold database during boot cannot fail a deploy; read the
`"database"` field in the body instead of the status code.

**For anything taking real money, `Starter` ($7/mo, always-on, same 512 MB) is the cheaper choice —
the difference is paid in failed webhook deliveries on Free.**

---

## Post-Deployment Checklist

1. **Verify the health probe** — expect HTTP `200` on a live service, with `"database": "connected"`:
   ```bash
   curl -i https://<render-subdomain>.onrender.com/api/health
   ```

2. **Confirm the storefront is reading real inventory.** `GET /` renders per request. If it returns
   `500`, the database is unreachable — check `database` in `/api/health` before assuming a code bug.
   The homepage no longer substitutes sample catalog data, so a visible error is the correct
   behaviour rather than advertising products that do not exist.

3. **Point Paystack at the live webhook**: Paystack Dashboard → Settings → API Keys & Webhooks →
   Live Webhook URL = `https://<render-subdomain>.onrender.com/api/webhooks/paystack`. Test by
   re-sending a webhook, and confirm the handler is idempotent on `paystack_reference`.

4. **Point Meta at the live webhook**: Developers → your app → WhatsApp → Configuration →
   Callback URL = `https://<render-subdomain>.onrender.com/api/webhooks/whatsapp`, with the same
   `WHATSAPP_WEBHOOK_VERIFY_TOKEN` value.

5. **Schedule the cron sweeps** (Render Cron Job or cron-job.org), each as `POST` with header
   `Authorization: Bearer <CRON_SECRET>`:

   | Route | Purpose | Suggested cadence |
   | :--- | :--- | :--- |
   | `/api/cron/abandoned-sweep` | 1-hour reminder, 48-hour abandonment | every 30 min |
   | `/api/cron/review-reminders` | post-delivery review requests | daily |
   | `/api/cron/marketing-drips` | win-back & replenishment campaigns | daily |
   | `/api/cron/delivery-surveys` | NPS survey after delivery | daily |

---

## Before you take public payments (unresolved)

Two things are not deployment configuration and must be closed first:

- **The admin panel is unauthenticated.** `app/admin/page.tsx` and every `app/api/admin/*` route
  have no login check and there is no `middleware.ts`, while the site footer links to `/admin`.
  Anyone with the URL can read every order and change any status.
- **Placeholder contact details are hardcoded.** `wa.me/2348000000000` appears in `app/layout.tsx`
  and `app/page.tsx`, and `admin@store.com` with a placeholder password hash is the seeded admin in
  `prisma/seed.ts`.
