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
