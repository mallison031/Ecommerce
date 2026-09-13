# Aura Store E-Commerce Production Emergency Runbook

**Version**: 1.0  
**Effective Date**: September 2026  
**Applicability**: Production Operations, Technical Leads, On-Call Engineers, Store Administrators

---

## 1. Incident Severity Definitions & Response SLAs

| Severity Level | Definition | Response SLA | Target Resolution | Escalation Contact |
| :--- | :--- | :--- | :--- | :--- |
| **P1 - Critical** | Full storefront outage, checkout/payment completely down, database unresponsive, severe data corruption. | < 15 minutes | < 2 hours | Engineering Lead & Store Owner |
| **P2 - Major** | Payment webhook delayed, one sector/category failing, courier dispatch API down, email/WhatsApp notification backlog. | < 30 minutes | < 4 hours | Backend Lead |
| **P3 - Moderate** | Admin reporting delay, non-critical UI bug, slow sitemap generation, minor promo code discrepancy. | < 2 hours | < 24 hours | On-duty Engineer |

---

## 2. Fast Health & Diagnostics Triage

Run these diagnostic commands immediately when an alert triggers:

```bash
# 1. Check Next.js server responsiveness
curl -I https://aurastore.ng/api/sectors

# 2. Verify database connection & exchange rates engine
curl -s https://aurastore.ng/api/currency/rates

# 3. Check recent admin notifications & critical alarms
curl -s -H "Cookie: admin_session=..." https://aurastore.ng/api/admin/notifications?limit=10

# 4. Check active error logs in terminal / hosting dashboard
tail -n 100 /path/to/logs/app.log | grep -E "ERROR|FATAL|500"
```

---

## 3. Playbook A: Paystack Gateway & Payment Webhook Outages

### Symptoms
- Customers report debit alerts from their banks, but order status remains `pending_payment`.
- Webhook endpoints returning `500` or `504 Gateway Timeout`.
- Paystack status dashboard indicates third-party NIBSS/switch downtime.

### Diagnostic Steps
1. Verify Paystack system health at `https://status.paystack.com/`.
2. Inspect the Paystack Dashboard > **Webhooks** tab for failed delivery attempts to `/api/webhooks/paystack`.
3. Check `Payment` table for matching reference:
   ```bash
   npx prisma studio
   # Or via database query:
   SELECT * FROM "Payment" WHERE "paystack_ref" = 'YOUR_REFERENCE';
   ```

### Remediation Workflow
1. **Replay Failed Webhooks**:
   - In Paystack Dashboard > Transactions, locate the successful transaction.
   - Click **"Resend Webhook"** to trigger `/api/webhooks/paystack`.
   - Our webhook endpoint is completely **idempotent** (Rule 23 / TEST 3): duplicate deliveries are safely ignored without double-decrementing inventory.
2. **Manual Reconciliation via Admin Settlement Studio**:
   - Navigate to `/admin` > **Sales Ledger & Settlements**.
   - Click **"Reconcile Reference"** and enter the Paystack transaction reference `T...`.
   - The system verifies the payment with Paystack API, flips order status to `paid`, decrements inventory, generates the fiscal Invoice and Receipt, and triggers customer notifications.
3. **If Paystack is Experiencing Prolonged Downtime**:
   - In `app/checkout/page.tsx`, the store displays Paystack with fallback bank transfer support.
   - Notify customers via WhatsApp support banner (`wa.me/2348000000000`).

---

## 4. Playbook B: Database Connection Exhaustion (Supabase / Prisma)

### Symptoms
- Error code `P2024`: "Timed out fetching a new connection from the connection pool."
- Error code `P1001`: "Can't reach database server at..."
- Slow response times on PDP and checkout pages.

### Remediation Workflow
1. **Switch to Transaction Pooler (Port 6543)**:
   - Ensure `DATABASE_URL` in `.env` uses Supabase PgBouncer pooler connection string (`pool_mode=transaction`) rather than direct port `5432`.
2. **Clear Idle Connections**:
   - Log in to Supabase Dashboard > Database > Connection Pools.
   - Check active clients count. If near pool ceiling (typically 15-20 on free/starter tiers), restart the database server or terminate dangling pooler processes.
3. **Recycle Server Instances**:
   - Restart the Next.js process to close any dangling Prisma Client singletons:
     ```bash
     npm run dev # or systemctl restart nextjs
     ```

---

## 5. Playbook C: Flash Sale Overselling & Inventory Race Conditions

