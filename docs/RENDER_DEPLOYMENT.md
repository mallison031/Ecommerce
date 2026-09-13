# Render Deployment Guide — Aura Storefront & Admin API

This guide provides end-to-end instructions for deploying the Next.js 14 eCommerce application to **[Render](https://render.com)**.

---

## Architecture Summary
- **Framework**: Next.js 14 (App Router)
- **Runtime**: Node.js 20 LTS
- **Database**: PostgreSQL (Supabase with AWS `eu-central-1` transaction pooler)
- **ORM**: Prisma Client
- **Payments**: Paystack (Webhook-driven transactional confirmation)
- **Notifications**: Resend (Email) & Meta WhatsApp Cloud API
- **Monitoring**: `/api/health` zero-downtime health check probe

---

## Option 1: One-Click Deploy via Render Blueprint (Recommended)

The repository includes a ready-to-use [`render.yaml`](../render.yaml) blueprint specification.

1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Blueprint**.
3. Connect your GitHub account and select the `mallison031/Ecommerce` repository.
4. Render will parse `render.yaml` and discover the `aura-ecommerce-store` service.
5. Fill in the required environment variables (see table below).
6. Click **Apply**. Render will automatically build, run database client generation, and deploy the application.

---

## Option 2: Manual Web Service Setup

If setting up directly via the Render UI:

1. In the Render Dashboard, click **New +** → **Web Service**.
2. Select your repository: `mallison031/Ecommerce`.
3. Configure the service settings:
   - **Name**: `aura-ecommerce-store`
   - **Region**: `Frankfurt (EU Central)` *(matches the Supabase `aws-0-eu-central-1` database region for minimum latency)*
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install && npx prisma generate && npm run build
     ```
   - **Start Command**:
     ```bash
     npm run start
     ```
   - **Plan**: `Starter` (or `Free` for testing)
4. Under **Advanced Settings**:
   - **Health Check Path**: `/api/health`
   - **Auto-Deploy**: `Yes`
5. Add the Environment Variables listed in the next section.
6. Click **Create Web Service**.

---

## Environment Variables Configuration

Set these variables in the Render Dashboard (**Environment** tab):

| Variable Name | Required | Description | Example / Notes |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | Node environment | `production` |
| `NODE_VERSION` | **Yes** | Node runtime version | `20.20.2` |
| `DATABASE_URL` | **Yes** | Supabase connection string | `postgresql://postgres.[ref]:[pass]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require&connection_limit=15` |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Live base URL of your app | `https://aura-ecommerce-store.onrender.com` (or your custom domain) |
| `PAYSTACK_SECRET_KEY` | **Yes** | Paystack Secret Key | `sk_live_...` (or `sk_test_...`) |
| `PAYSTACK_PUBLIC_KEY` | Optional | Paystack Public Key | `pk_live_...` (or `pk_test_...`) |
| `CRON_SECRET` | **Yes** | Bearer secret for cron sweeps | A strong random token (e.g. `openssl rand -hex 24`) |
| `RESEND_API_KEY` | Optional | API key for transactional emails | `re_...` from Resend dashboard |
| `RESEND_FROM_EMAIL` | Optional | Sender address for emails | `orders@yourdomain.com` or `orders@resend.dev` |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Optional | Meta Webhook verify token | Configured in Meta App Dashboard |
| `WHATSAPP_APP_SECRET` | Optional | Meta App Secret for HMAC signatures | From Meta App Dashboard |
| `WHATSAPP_PHONE_NUMBER_ID` | Optional | Meta Cloud API Phone Number ID | From Meta WhatsApp settings |
| `WHATSAPP_ACCESS_TOKEN` | Optional | Permanent/System User Graph API Token | From Meta Business Manager |
| `ADMIN_WHATSAPP_PHONE` | Optional | WhatsApp number for admin alerts | `+2348000000000` |

> [!IMPORTANT]
> **Database Pooler Tip**: Always use the **Transaction Pooler URL** (port `6543` or `5432` with `connection_limit=15`) in `DATABASE_URL` to prevent exhausting connection limits under serverless or high concurrency traffic.

---

## Post-Deployment Checklist

1. **Verify Health Check Probe**:
   ```bash
   curl -i https://<your-render-subdomain>.onrender.com/api/health
   ```
   Should return HTTP `200 OK` with:
   ```json
   {
     "status": "healthy",
     "uptimeSeconds": 15,
     "timestamp": "2026-09-13T14:00:00.000Z",
     "database": "connected",
     "responseTimeMs": 142,
     "env": "production"
   }
   ```

2. **Configure Paystack Webhooks**:
   - Go to [Paystack Dashboard](https://dashboard.paystack.com/#/settings/developer) → **Settings** → **API Keys & Webhooks**.
   - Set **Live Webhook URL** to:
     `https://<your-render-subdomain>.onrender.com/api/webhooks/paystack`
   - Test by clicking "Test Webhook".

3. **Configure Meta WhatsApp Cloud API Webhooks** (if active):
   - Go to [Meta for Developers](https://developers.facebook.com) → WhatsApp → Configuration.
   - Set **Callback URL** to:
     `https://<your-render-subdomain>.onrender.com/api/webhooks/whatsapp`
   - Enter your `WHATSAPP_WEBHOOK_VERIFY_TOKEN` and verify.

4. **Set Up Recurring Cron Jobs**:
   - Set up an external cron ping (via Render Cron Job or services like [cron-job.org](https://cron-job.org)):
     - URL: `https://<your-render-subdomain>.onrender.com/api/cron/abandoned-sweep`
     - Method: `POST`
     - Header: `Authorization: Bearer <YOUR_CRON_SECRET>`
     - Schedule: Every 30–60 minutes.
