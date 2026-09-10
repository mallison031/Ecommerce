import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { formatToE164, formatKoboToNaira } from "@/lib/utils";
import { notifyOrderStatusChange } from "@/lib/notify";

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

  // Order status inquiry: e.g. "track 1042" or numbers only
  const trackMatch = text.match(/(?:track|order|status)?\s*#?(\d{3,})/i);
  if (trackMatch) {
    const orderNumber = parseInt(trackMatch[1], 10);
    const order = await prisma.order.findUnique({
      where: { order_number: orderNumber },
      include: { customer: true },
    });

    if (order) {
      console.log(`[WhatsApp FAQ] Customer checked order #${orderNumber}: status ${order.status}`);
      // In production within 24h window, bot can reply with order status & total
      return;
    }
  }

  // Fallback: If intent isn't recognized or resolved, create SupportTicket (Rule 44 in agent.md)
  await prisma.supportTicket.create({
    data: {
      whatsapp_phone_e164: customerPhone,
      message: message.text?.body || `Message of type: ${message.type}`,
      status: "open",
    },
  });

  console.log(`[Support Ticket] Created support ticket for ${customerPhone}`);
}
