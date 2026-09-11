import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "sk_test_sim_secret";
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET || "sim_app_secret";
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "sim_verify_token";

async function runTests() {
  console.log("=================================================");
  console.log("🚀 STARTING E-COMMERCE INTEGRATION TEST SUITE");
  console.log("=================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  // Helper assertions
  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      throw new Error(`Test assertion failed: ${testName}`);
    }
  }

  // Find a product to test with
  const product = await prisma.product.findFirst({
    where: { is_active: true },
    include: { sector: true },
  });

  if (!product) {
    throw new Error("No active product found in database. Please run prisma/seed.ts first.");
  }

  console.log(`Using product for tests: "${product.name}" (Initial stock: ${product.stock_qty})\n`);

  // --- TEST 1: Checkout API & Pending Order Creation ---
  console.log("--- TEST 1: Guest Checkout & Pending Order Creation ---");
  const checkoutPayload = {
    name: "Amina Adeleke",
    email: `amina_${Date.now()}@example.com`,
    phone: "08012345678",
    deliveryAddress: "14 Admiralty Way, Lekki Phase 1, Lagos",
    whatsappOptIn: true,
    items: [{ productId: product.id, quantity: 1 }],
  };

  const checkoutRes = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(checkoutPayload),
  });

  const checkoutData = await checkoutRes.json();
  assert(checkoutRes.ok && checkoutData.success === true, "Checkout returns authorizationUrl and orderId");

  const orderId = checkoutData.orderId;
  const initialOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, customer: true },
  });

  assert(initialOrder !== null, "Order created in database");
  assert(initialOrder?.status === "pending_payment", "Order status is 'pending_payment'");
  assert(initialOrder?.customer.whatsapp_opt_in === true, "Customer WhatsApp opt-in is true");
  assert(initialOrder?.customer.whatsapp_phone_e164 === "+2348012345678", "Phone formatted to E.164");
  console.log();

  // --- TEST 2: Paystack Webhook Processing & Atomic Fulfillment ---
  console.log("--- TEST 2: Paystack Webhook Payment Confirmation ---");
  const initialStock = product.stock_qty;
  const reference = `sim_test_${Date.now()}`;
  const webhookEvent = {
    event: "charge.success",
    data: {
      id: 999999,
      reference,
      amount: initialOrder!.total_kobo,
      status: "success",
      metadata: {
        orderId: initialOrder!.id,
        orderNumber: initialOrder!.order_number,
      },
    },
  };

  const rawWebhookBody = JSON.stringify(webhookEvent);
  const signature = crypto.createHmac("sha512", PAYSTACK_SECRET).update(rawWebhookBody).digest("hex");

  const webhookRes = await fetch(`${BASE_URL}/api/webhooks/paystack`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-paystack-signature": signature,
    },
    body: rawWebhookBody,
  });

  const webhookData = await webhookRes.json();
  if (!webhookRes.ok || webhookData.success !== true) {
    console.error("WEBHOOK RES FAILED:", webhookRes.status, webhookData);
  }
  assert(webhookRes.ok && webhookData.success === true, "Webhook returns HTTP 200 success");

  // Verify database mutations
  const paidOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true, invoice: true, receipt: true, sales_ledger: true },
  });

  assert(paidOrder?.status === "paid", "Order status flipped to 'paid'");
  assert(paidOrder?.payment?.paystack_reference === reference, "Payment record created with reference");
  assert(paidOrder?.invoice?.invoice_number !== undefined, "Sequential invoice created");
  assert(paidOrder?.receipt?.receipt_number !== undefined, "Sequential receipt created");
  assert(paidOrder?.sales_ledger !== null, "Sales ledger entry recorded");

  // Verify stock decrement
  const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
  assert(updatedProduct?.stock_qty === initialStock - 1, "Product stock decremented by exactly 1");
  console.log();

  // --- TEST 3: Webhook Idempotency (Duplicate Event Delivery) ---
  console.log("--- TEST 3: Webhook Idempotency Verification ---");
  const duplicateWebhookRes = await fetch(`${BASE_URL}/api/webhooks/paystack`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-paystack-signature": signature,
    },
    body: rawWebhookBody,
  });

  const duplicateData = await duplicateWebhookRes.json();
  assert(duplicateWebhookRes.ok, "Duplicate webhook gracefully acknowledged with HTTP 200");
  assert(duplicateData.message === "Event already processed", "Idempotency recognized duplicate reference");

  // Confirm stock was NOT decremented again
  const productAfterDuplicate = await prisma.product.findUnique({ where: { id: product.id } });
  assert(productAfterDuplicate?.stock_qty === initialStock - 1, "Stock was not decremented a second time");
  console.log();

  // --- TEST 4: Rule 8 - Late Payment on Abandoned Order ---
  console.log("--- TEST 4: Late Payment on Abandoned Order (Rule 8) ---");
  const abandonedOrder = await prisma.order.create({
    data: {
      customer_id: initialOrder!.customer_id,
      status: "abandoned",
      subtotal_kobo: 500000,
      total_kobo: 500000,
      delivery_address: "Ikeja, Lagos",
      abandoned_at: new Date(),
      items: {
        create: [
          {
            product_id: product.id,
            product_name_snapshot: product.name,
            unit_price_kobo_snapshot: 500000,
            qty: 1,
            line_total_kobo: 500000,
          },
        ],
      },
    },
  });

  const lateRef = `sim_test_late_${Date.now()}`;
  const lateWebhookEvent = {
    event: "charge.success",
    data: {
      id: 999998,
      reference: lateRef,
      amount: 500000,
      status: "success",
      metadata: {
        orderId: abandonedOrder.id,
        orderNumber: abandonedOrder.order_number,
      },
    },
  };

  const lateRaw = JSON.stringify(lateWebhookEvent);
  const lateSig = crypto.createHmac("sha512", PAYSTACK_SECRET).update(lateRaw).digest("hex");

  const lateRes = await fetch(`${BASE_URL}/api/webhooks/paystack`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-paystack-signature": lateSig,
    },
    body: lateRaw,
  });

  if (!lateRes.ok) {
    console.error("LATE RES FAILED:", lateRes.status, await lateRes.text());
  }
  assert(lateRes.ok, "Late webhook for abandoned order returned HTTP 200");
  const orderAfterLatePayment = await prisma.order.findUnique({ where: { id: abandonedOrder.id } });
  assert(orderAfterLatePayment?.status === "paid", "Abandoned order correctly transitioned to 'paid'");
  console.log();

  // --- TEST 5: WhatsApp Webhook Handshake (GET) ---
  console.log("--- TEST 5: WhatsApp Handshake (GET) ---");
  const challengeCode = "challenge_xyz_987";
  const handshakeUrl = `${BASE_URL}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(
    WHATSAPP_VERIFY_TOKEN
  )}&hub.challenge=${challengeCode}`;

  const handshakeRes = await fetch(handshakeUrl);
  const handshakeText = await handshakeRes.text();

  assert(handshakeRes.status === 200, "WhatsApp GET handshake returns status 200");
  assert(handshakeText === challengeCode, "WhatsApp GET handshake echoes challenge string");
  console.log();

  // --- TEST 6: WhatsApp Customer Message Fallback to Support Ticket ---
  console.log("--- TEST 6: WhatsApp Message Triage to Support Ticket ---");
  const customerInboundEvent = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA_ID",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: { phone_number_id: "12345" },
              contacts: [{ wa_id: "2348099887766", profile: { name: "Chioma" } }],
              messages: [
                {
                  from: "2348099887766",
                  id: `wamid_${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "text",
                  text: { body: "Do you offer same-day delivery to Victoria Island?" },
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  };

  const rawWaBody = JSON.stringify(customerInboundEvent);
  const waSig = "sha256=" + crypto.createHmac("sha256", WHATSAPP_APP_SECRET).update(rawWaBody).digest("hex");

  const waPostRes = await fetch(`${BASE_URL}/api/webhooks/whatsapp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hub-signature-256": waSig,
    },
    body: rawWaBody,
  });

  assert(waPostRes.status === 200, "WhatsApp POST event returns 200 OK");

  const ticket = await prisma.supportTicket.findFirst({
    where: { whatsapp_phone_e164: "+2348099887766" },
    orderBy: { created_at: "desc" },
  });

  assert(ticket !== null, "Support ticket created in database for unhandled customer message");
  assert(ticket?.status === "open", "Support ticket status is 'open'");
  console.log();

  // --- TEST 7: Abandoned Cart Cron Sweep ---
  console.log("--- TEST 7: Abandoned Cart Cron Sweep ---");
  const cronRes = await fetch(`${BASE_URL}/api/cron/abandoned-sweep`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET || "sim_cron_secret"}`,
    },
  });

  const cronData = await cronRes.json();
  assert(cronRes.ok && cronData.success === true, "Cron sweep endpoint executes and returns success");
  console.log();

  // --- TEST 8: Two-Way WhatsApp Interactive Bot Order Tracking Inquiry ---
  console.log("--- TEST 8: WhatsApp Bot Order Tracking Inquiry ---");
  const botTrackInboundEvent = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA_ID",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: { phone_number_id: "12345" },
              contacts: [{ wa_id: "2348099887766", profile: { name: "Chioma" } }],
              messages: [
                {
                  from: "2348099887766",
                  id: `wamid_track_${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "text",
                  text: { body: `track #${paidOrder?.order_number}` },
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  };

  const rawBotTrack = JSON.stringify(botTrackInboundEvent);
  const botTrackSig = "sha256=" + crypto.createHmac("sha256", WHATSAPP_APP_SECRET).update(rawBotTrack).digest("hex");

  const botTrackRes = await fetch(`${BASE_URL}/api/webhooks/whatsapp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hub-signature-256": botTrackSig,
    },
    body: rawBotTrack,
  });

  assert(botTrackRes.status === 200, "WhatsApp bot handles tracking inquiry with HTTP 200");
  const botLog = await prisma.messageNotificationLog.findFirst({
    where: {
      order_id: paidOrder?.id,
      template_name: "bot_text_reply",
    },
  });
  assert(botLog !== null, "WhatsApp bot recorded outgoing text reply in MessageNotificationLog");
  console.log();

  // --- TEST 9: Admin Support Ticket Management API ---
  console.log("--- TEST 9: Admin Support Ticket Management API ---");
  const getTicketsRes = await fetch(`${BASE_URL}/api/admin/tickets`);
  assert(getTicketsRes.status === 200, "Admin tickets endpoint returns HTTP 200");
  const ticketsData = await getTicketsRes.json();
  assert(Array.isArray(ticketsData.tickets) && ticketsData.tickets.length > 0, "Admin tickets endpoint returned tickets array");

  if (ticket) {
    const updateTicketRes = await fetch(`${BASE_URL}/api/admin/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: ticket.id, status: "closed" }),
    });
    assert(updateTicketRes.status === 200, "Admin updated support ticket status with HTTP 200");
    const updatedTicketFromDb = await prisma.supportTicket.findUnique({ where: { id: ticket.id } });
    assert(updatedTicketFromDb?.status === "closed", "Support ticket status updated to 'closed' in DB");
  }
  console.log();

  // --- TEST 10: 1-Click Checkout Resume API ---
  console.log("--- TEST 10: 1-Click Checkout Resume API ---");
  const abandonedCheckoutRes = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Titi Adeyemi",
      email: "titi.adeyemi@example.com",
      phone: "08034567890",
      deliveryAddress: "12 Admiralty Way, Lekki Phase 1, Lagos",
      whatsappOptIn: true,
      items: [{ productId: product.id, quantity: 1 }],
    }),
  });
  const abandonedCheckoutData = await abandonedCheckoutRes.json();
  assert(abandonedCheckoutData.success === true, "Pending cart checkout created for recovery simulation");
  const testOrderId = abandonedCheckoutData.orderId;

  const resumeGetRes = await fetch(`${BASE_URL}/api/checkout/resume?orderId=${testOrderId}`);
  assert(resumeGetRes.status === 200, "Checkout resume GET returns HTTP 200");
  const resumeGetData = await resumeGetRes.json();
  assert(resumeGetData.success === true, "Checkout resume GET reports success: true");
  assert(Array.isArray(resumeGetData.order.items) && resumeGetData.order.items.length > 0, "Checkout resume contains snapshot items");

  const resumePostRes = await fetch(`${BASE_URL}/api/checkout/resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: testOrderId, discountCode: "SAVE5" }),
  });
  assert(resumePostRes.status === 200, "Checkout resume POST returns HTTP 200");
  const resumePostData = await resumePostRes.json();
  assert(resumePostData.success === true, "Checkout resume POST returns success: true");
  assert(typeof resumePostData.authorizationUrl === "string", "Checkout resume generates authorization URL");
  assert(resumePostData.discountAppliedKobo > 0, "Checkout resume successfully applied 5% discount");
  console.log();

  // --- TEST 11: Abandoned Cart Sweep & Admin Recovery API ---
  console.log("--- TEST 11: Abandoned Cart Sweep & Admin Recovery API ---");
  const sweepRes = await fetch(`${BASE_URL}/api/cron/abandoned-sweep`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CRON_SECRET || "sim_cron_secret"}`,
    },
    body: JSON.stringify({ thresholdMinutes: 0 }),
  });
  assert(sweepRes.status === 200, "Cron sweep endpoint returns HTTP 200");
  const sweepData = await sweepRes.json();
  assert(sweepData.success === true, "Cron sweep executed successfully");

  const recoveryLog = await prisma.messageNotificationLog.findFirst({
    where: {
      order_id: testOrderId,
      template_name: "abandoned_cart_email",
    },
  });
  assert(recoveryLog !== null, "Abandoned cart sweep logged recovery email in MessageNotificationLog");

  const adminAbandonedGetRes = await fetch(`${BASE_URL}/api/admin/abandoned`);
  assert(adminAbandonedGetRes.status === 200, "Admin abandoned GET returns HTTP 200");
  const adminAbandonedData = await adminAbandonedGetRes.json();
  assert(adminAbandonedData.success === true, "Admin abandoned API returns success");
  assert(adminAbandonedData.metrics.remindersSentCount >= 1, "Admin recovery metrics track dispatched reminders");

  const adminTriggerRes = await fetch(`${BASE_URL}/api/admin/abandoned`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: testOrderId }),
  });
  assert(adminTriggerRes.status === 200, "Admin manual recovery reminder trigger returns HTTP 200");
  const adminTriggerData = await adminTriggerRes.json();
  assert(adminTriggerData.success === true, "Admin manual recovery trigger succeeded");
  console.log();

  // --- TEST 12: Nigerian Dynamic Shipping Engine & Checkout Fee Integration ---
  console.log("--- TEST 12: Nigerian Dynamic Shipping Engine & Checkout Integration ---");
  const shippingInfoRes = await fetch(`${BASE_URL}/api/shipping/calculate`);
  assert(shippingInfoRes.status === 200, "Shipping info GET returns HTTP 200");
  const shippingInfo = await shippingInfoRes.json();
  assert(Array.isArray(shippingInfo.states) && shippingInfo.states.length >= 36, "Shipping API returns Nigerian states");
  assert(shippingInfo.freeShippingThresholdKobo === 5000000, "Free shipping threshold is ₦50,000");
  assert(Array.isArray(shippingInfo.lagosZones) && shippingInfo.lagosZones.length >= 8, "Shipping API returns expanded Lagos zones (8+ zones)");
  assert(shippingInfo.expressAddonKobo === 450000, "Same-day express add-on reflects 200% increase to ₦4,500");

  // Test Lagos Lekki / Ajah calculation
  const lekkiCalcRes = await fetch(`${BASE_URL}/api/shipping/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: "Lagos", lagosZone: "lagos_lekki_ajah", subtotalKobo: 1500000 }),
  });
  assert(lekkiCalcRes.status === 200, "Lekki/Ajah shipping calculation returns HTTP 200");
  const lekkiCalc = await lekkiCalcRes.json();
  assert(lekkiCalc.shippingFeeKobo === 300000, "Lekki/Ajah base fee is ₦3,000");

  // Test Lagos Mainland calculation
  const lagosMainlandCalcRes = await fetch(`${BASE_URL}/api/shipping/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: "Lagos", lagosZone: "lagos_mainland", subtotalKobo: 1500000 }),
  });
  assert(lagosMainlandCalcRes.status === 200, "Lagos Mainland shipping calculation returns HTTP 200");
  const lagosMainlandCalc = await lagosMainlandCalcRes.json();
  assert(lagosMainlandCalc.shippingFeeKobo === 200000, "Lagos Mainland base fee is ₦2,000");
  assert(lagosMainlandCalc.isFreeDelivery === false, "Subtotal under ₦50k does not qualify for free delivery");

  // Test Interstate Abuja calculation
  const abujaCalcRes = await fetch(`${BASE_URL}/api/shipping/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: "Abuja (FCT)", subtotalKobo: 1500000 }),
  });
  assert(abujaCalcRes.status === 200, "Abuja shipping calculation returns HTTP 200");
  const abujaCalc = await abujaCalcRes.json();
  assert(abujaCalc.shippingFeeKobo === 400000, "Abuja interstate fee is ₦4,000");

  // Test Free Delivery qualification
  const freeShippingCalcRes = await fetch(`${BASE_URL}/api/shipping/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: "Rivers", subtotalKobo: 6000000 }),
  });
  assert(freeShippingCalcRes.status === 200, "Free shipping qualification calculation returns HTTP 200");
  const freeShippingCalc = await freeShippingCalcRes.json();
  assert(freeShippingCalc.isFreeDelivery === true, "Subtotal over ₦50k qualifies for free delivery");
  assert(freeShippingCalc.shippingFeeKobo === 0, "Free delivery results in ₦0 shipping fee");

  // Test Dynamic Checkout with Lagos Island + Express add-on
  const shippingCheckoutRes = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Bolanle Cole",
      email: "bolanle.cole@example.com",
      phone: "08098765432",
      deliveryAddress: "Penthouse 4, Ocean Parade, Banana Island",
      state: "Lagos",
      lagosZone: "lagos_island",
      isExpress: true,
      whatsappOptIn: true,
      items: [{ productId: product.id, quantity: 1 }],
    }),
  });
  assert(shippingCheckoutRes.status === 200, "Checkout with dynamic shipping returns HTTP 200");
  const shippingCheckoutData = await shippingCheckoutRes.json();
  assert(shippingCheckoutData.shippingFeeKobo === 700000, "Shipping fee includes Island base (₦2,500) + Express (₦4,500)");
  assert(shippingCheckoutData.totalKobo === product.price_kobo + 700000, "Order total correctly includes item price and shipping fee");
  console.log();

  // --- TEST 13: Promotions, Discount Coupons & Sector Flash Sales Engine ---
  console.log("--- TEST 13: Promotions, Discount Coupons & Sector Flash Sales Engine ---");
  // 1. Validate valid percentage coupon WELCOME10
  const validCouponRes = await fetch(`${BASE_URL}/api/coupons/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "WELCOME10", subtotalKobo: 1000000 }),
  });
  assert(validCouponRes.status === 200, "Valid coupon validation returns HTTP 200");
  const validCouponData = await validCouponRes.json();
  assert(validCouponData.valid === true, "WELCOME10 is reported as valid");
  assert(validCouponData.discountKobo === 100000, "10% discount on ₦10,000 is ₦1,000 (100,000 kobo)");
  assert(validCouponData.finalSubtotalKobo === 900000, "Final subtotal after 10% discount is ₦9,000");

  // 2. Validate below minimum spend
  const minSpendFailRes = await fetch(`${BASE_URL}/api/coupons/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "WELCOME10", subtotalKobo: 200000 }),
  });
  assert(minSpendFailRes.status === 200, "Validation endpoint responds 200 with valid: false for below min spend");
  const minSpendFailData = await minSpendFailRes.json();
  assert(minSpendFailData.valid === false, "WELCOME10 rejected when subtotal is below ₦5,000 min spend");

  // 3. Validate sector restriction
  const sectorFailRes = await fetch(`${BASE_URL}/api/coupons/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "JEWELRY15", subtotalKobo: 2000000, sectorSlug: "kitchen-souvenirs" }),
  });
  const sectorFailData = await sectorFailRes.json();
  assert(sectorFailData.valid === false, "JEWELRY15 rejected when applied outside jewelry sector");

  // 4. Validate Free Shipping coupon
  const freeShipCouponRes = await fetch(`${BASE_URL}/api/coupons/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "FREESHIP", subtotalKobo: 1500000, currentShippingFeeKobo: 250000 }),
  });
  const freeShipCouponData = await freeShipCouponRes.json();
  assert(freeShipCouponData.valid === true, "FREESHIP coupon validated successfully");
  assert(freeShipCouponData.shippingDiscountKobo === 250000, "FREESHIP waives the full ₦2,500 shipping fee");

  // 5. Admin Coupons API & New Coupon Creation
  const adminCouponsGetRes = await fetch(`${BASE_URL}/api/admin/coupons`);
  assert(adminCouponsGetRes.status === 200, "Admin coupons endpoint returns HTTP 200");
  const adminCouponsGetData = await adminCouponsGetRes.json();
  assert(adminCouponsGetData.success === true, "Admin coupons query succeeds");
  assert(adminCouponsGetData.stats.totalCoupons >= 6, "Admin reports at least 6 configured coupons");
  assert(adminCouponsGetData.flashSales.length >= 1, "Admin reports active sector flash sales");

  const createCouponRes = await fetch(`${BASE_URL}/api/admin/coupons`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: "SIMULATION25",
      discountType: "PERCENTAGE",
      discountValue: 25,
      minSpendKobo: 500000,
      description: "Simulation 25% discount voucher",
    }),
  });
  assert(createCouponRes.status === 200, "Admin coupon creation returns HTTP 200");
  const createCouponData = await createCouponRes.json();
  assert(createCouponData.success === true && createCouponData.coupon.code === "SIMULATION25", "SIMULATION25 successfully created");

  // Validate newly created coupon
  const testNewCouponRes = await fetch(`${BASE_URL}/api/coupons/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "SIMULATION25", subtotalKobo: 1000000 }),
  });
  const testNewCouponData = await testNewCouponRes.json();
  assert(testNewCouponData.valid === true, "Newly created SIMULATION25 coupon is immediately valid");
  assert(testNewCouponData.discountKobo === 250000, "25% discount correctly applied (250,000 kobo)");

  // 6. Checkout with coupon code
  const couponCheckoutRes = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Tariq Danjuma",
      email: "tariq.danjuma@example.com",
      phone: "08031234567",
      deliveryAddress: "14 Admiralty Way, Lekki Phase 1",
      state: "Lagos",
      lagosZone: "lagos_island",
      couponCode: "WELCOME10",
      whatsappOptIn: true,
      items: [{ productId: product.id, quantity: 1 }],
    }),
  });
  assert(couponCheckoutRes.status === 200, "Checkout with valid coupon returns HTTP 200");
  const couponCheckoutData = await couponCheckoutRes.json();
  const expectedDiscount = Math.round((product.price_kobo * 10) / 100);
  assert(couponCheckoutData.couponCode === "WELCOME10", "Order confirms WELCOME10 coupon applied");
  assert(couponCheckoutData.couponDiscountKobo === expectedDiscount, "Order confirms 10% coupon discount applied to total");
  assert(couponCheckoutData.totalKobo === (product.price_kobo - expectedDiscount) + 250000, "Final order total reflects product price minus coupon discount plus shipping");
  console.log();

  // --- TEST 14: Customer Product Reviews, Star Ratings & Photo UGC Engine ---
  console.log("--- TEST 14: Customer Product Reviews, Star Ratings & Photo UGC Engine ---");
  // 1. Fetch reviews & summary for product
  const getReviewsRes = await fetch(`${BASE_URL}/api/products/${product.id}/reviews`);
  assert(getReviewsRes.status === 200, "Product reviews GET returns HTTP 200");
  const getReviewsData = await getReviewsRes.json();
  assert(getReviewsData.success === true, "Product reviews API reports success: true");
  assert(typeof getReviewsData.summary.averageRating === "number", "Reviews summary includes averageRating");
  assert(typeof getReviewsData.summary.totalReviews === "number", "Reviews summary includes totalReviews");
  assert(getReviewsData.summary.ratingDistribution[5] !== undefined, "Rating distribution includes 5-star bucket");

  // 2. Rating boundary validation (reject > 5 stars)
  const invalidRatingRes = await fetch(`${BASE_URL}/api/products/${product.id}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName: "Anonymous",
      customerEmail: "anon@example.com",
      rating: 8,
      comment: "Invalid star rating test",
    }),
  });
  assert(invalidRatingRes.status === 400, "Review submission rejects rating > 5 with HTTP 400");

  // 3. Guest review submission (is_verified_buyer === false)
  const guestReviewRes = await fetch(`${BASE_URL}/api/products/${product.id}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName: "New Shopper",
      customerEmail: `guest_${Date.now()}@example.com`,
      rating: 4,
      headline: "Good initial impression",
      comment: "Looks very nice online, considering ordering for my upcoming event.",
      photoUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400",
    }),
  });
  assert(guestReviewRes.status === 201, "Guest review creation returns HTTP 201");
  const guestReviewData = await guestReviewRes.json();
  assert(guestReviewData.review.is_verified_buyer === false, "Unpurchased customer email correctly flagged is_verified_buyer: false");
  assert(guestReviewData.review.photo_url !== null, "Photo UGC URL successfully stored with review");

  // 4. Verified buyer review submission (is_verified_buyer === true)
  const buyerReviewRes = await fetch(`${BASE_URL}/api/products/${product.id}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName: checkoutPayload.name,
      customerEmail: checkoutPayload.email,
      rating: 5,
      headline: "Fantastic quality & fast dispatch",
      comment: "Item arrived exactly as pictured and packaging was exceptional. Highly recommend!",
    }),
  });
  assert(buyerReviewRes.status === 201, "Buyer review creation returns HTTP 201");
  const buyerReviewData = await buyerReviewRes.json();
  assert(buyerReviewData.review.is_verified_buyer === true, "Paid customer email correctly awarded is_verified_buyer: true");

  // 5. Helpful vote increment
  const helpfulRes = await fetch(`${BASE_URL}/api/products/${product.id}/reviews/${buyerReviewData.review.id}/helpful`, {
    method: "POST",
  });
  assert(helpfulRes.status === 200, "Review helpful vote returns HTTP 200");
  const helpfulData = await helpfulRes.json();
  assert(helpfulData.helpfulVotes === 1, "Helpful vote incremented to 1");

  // 6. Admin Reviews Moderation API
  let adminReviewsGetRes = await fetch(`${BASE_URL}/api/admin/reviews`);
  if (!adminReviewsGetRes.ok) {
    await new Promise((r) => setTimeout(r, 500));
    adminReviewsGetRes = await fetch(`${BASE_URL}/api/admin/reviews`);
  }
  assert(adminReviewsGetRes.status === 200, "Admin reviews GET returns HTTP 200");
  const adminReviewsGetData = await adminReviewsGetRes.json();
  assert(adminReviewsGetData.success === true, "Admin reviews API reports success: true");
  assert(adminReviewsGetData.metrics.totalReviews >= 1, "Admin reviews metrics report total reviews");
  assert(adminReviewsGetData.metrics.verifiedCount >= 1, "Admin reviews metrics track verified buyers");

  // Moderation status toggle (Hide review)
  const moderateRes = await fetch(`${BASE_URL}/api/admin/reviews`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reviewId: guestReviewData.review.id,
      isApproved: false,
    }),
  });
  assert(moderateRes.status === 200, "Admin review moderation PATCH returns HTTP 200");
  const moderateData = await moderateRes.json();
  assert(moderateData.review.is_approved === false, "Admin successfully hid review from storefront");
  console.log();

  // --- TEST 15: Customer Wishlist & Favorites Engine ---
  console.log("--- TEST 15: Customer Wishlist & Favorites Engine ---");
  // 1. Rejects invalid payload
  const invalidWishlistRes = await fetch(`${BASE_URL}/api/wishlist/details`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productIds: "not-an-array" }),
  });
  assert(invalidWishlistRes.status === 400, "Wishlist details rejects non-array productIds with HTTP 400");

  // 2. Empty array
  const emptyWishlistRes = await fetch(`${BASE_URL}/api/wishlist/details`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productIds: [] }),
  });
  assert(emptyWishlistRes.status === 200, "Wishlist details handles empty array with HTTP 200");
  const emptyWishlistData = await emptyWishlistRes.json();
  assert(emptyWishlistData.products.length === 0, "Wishlist details returns empty list for empty array");

  // 3. Batch product verification & stock status
  const wishlistDetailsRes = await fetch(`${BASE_URL}/api/wishlist/details`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productIds: [product.id] }),
  });
  assert(wishlistDetailsRes.status === 200, "Wishlist details returns HTTP 200 for valid productIds");
  const wishlistDetailsData = await wishlistDetailsRes.json();
  assert(wishlistDetailsData.success === true, "Wishlist details API reports success: true");
  assert(wishlistDetailsData.count === 1, "Wishlist details returns exact matched product count");
  const verifiedProd = wishlistDetailsData.products[0];
  assert(verifiedProd.productId === product.id, "Verified item ID matches requested ID");
  assert(verifiedProd.priceKobo === product.price_kobo, "Verified item price matches live price snapshot");
  assert(typeof verifiedProd.inStock === "boolean", "Verified item returns boolean inStock status");
  assert(typeof verifiedProd.sectorSlug === "string", "Verified item includes sector slug for routing");
  console.log();

  // ==========================================
  // TEST 16: Sales Accounting Ledger, Sector Attribution & Sequential Invoicing
  // ==========================================
  console.log("TEST 16: Sales Accounting Ledger, Sector Financial Reporting & Invoicing...");

  // 1. Fetch sales endpoint
  const salesRes = await fetch(`${BASE_URL}/api/admin/sales`);
  assert(salesRes.status === 200, "Sales API returns HTTP 200");
  const salesData = await salesRes.json();
  assert(salesData.metrics !== undefined, "Sales response includes comprehensive financial metrics");
  assert(typeof salesData.metrics.grossRevenueKobo === "number", "Gross revenue is numeric kobo");
  assert(salesData.metrics.grossRevenueKobo > 0, "Gross revenue is non-zero after paid order simulation");
  assert(salesData.metrics.paidOrdersCount >= 1, "Paid orders count tracks confirmed orders");
  assert(typeof salesData.metrics.averageOrderValueKobo === "number", "AOV metric is numeric kobo");
  assert(salesData.metrics.totalUnitsSold >= 1, "Total units sold tracks inventory volume");
  assert(Array.isArray(salesData.sectorBreakdown), "Sector breakdown is an array");
  assert(salesData.sectorBreakdown.length === 4, "Sector breakdown covers all 4 store sectors");

  // 2. Sector filtering
  const sectorFilterRes = await fetch(`${BASE_URL}/api/admin/sales?sector=jewelry`);
  assert(sectorFilterRes.status === 200, "Sales sector filter returns HTTP 200");
  const sectorFilteredData = await sectorFilterRes.json();
  assert(Array.isArray(sectorFilteredData.orders), "Filtered sector returns orders array");

  // 3. Status filtering
  const statusFilterRes = await fetch(`${BASE_URL}/api/admin/sales?status=paid`);
  assert(statusFilterRes.status === 200, "Sales status filter returns HTTP 200");
  const statusFilteredData = await statusFilterRes.json();
  assert(
    statusFilteredData.orders.every((o: any) => o.status === "paid"),
    "Status filter returns strictly paid orders"
  );

  // 4. CSV Exports (Master Sales & Sector Accounting)
  const masterCsvRes = await fetch(`${BASE_URL}/api/admin/sales?format=csv`);
  assert(masterCsvRes.status === 200, "Master Sales CSV export returns HTTP 200");
  const masterCsvText = await masterCsvRes.text();
  assert(masterCsvText.includes("Order Number,Date,Customer Name"), "Master CSV contains required bookkeeping headers");
  assert(masterCsvText.includes("Invoice Number,Receipt Number"), "Master CSV includes invoice and receipt document numbers");

  const sectorCsvRes = await fetch(`${BASE_URL}/api/admin/sales?format=sector_csv`);
  assert(sectorCsvRes.status === 200, "Sector Accounting CSV export returns HTTP 200");
  const sectorCsvText = await sectorCsvRes.text();
  assert(sectorCsvText.includes("Sector Name,Sector Slug,Units Sold,Revenue (NGN)"), "Sector CSV contains sector accounting headers");

  // 5. Sequential Invoicing & Official Receipt PDF Downloads
  if (paidOrder) {
    const invoicePdfRes = await fetch(`${BASE_URL}/api/orders/${paidOrder.id}/receipt?type=invoice`);
    assert(invoicePdfRes.status === 200, "Official Invoice PDF returns HTTP 200");
    assert(invoicePdfRes.headers.get("content-type") === "application/pdf", "Invoice endpoint returns application/pdf content type");

    const receiptPdfRes = await fetch(`${BASE_URL}/api/orders/${paidOrder.id}/receipt?type=receipt`);
    assert(receiptPdfRes.status === 200, "Official Receipt PDF returns HTTP 200");
    assert(receiptPdfRes.headers.get("content-type") === "application/pdf", "Receipt endpoint returns application/pdf content type");

    const adminInvoiceRes = await fetch(`${BASE_URL}/api/admin/invoices/${paidOrder.id}`);
    assert(adminInvoiceRes.status === 200, "Admin invoice route alias returns HTTP 200");
    assert(adminInvoiceRes.headers.get("content-type") === "application/pdf", "Admin invoice alias returns application/pdf");
  }
  console.log();

  // ==========================================
  // TEST 17: WAREHOUSE INVENTORY MANAGEMENT, AUDIT TRAIL & RESTOCK PORTAL
  // ==========================================
  console.log("--- TEST 17: Warehouse Inventory Management, Audit Trail & Restock Portal ---");

  // 1. Fetch live inventory dashboard snapshot & warehouse valuation
  const inventoryRes = await fetch(`${BASE_URL}/api/admin/inventory`);
  assert(inventoryRes.status === 200, "Inventory dashboard endpoint returns HTTP 200");
  const invData = await inventoryRes.json();
  assert(Array.isArray(invData.products), "Inventory returns products list");
  assert(invData.products.length > 0, "Inventory has products across sectors");
  assert(invData.metrics !== undefined, "Inventory includes warehouse valuation metrics");
  assert(typeof invData.metrics.totalValuationKobo === "number", "Total inventory valuation is numeric kobo");
  assert(typeof invData.metrics.totalStockUnits === "number", "Total stock units is numeric");
  assert(typeof invData.metrics.lowStockCount === "number", "Low stock count is numeric");
  assert(typeof invData.metrics.outOfStockCount === "number", "Out of stock count is numeric");
  assert(typeof invData.metrics.inStockCount === "number", "Healthy in-stock count is numeric");

  // 2. Sector & Status Filtering
  const sectorFilterInvRes = await fetch(`${BASE_URL}/api/admin/inventory?sector=jewelry`);
  assert(sectorFilterInvRes.status === 200, "Inventory sector filter returns HTTP 200");
  const sectorFilterInvData = await sectorFilterInvRes.json();
  assert(Array.isArray(sectorFilterInvData.products), "Sector-filtered inventory returns products");

  const lowStockInvRes = await fetch(`${BASE_URL}/api/admin/inventory?status=low_stock`);
  assert(lowStockInvRes.status === 200, "Inventory low_stock status filter returns HTTP 200");
  const lowStockInvData = await lowStockInvRes.json();
  assert(
    lowStockInvData.products.every((p: any) => p.stockStatus === "low_stock"),
    "Low stock filter returns only items with 1-5 units remaining"
  );

  // 3. Stock Adjustment & Audit Logging (PATCH)
  const targetProduct = invData.products[0];
  const invInitialStock = targetProduct.stock_qty;

  const restockRes = await fetch(`${BASE_URL}/api/admin/inventory/${targetProduct.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stock_qty: 20,
      adjustment_type: "increment",
      reason: "Supplier Restock Shipment",
      notes: "Batch #RESTOCK-TEST-LAGOS-01",
    }),
  });
  if (!restockRes.ok) {
    console.error("RESTOCK RES FAILED:", restockRes.status, await restockRes.text());
  }
  assert(restockRes.status === 200, "Restock PATCH returns HTTP 200");
  const restockData = await restockRes.json();
  assert(restockData.success === true, "Restock PATCH reports success");
  assert(restockData.product.stock_qty === invInitialStock + 20, "Product stock incremented correctly");
  assert(restockData.log !== null, "StockAdjustmentLog record created");
  assert(restockData.log.adjustment === 20, "Audit log records correct adjustment quantity (+20)");
  assert(restockData.log.previous_stock === invInitialStock, "Audit log records correct previous stock");
  assert(restockData.log.new_stock === invInitialStock + 20, "Audit log records correct new stock");

  // 4. Product Audit Trail History GET
  const productDetailRes = await fetch(`${BASE_URL}/api/admin/inventory/${targetProduct.id}`);
  assert(productDetailRes.status === 200, "Inventory product detail returns HTTP 200");
  const productDetailData = await productDetailRes.json();
  assert(Array.isArray(productDetailData.product.adjustment_logs), "Product details include adjustment audit logs array");
  assert(productDetailData.product.adjustment_logs.length >= 1, "Audit logs contain the recent restock entry");

  // 5. Customer Back-In-Stock Waitlist Notification Subscription
  const waitlistEmail = `shopper-${Date.now()}@example.ng`;
  const waitlistRes = await fetch(`${BASE_URL}/api/products/${targetProduct.id}/notify-restock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: waitlistEmail,
      phone: "+2348021112233",
    }),
  });
  assert(waitlistRes.status === 200, "Customer restock waitlist returns HTTP 200");
  const waitlistData = await waitlistRes.json();
  assert(waitlistData.success === true, "Customer waitlist subscription succeeded");

  // Duplicate subscription check
  const duplicateWaitlistRes = await fetch(`${BASE_URL}/api/products/${targetProduct.id}/notify-restock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: waitlistEmail,
      phone: "+2348021112233",
    }),
  });
  assert(duplicateWaitlistRes.status === 200, "Duplicate waitlist subscription handled gracefully");
  const duplicateWaitlistData = await duplicateWaitlistRes.json();
  assert(duplicateWaitlistData.alreadySubscribed === true, "System detects existing waitlist subscriber");

  // 6. Revert stock to initial quantity to maintain test idempotency
  const revertRes = await fetch(`${BASE_URL}/api/admin/inventory/${targetProduct.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stock_qty: invInitialStock,
      adjustment_type: "set",
      reason: "Test Suite Idempotency Reversion",
      notes: "Reset to initial test baseline",
    }),
  });
  if (!revertRes.ok) {
    console.error("REVERT RES FAILED:", revertRes.status, await revertRes.text());
  }
  assert(revertRes.status === 200, "Stock reversion returns HTTP 200");
  const revertData = await revertRes.json();
  assert(revertData.product.stock_qty === invInitialStock, "Product stock reverted to initial value");
  console.log();

  // ==========================================
  // TEST 18: GLOBAL SEARCH, PREDICTIVE AUTOCOMPLETE & MULTI-FACETED FILTERS
  // ==========================================
  console.log("--- TEST 18: Global Search, Predictive Autocomplete & Multi-Faceted Filters ---");

  // 1. Predictive Autocomplete Search
  const autocompleteRes = await fetch(`${BASE_URL}/api/search?q=lip&type=autocomplete&limit=5`);
  assert(autocompleteRes.status === 200, "Autocomplete search endpoint returns HTTP 200");
  const autocompleteData = await autocompleteRes.json();
  assert(autocompleteData.success === true, "Autocomplete response reports success: true");
  assert(Array.isArray(autocompleteData.products), "Autocomplete returns products array");
  assert(autocompleteData.products.length >= 1, "Autocomplete finds matches for 'lip'");
  const sampleAuto = autocompleteData.products[0];
  assert(typeof sampleAuto.name === "string", "Autocomplete product has name");
  assert(typeof sampleAuto.price_kobo === "number", "Autocomplete product has price_kobo");
  assert(typeof sampleAuto.stockStatus === "string", "Autocomplete product has stockStatus pill");
  assert(typeof sampleAuto.sector_slug === "string", "Autocomplete product has sector_slug");
  assert(Array.isArray(autocompleteData.sectorSuggestions), "Autocomplete returns sectorSuggestions array");

  // 2. Full Catalog Search & Facet Metadata
  const fullSearchRes = await fetch(`${BASE_URL}/api/search?q=a`);
  assert(fullSearchRes.status === 200, "Full search endpoint returns HTTP 200");
  const fullSearchData = await fullSearchRes.json();
  assert(fullSearchData.totalCount >= 1, "Full search finds products matching query 'a'");
  assert(Array.isArray(fullSearchData.sectorFacets), "Search returns sector facets");
  assert(fullSearchData.sectorFacets.length === 4, "Sector facets cover all 4 store sectors");

  // 3. Sector Filter
  const sectorSearchRes = await fetch(`${BASE_URL}/api/search?sector=jewelry`);
  assert(sectorSearchRes.status === 200, "Sector search filter returns HTTP 200");
  const sectorSearchData = await sectorSearchRes.json();
  assert(Array.isArray(sectorSearchData.products), "Sector search returns products array");
  assert(
    sectorSearchData.products.every((p: any) => p.sector_slug === "jewelry"),
    "Sector filter returns strictly products in 'jewelry' sector"
  );

  // 4. Price Range Bounds Filter (₦10,000 to ₦45,000)
  const priceFilterRes = await fetch(`${BASE_URL}/api/search?min_price=10000&max_price=45000`);
  assert(priceFilterRes.status === 200, "Price range filter returns HTTP 200");
  const priceFilterData = await priceFilterRes.json();
  assert(
    priceFilterData.products.every(
      (p: any) => p.price_kobo >= 1000000 && p.price_kobo <= 4500000
    ),
    "Price range filter strictly respects min and max price bounds in kobo"
  );

  // 5. In-Stock Only Filter
  const inStockSearchRes = await fetch(`${BASE_URL}/api/search?in_stock=true`);
  assert(inStockSearchRes.status === 200, "In-stock filter returns HTTP 200");
  const inStockSearchData = await inStockSearchRes.json();
  assert(
    inStockSearchData.products.every((p: any) => p.stock_qty > 0 && p.stockStatus !== "out_of_stock"),
    "In-stock filter excludes all zero-stock products"
  );

  // 6. Sorting by Price Ascending & Descending
  const sortAscRes = await fetch(`${BASE_URL}/api/search?sort=price_asc`);
  assert(sortAscRes.status === 200, "Price ascending sort returns HTTP 200");
  const sortAscData = await sortAscRes.json();
  for (let i = 1; i < sortAscData.products.length; i++) {
    assert(
      sortAscData.products[i].price_kobo >= sortAscData.products[i - 1].price_kobo,
      "Products are ordered in non-decreasing price order"
    );
  }

  const sortDescRes = await fetch(`${BASE_URL}/api/search?sort=price_desc`);
  assert(sortDescRes.status === 200, "Price descending sort returns HTTP 200");
  const sortDescData = await sortDescRes.json();
  for (let i = 1; i < sortDescData.products.length; i++) {
    assert(
      sortDescData.products[i].price_kobo <= sortDescData.products[i - 1].price_kobo,
      "Products are ordered in non-increasing price order"
    );
  }

  // 7. Non-existent query term handling
  const noMatchRes = await fetch(`${BASE_URL}/api/search?q=xyzsupercalifragilisticnomatch999`);
  assert(noMatchRes.status === 200, "Unmatched search query returns HTTP 200");
  const noMatchData = await noMatchRes.json();
  assert(noMatchData.products.length === 0, "No products returned for impossible search term");
  assert(noMatchData.totalCount === 0, "Total count is zero for unmatched search");
  console.log();

  // ==========================================
  // TEST 19: CUSTOMER ACCOUNT, OTP AUTH, RE-ORDER & SAVED ADDRESSES
  // ==========================================
  console.log("--- TEST 19: Customer Account, OTP Auth, Re-Order & Saved Addresses ---");

  const accountTestEmail = `customer-${Date.now()}@example.ng`;

  // 1. Send OTP Request
  const otpRes = await fetch(`${BASE_URL}/api/customer/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: accountTestEmail,
      name: "Chisom Balogun",
      phone: "08039991122",
    }),
  });
  assert(otpRes.status === 200, "Send OTP endpoint returns HTTP 200");
  const otpData = await otpRes.json();
  assert(otpData.success === true, "Send OTP reports success: true");
  assert(typeof otpData.otp === "string" && otpData.otp.length === 6, "OTP is 6-digit code");

  // 2. Verify OTP & Issue Session
  const verifyRes = await fetch(`${BASE_URL}/api/customer/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: accountTestEmail,
      code: otpData.otp,
    }),
  });
  assert(verifyRes.status === 200, "Verify OTP endpoint returns HTTP 200");
  const verifyData = await verifyRes.json();
  assert(verifyData.success === true, "Verify OTP reports success: true");
  assert(typeof verifyData.token === "string" && verifyData.token.length > 20, "Session token issued");
  assert(verifyData.customer.email === accountTestEmail, "Authenticated customer email matches");

  const authBearer = verifyData.token;
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authBearer}`,
  };

  // 3. Fetch Customer Profile & Dashboard Data
  const profileRes = await fetch(`${BASE_URL}/api/customer/profile`, {
    headers: authHeaders,
  });
  assert(profileRes.status === 200, "Customer profile endpoint returns HTTP 200");
  const profileData = await profileRes.json();
  assert(profileData.success === true, "Profile endpoint reports success: true");
  assert(profileData.customer.name === "Chisom Balogun", "Profile returns customer name");
  assert(Array.isArray(profileData.orders), "Profile includes orders array");
  assert(Array.isArray(profileData.addresses), "Profile includes addresses array");
  assert(profileData.stats !== undefined, "Profile includes account stats");

  // 4. Add Saved Nigerian Delivery Address
  const addAddressRes = await fetch(`${BASE_URL}/api/customer/addresses`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      label: "Lekki Residence",
      recipient_name: "Chisom Balogun",
      phone: "08039991122",
      street_address: "Plot 14 Admiralty Way, Lekki Phase 1",
      state: "Lagos",
      lga: "Eti-Osa",
      is_default: true,
    }),
  });
  assert(addAddressRes.status === 201, "Add address endpoint returns HTTP 201 Created");
  const addAddressData = await addAddressRes.json();
  assert(addAddressData.success === true, "Add address reports success: true");
  assert(addAddressData.address.is_default === true, "First address is default");
  assert(addAddressData.address.state === "Lagos", "Saved address state is Lagos");
  const addressId = addAddressData.address.id;

  // 5. Update Address
  const updateAddressRes = await fetch(`${BASE_URL}/api/customer/addresses/${addressId}`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({
      label: "Victoria Island Office",
    }),
  });
  assert(updateAddressRes.status === 200, "Update address endpoint returns HTTP 200");
  const updateAddressData = await updateAddressRes.json();
  assert(updateAddressData.address.label === "Victoria Island Office", "Address label updated");

  // 6. 1-Click Re-order Verification
  if (paidOrder) {
    // Link paidOrder to this authenticated customer for test
    await prisma.order.update({
      where: { id: paidOrder.id },
      data: { customer_id: verifyData.customer.id },
    });

    const reorderRes = await fetch(`${BASE_URL}/api/customer/reorder/${paidOrder.id}`, {
      method: "POST",
      headers: authHeaders,
    });
    assert(reorderRes.status === 200, "1-Click reorder endpoint returns HTTP 200");
    const reorderData = await reorderRes.json();
    assert(reorderData.success === true, "Reorder reports success: true");
    assert(Array.isArray(reorderData.reorderItems), "Reorder returns items array");
    assert(reorderData.reorderItems.length >= 1, "Reorder items available for cart addition");
    assert(typeof reorderData.reorderItems[0].productId === "string", "Reorder item has valid productId");
    assert(typeof reorderData.reorderItems[0].priceKobo === "number", "Reorder item has valid priceKobo");
  }

  // 7. Update Customer Profile Settings
  const updateProfileRes = await fetch(`${BASE_URL}/api/customer/profile`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({
      name: "Chisom Adeleke Balogun",
      whatsapp_opt_in: true,
    }),
  });
  assert(updateProfileRes.status === 200, "Update profile endpoint returns HTTP 200");
  const updateProfileData = await updateProfileRes.json();
  assert(updateProfileData.customer.name === "Chisom Adeleke Balogun", "Customer name updated successfully");

  // 8. Delete Address
  const deleteAddrRes = await fetch(`${BASE_URL}/api/customer/addresses/${addressId}`, {
    method: "DELETE",
    headers: authHeaders,
  });
  assert(deleteAddrRes.status === 200, "Delete address endpoint returns HTTP 200");

  // 9. Logout & Session Invalidation
  const logoutRes = await fetch(`${BASE_URL}/api/customer/auth/logout`, {
    method: "POST",
    headers: authHeaders,
  });
  assert(logoutRes.status === 200, "Logout endpoint returns HTTP 200");

  // Verify session invalidated
  const postLogoutRes = await fetch(`${BASE_URL}/api/customer/profile`, {
    headers: authHeaders,
  });
  assert(postLogoutRes.status === 401, "Invalidated session token returns HTTP 401 Unauthorized");
  console.log();

  // ==========================================
  // TEST 20: Return Merchandise Authorization (RMA) & Multi-Item Refund Processing Lifecycle
  // ==========================================
  console.log("-------------------------------------------------");
  console.log("📦 TEST 20: Return Merchandise Authorization (RMA) & Refund Processing");
  console.log("-------------------------------------------------");

  // 1. Authenticate customer for return testing
  const returnCustomerEmail = "rma_shopper@auranigeria.com";
  const rmaOtpSendRes = await fetch(`${BASE_URL}/api/customer/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: returnCustomerEmail, name: "Bolanle Williams", phone: "08055554321" }),
  });
  assert(rmaOtpSendRes.status === 200, "RMA customer OTP send returns HTTP 200");
  const rmaOtpData = await rmaOtpSendRes.json();
  const rmaOtp = rmaOtpData.otp;

  const rmaVerifyRes = await fetch(`${BASE_URL}/api/customer/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: returnCustomerEmail, code: rmaOtp }),
  });
  assert(rmaVerifyRes.status === 200, "RMA customer verify-otp returns HTTP 200");
  const rmaVerifyData = await rmaVerifyRes.json();
  const rmaToken = rmaVerifyData.token;
  const rmaAuthHeaders = {
    Authorization: `Bearer ${rmaToken}`,
    "Content-Type": "application/json",
  };

  // 2. Create delivered order for customer to return
  const testDeliveredOrder = await prisma.order.create({
    data: {
      customer_id: rmaVerifyData.customer.id,
      status: "delivered",
      subtotal_kobo: product.price_kobo * 2,
      total_kobo: product.price_kobo * 2,
      delivery_address: "Plot 14 Admiralty Way, Lekki Phase 1, Lagos",
      courier_name: "GIG Logistics",
      tracking_number: "GIG-DEL-77812",
      delivered_at: new Date(),
      paid_at: new Date(),
      items: {
        create: [
          {
            product_id: product.id,
            product_name_snapshot: product.name,
            unit_price_kobo_snapshot: product.price_kobo,
            qty: 2,
            line_total_kobo: product.price_kobo * 2,
          },
        ],
      },
      payment: {
        create: {
          paystack_reference: `sim_test_rma_${Date.now()}`,
          status: "success",
          amount_kobo: product.price_kobo * 2,
          raw_payload_json: { gateway_response: "Approved", channel: "card" },
        },
      },
    },
    include: { items: true },
  });
  assert(!!testDeliveredOrder.id, "Delivered order for return test created");
  const orderItemId = testDeliveredOrder.items[0].id;

  // 3. Customer submits Return Request (RMA) for 1 unit
  const submitRmaRes = await fetch(`${BASE_URL}/api/customer/returns`, {
    method: "POST",
    headers: rmaAuthHeaders,
    body: JSON.stringify({
      order_id: testDeliveredOrder.id,
      reason: "damaged_defective",
      customer_note: "Watch bezel was loose on unboxing",
      evidence_images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80"],
      refund_method: "original_payment",
      pickup_address: "Plot 14 Admiralty Way, Lekki Phase 1, Lagos",
      items: [{ order_item_id: orderItemId, qty: 1 }],
    }),
  });
  assert(submitRmaRes.status === 200, "Customer RMA submission returns HTTP 200");
  const submitRmaData = await submitRmaRes.json();
  assert(submitRmaData.success === true, "RMA reports success: true");
  assert(submitRmaData.return_request.rma_number.startsWith("RMA-"), "RMA number formatted with RMA- prefix");
  assert(submitRmaData.return_request.status === "requested", "Initial RMA status is 'requested'");
  assert(submitRmaData.return_request.refund_amount_kobo === product.price_kobo, "Refund amount equals item unit price * 1 qty");
  const createdRmaId = submitRmaData.return_request.id;

  // 4. Customer lists their returns
  const listReturnsRes = await fetch(`${BASE_URL}/api/customer/returns`, {
    headers: rmaAuthHeaders,
  });
  assert(listReturnsRes.status === 200, "Customer list returns returns HTTP 200");
  const listReturnsData = await listReturnsRes.json();
  assert(Array.isArray(listReturnsData.returns), "Customer returns response contains returns array");
  assert(listReturnsData.returns.some((r: any) => r.id === createdRmaId), "Created RMA is present in customer returns list");

  // 5. Customer gets return details
  const getRmaDetailsRes = await fetch(`${BASE_URL}/api/customer/returns/${createdRmaId}`, {
    headers: rmaAuthHeaders,
  });
  assert(getRmaDetailsRes.status === 200, "Customer RMA details returns HTTP 200");
  const getRmaDetailsData = await getRmaDetailsRes.json();
  assert(getRmaDetailsData.return_request.items.length === 1, "RMA has 1 return item");
  assert(getRmaDetailsData.return_request.items[0].qty === 1, "Returned qty is 1");

  // 6. Admin lists all returns and filters by status
  const adminReturnsRes = await fetch(`${BASE_URL}/api/admin/returns?status=requested`);
  assert(adminReturnsRes.status === 200, "Admin returns listing returns HTTP 200");
  const adminReturnsData = await adminReturnsRes.json();
  assert(adminReturnsData.metrics.requested >= 1, "Admin metrics reflect pending requested RMAs");
  assert(adminReturnsData.returns.some((r: any) => r.id === createdRmaId), "Admin list contains created RMA");

  // 7. Admin Approves Return Request
  const adminApproveRes = await fetch(`${BASE_URL}/api/admin/returns/${createdRmaId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "approved",
      return_courier: "GIG Logistics",
      return_tracking_num: "GIG-RET-88210",
      admin_notes: "Courier dispatched for item pickup",
    }),
  });
  assert(adminApproveRes.status === 200, "Admin approve RMA returns HTTP 200");
  const adminApproveData = await adminApproveRes.json();
  assert(adminApproveData.return_request.status === "approved", "RMA status is now 'approved'");
  assert(adminApproveData.return_request.return_courier === "GIG Logistics", "Return courier assigned");

  // 8. Admin marks in transit
  const adminInTransitRes = await fetch(`${BASE_URL}/api/admin/returns/${createdRmaId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "in_transit",
    }),
  });
  assert(adminInTransitRes.status === 200, "Admin mark in-transit returns HTTP 200");
  const adminInTransitData = await adminInTransitRes.json();
  assert(adminInTransitData.return_request.status === "in_transit", "RMA status is now 'in_transit'");

  // 9. Admin marks received at warehouse & restocks inventory
  const preRestockProduct = await prisma.product.findUnique({ where: { id: product.id } });
  const preStockQty = preRestockProduct?.stock_qty || 0;

  const adminReceivedRes = await fetch(`${BASE_URL}/api/admin/returns/${createdRmaId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "received",
      restock: true,
      admin_notes: "Item received at warehouse and verified intact",
    }),
  });
  assert(adminReceivedRes.status === 200, "Admin mark received returns HTTP 200");
  const adminReceivedData = await adminReceivedRes.json();
  assert(adminReceivedData.return_request.status === "received", "RMA status is now 'received'");
  assert(adminReceivedData.return_request.restocked === true, "RMA restocked flag set to true");

  // Verify inventory increment and stock log
  const postRestockProduct = await prisma.product.findUnique({ where: { id: product.id } });
  assert((postRestockProduct?.stock_qty || 0) === preStockQty + 1, "Product inventory incremented by 1 returned unit");
  const stockLog = await prisma.stockAdjustmentLog.findFirst({
    where: { product_id: product.id, reason: "Customer Return Restock" },
    orderBy: { created_at: "desc" },
  });
  assert(!!stockLog, "StockAdjustmentLog created with reason 'Customer Return Restock'");

  // 10. Admin issues Paystack refund
  const adminRefundRes = await fetch(`${BASE_URL}/api/admin/returns/${createdRmaId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "refunded",
    }),
  });
  assert(adminRefundRes.status === 200, "Admin process refund returns HTTP 200");
  const adminRefundData = await adminRefundRes.json();
  assert(adminRefundData.return_request.status === "refunded", "RMA status is now 'refunded'");
  assert(!!adminRefundData.return_request.refund_reference, "RMA has refund_reference generated");

  // 11. Store Credit Voucher Return Test
  const submitCreditRmaRes = await fetch(`${BASE_URL}/api/customer/returns`, {
    method: "POST",
    headers: rmaAuthHeaders,
    body: JSON.stringify({
      order_id: testDeliveredOrder.id,
      reason: "changed_mind",
      refund_method: "store_credit",
      items: [{ order_item_id: orderItemId, qty: 1 }],
    }),
  });
  assert(submitCreditRmaRes.status === 200, "Customer store credit RMA submission returns HTTP 200");
  const creditRmaData = await submitCreditRmaRes.json();
  const creditRmaId = creditRmaData.return_request.id;

  // Process credit refund directly to refunded
  const adminCreditRefundRes = await fetch(`${BASE_URL}/api/admin/returns/${creditRmaId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "refunded",
    }),
  });
  assert(adminCreditRefundRes.status === 200, "Admin issue store credit refund returns HTTP 200");
  const adminCreditRefundData = await adminCreditRefundRes.json();
  assert(adminCreditRefundData.return_request.status === "refunded", "Credit RMA status is 'refunded'");
  assert(adminCreditRefundData.store_credit_code.startsWith("CREDIT-"), "Store credit coupon code issued");

  // Check that entire order (all 2 units) is now returned/refunded, so order status became returned
  const finalOrder = await prisma.order.findUnique({ where: { id: testDeliveredOrder.id } });
  assert(finalOrder?.status === "returned", "Full order status transitioned to 'returned' after all units refunded");

  // 12. Cancellation of pending return request
  const cancelTestOrder = await prisma.order.create({
    data: {
      customer_id: rmaVerifyData.customer.id,
      status: "delivered",
      subtotal_kobo: product.price_kobo,
      total_kobo: product.price_kobo,
      delivery_address: "Victoria Island, Lagos",
      items: {
        create: [
          {
            product_id: product.id,
            product_name_snapshot: product.name,
            unit_price_kobo_snapshot: product.price_kobo,
            qty: 1,
            line_total_kobo: product.price_kobo,
          },
        ],
      },
    },
    include: { items: true },
  });

  const submitCancelRmaRes = await fetch(`${BASE_URL}/api/customer/returns`, {
    method: "POST",
    headers: rmaAuthHeaders,
    body: JSON.stringify({
      order_id: cancelTestOrder.id,
      reason: "other",
      refund_method: "original_payment",
      items: [{ order_item_id: cancelTestOrder.items[0].id, qty: 1 }],
    }),
  });
  const cancelRmaId = (await submitCancelRmaRes.json()).return_request.id;

  const cancelReqRes = await fetch(`${BASE_URL}/api/customer/returns/${cancelRmaId}/cancel`, {
    method: "POST",
    headers: rmaAuthHeaders,
  });
  assert(cancelReqRes.status === 200, "Customer cancel return request returns HTTP 200");
  const cancelReqData = await cancelReqRes.json();
  assert(cancelReqData.return_request.status === "cancelled", "Return request status is 'cancelled'");
  console.log();

  // ==========================================
  // TEST 21: Customer Review Reminders & Admin Live Feed / Daily Settlement
  // ==========================================
  console.log("--- TEST 21: Review Reminders & Admin Live Feed / Settlement Reconciliation ---");

  // Create a delivered order for testing review reminders
  const reviewTestOrder = await prisma.order.create({
    data: {
      customer_id: rmaVerifyData.customer.id,
      status: "delivered",
      subtotal_kobo: 3500000, // NGN 35,000
      total_kobo: 3750000,    // NGN 37,500 (incl NGN 2,500 delivery)
      delivery_address: "12 Marine Road, Apapa, Lagos",
      delivered_at: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48h ago
      review_reminder_sent_at: null,
      items: {
        create: [
          {
            product_id: product.id,
            product_name_snapshot: product.name,
            unit_price_kobo_snapshot: 3500000,
            qty: 1,
            line_total_kobo: 3500000,
          },
        ],
      },
    },
    include: { items: true },
  });

  // 1. Cron sweep for review reminders
  const reviewCronRes = await fetch(`${BASE_URL}/api/cron/review-reminders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  assert(reviewCronRes.status === 200, "Cron review-reminders returns HTTP 200");
  const reviewCronData = await reviewCronRes.json();
  assert(reviewCronData.success === true, "Cron response has success === true");
  assert(typeof reviewCronData.remindersSent === "number", "Cron response reports remindersSent count");

  const updatedReviewOrder = await prisma.order.findUnique({
    where: { id: reviewTestOrder.id },
  });
  assert(
    updatedReviewOrder?.review_reminder_sent_at !== null,
    "Delivered order review_reminder_sent_at was stamped by automated sweep"
  );

  // 2. Manual 1-click admin review request trigger
  const manualReviewRes = await fetch(
    `${BASE_URL}/api/admin/orders/${reviewTestOrder.id}/send-review-request`,
    {
      method: "POST",
    }
  );
  assert(manualReviewRes.status === 200, "Manual send-review-request returns HTTP 200");
  const manualReviewData = await manualReviewRes.json();
  assert(manualReviewData.success === true, "Manual review trigger returns success === true");
  assert(
    manualReviewData.reviewUrl.includes("review=true"),
    "Manual review trigger generates magic link with review=true query param"
  );

  // 3. Admin Live Push Feed
  const liveFeedRes = await fetch(`${BASE_URL}/api/admin/live-feed`);
  assert(liveFeedRes.status === 200, "Admin live-feed returns HTTP 200");
  const liveFeedData = await liveFeedRes.json();
  assert(liveFeedData.success === true, "Live feed returns success === true");
  assert(
    typeof liveFeedData.summary.todayOrdersCount === "number",
    "Live feed includes todayOrdersCount"
  );
  assert(
    typeof liveFeedData.summary.todayRevenueKobo === "number",
    "Live feed includes todayRevenueKobo"
  );
  assert(Array.isArray(liveFeedData.events), "Live feed returns events array");

  // 4. Daily Settlement Reconciliation JSON
  const settlementJsonRes = await fetch(`${BASE_URL}/api/admin/settlement?date=today&format=json`);
  assert(settlementJsonRes.status === 200, "Settlement API JSON returns HTTP 200");
  const settlementData = await settlementJsonRes.json();
  assert(settlementData.success === true, "Settlement API JSON returns success === true");
  assert(
    settlementData.metrics.netSettlementPayoutKobo ===
      settlementData.metrics.grossVolumeKobo -
        settlementData.metrics.totalGatewayFeesKobo -
        settlementData.metrics.totalRefundsKobo,
    "Settlement net payout matches exact Paystack reconciliation formula (Gross - Fees - Refunds)"
  );

  // 5. Daily Settlement Reconciliation CSV Export
  const settlementCsvRes = await fetch(`${BASE_URL}/api/admin/settlement?date=today&format=csv`);
  assert(settlementCsvRes.status === 200, "Settlement CSV export returns HTTP 200");
  const settlementCsvContentType = settlementCsvRes.headers.get("content-type") || "";
  assert(
    settlementCsvContentType.includes("text/csv"),
    "Settlement CSV export sets Content-Type text/csv"
  );
  const csvText = await settlementCsvRes.text();
  assert(
    csvText.includes("DAILY SETTLEMENT RECONCILIATION REPORT"),
    "Settlement CSV contains header title"
  );
  assert(
    csvText.includes("NET EXPECTED PAYSTACK PAYOUT"),
    "Settlement CSV contains net payout summary line"
  );
  console.log();

  // ==========================================
  // TEST 22: Frequently Bought Together (Bundle Engine)
  // ==========================================
  console.log("--- TEST 22: Frequently Bought Together (Bundle Engine) ---");

  // Find a secondary product to bundle
  const secondaryProduct = await prisma.product.findFirst({
    where: {
      id: { not: product.id },
      is_active: true,
    },
  });
  assert(!!secondaryProduct, "Found secondary product for bundle testing");

  // 1. Fetch dynamic bundle recommendations for storefront
  const bundleRecRes = await fetch(`${BASE_URL}/api/products/${product.id}/bundles`);
  assert(bundleRecRes.status === 200, "Bundle recommendations endpoint returns HTTP 200");
  const bundleRecData = await bundleRecRes.json();
  assert(bundleRecData.success === true, "Bundle recommendations reports success: true");
  assert(bundleRecData.primaryProduct.id === product.id, "Bundle returns correct primary product");
  assert(Array.isArray(bundleRecData.bundleItems), "Bundle returns bundleItems array");

  // 2. Admin creates explicit bundle pairing
  const createBundleRes = await fetch(`${BASE_URL}/api/admin/bundles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productId: product.id,
      bundleItemId: secondaryProduct!.id,
    }),
  });
  assert(createBundleRes.status === 200, "Admin create bundle returns HTTP 200");
  const createBundleData = await createBundleRes.json();
  assert(createBundleData.success === true, "Admin create bundle reports success: true");
  const createdBundleId = createBundleData.bundle.id;

  // 3. Admin lists all bundles
  const listBundlesRes = await fetch(`${BASE_URL}/api/admin/bundles`);
  assert(listBundlesRes.status === 200, "Admin list bundles returns HTTP 200");
  const listBundlesData = await listBundlesRes.json();
  assert(
    listBundlesData.bundles.some((b: any) => b.id === createdBundleId),
    "Created bundle pairing appears in admin bundles list"
  );

  // 4. Admin deletes bundle pairing
  const deleteBundleRes = await fetch(`${BASE_URL}/api/admin/bundles?id=${createdBundleId}`, {
    method: "DELETE",
  });
  assert(deleteBundleRes.status === 200, "Admin delete bundle returns HTTP 200");
  console.log();

  // ==========================================
  // TEST 23: Customer Loyalty Points & Tier Progress (Without Naira worth)
  // ==========================================
  console.log("--- TEST 23: Customer Loyalty & Rewards Points System ---");

  // Fetch customer loyalty status using auth token
  const loyaltyRes = await fetch(`${BASE_URL}/api/customer/loyalty`, {
    headers: rmaAuthHeaders,
  });
  assert(loyaltyRes.status === 200, "Customer loyalty endpoint returns HTTP 200");
  const loyaltyData = await loyaltyRes.json();
  assert(loyaltyData.success === true, "Loyalty response reports success: true");
  assert(typeof loyaltyData.points === "number", "Loyalty response returns numeric points balance");
  assert(typeof loyaltyData.tier.name === "string", "Loyalty response returns member tier name");
  assert(loyaltyData.redemptionStatus === "unlocking_soon", "Loyalty points redemption status is unlocking_soon");
  assert(
    !JSON.stringify(loyaltyData).includes("worth_naira") && !JSON.stringify(loyaltyData).includes("naira_value"),
    "Loyalty response preserves secrecy of Naira conversion value as requested"
  );

  // Directly award points via database to test accrual
  const preLoyaltyCustomer = await prisma.customer.findUnique({ where: { id: rmaVerifyData.customer.id } });
  const prePoints = preLoyaltyCustomer?.loyalty_points || 0;

  await prisma.customer.update({
    where: { id: rmaVerifyData.customer.id },
    data: { loyalty_points: { increment: 250 } },
  });
  await prisma.loyaltyPointsLedger.create({
    data: {
      customer_id: rmaVerifyData.customer.id,
      points: 250,
      reason: "Special Promo Points Bonus",
    },
  });

  const postLoyaltyRes = await fetch(`${BASE_URL}/api/customer/loyalty`, {
    headers: rmaAuthHeaders,
  });
  const postLoyaltyData = await postLoyaltyRes.json();
  assert(postLoyaltyData.points === prePoints + 250, "Loyalty points balance reflects +250 earned points");
  assert(
    postLoyaltyData.ledger.some((l: any) => l.reason === "Special Promo Points Bonus"),
    "Loyalty ledger records the points activity entry"
  );
  console.log();

  // ==========================================
  // TEST 24: Bulk Order Fulfillment & Warehouse Dispatch Manifest
  // ==========================================
  console.log("--- TEST 24: Bulk Fulfillment & Dispatch Manifest ---");

  // Create two orders for bulk fulfillment test
  const bulkOrder1 = await prisma.order.create({
    data: {
      customer_id: rmaVerifyData.customer.id,
      status: "paid",
      subtotal_kobo: 2000000,
      total_kobo: 2200000,
      delivery_address: "10 Broad Street, Lagos Island",
      items: {
        create: [
          {
            product_id: product.id,
            product_name_snapshot: product.name,
            unit_price_kobo_snapshot: 2000000,
            qty: 2,
            line_total_kobo: 2000000,
          },
        ],
      },
    },
  });

  const bulkOrder2 = await prisma.order.create({
    data: {
      customer_id: rmaVerifyData.customer.id,
      status: "paid",
      subtotal_kobo: 1500000,
      total_kobo: 1700000,
      delivery_address: "45 Allen Avenue, Ikeja, Lagos",
      items: {
        create: [
          {
            product_id: secondaryProduct!.id,
            product_name_snapshot: secondaryProduct!.name,
            unit_price_kobo_snapshot: 1500000,
            qty: 1,
            line_total_kobo: 1500000,
          },
        ],
      },
    },
  });

  // 1. Bulk Status Update: Mark both shipped with Speedaf Express
  const bulkUpdateRes = await fetch(`${BASE_URL}/api/admin/orders/bulk-status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderIds: [bulkOrder1.id, bulkOrder2.id],
      status: "shipped",
      courier_name: "Speedaf Express",
    }),
  });
  assert(bulkUpdateRes.status === 200, "Bulk status update returns HTTP 200");
  const bulkUpdateData = await bulkUpdateRes.json();
  assert(bulkUpdateData.success === true, "Bulk status reports success: true");
  assert(bulkUpdateData.updatedCount === 2, "Bulk update reports 2 orders updated");

  // Verify in database
  const refreshedBulkOrder1 = await prisma.order.findUnique({ where: { id: bulkOrder1.id } });
  assert(refreshedBulkOrder1?.status === "shipped", "Bulk order 1 transitioned to shipped");
  assert(refreshedBulkOrder1?.courier_name === "Speedaf Express", "Bulk order 1 assigned Speedaf Express");

  // 2. Dispatch Manifest JSON
  const manifestJsonRes = await fetch(
    `${BASE_URL}/api/admin/orders/manifest?ids=${bulkOrder1.id},${bulkOrder2.id}&format=json`
  );
  assert(manifestJsonRes.status === 200, "Manifest JSON returns HTTP 200");
  const manifestJsonData = await manifestJsonRes.json();
  assert(manifestJsonData.success === true, "Manifest reports success: true");
  assert(manifestJsonData.metrics.totalOrders === 2, "Manifest includes 2 total orders");
  assert(Array.isArray(manifestJsonData.pickingSummary), "Manifest includes product picking summary");

  // 3. Dispatch Manifest Printable HTML
  const manifestHtmlRes = await fetch(
    `${BASE_URL}/api/admin/orders/manifest?ids=${bulkOrder1.id},${bulkOrder2.id}&format=html`
  );
  assert(manifestHtmlRes.status === 200, "Manifest HTML returns HTTP 200");
  const manifestHtml = await manifestHtmlRes.text();
  assert(
    manifestHtml.includes("DAILY WAREHOUSE DISPATCH MANIFEST"),
    "Manifest HTML includes warehouse title"
  );
  assert(
    manifestHtml.includes("Warehouse Item Pick List Summary"),
    "Manifest HTML includes SKU pick list section"
  );

  // 4. Dispatch Manifest CSV
  const manifestCsvRes = await fetch(
    `${BASE_URL}/api/admin/orders/manifest?ids=${bulkOrder1.id},${bulkOrder2.id}&format=csv`
  );
  assert(manifestCsvRes.status === 200, "Manifest CSV returns HTTP 200");
  const manifestCsv = await manifestCsvRes.text();
  assert(
    manifestCsv.includes("COURIER DISPATCH STOPS"),
    "Manifest CSV includes courier stops table"
  );
  console.log();

  // --- TEST 25: Customer Referral & Growth Engine (Task 1) ---
  console.log("--- TEST 25: Customer Referral & Growth Engine ---");
  // 1. Customer Referral GET
  const referralGetRes = await fetch(`${BASE_URL}/api/customer/referrals`, {
    headers: rmaAuthHeaders,
  });
  assert(referralGetRes.status === 200, "Customer referral GET returns HTTP 200");
  const referralGetData = await referralGetRes.json();
  assert(referralGetData.success === true, "Customer referral GET reports success: true");
  assert(typeof referralGetData.data.referralCode === "string", "Referral response returns referral code");
  assert(referralGetData.data.referralLink.includes("ref="), "Referral response returns valid referral link");
  assert(referralGetData.data.rewardPerReferral === 500, "Referral reward is 500 points per friend");

  // 2. Reject self-referral
  const selfReferralRes = await fetch(`${BASE_URL}/api/customer/referrals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${rmaToken}`,
    },
    body: JSON.stringify({ referralCode: referralGetData.data.referralCode }),
  });
  assert(selfReferralRes.status === 400, "Self-referral is rejected with HTTP 400");

  // 3. Admin Referrals Metrics
  const adminReferralsRes = await fetch(`${BASE_URL}/api/admin/referrals`);
  assert(adminReferralsRes.status === 200, "Admin referrals endpoint returns HTTP 200");
  const adminReferralsData = await adminReferralsRes.json();
  assert(adminReferralsData.success === true, "Admin referrals reports success: true");
  assert(typeof adminReferralsData.metrics.totalReferredCustomers === "number", "Admin tracks total referred customers");
  console.log();

  // --- TEST 26: Real-Time Admin Notification Center & Sound Alerts (Task 2) ---
  console.log("--- TEST 26: Real-Time Admin Notification Center & Sound Alerts ---");
  // 1. Create notification
  const createAlertRes = await fetch(`${BASE_URL}/api/admin/notifications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "order_paid",
      title: "Test Simulation Order Alert",
      message: "Order #99999 was paid successfully",
      referenceId: "sim-order-999",
      link: "/admin",
    }),
  });
  assert(createAlertRes.status === 200, "Create admin alert returns HTTP 200");
  const createAlertData = await createAlertRes.json();
  assert(createAlertData.success === true, "Create alert reports success: true");
  const alertId = createAlertData.notification.id;

  // 2. Fetch notifications
  const getAlertsRes = await fetch(`${BASE_URL}/api/admin/notifications?limit=10`);
  assert(getAlertsRes.status === 200, "Get admin notifications returns HTTP 200");
  const getAlertsData = await getAlertsRes.json();
  assert(getAlertsData.success === true, "Get alerts reports success: true");
  assert(getAlertsData.unreadCount >= 1, "Unread notifications count is tracked");
  assert(Array.isArray(getAlertsData.notifications), "Alerts list is an array");
  assert(getAlertsData.liveSummary.openTickets >= 0, "Live summary includes open tickets");

  // 3. Mark single notification as read
  const markReadRes = await fetch(`${BASE_URL}/api/admin/notifications`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: alertId }),
  });
  assert(markReadRes.status === 200, "Mark single alert read returns HTTP 200");

  // 4. Mark all as read
  const markAllReadRes = await fetch(`${BASE_URL}/api/admin/notifications`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markAll: true }),
  });
  assert(markAllReadRes.status === 200, "Mark all alerts read returns HTTP 200");
  console.log();

  // --- TEST 27: Automated Courier Dispatch & Real-Time Tracking Deep-Links (Task 3) ---
  console.log("--- TEST 27: Courier Dispatch & Real-Time Tracking Deep-Links ---");
  // 1. Transition an order to shipped with Courier details
  const shipCourierRes = await fetch(`${BASE_URL}/api/admin/orders/${bulkOrder1.id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "shipped",
      courier_name: "Speedaf Express",
      tracking_number: "SPD-NG-889900",
    }),
  });
  assert(shipCourierRes.status === 200, "Order transition to shipped with courier returns HTTP 200");
  const shipCourierData = await shipCourierRes.json();
  assert(shipCourierData.order.courier_name === "Speedaf Express", "Order records courier name");
  assert(shipCourierData.order.tracking_number === "SPD-NG-889900", "Order records tracking number");

  // 2. Query Track Order API by Tracking Code
  const trackByCodeRes = await fetch(`${BASE_URL}/api/track-order?tracking=SPD-NG-889900`);
  assert(trackByCodeRes.status === 200, "Track order by tracking code returns HTTP 200");
  const trackByCodeData = await trackByCodeRes.json();
  assert(Array.isArray(trackByCodeData.orders) && trackByCodeData.orders.length > 0, "Track order returns matched order");
  const trackedOrder = trackByCodeData.orders[0];
  assert(trackedOrder.courier_name === "Speedaf Express", "Tracked order includes courier name");
  assert(trackedOrder.tracking_number === "SPD-NG-889900", "Tracked order includes tracking number");
  assert(
    trackedOrder.tracking_url.includes("speedaf.com/tracking?nums=SPD-NG-889900"),
    "Tracked order includes valid external courier tracking URL"
  );
  assert(Array.isArray(trackedOrder.timeline), "Tracked order includes 4-step progress timeline");
  assert(trackedOrder.timeline.length === 4, "Timeline contains all 4 milestones");
  assert(trackedOrder.timeline[2].completed === true, "In Transit milestone is flagged as completed");
  console.log();

  // ==========================================
  // TEST 28: Customer Support & WhatsApp Escalation Desk (Task 1)
  // ==========================================
  console.log("--- TEST 28: Customer Support & WhatsApp Escalation Desk ---");
  // 1. Submit public customer support ticket
  const ticketRes = await fetch(`${BASE_URL}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName: "Amaka Eze",
      customerEmail: "amaka.eze@example.ng",
      customerPhone: "+2348012345678",
      category: "shipping",
      subject: "Inquiry on Same-Day Delivery to Ikeja",
      message: "Hello Aura team, please confirm if orders placed before noon arrive same day in Ikeja.",
    }),
  });
  assert(ticketRes.status === 201, "Customer ticket submission returns HTTP 201");
  const ticketData = await ticketRes.json();
  assert(ticketData.success === true, "Ticket response success flag is true");
  assert(ticketData.ticket?.id, "Created ticket has valid id");
  assert(ticketData.ticket.status === "open", "Initial ticket status is 'open'");

  // 2. Reject malformed customer ticket
  const badTicketRes = await fetch(`${BASE_URL}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerEmail: "not-an-email",
      message: "hi",
    }),
  });
  assert(badTicketRes.status === 400, "Malformed ticket submission returns HTTP 400");

  // 3. Admin Support Desk API: Fetch tickets with metrics & filters
  const adminTicketsRes = await fetch(`${BASE_URL}/api/admin/tickets?status=open&q=Amaka`);
  assert(adminTicketsRes.status === 200, "Admin tickets endpoint returns HTTP 200");
  const adminTicketsData = await adminTicketsRes.json();
  const counts = adminTicketsData.counts || adminTicketsData.stats;
  assert(counts && typeof counts.total === "number", "Admin tickets response returns counts");
  assert(Array.isArray(adminTicketsData.tickets), "Admin tickets response returns tickets array");
  const foundTicket = adminTicketsData.tickets.find((t: any) => t.id === ticketData.ticket.id);
  assert(Boolean(foundTicket), "Created ticket found in admin ticket list");
  assert(
    typeof foundTicket.whatsappReplyUrl === "string" && foundTicket.whatsappReplyUrl.includes("wa.me/2348012345678"),
    "Ticket generates 1-click WhatsApp response URL with sanitized phone"
  );

  // 4. Update ticket status & admin notes (Escalation)
  const patchTicketRes = await fetch(`${BASE_URL}/api/admin/tickets`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ticketId: ticketData.ticket.id,
      status: "escalated",
      adminNotes: "Assigned to VIP dispatch team for prompt confirmation",
    }),
  });
  assert(patchTicketRes.status === 200, "Admin ticket status update returns HTTP 200");
  const patchTicketData = await patchTicketRes.json();
  assert(patchTicketData.ticket.status === "escalated", "Ticket status successfully updated to 'escalated'");
  assert(
    patchTicketData.ticket.admin_notes === "Assigned to VIP dispatch team for prompt confirmation",
    "Ticket admin notes persisted"
  );
  console.log();

  // ==========================================
  // TEST 29: Product Customization & Engraving Studio (Task 2)
  // ==========================================
  console.log("--- TEST 29: Product Customization & Engraving Studio ---");
  // 1. Mark product as supporting engraving
  await prisma.product.update({
    where: { id: product.id },
    data: { supports_engraving: true },
  });

  // 2. Checkout with engraving & gift wrap
  const customCheckoutRes = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Chukwudi Nnamdi",
      email: "chukwudi@example.ng",
      phone: "+2348099887766",
      deliveryAddress: "Penthouse Suite, Victoria Island, Lagos",
      state: "Lagos",
      lagosZone: "Island (Ikoyi, VI, Lekki Phase 1)",
      isExpress: false,
      items: [
        {
          productId: product.id,
          quantity: 1,
          customEngraving: "Forever Yours",
          engravingFont: "serif",
          giftWrap: true,
        },
      ],
    }),
  });
  assert(customCheckoutRes.status === 200, "Customized product checkout returns HTTP 200");
  const customCheckoutData = await customCheckoutRes.json();
  assert(customCheckoutData.success === true, "Custom checkout response is successful");
  assert(customCheckoutData.orderId, "Custom checkout returns orderId");

  // 3. Verify OrderItem in DB has customization attributes
  const customOrderItem = await prisma.orderItem.findFirst({
    where: { order_id: customCheckoutData.orderId },
  });
  assert(customOrderItem !== null, "Created order item exists in database");
  assert(customOrderItem?.custom_engraving === "Forever Yours", "Custom engraving text is recorded");
  assert(customOrderItem?.engraving_font === "serif", "Engraving font selection is recorded");
  assert(customOrderItem?.gift_wrap === true, "Luxury gift wrap flag is recorded");

  // 4. Verify track-order API returns customization specs
  const trackCustomRes = await fetch(`${BASE_URL}/api/track-order?email=chukwudi@example.ng`);
  assert(trackCustomRes.status === 200, "Track order for customized item returns HTTP 200");
  const trackCustomData = await trackCustomRes.json();
  const trackedCustomOrder = trackCustomData.orders.find((o: any) => o.id === customCheckoutData.orderId);
  assert(Boolean(trackedCustomOrder), "Customized order found in track order response");
  assert(
    trackedCustomOrder.items[0].custom_engraving === "Forever Yours",
    "Track order response includes item custom_engraving"
  );
  assert(
    trackedCustomOrder.items[0].gift_wrap === true,
    "Track order response includes item gift_wrap"
  );
  console.log();

  // ==========================================
  // TEST 30: Automated SEO Engine, Dynamic OG Cards & Sitemaps (Task 3)
  // ==========================================
  console.log("--- TEST 30: Automated SEO Engine, Dynamic OG Cards & Sitemaps ---");
  // 1. Test sitemap generation endpoint
  const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`);
  assert(sitemapRes.status === 200, "GET /sitemap.xml returns HTTP 200");
  const sitemapText = await sitemapRes.text();
  assert(sitemapText.includes("<urlset") || sitemapText.includes("<url>"), "Sitemap contains valid XML urlset");
  assert(sitemapText.includes(`/${product.slug}`), "Sitemap includes dynamic product canonical URL");

  // 2. Test robots.txt endpoint
  const robotsRes = await fetch(`${BASE_URL}/robots.txt`);
  assert(robotsRes.status === 200, "GET /robots.txt returns HTTP 200");
  const robotsText = await robotsRes.text();
  assert(robotsText.toLowerCase().includes("user-agent: *"), "Robots.txt contains User-agent directive");
  assert(robotsText.includes("/admin"), "Robots.txt disallows admin path");
  assert(robotsText.includes("sitemap.xml"), "Robots.txt references sitemap.xml");

  // 3. Test dynamic OpenGraph image generation route
  const ogRes = await fetch(
    `${BASE_URL}/api/og?title=Luxury%20Timepiece&price=%E2%82%A6120,000&sector=Accessories&badge=Bestseller`
  );
  assert(ogRes.status === 200, "GET /api/og returns HTTP 200");
  const ogContentType = ogRes.headers.get("content-type");
  assert(Boolean(ogContentType && ogContentType.includes("image/png")), "OG route returns image/png content type");
  const ogBuffer = await ogRes.arrayBuffer();
  assert(ogBuffer.byteLength > 1000, "Generated OG image buffer is non-empty and valid binary");
  console.log();

  // ==========================================
  // TEST 31: Flash Sales Engine & Countdowns (Milestone 20 - Module 1)
  // ==========================================
  console.log("--- TEST 31: Flash Sales Engine & Timed Promotion Countdowns ---");
  // 1. Create a Flash Sale via Admin API
  const saleStart = new Date(Date.now() - 60000).toISOString();
  const saleEnd = new Date(Date.now() + 86400000 * 2).toISOString();
  const createSaleRes = await fetch(`${BASE_URL}/api/admin/flash-sales`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Weekend Flash Blitz",
      description: "25% discount across curated essentials",
      discount_percentage: 25,
      banner_text: "⚡ 25% OFF Weekend Flash Deal!",
      start_time: saleStart,
      end_time: saleEnd,
      product_ids: [product.id],
    }),
  });
  assert(createSaleRes.status === 201, "Admin create flash sale returns HTTP 201");
  const createSaleData = await createSaleRes.json();
  assert(createSaleData.success === true, "Flash sale created successfully");
  const createdSaleId = createSaleData.flash_sale.id;

  // 2. Public Flash Sales API verification
  const publicSalesRes = await fetch(`${BASE_URL}/api/flash-sales`);
  assert(publicSalesRes.status === 200, "GET /api/flash-sales returns HTTP 200");
  const publicSalesData = await publicSalesRes.json();
  assert(publicSalesData.success === true, "Public flash sales query succeeded");
  assert(publicSalesData.active_sale !== null, "Active flash sale found in public endpoint");
  assert(publicSalesData.active_sale.discount_percentage === 25, "Active flash sale has 25% discount");
  assert(publicSalesData.active_sale.remaining_seconds > 0, "Active flash sale has positive remaining seconds");
  const saleProduct = publicSalesData.active_sale.products.find((p: any) => p.id === product.id);
  assert(Boolean(saleProduct), "Product is included in active flash sale response");
  const expectedPromoPrice = Math.round(product.price_kobo * 0.75);
  assert(saleProduct.promo_price_kobo === expectedPromoPrice, "Promo price matches 25% discount calculation");

  // 3. Checkout automatically applies active flash sale price
  const flashCheckoutRes = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Tunde Bakare",
      email: "tunde@example.com",
      phone: "+2348033221144",
      deliveryAddress: "Marina, Lagos Island",
      state: "Lagos",
      lagosZone: "Island (Ikoyi, VI, Lekki Phase 1)",
      items: [{ productId: product.id, quantity: 1, giftWrap: false }],
    }),
  });
  assert(flashCheckoutRes.status === 200, "Checkout with flash sale item returns HTTP 200");
  const flashCheckoutData = await flashCheckoutRes.json();
  assert(flashCheckoutData.subtotalKobo === expectedPromoPrice, "Subtotal reflects flash sale discounted price");

  // 4. Admin updates / pauses flash sale
  const pauseSaleRes = await fetch(`${BASE_URL}/api/admin/flash-sales`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: createdSaleId, is_active: false }),
  });
  assert(pauseSaleRes.status === 200, "Admin pause flash sale returns HTTP 200");
  console.log();

  // ==========================================
  // TEST 32: Digital Gift Cards & Store Credit Wallet (Milestone 20 - Module 2)
  // ==========================================
  console.log("--- TEST 32: Digital Gift Cards & Store Credit Wallet ---");
  // 1. Issue / Purchase a Digital Gift Card
  const purchaseGcRes = await fetch(`${BASE_URL}/api/gift-cards/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount_kobo: 2500000, // ₦25,000
      recipient_name: "Amina Yusuf",
      recipient_email: "amina@example.com",
      sender_name: "Farouk",
      message: "Happy Birthday Amina! Enjoy shopping at Aura.",
      expires_in_days: 90,
    }),
  });
  assert(purchaseGcRes.status === 201, "POST /api/gift-cards/purchase returns HTTP 201");
  const purchaseGcData = await purchaseGcRes.json();
  assert(purchaseGcData.success === true, "Gift card purchased successfully");
  assert(typeof purchaseGcData.gift_card.code === "string", "Gift card has unique voucher code");
  assert(purchaseGcData.gift_card.balance_kobo === 2500000, "Gift card initial balance is ₦25,000");
  const gcCode = purchaseGcData.gift_card.code;

  // 2. Validate Gift Card code
  const validateGcRes = await fetch(`${BASE_URL}/api/gift-cards/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: gcCode, total_kobo: 1000000 }), // ₦10,000 order
  });
  assert(validateGcRes.status === 200, "POST /api/gift-cards/validate returns HTTP 200");
  const validateGcData = await validateGcRes.json();
  assert(validateGcData.valid === true, "Gift card validation returns valid: true");
  assert(validateGcData.balance_kobo === 2500000, "Balance is ₦25,000");
  assert(validateGcData.deduction_kobo === 1000000, "Deduction equals order total when balance exceeds total");

  // 3. Checkout using Gift Card (Split or Full payment)
  const gcCheckoutRes = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Amina Yusuf",
      email: "amina@example.com",
      phone: "+2348055443322",
      deliveryAddress: "Garki 2, Abuja",
      state: "Abuja (FCT)",
      giftCardCode: gcCode,
      items: [{ productId: product.id, quantity: 1 }],
    }),
  });
  assert(gcCheckoutRes.status === 200, "Checkout with Gift Card returns HTTP 200");
  const gcCheckoutData = await gcCheckoutRes.json();
  assert(gcCheckoutData.success === true, "Gift card checkout succeeds");
  assert(gcCheckoutData.giftCardCode === gcCode, "Returned order includes applied gift card code");
  assert(gcCheckoutData.giftCardDeductionKobo > 0, "Gift card deduction recorded in checkout response");

  // 4. Verify Gift Card balance decremented in DB
  const updatedGc = await prisma.giftCard.findUnique({ where: { code: gcCode } });
  assert(updatedGc !== null, "Gift card exists in DB");
  assert(updatedGc!.balance_kobo < 2500000, "Gift card balance successfully decremented after checkout");

  // 5. Verify GiftCardRedemption record
  const redemption = await prisma.giftCardRedemption.findFirst({
    where: { gift_card_id: updatedGc!.id },
  });
  assert(redemption !== null, "GiftCardRedemption record persisted");
  assert(redemption!.amount_kobo > 0, "Redemption amount is recorded");

  // 6. Admin Gift Cards API metrics
  const adminGcRes = await fetch(`${BASE_URL}/api/admin/gift-cards`);
  assert(adminGcRes.status === 200, "GET /api/admin/gift-cards returns HTTP 200");
  const adminGcData = await adminGcRes.json();
  assert(adminGcData.stats.total_cards >= 1, "Admin stats reflect issued gift cards");
  assert(adminGcData.stats.total_redeemed_kobo > 0, "Admin stats reflect redeemed amount");
  console.log();

  // ==========================================
  // TEST 33: Product Community Q&A & Answer Desk (Milestone 20 - Module 3)
  // ==========================================
  console.log("--- TEST 33: Product Community Q&A & Answer Desk ---");
  // 1. Submit a Customer Question
  const askRes = await fetch(`${BASE_URL}/api/products/${product.id}/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer_name: "Ngozi Obi",
      customer_email: "ngozi@example.com",
      question: "Is this item covered by a 1-year warranty and does it tarnish?",
    }),
  });
  assert(askRes.status === 201, "POST /api/products/[id]/questions returns HTTP 201");
  const askData = await askRes.json();
  assert(askData.success === true, "Question submitted successfully");
  const createdQuestionId = askData.question.id;

  // 2. Fetch approved questions on PDP
  const getQuestionsRes = await fetch(`${BASE_URL}/api/products/${product.id}/questions`);
  assert(getQuestionsRes.status === 200, "GET /api/products/[id]/questions returns HTTP 200");
  const getQuestionsData = await getQuestionsRes.json();
  assert(Array.isArray(getQuestionsData.questions), "Questions response contains array");
  const foundQ = getQuestionsData.questions.find((q: any) => q.id === createdQuestionId);
  assert(Boolean(foundQ), "Submitted question found in PDP questions list");

  // 3. Admin Answers the Question
  const answerRes = await fetch(`${BASE_URL}/api/admin/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question_id: createdQuestionId,
      answer: "Yes! It is crafted from 18k PVD gold-plated stainless steel which does not tarnish and includes a 1-year warranty.",
      answered_by: "Aura Store Concierge",
    }),
  });
  assert(answerRes.status === 201, "POST /api/admin/questions returns HTTP 201");
  const answerData = await answerRes.json();
  assert(answerData.success === true, "Admin answer posted successfully");
  const createdAnswerId = answerData.answer.id;

  // 4. Upvote helpful answer
  const upvoteRes = await fetch(
    `${BASE_URL}/api/products/${product.id}/questions/${createdQuestionId}/answers/${createdAnswerId}/helpful`,
    { method: "POST" }
  );
  assert(upvoteRes.status === 200, "POST answer helpful vote returns HTTP 200");
  const upvoteData = await upvoteRes.json();
  assert(upvoteData.helpful_count === 1, "Helpful count incremented to 1");

  // 5. Verify PDP returns answered question with official badge and helpful count
  const verifyQnaRes = await fetch(`${BASE_URL}/api/products/${product.id}/questions`);
  const verifyQnaData = await verifyQnaRes.json();
  const verifiedQ = verifyQnaData.questions.find((q: any) => q.id === createdQuestionId);
  assert(verifiedQ.answers.length === 1, "Question now has 1 answer");
  assert(verifiedQ.answers[0].is_official === true, "Answer has is_official: true");
  assert(verifiedQ.answers[0].helpful_count === 1, "Answer has helpful_count: 1");
  console.log();

  console.log("=================================================");
  console.log(`🎉 ALL ${passedTests}/${totalTests} INTEGRATION TESTS PASSED!`);
  console.log("=================================================\n");
}

runTests()
  .catch((err) => {
    console.error("\n❌ TEST SUITE FAILED WITH ERROR:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
