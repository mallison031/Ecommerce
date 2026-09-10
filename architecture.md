# Architecture

Companion to PRD.md. See architecture-essentials.md for the condensed, critical-decisions-only version.

## 1. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (App Router, TypeScript) | SSR for product pages (SEO for the storefront matters, TikTok/IG traffic lands on product pages), one codebase for site + API. |
| Backend | Next.js API routes / Route Handlers, same monorepo | Avoids a second service for a store this size. No microservices. |
| Database | PostgreSQL | Orders/invoices/payments are relational and need transactional integrity (stock decrement + order creation must be atomic). |
| ORM | Prisma | Migrations + type safety, minimal ceremony for a small schema. |
| Messaging | WhatsApp Cloud API (Meta, direct — no BSP), webhook-only | Cloud API doesn't offer polling; this matches the serverless model already chosen. Direct-to-Meta was your call over a paid BSP (Twilio/360dialog) — cheaper, but you own setup, verification, and template submission yourself. |
| Payments | Paystack (Node SDK / REST) | See PRD note — Stripe unsupported for NG-registered merchants. |
| PDF generation | `@react-pdf/renderer` or `pdf-lib` | Server-side invoice/receipt generation, no headless browser needed. |
| File storage | S3-compatible object storage (Cloudflare R2 or Supabase Storage) | Store generated invoice/receipt PDFs and product images. |
| Email | Resend or SendGrid (transactional only) | Universal fallback notification channel — always sent, regardless of WhatsApp opt-in status. |
| Scheduled jobs | Vercel Cron (or equivalent) | Abandoned-cart reminder sweep and abandonment-marking sweep. |
| Hosting | Vercel (app) + managed Postgres (Supabase/Neon/Railway) | Minimal ops for a solo founder. |
| Admin access | Single or few admin accounts, email+password via a lightweight auth lib (e.g. Lucia or NextAuth Credentials) | Not building custom RBAC. |

## 2. System Architecture (textual diagram)

```
                         ┌─────────────────────┐
                         │   Customer Browser    │
                         └─────────┬────────────┘
                                   │ HTTPS
                                   ▼
                         ┌─────────────────────┐
                         │   Next.js App        │
                         │  (Storefront + API)  │
                         └───┬────────┬─────────┘
             ┌───────────────┘        └───────────────┐
             ▼                                          ▼
   ┌───────────────────┐                     ┌────────────────────┐
   │  PostgreSQL (Prisma)│                     │  Paystack (hosted   │
   │ products/orders/etc │                     │  checkout + webhook)│
   └───────────────────┘                     └──────────┬─────────┘
             ▲                                            │ webhook: charge.success
             │                                            ▼
   ┌───────────────────┐                     ┌────────────────────┐
   │ Object storage (R2) │◄────generate───────│ /api/webhooks/      │
   │ invoices/receipts   │                     │ paystack handler    │
   └───────────────────┘                     └──────────┬─────────┘
                                                          │
                             ┌────────────────────────────┼───────────────────────────┐
                             ▼                             ▼                            ▼
                   ┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
                   │ WhatsApp Cloud API │        │ Email (Resend)    │        │ Admin panel (web)  │
                   │ (templates: order  │        │ (always-on         │        │ (always-on order   │
                   │  status, admin      │        │  fallback +        │        │  status controls,  │
                   │  alerts w/ buttons) │        │  cart reminders)   │        │  no WhatsApp dep.) │
                   └──────────────────┘        └──────────────────┘        └──────────────────┘
                             ▲
                             │ webhook (messages + button replies)
                   ┌──────────────────┐
                   │  WhatsApp Users     │
                   │ (customers + owner) │
                   └──────────────────┘

   ┌───────────────────┐        sweeps pending_payment orders
   │ Scheduled cron job  │───────────────────────────────────► sends 1hr reminder email / marks 48hr abandoned
   └───────────────────┘
```

## 3. Data Model

