import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { formatToE164, formatKoboToNaira } from "@/lib/utils";
import { notifyOrderStatusChange } from "@/lib/notify";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp/send";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token === expectedToken && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256") || "";
    const appSecret = process.env.WHATSAPP_APP_SECRET;

    // Signature verification
    if (appSecret) {
      const expected =
        "sha256=" +
        crypto
          .createHmac("sha256", appSecret)
          .update(rawBody)
          .digest("hex");

      if (signature !== expected) {
        console.warn("[WhatsApp Webhook] Invalid signature rejected.");
        return new Response("Invalid signature", { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);

    // Ensure it's a WhatsApp business event
    if (payload.object !== "whatsapp_business_account") {
      return new Response("Not a WhatsApp event", { status: 404 });
    }

    const entries = payload.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;
        const messages = value?.messages || [];

        for (const message of messages) {
          await processIncomingMessage(message);
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("[WhatsApp Webhook] Handler error:", err);
    return new Response("Internal error", { status: 500 });
  }
}

async function processIncomingMessage(message: {
  from: string;
  type: string;
  text?: { body: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string };
  };
}) {
  const senderPhone = formatToE164(message.from);

  // 1. Check if sender is a whitelisted AdminUser (Rule 10)
  const admin = await prisma.adminUser.findFirst({
    where: { whatsapp_phone_e164: senderPhone },
  });

  if (admin) {
    await handleAdminMessage(senderPhone, message);
    return;
  }

  // 2. Otherwise route to Customer FAQ / Support Ticket Handling
  await handleCustomerMessage(senderPhone, message);
}

async function handleAdminMessage(
  adminPhone: string,
  message: {
    type: string;
    text?: { body: string };
    interactive?: {
      button_reply?: { id: string; title: string };
    };
  }
) {
  // Handle interactive quick-reply buttons (e.g. from admin_new_order template)
  const buttonReply = message.interactive?.button_reply;
  if (buttonReply) {
    const actionId = buttonReply.id; // e.g. "mark_shipped_1042" or "mark_delivered_1042"

    if (actionId.startsWith("mark_shipped_")) {
      const orderNumber = parseInt(actionId.replace("mark_shipped_", ""), 10);
      const order = await prisma.order.findUnique({ where: { order_number: orderNumber } });
      if (order && order.status === "paid") {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "shipped" },
        });
        await notifyOrderStatusChange({ orderId: order.id, status: "shipped" });
        console.log(`[Admin Action] Order #${orderNumber} marked shipped via WhatsApp by ${adminPhone}`);
      }
      return;
    }

    if (actionId.startsWith("mark_delivered_")) {
      const orderNumber = parseInt(actionId.replace("mark_delivered_", ""), 10);
      const order = await prisma.order.findUnique({ where: { order_number: orderNumber } });
      if (order && order.status === "shipped") {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "delivered" },
        });
        await notifyOrderStatusChange({ orderId: order.id, status: "delivered" });
        console.log(`[Admin Action] Order #${orderNumber} marked delivered via WhatsApp by ${adminPhone}`);
      }
      return;
    }
  }

  // Plaintext admin commands can be added here if needed
}

