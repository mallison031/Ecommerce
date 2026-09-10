# PRD — Multi-Sector E-Commerce Store with WhatsApp-Based Customer Service

## 1. Summary
A storefront selling physical products across four sectors — Jewelry & Accessories, Girly Essentials, Content Accessories, Kitchen/Souvenirs — with checkout via Paystack, customer service and order notifications handled through WhatsApp (Meta Cloud API), automated order processing, and automated invoice/receipt/sales-record generation.

**Note on payment provider:** Stripe does not support merchant accounts registered in Nigeria directly. Paystack (Stripe-owned, Nigeria-native) is used instead.

**Note on messaging provider:** WhatsApp (Meta Cloud API, connected directly rather than through a paid BSP) replaces the originally-planned Telegram bot, per your decision. This is a materially different messaging model — see architecture-essentials.md for what that changes. The biggest consequences for this PRD: (a) messages the business sends *without* the customer messaging first must use a Meta-approved template, and (b) sending real order-update messages to real customers requires Meta Business Verification, which is a launch-blocking step, not a background task.

## 2. Goals
- Let customers browse products by sector and check out without creating an account.
- Handle pre-sale questions and post-sale support through WhatsApp, not a live-chat widget.
- Process an order end-to-end (payment → stock update → invoice → receipt → sales record → notifications) with zero manual steps for the happy path — and without the whole flow depending on WhatsApp delivery succeeding.
- Recover as much of the "customer almost bought but didn't" path as is reasonable without building a full marketing-automation system.
- Give the owner a way to see sales and pull records for accounting without opening a spreadsheet by hand.

## 3. Non-Goals (explicitly out of scope for v1)
- Multi-vendor marketplace features (single seller only).
- Customer accounts / login / order history portal.
- In-house live chat widget on the website (WhatsApp is the support surface).
- International shipping logistics, multi-currency pricing, or tax-by-jurisdiction calculation.
- Native mobile app.
- AI-generated bot replies. Bot starts rule-based with human handoff; AI auto-reply is a future consideration, not a v1 requirement.
- Multi-touch cart recovery campaigns (drip sequences, repeated retargeting). One reminder is in scope; a marketing funnel is not.
- WhatsApp marketing messages of any kind. Everything sent is a transactional/utility template tied to an actual order or support interaction — never promotional content — because marketing templates have stricter opt-in and quality-rating consequences that aren't worth the risk for v1.

## 4. Users
- **Shopper**: browses sectors, buys as guest, contacts support via WhatsApp button/link.
- **Owner/Admin**: manages products, fulfills orders, answers WhatsApp support messages, pulls sales records. Receives order alerts and fulfillment actions via WhatsApp, with the admin panel as a required fallback (not optional) for every action WhatsApp can trigger.
- **WhatsApp bot**: automated front line for FAQs (shipping time, returns, "where's my order"), escalates to owner when it can't answer.

## 5. Core Features

### 5.1 Storefront
- Home page with sector navigation: Jewelry & Accessories, Girly Essentials, Content Accessories, Kitchen/Souvenirs.
- Product listing per sector, product detail page (images, price, description, stock status).
- Cart (session-based, no login required) and checkout form (name, phone, delivery address, email — email is required and remains the universal fallback; phone is required for delivery and doubles as the customer's WhatsApp identity **only if they opt in**).
- **Explicit WhatsApp opt-in checkbox at checkout** ("Send my order updates via WhatsApp"), unchecked by default, separate from the required email field. If unchecked, or if the number isn't reachable on WhatsApp, all notifications fall back to email silently — this is expected behavior, not an error.
- Footer/header links to TikTok, Instagram, WhatsApp click-to-chat (`wa.me` link for support).
- Prominent "Chat with us on WhatsApp" entry point.

### 5.2 WhatsApp Bot (Customer Service)
- Answers common questions via quick-reply buttons/list messages (shipping time, payment methods, return policy, track order by order ID) when the customer messages first — this opens a 24-hour free-form conversation window in which the bot can reply without a template.
- Lets a customer check order status by order ID or phone number.
- Escalates unanswered questions to the owner (forwarded to the owner's WhatsApp or the admin panel) with a "human will reply" acknowledgment.
- Sends automatic order status updates (paid, shipped, delivered, returned) to customers who opted in, using pre-approved templates — this works regardless of whether the customer has messaged the bot before.

### 5.3 Checkout & Payment
- Paystack Checkout (hosted or inline popup) for card, bank transfer, USSD.
- On successful payment: order is marked paid automatically via Paystack webhook (not by trusting the browser redirect).
- Failed/abandoned payments do not create a paid order or touch stock, but are no longer a dead end — see 5.4.

### 5.4 Automated Order Processing
On confirmed payment, without manual intervention:
1. Order status → Paid.
2. Stock decremented per line item.
3. Invoice (pre-payment-style record) and Receipt (post-payment proof) generated as PDFs.
4. Sales ledger entry recorded.
5. Customer notified — WhatsApp template if opted in and the send succeeds, **email always as the backstop** regardless of WhatsApp outcome. WhatsApp send failure never blocks order processing (see architecture-essentials.md).
6. Owner notified via WhatsApp (template with a "Mark as Shipped" quick-reply button) **and** the alert appears in the admin panel regardless of whether the WhatsApp message was deliverable.

**Abandoned checkout handling:** an order sitting in `pending_payment` is not left to rot silently.
- At 1 hour with no payment confirmation, the customer gets one reminder email (checkout link). No WhatsApp reminder — a business-initiated "come back and buy" message reads closer to marketing than a utility notification, and isn't worth the compliance risk for one reminder. Email only.
- At 48 hours with still no payment, the order is marked `abandoned` for reporting purposes. No stock action is needed here since stock was never reserved at checkout start.

**Delivery failure:** if a courier returns a shipped package, the admin marks the order `returned` from the admin panel (WhatsApp button as a convenience, panel as the reliable path). This does not auto-refund or auto-restock — the owner decides both manually.

### 5.5 Invoicing, Receipts, Sales Records
- Every paid order produces an invoice and a receipt PDF, sequentially numbered, downloadable by the owner.
- Sales are queryable/exportable (CSV) by date range and by sector, for the owner's own bookkeeping — not a full accounting suite.

## 6. Success Criteria
- Owner can fulfill an order (see it, ship it, mark it) without touching the database directly, and without that ability depending on WhatsApp being up.
- Zero double-charges, zero oversold items under normal load (single-digit concurrent buyers).
- Every paid order has exactly one invoice and one receipt.
- No customer who successfully paid is left without a status notification via at least one channel (email, always; WhatsApp, if opted in and deliverable).
- Bot correctly answers the top ~10 FAQ intents within an open conversation window; anything else reaches the owner.

## 7. Open Questions (owner decisions still needed — not guessed on)
1. **Reminder email timing**: 1 hour / 48 hours are placeholders — confirm or adjust before build. *[Guessing these are reasonable defaults, not validated against your actual customer behavior.]*
2. **Delivery/shipping**: is fulfillment self-delivered in Lagos, courier-based, or pickup? Still not modeled beyond an address field and a status flag.
3. **VAT/tax**: are listed prices tax-inclusive? Not addressed in v1.
4. **Refund process**: manual owner action in v1, same as before.
5. **Business verification**: you'll need to submit business documents (e.g. CAC certificate) to Meta to lift the sandbox recipient limit before you can message real customers. This has to happen before launch, and Meta's review time isn't fully in your control — plan for it as a schedule risk, not a formality.