### Symptoms
- An item with stock = 1 was purchased concurrently by two shoppers during peak traffic.
- Stock count reaches negative (`-1`) or second order fails at fulfillment.

### Remediation Workflow
1. **Identify Collision Order**:
   - Navigate to `/admin` > **Orders**. Filter by product name. Compare timestamps of paid orders.
2. **Prioritize Earliest Timestamp**:
   - The earliest confirmed payment receives the allocated warehouse unit.
3. **Resolve Second Order with Customer**:
   - **Option 1 (Wallet Credit + 10% Goodwill Bonus)**:
     - Open `/admin` > **Customer Wallet Top-Up**.
     - Credit customer's store wallet with the full order amount plus an extra ₦2,000 goodwill credit.
   - **Option 2 (Full Gateway Refund)**:
     - Go to Paystack Dashboard > Transactions > Refund.
     - Record refund in Aura Store via `/api/admin/returns` to reconcile the Sales Ledger.
4. **Subscribe Customer to Restock Priority**:
   - Add customer's email to `/api/products/[id]/notify-restock` so they receive first-priority alert when restocked.

---

## 6. Playbook D: Courier API / Logistics Partner Failures

### Symptoms
- Courier automated tracking link generation times out or returns partner errors (GIG, Speedaf, Fez, DHL).
- Dispatch team cannot print tracking labels.

### Remediation Workflow
1. **Fallback to Warehouse Dispatch Manifest**:
   - Open `/admin` > **Bulk Dispatch**.
   - Select pending orders ready for pickup.
   - Click **"Download HTML Warehouse Manifest"** or **"Export CSV Dispatch Sheet"**.
   - Hand the physical printed manifest and parcel batches to the pickup courier driver.
2. **Manual Tracking Number Entry**:
   - Once courier provides physical consignment notes, open `/admin` > Order row > **Dispatch Order**.
   - Input the manual waybill/consignment number.
   - Order status immediately transitions to `shipped`, generating the 4-milestone tracking timeline on `/track-order`.
   - Direct WhatsApp status update is dispatched to customer automatically.

---

## 7. Playbook E: NDPR Compliance & Privacy Emergency

### Regulation
Nigerian Data Protection Regulation (NDPR) / Nigeria Data Protection Act (NDPA).

### Procedures
1. **1-Click Unsubscribe Requests**:
   - All automated marketing drips contain an instant 1-click unsubscribe link (`/api/customer/unsubscribe?token=...`).
   - If a customer requests manual exclusion, run:
     ```bash
     # Directly opt out customer from marketing
     curl -X POST https://aurastore.ng/api/customer/unsubscribe -H "Content-Type: application/json" -d '{"email":"customer@email.com"}'
     ```
2. **Data Erasure / Right to Be Forgotten**:
   - Anonymize personal identification while preserving accounting ledger compliance (invoices & receipts must retain legal transaction totals for audit).

---

## 8. Emergency Contacts & Escalation Directory

| Role | Contact Channel | Escalation Trigger |
| :--- | :--- | :--- |
| **Primary Engineering On-Call** | WhatsApp / Phone: `+234 800 000 0000` | P1 outages > 10 min, unhandled crashes |
| **Store Operations / Warehouse** | Email: `dispatch@aurastore.ng` | Logistics backlog, damaged shipments |
| **Customer Support Lead** | Email: `support@aurastore.ng` | Escalated customer disputes, chargebacks |
| **Paystack Merchant Support** | `support@paystack.com` | Payment switch downtime, settlement delays |
| **Hosting / Infrastructure** | Vercel / Cloud Dashboard | DNS outage, edge routing failures |

---

## 9. Post-Mortem Template

Following resolution of any P1 or P2 incident, complete this post-mortem within 24 hours:

```markdown
# Incident Post-Mortem: [INCIDENT-ID] - [Brief Summary]

**Date & Time**: YYYY-MM-DD HH:MM WAT  
**Duration**: X hours Y minutes  
**Lead Responder**: [Name]  
**Severity**: [P1 / P2]

### 1. Root Cause Analysis (5 Whys)
- What happened?
- Why did it happen?
- Why did our monitoring not catch it sooner?

### 2. Customer Impact
- Number of affected orders:
- Total revenue at risk:
- Customer complaints received:

### 3. Immediate Corrective Actions Taken
- [Action 1]
- [Action 2]

### 4. Preventative Long-Term Fixes
- [ ] Task 1: Add automated alert
- [ ] Task 2: Implement circuit breaker
- [ ] Task 3: Update integration test simulation
```