async function handleCustomerMessage(
  customerPhone: string,
  message: {
    type: string;
    text?: { body: string };
  }
) {
  const text = message.text?.body?.trim().toLowerCase() || "";

  // 1. Welcome / Menu Keywords
  const greetings = ["hi", "hello", "hey", "menu", "start", "help", "good morning", "good afternoon", "good evening"];
  if (greetings.some((g) => text === g || text.startsWith(g + " "))) {
    const welcomeText =
      `✨ *Welcome to Aura Store!* ✨\n` +
      `How can we help you today?\n\n` +
      `1️⃣ *Track an Order*: Reply with your Order # (e.g. *#1042* or *1042*)\n` +
      `2️⃣ *Catalog & Products*: Reply *STORE*\n` +
      `3️⃣ *Payment & Bank Transfers*: Reply *PAYMENT*\n` +
      `4️⃣ *Customer Support*: Reply with your question or *AGENT*\n\n` +
      `🌐 Visit our storefront: https://aurastore.ng`;

    await sendWhatsAppTextMessage({ toE164: customerPhone, text: welcomeText });
    return;
  }

  // 2. Storefront Catalog Links
  if (text === "store" || text === "shop" || text === "catalog" || text === "website") {
    const storeText =
      `🛍️ *Aura Store Curated Collections*\n\n` +
      `• 💎 *Jewelry & Accessories*: https://aurastore.ng/jewelry-accessories\n` +
      `• 🌸 *Girly Essentials*: https://aurastore.ng/girly-essentials\n` +
      `• 📸 *Content Accessories*: https://aurastore.ng/content-accessories\n` +
      `• 🎁 *Kitchen & Souvenirs*: https://aurastore.ng/kitchen-souvenirs\n\n` +
      `🚚 Nationwide delivery: Lagos (24-48 hrs), other states (2-5 days).`;

    await sendWhatsAppTextMessage({ toE164: customerPhone, text: storeText });
    return;
  }

  // 3. Payment Inquiries & Bank Transfers
  if (text === "payment" || text === "pay" || text === "bank" || text === "transfer") {
    const pendingOrder = await prisma.order.findFirst({
      where: {
        customer: { whatsapp_phone_e164: customerPhone },
        status: "pending_payment",
      },
      orderBy: { created_at: "desc" },
    });

    if (pendingOrder) {
      const paymentText =
        `💳 *Pending Order Found*\n\n` +
        `You have a pending order *#${pendingOrder.order_number}* totaling *${formatKoboToNaira(pendingOrder.total_kobo)}*.\n\n` +
        `To pay securely with your Card, Bank Transfer, USSD, or Apple Pay, visit:\n` +
        `🔗 https://aurastore.ng/checkout\n\n` +
        `If you have already paid or transferred, please send your payment reference and our team will confirm it.`;

      await sendWhatsAppTextMessage({ toE164: customerPhone, text: paymentText, orderId: pendingOrder.id });
      return;
    } else {
      const genericPaymentText =
        `💳 *Aura Store Payment Info*\n\n` +
        `All orders are secured via Paystack. You can pay with Debit Cards, Bank Transfer, or USSD directly during checkout.\n\n` +
        `If you need direct bank transfer details or paid without receiving confirmation, reply with your receipt screenshot and an agent will assist you!`;

      await sendWhatsAppTextMessage({ toE164: customerPhone, text: genericPaymentText });
      return;
    }
  }

  // 4. Order Status Inquiry (e.g. "track 1042", "#1042", "1042", or "status")
  const trackMatch = text.match(/(?:track|order|status)?\s*#?(\d{1,7})\b/i);
  if (trackMatch) {
    const orderNumber = parseInt(trackMatch[1], 10);
    const order = await prisma.order.findUnique({
      where: { order_number: orderNumber },
      include: { customer: true, items: true },
    });

    if (order) {
      const statusLabels: Record<string, string> = {
        pending_payment: "⏳ Pending Payment",
        paid: "✅ Payment Confirmed (Processing)",
        shipped: "🚚 Dispatched / In Transit",
        delivered: "🎉 Delivered Successfully",
        returned: "⚠️ Returned to Warehouse",
        cancelled: "❌ Cancelled",
        abandoned: "🛒 Cart Incomplete",
      };

      let reply = `📦 *Order #${order.order_number} Status*\n\n`;
      reply += `• *Status*: ${statusLabels[order.status] || order.status}\n`;
      reply += `• *Total*: ${formatKoboToNaira(order.total_kobo)}\n`;
      if (order.courier_name) {
        reply += `• *Courier*: ${order.courier_name}\n`;
      }
      if (order.tracking_number) {
        reply += `• *Waybill / Tracking*: ${order.tracking_number}\n`;
      }
      if (order.dispatch_notes) {
        reply += `• *Notes*: ${order.dispatch_notes}\n`;
      }
      reply += `• *Address*: ${order.delivery_address}\n\n`;
      reply += `🔗 Live Tracking & Receipt:\nhttps://aurastore.ng/track-order?order=${order.order_number}`;

      await sendWhatsAppTextMessage({
        toE164: customerPhone,
        text: reply,
        orderId: order.id,
      });
      return;
    } else {
      const notFoundText =
        `🔍 We could not find an order with number *#${orderNumber}*.\n\n` +
        `Please check the order number in your confirmation email, or reply with *AGENT* to speak with our support team.`;

      await sendWhatsAppTextMessage({ toE164: customerPhone, text: notFoundText });
      return;
    }
  }

  // 5. If customer just texted "track" without numbers, check by customer's phone
  if (text.includes("track") || text.includes("my order")) {
    const latestOrder = await prisma.order.findFirst({
      where: { customer: { whatsapp_phone_e164: customerPhone } },
      orderBy: { created_at: "desc" },
    });

    if (latestOrder) {
      const reply =
        `📦 *Your Recent Order #${latestOrder.order_number}*\n\n` +
        `• *Status*: ${latestOrder.status}\n` +
        `• *Total*: ${formatKoboToNaira(latestOrder.total_kobo)}\n` +
        (latestOrder.courier_name ? `• *Courier*: ${latestOrder.courier_name}\n` : "") +
        (latestOrder.tracking_number ? `• *Tracking*: ${latestOrder.tracking_number}\n\n` : "\n") +
        `🔗 Track details: https://aurastore.ng/track-order?order=${latestOrder.order_number}`;

      await sendWhatsAppTextMessage({ toE164: customerPhone, text: reply, orderId: latestOrder.id });
      return;
    }
  }

  // 6. Fallback: Log SupportTicket and send confirmation to customer (Rule 44 in agent.md)
  const ticket = await prisma.supportTicket.create({
    data: {
      whatsapp_phone_e164: customerPhone,
      message: message.text?.body || `Message of type: ${message.type}`,
      status: "open",
    },
  });

  const ticketReply =
    `💬 *Support Ticket Received* (#${ticket.id.slice(-6).toUpperCase()})\n\n` +
    `Thank you for contacting Aura Store! Your message has been routed to our customer care team.\n\n` +
    `An agent will reply directly in this chat shortly (Mon-Sat, 9 AM - 6 PM WAT).\n\n` +
    `If this is about an existing order, please include your *Order #*.`;

  await sendWhatsAppTextMessage({ toE164: customerPhone, text: ticketReply });
  console.log(`[Support Ticket] Created support ticket ${ticket.id} for ${customerPhone}`);
}