```
Sector (id, name, slug, display_order)
  └─< Product (id, sector_id, name, slug, description, price_kobo, currency, stock_qty, image_urls[], is_active)
        └─< OrderItem

Customer (id, name, phone, email, whatsapp_opt_in [bool, default false], whatsapp_phone_e164?, created_at)
  └─< Order

Order (id, order_number [sequential, human-readable], customer_id, status
       [pending_payment | paid | shipped | delivered | abandoned | cancelled | refunded | returned],
       subtotal_kobo, total_kobo, currency, delivery_address, created_at, paid_at?,
       reminder_sent_at?, abandoned_at?)
  └─< OrderItem (id, order_id, product_id, product_name_snapshot, unit_price_kobo_snapshot, qty, line_total_kobo)
  └─1 Payment (id, order_id, paystack_reference [unique], status, amount_kobo, verified_at, raw_payload_json)
  └─1 Invoice (id, order_id, invoice_number [sequential], pdf_url, issued_at)
  └─1 Receipt (id, order_id, receipt_number [sequential], pdf_url, issued_at)

SalesLedgerEntry (id, order_id, amount_kobo, sector_breakdown_json, recorded_at)

SupportTicket (id, whatsapp_phone_e164, order_id?, message, status [open|escalated|closed], created_at)
  — created when the bot can't answer within an open conversation window.

AdminUser (id, email, password_hash, role [owner|staff], whatsapp_phone_e164?)
  — whatsapp_phone_e164 here is the owner's/staff's own WhatsApp number, whitelisted so the
    webhook handler can route their incoming messages/button replies as admin actions rather
    than customer support intents.

MessageNotificationLog (id, order_id, channel [whatsapp|email], template_name?, status [sent|failed|skipped], created_at)
  — exists specifically because WhatsApp delivery is no longer guaranteed the way it effectively
    was with Telegram; without this log, a failed WhatsApp send is invisible.
```

Key integrity rules:
- `product_name_snapshot` / `unit_price_kobo_snapshot` on `OrderItem` are copied at order time.
- `paystack_reference` is unique and is the idempotency key for the webhook handler.
- Stock decrement and `Order.status = paid` happen in a single DB transaction.
- Invoice/receipt numbers are generated from a DB sequence.
- `Customer.whatsapp_opt_in` must be true, and `whatsapp_phone_e164` present, before any WhatsApp send is attempted. No opt-in, no WhatsApp attempt — straight to email.
- `MessageNotificationLog` is written for every attempted notification, success or failure, so a silent WhatsApp delivery failure is diagnosable instead of invisible.

## 4. Key Flows

### 4.1 Checkout
1. Customer builds cart client-side (session-based, no persistent cross-device cart in v1).
2. Checkout form collects name, phone, address, email (all required) plus the WhatsApp opt-in checkbox (optional, default unchecked).
3. Server creates `Order(status=pending_payment)` + `OrderItem`s. No stock reservation (see architecture-essentials.md).
4. Server initializes a Paystack transaction, returns the authorization URL.
5. Customer redirected to Paystack, pays.

### 4.2 Payment Confirmation (source of truth = webhook, never the browser redirect)
1. Paystack sends `charge.success` to `/api/webhooks/paystack`.
2. Handler verifies the webhook signature (`x-paystack-signature` HMAC).
3. Handler calls Paystack's Verify Transaction API server-to-server as a second check.
4. Idempotency check on `paystack_reference`.
5. If new: transaction block — set `Order.status = paid`, decrement stock, write `Payment` row.
6. Generate invoice + receipt PDFs, upload to object storage.
7. Call the shared notification step (4.4) for customer and admin.

### 4.3 Abandoned Checkout Recovery
Unchanged from the email-only design: hourly cron sweep, 1-hour reminder email, 48-hour `abandoned` flag, late payments still honored. No WhatsApp involvement — see PRD 5.4 for why.

