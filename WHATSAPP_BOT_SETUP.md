# WhatsApp Bot Setup — Step-by-Step (Meta Cloud API, Direct)

This is a build/setup guide, not a design doc — see architecture.md for how this fits the rest of the system, and architecture-essentials.md for the trade-offs behind these choices.

**Read this first:** steps 1–5 are account/verification setup and are the actual critical path — they involve waiting on Meta, not writing code. Start them before you write any bot logic, because template approval and business verification can each take days and can be rejected, requiring resubmission.

---

## Phase 1 — Accounts and Access

### Step 1: Create a Meta Developer account and App
1. Go to `developers.facebook.com`, log in with a Facebook account (create one for the business if you don't want to use a personal account).
2. Click **My Apps → Create App**.
3. Choose the **Business** app type.
4. Name it something identifiable (e.g. "YourStore WhatsApp").
5. On the app dashboard, find **WhatsApp** in the product list and click **Set Up**.

### Step 2: Connect (or create) a Meta Business Account
1. If you don't already have one, Meta will prompt you to create a **Business Manager / Business Portfolio** during WhatsApp setup.
2. Fill in your business name and details as they appear on your official business documents — this matters later for Business Verification (Step 5), so don't use a casual/trading name that doesn't match your paperwork.

### Step 3: Get a test phone number and API credentials
1. In the app's WhatsApp → **API Setup** page, Meta provides a **free test phone number** automatically.
2. Note down: **Phone Number ID** and **WhatsApp Business Account ID** — both shown on this page.
3. Generate a **temporary access token** from the same page (valid ~24h) to confirm things work before setting up a permanent one.
4. Under "To" recipients, add your own phone number as a test recipient (you'll get a verification code via WhatsApp) — this is one of the small number of numbers you can message before Business Verification is complete.

### Step 4: Send a test message
1. Using the temporary token, send a test `hello_world` template message (Meta provides this pre-approved template for exactly this purpose) via the API Setup page's built-in "Send Message" button, or with `curl`:
```bash
curl -X POST "https://graph.facebook.com/v20.0/<PHONE_NUMBER_ID>/messages" \
  -H "Authorization: Bearer <TEMP_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "<YOUR_TEST_NUMBER_E164>",
    "type": "template",
    "template": { "name": "hello_world", "language": { "code": "en_US" } }
  }'
```
2. Confirm you receive it on WhatsApp. If this doesn't work, nothing downstream will — fix this before proceeding.

### Step 5: Apply for Business Verification (start this now — it's the long pole)
1. In Meta Business Settings → **Business Verification**, submit your business documents (for a Nigerian business, typically your CAC certificate, and proof of business address/utility bill as requested).
2. This review can take anywhere from under a day to well over a week, and can bounce back requesting more documents.
3. Until this is approved, your WhatsApp integration stays in **development mode**: you can only message the small number of test recipients you manually added in Step 3, not real customers. Everything in Phase 2–4 below can be built and tested in this mode — you just can't go live to real customers until this step clears.

### Step 6: Generate a permanent access token
1. Once you have a verified business, go to Business Settings → **System Users**, create a system user (e.g. "whatsapp-api-bot") with **Admin** role on the app.
2. Generate a token for that system user with the `whatsapp_business_messaging` and `whatsapp_business_management` permissions, set to **never expire** (or the longest available duration).
3. Store this as `WHATSAPP_ACCESS_TOKEN` in your app's environment secrets. Treat it like a database password — if it leaks, revoke and regenerate it immediately from the same System Users page.

---

## Phase 2 — Webhook (Receiving Messages)

### Step 7: Build the webhook endpoint
Your app needs one route that handles both:
- **GET** (Meta's verification handshake, sent once when you register the webhook)
- **POST** (actual incoming messages and button-reply events)

```ts
// /app/api/webhooks/whatsapp/route.ts (Next.js Route Handler, illustrative)
import crypto from "crypto";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const rawBody = await req.text();

  // Validate the request actually came from Meta before trusting the payload.
  const signature = req.headers.get("x-hub-signature-256") ?? "";
  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", process.env.WHATSAPP_APP_SECRET!)
      .update(rawBody)
      .digest("hex");
  if (signature !== expected) {
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  await handleWhatsAppEvent(payload); // route to admin-command or customer-FAQ handling
  return new Response("OK", { status: 200 });
}
```

### Step 8: Register the webhook with Meta
1. In the App dashboard → WhatsApp → **Configuration**, set the **Callback URL** to your deployed endpoint (`https://yourdomain.com/api/webhooks/whatsapp`) and set a **Verify Token** of your choosing — this must match `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in your app.
2. Click **Verify and Save** — Meta will call your GET handler; if it doesn't return the challenge correctly, this fails immediately and tells you why.
3. Under **Webhook fields**, subscribe to `messages` (this covers both text messages and interactive button replies).

### Step 9: Route inbound events by sender
Inside `handleWhatsAppEvent`, the payload structure gives you the sender's phone number (`from`) and message content. Route it:
```
IF from is in AdminUser.whatsapp_phone_e164 list:
    handle as admin command (order lookup, status change via button reply)
ELSE:
    handle as customer message (FAQ intent match, order tracking, or escalate to SupportTicket)
```
This mirrors the bot-logic algorithm in the PRD/architecture docs — implement the same intent-matching and fallback-to-ticket behavior described there.

---

## Phase 3 — Sending Messages (Templates)

### Step 10: Design your message templates
You need one approved template per business-initiated message type. Draft these now, in Meta's Template Manager (Business Manager → WhatsApp Manager → Message Templates):

| Template name | Category | Variables | Buttons |
|---|---|---|---|
| `order_confirmed` | Utility | order number, total, sector summary | — |
| `order_shipped` | Utility | order number, estimated delivery | — |
| `order_delivered` | Utility | order number | — |
| `order_returned` | Utility | order number | — |
| `admin_new_order` | Utility | order number, customer name, total | Quick reply: "Mark as Shipped" |
| `admin_return_alert` | Utility | order number | — |

Keep wording factual and transactional ("Your order #1042 has shipped") — anything that reads as promotional risks being categorized as Marketing (stricter rules) or rejected outright.

### Step 11: Submit templates for approval
1. In WhatsApp Manager → Message Templates → **Create Template**, fill in name, category (**Utility** for all of the above), language, and body text with `{{1}}`, `{{2}}` placeholders for variables.
2. For `admin_new_order`, add a **Quick Reply** button with text "Mark as Shipped."
3. Submit. Review typically takes minutes to a couple of days; you'll be notified of approval or rejection (with a reason) in the same dashboard.
4. Once approved, note the exact template name — this is what you'll reference in code.

### Step 12: Build the template registry and send helper
```ts
// /lib/whatsapp/templates.ts
export const TEMPLATES = {
  order_confirmed: { name: "order_confirmed", approved: true },
  order_shipped: { name: "order_shipped", approved: true },
  order_delivered: { name: "order_delivered", approved: false }, // flip once Meta approves
  order_returned: { name: "order_returned", approved: false },
  admin_new_order: { name: "admin_new_order", approved: true },
  admin_return_alert: { name: "admin_return_alert", approved: false },
} as const;
```
```ts
// /lib/whatsapp/send.ts
export async function sendWhatsAppTemplate(to: string, templateKey: keyof typeof TEMPLATES, variables: string[]) {
  const template = TEMPLATES[templateKey];
  if (!template.approved) {
    await logNotification({ channel: "whatsapp", template: templateKey, status: "skipped" });
    return { skipped: true };
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template.name,
          language: { code: "en_US" },
          components: [{ type: "body", parameters: variables.map((v) => ({ type: "text", text: v })) }],
        },
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    await logNotification({ channel: "whatsapp", template: templateKey, status: "sent" });
    return { skipped: false, success: true };
  } catch (err) {
    await logNotification({ channel: "whatsapp", template: templateKey, status: "failed" });
    return { skipped: false, success: false }; // caller must not throw — see agent.md rule 7
  }
}
```

### Step 13: Wire this into the shared `/lib/notify` function
Per agent.md rule 6/7: email sends unconditionally first; `sendWhatsAppTemplate` is called only if `Customer.whatsapp_opt_in` is true, wrapped so its failure can't affect order processing.

---

## Phase 4 — Checkout Opt-In and Admin Setup

### Step 14: Add the opt-in checkbox to checkout
Add an unchecked-by-default checkbox: "Send my order updates via WhatsApp." Store as `Customer.whatsapp_opt_in`. Convert the phone field to E.164 (`+234...`) for `whatsapp_phone_e164` only if checked.

### Step 15: Whitelist admin numbers
Add the owner's (and any staff's) WhatsApp number to `AdminUser.whatsapp_phone_e164` so inbound messages/button taps from that number are routed as admin actions (Step 9).

### Step 16: End-to-end test in development mode
Before requesting production access:
1. Add your test-buyer number and admin number as allowed recipients (Step 3).
2. Run a full order through: checkout → Paystack test payment → webhook fires → `order_confirmed` template arrives on the test number → mark shipped via admin panel → `order_shipped` template arrives → tap "Mark as Shipped" quick reply on the `admin_new_order` template and confirm the webhook handler updates order status correctly.
3. Force a WhatsApp send failure (e.g. temporarily revoke the token) and confirm the order still processes fully and the email still sends — this is the regression test for the whole reason the admin panel and email fallback exist.

### Step 17: Go live
Once Business Verification (Step 5) is approved and all required templates (Step 11) are approved:
1. Switch the app from development to live mode in the App Dashboard.
2. Confirm the permanent system-user token (Step 6) is in production environment secrets, not the temporary one from Step 3.
3. Send one real test order through with a real (consenting) customer before announcing the channel publicly.

---

## Launch checklist
- [ ] Business Verification approved
- [ ] All six templates submitted and approved (or explicitly deferred with `approved: false` in the registry and a fallback-to-email path confirmed working)
- [ ] Permanent system-user token in production secrets, temporary token discarded
- [ ] Webhook signature validation tested with an intentionally-wrong signature (should reject)
- [ ] Admin panel status controls tested with WhatsApp integration fully disabled
- [ ] Opt-in checkbox default-unchecked, confirmed no WhatsApp send is attempted for non-opted-in customers
- [ ] Notification log reviewed after first few real orders to confirm sends are actually succeeding, not silently failing
