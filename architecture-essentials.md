# Architecture Essentials — Critical Decisions Only

For full detail see architecture.md. This file is the "if you only read one page" version.

## Decisions and why

| Decision | Choice | Rejected alternative | Why rejected |
|---|---|---|---|
| Payment provider | Paystack | Stripe direct | Stripe has no Nigeria merchant support without a foreign entity. [Certain] |
| Messaging provider | WhatsApp, Meta Cloud API direct | Telegram Bot API | Your explicit decision. Trades Telegram's free-form, no-verification-needed model for WhatsApp's larger reach at the cost of template approval and business verification gates. |
| Messaging provider | Meta Cloud API direct | Twilio / 360dialog (BSP) | Direct is free at the API layer and gives full control, but you own setup, verification, and template submission with no vendor support line. This was an explicit trade-off you made, not a default. |
| Backend topology | Single Next.js monolith | Separate microservices | Order volume for a boutique 4-sector store doesn't justify the operational overhead. |
| Payment truth source | Server-verified webhook (+ Verify Transaction API call) | Trusting the browser's post-payment redirect | Redirects can be faked or interrupted; webhook + verify is the only server-authoritative signal. |
| Stock handling | Decrement on confirmed payment, no pre-payment reservation | Reserve stock for N minutes at checkout | Reservation prevents overselling but adds real complexity. Deferred — see "what will break." |
| Customer identity for WhatsApp | Checkout phone number doubles as WhatsApp ID, gated by explicit opt-in | Separate "link your account" flow (as Telegram required) | WhatsApp identity is just a phone number, already collected. A separate linking step would be pure friction with no benefit. |
| Compliance | Explicit opt-in checkbox at checkout, unchecked by default | Treat "gave us your phone number" as implied WhatsApp consent | Meta expects clear opt-in before business-initiated template messages. Messaging without it risks the number's quality rating and, at scale, restriction. Not worth it for a first version. |
| Admin fulfillment actions | Admin panel is the source of truth; WhatsApp buttons are a convenience layer on top | WhatsApp-only fulfillment (no panel) | WhatsApp delivery now depends on template approval status, business verification, and Meta's quality-rating system — none of which existed as failure modes with Telegram. Making order fulfillment depend solely on WhatsApp being healthy is a new single point of failure that wasn't there before, so the panel keeps full manual control independently. |
| Notification channel | Email always sent; WhatsApp attempted only if opted-in, failures logged and swallowed | WhatsApp as primary, email as afterthought | WhatsApp send failures (unregistered number, template not yet approved, account temporarily restricted) are now a real, non-trivial failure mode. Email is the channel that can't be throttled or gated by a third party's review process. |
| Cart-recovery reminder | Email only, no WhatsApp reminder | WhatsApp reminder for abandoned carts | A business-initiated "come back and finish buying" message sits close to marketing in Meta's categorization. Risking template rejection or quality-rating damage for one reminder isn't worth it. |
| Invoice numbering | DB sequence | UUID or `COUNT(*)+1` | UUIDs aren't acceptable for accounting; `COUNT()+1` race-conditions under concurrent orders. |
| Website support surface | Link out to WhatsApp (`wa.me`) | Embedded live-chat widget | Support channel is WhatsApp by design; a second parallel chat UI duplicates it for no benefit. |
| Returned/failed delivery | `returned` order state, manual owner decision on refund/restock | Auto-refund and auto-restock | The reason for a return changes what should happen next; automating the decision risks getting it wrong. |

## What will break (ranked by likelihood)

1. **Launch blocked by Business Verification, not code.** Meta Cloud API in unverified mode can only message a handful of pre-registered test recipients. You cannot message real customers until Meta approves your Business Verification (business documents, e.g. a CAC certificate for a Nigerian entity). This is a real external dependency with a review queue you don't control — treat it as a project-plan risk, not a technical task. [Certain]
2. **Message templates take time to approve, and can be rejected.** Every distinct WhatsApp message pattern (order confirmed, shipped, delivered, returned, admin new-order alert) needs a Meta-approved template before it can be sent business-initiated. Wording that reads as promotional, or that doesn't match the declared category, gets rejected and needs resubmission. Build and submit these early, not the week you plan to launch.
3. **Duplicate webhook processing (Paystack)** — same risk as before, unrelated to the messaging swap. Idempotency check on `paystack_reference` is non-negotiable.
4. **Overselling on concurrent last-unit checkout** — unchanged risk, stock isn't reserved at checkout start.
5. **WhatsApp number quality-rating throttling** — if messages are marked as spam, blocked, or reported by too many recipients (which is more likely if opt-in isn't respected), Meta can throttle or restrict the number's ability to send. The admin-panel fallback (see decisions table) exists specifically so this doesn't take down order fulfillment, only the convenience layer.
6. **A customer's checkout phone number isn't actually a WhatsApp number, or isn't in a format Meta accepts.** Send attempt fails; must degrade to "already sent via email" rather than erroring the whole notification step.
7. **Sequential invoice numbers under concurrent writes** — unchanged risk, mitigated by generating numbers inside the confirmation transaction.

## Edge cases not yet handled
- Partial refunds / partial order cancellation.
- A product deactivated mid-cart.
- Currency: Paystack transacts in NGN by default; USD/international payment isn't modeled.
- VAT/tax line items — not modeled.
- A customer who opts in to WhatsApp at checkout but later blocks/reports the business number — no handling to auto-clear `whatsapp_opt_in` on a delivery failure signal from Meta; currently just logs and keeps retrying on future orders, which could itself contribute to the quality-rating risk above if not addressed.
- Template rejected by Meta after submission — no fallback content plan is defined; you'd need to revise wording and resubmit, delaying that specific notification type (others can still ship independently).
- Admin's own WhatsApp number changing or being unreachable — no secondary admin contact method is modeled beyond the panel itself (which is, deliberately, the reliable path).

## What's over-engineered if built as originally implied
- **Full accounting software** for "record sales easily" — a sales table + CSV export is enough.
- **Microservices split** for bot/storefront/orders — one app is sufficient at this scale.
- **AI-generated bot replies** — start rule-based with human escalation.
- **Custom RBAC/admin roles** — email+password for 1–2 admins is enough.
- **Stock reservation system** — real complexity for a currently-theoretical risk.
- **Elasticsearch or dedicated search** for a four-sector catalog — Postgres full-text search is enough.
- **Multi-touch cart recovery / marketing automation** — one reminder email is the right scope.
- **A BSP (Twilio/360dialog) abstraction layer "just in case you switch later"** — you chose direct Meta Cloud API; building a provider-agnostic messaging abstraction now, before you've shipped a single template, is speculative work against a decision you already made.