### 4.4 Customer & Admin Notification (shared step, used by every status change)
Any time `Order.status` changes to `paid`, `shipped`, `delivered`, or `returned`:
1. **Always** send the email notification. This never depends on WhatsApp succeeding or even being attempted.
2. If `Customer.whatsapp_opt_in` is true and `whatsapp_phone_e164` is set: attempt a WhatsApp template send (`order_confirmed`, `order_shipped`, `order_delivered`, or `order_returned` template, matching the status). Wrap in try/catch — **a WhatsApp send failure must never throw out of the order-processing transaction or block subsequent steps.** Log the outcome to `MessageNotificationLog`.
3. Admin notification: send a WhatsApp template (`admin_new_order` with a "Mark as Shipped" quick-reply button, or `admin_return_alert`) to whitelisted `AdminUser.whatsapp_phone_e164` numbers, **and** always create/update the corresponding entry in the admin panel regardless of WhatsApp delivery outcome. The panel is the reliable path; WhatsApp is the convenience path.

### 4.5 WhatsApp Identity & Opt-In
Unlike the Telegram design, there's no separate "link your chat" flow: the phone number collected at checkout *is* the WhatsApp identity, converted to E.164 format, gated behind the explicit opt-in checkbox. If a customer opts in but their number isn't actually WhatsApp-registered, the send attempt fails gracefully (Cloud API returns an error), is logged, and the flow falls through to email having already been sent regardless.

### 4.6 Order Fulfillment
- Admin panel is the source of truth for status changes: "Mark as shipped," "Mark as delivered," "Mark as returned" are always available there.
- WhatsApp quick-reply buttons on the `admin_new_order` template offer the same actions as a convenience — tapping "Mark as Shipped" hits the same status-change code path via the webhook's interactive-reply handler.
- "Mark as returned" does not auto-refund or auto-restock in either path.

### 4.7 Admin Panel (minimal, but now load-bearing)
- Product CRUD.
- Order list with manual status controls (not just a read-only view — this is now the fallback for every WhatsApp-dependent action).
- Sales view: filter by date range/sector/status, export CSV, download invoice/receipt PDFs.
- Notification log view: see which orders had a failed WhatsApp send, so the owner knows to follow up manually if needed.

## 5. API Surface (representative, not exhaustive)
```
GET  /api/sectors
GET  /api/sectors/:slug/products
GET  /api/products/:slug
POST /api/checkout                → creates pending order + Paystack init
POST /api/webhooks/paystack        → payment confirmation (see 4.2)
POST /api/webhooks/whatsapp        → inbound messages + button replies (GET for Meta's verification handshake)
POST /api/cron/abandoned-sweep     → hourly job
GET  /api/admin/orders
POST /api/admin/orders/:id/status  → manual status change (shipped/delivered/returned/cancelled)
GET  /api/admin/sales?from&to&sector&status
GET  /api/admin/invoices/:id.pdf
GET  /api/admin/notifications      → notification log, for spotting failed WhatsApp sends
```

## 6. Order State Machine

```
pending_payment
    --[webhook: charge.success, verified, reference unseen]--> paid
    --[cron: age >= 48h, still unpaid]--> abandoned
    --[webhook arrives after abandonment]--> paid   (late payment still honored)
paid
    --[admin panel or WhatsApp button: mark shipped]--> shipped
    --[admin/customer-initiated refund]--> refunded
shipped
    --[admin panel or WhatsApp button: mark delivered]--> delivered
    --[admin panel or WhatsApp button: mark returned]--> returned
refunded, delivered, returned
    --> terminal in v1
```

## 7. Deployment
- Single Vercel project for the Next.js app (storefront + all API routes, including the WhatsApp webhook route, Paystack webhook route, and the cron route).
- WhatsApp webhook URL registered in the Meta App dashboard, with a verify token checked on the GET handshake request.
- Managed Postgres with daily automated backups.
- Environment secrets: `PAYSTACK_SECRET_KEY`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `DATABASE_URL`, storage keys, email API key.
