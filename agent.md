# agent.md — Guide for AI coding agents working on this repo

Read PRD.md, architecture.md, and architecture-essentials.md before making structural changes. This file is operational: how to work in the codebase, not what to build.

## Project shape (target structure)
```
/app                    → Next.js App Router pages (storefront)
  /(storefront)/[sector]/[product]
  /admin/...             → admin panel — this is the reliable path for order status, not a fallback UI
  /api
    /checkout
    /webhooks/paystack
    /webhooks/whatsapp
    /cron/abandoned-sweep
    /admin/...
/lib
  /db                     → Prisma client, transactions
  /paystack                → Paystack SDK wrapper, verify helper
  /whatsapp                → Cloud API send/receive helpers, template registry
  /notify                  → shared status-change notification function (see rule 6)
  /pdf                     → invoice/receipt generation
/prisma/schema.prisma
```

## Non-negotiable rules
1. **Never treat the browser redirect as payment confirmation.** Order status only ever flips to `paid` inside the Paystack webhook handler, after signature verification + idempotency check.
2. **Paystack webhook handlers must be idempotent** on `paystack_reference`.
3. **Stock decrement and order-status-to-paid happen in one DB transaction.**
4. **Invoice/receipt numbers come from a DB sequence** inside the confirmation transaction, not `count()+1`, not UUIDs.
5. **Never overwrite `OrderItem.product_name_snapshot` / `unit_price_kobo_snapshot` from live product data.**
6. **All customer-facing status notifications go through one shared function** (`/lib/notify`), called for every transition to `paid`, `shipped`, `delivered`, `returned`. Email is sent unconditionally inside this function. WhatsApp is attempted only if `Customer.whatsapp_opt_in` is true, and only after the email send has been kicked off — not instead of it.
7. **A WhatsApp send failure must never throw out of `/lib/notify` or block order processing.** Catch it, write a `MessageNotificationLog` row with `status=failed`, move on. This function's job is "best-effort notify," not "guarantee WhatsApp delivery."
8. **Never send a WhatsApp message using a template that isn't in the approved-template registry** (`/lib/whatsapp/templates.ts` or equivalent, mapping template name → Meta template ID + approval status). If a needed template doesn't exist or isn't approved yet, log and skip the WhatsApp attempt — don't invent a freeform business-initiated message as a workaround; that's exactly the policy violation the opt-in/template system exists to prevent.
9. **Check `Customer.whatsapp_opt_in` and a valid `whatsapp_phone_e164` before every WhatsApp send attempt.** No opt-in, no attempt, full stop — not even for what feels like an obviously-wanted message (e.g. "your payment failed").
10. **Inbound WhatsApp webhook messages must be routed by sender number**: check against `AdminUser.whatsapp_phone_e164` first (admin command handling — status changes, order lookups) before falling through to customer FAQ/support handling.
11. **The admin panel must have a fully independent path for every action a WhatsApp button can trigger** (mark shipped, mark delivered, mark returned). Do not build a WhatsApp-button-only action with no panel equivalent — see architecture-essentials.md's fulfillment decision.
12. **`abandoned` is not terminal.** A late Paystack webhook for an `abandoned` order must still transition it to `paid` normally.
13. **`returned` orders never auto-refund or auto-restock.** Status change only.
14. **Don't add a website live-chat widget.** Support is WhatsApp-only by design.
15. **Don't add stock reservation, RBAC, microservice splits, AI bot replies, or a BSP abstraction layer unless explicitly requested.** All documented as deliberately deferred/rejected in architecture-essentials.md.

## Money handling
- Store all amounts as integer kobo (smallest currency unit), never floats.
- Format to Naira only at the display layer.

## When touching WhatsApp integration
- All outbound sends go through `/lib/whatsapp`, which wraps the Graph API `POST /{phone-number-id}/messages` call. Don't call the Graph API directly from route handlers.
- New message types require: (a) a template drafted and submitted to Meta, (b) approval confirmed, (c) an entry added to the template registry with its approved name/ID, in that order. Code that references a template name should assume it might not be approved yet in a given environment and fail gracefully, not throw.
- Webhook handler must respond to Meta's GET verification handshake (echoing the `hub.challenge` param when `hub.verify_token` matches) and must validate the `X-Hub-Signature-256` header on POST payloads using the app secret.
- Test against Meta's provided test phone number and the small set of allowlisted recipient numbers during development — production sending requires the app to be out of development mode.

## When touching payments
- Local development: use Paystack test mode keys and documented test cards.
- Any change to the Paystack webhook handler must be manually re-verified against Paystack's "resend webhook" tool for: a fresh success event, a duplicate/replayed event, and a success event for an order already in `abandoned` status.

## When touching the abandoned-cart cron job
- Must be safe to run concurrently with itself.
- Email only — do not add a WhatsApp reminder without an explicit PRD change (see architecture-essentials.md's rejected-alternatives table for why).

## Testing priorities (in order)
1. Paystack webhook idempotency.
2. Transactional integrity of payment confirmation.
3. Invoice/receipt number uniqueness under concurrent orders.
4. Notification behavior: email always sent; WhatsApp attempted only when opted-in; a simulated WhatsApp API failure must not affect order state or the email send.
5. Admin panel status-change actions work with WhatsApp integration fully disabled/mocked — this is the regression test for rule 11.
6. Abandoned-cart sweep idempotency and the late-payment-after-abandonment path.
7. Admin-vs-customer message routing in the WhatsApp webhook handler.

## Style
- TypeScript strict mode on.
- Prisma migrations committed with every schema change — never hand-edit the database in a deployed environment.
- No new top-level services/deployables without updating architecture.md first.
