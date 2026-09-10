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
  assert(shippingCheckoutData.shippingFeeKobo === 400000, "Shipping fee includes Island base (₦2,500) + Express (₦1,500)");
  assert(shippingCheckoutData.totalKobo === product.price_kobo + 400000, "Order total correctly includes item price and shipping fee");
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
  const adminReviewsGetRes = await fetch(`${BASE_URL}/api/admin/reviews`);
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
