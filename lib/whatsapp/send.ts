import { TEMPLATES, TemplateKey } from "./templates";
import { prisma } from "@/lib/db/prisma";

export interface SendTemplateResult {
  skipped: boolean;
  success: boolean;
  error?: string;
}

export async function sendWhatsAppTemplate({
  toE164,
  templateKey,
  variables,
  orderId,
}: {
  toE164: string;
  templateKey: TemplateKey;
  variables: string[];
  orderId?: string;
}): Promise<SendTemplateResult> {
  const template = TEMPLATES[templateKey];

  if (!template) {
    console.warn(`[WhatsApp] Unknown template key: ${templateKey}`);
    if (orderId) {
      await logNotification(orderId, templateKey, "skipped");
    }
    return { skipped: true, success: false, error: "Unknown template" };
  }

  if (!template.approved) {
    console.info(`[WhatsApp] Template '${templateKey}' is not yet marked approved. Skipping send.`);
    if (orderId) {
      await logNotification(orderId, templateKey, "skipped");
    }
    return { skipped: true, success: false, error: "Template not approved" };
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.warn("[WhatsApp] WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN not configured.");
    if (orderId) {
      await logNotification(orderId, templateKey, "skipped");
    }
    return { skipped: true, success: false, error: "WhatsApp credentials not configured" };
  }

  try {
    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toE164,
        type: "template",
        template: {
          name: template.name,
          language: { code: "en_US" },
          components: [
            {
              type: "body",
              parameters: variables.map((v) => ({
                type: "text",
                text: v,
              })),
            },
          ],
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[WhatsApp] Graph API error (${res.status}): ${errBody}`);
      if (orderId) {
        await logNotification(orderId, templateKey, "failed");
      }
      return { skipped: false, success: false, error: errBody };
    }

    if (orderId) {
      await logNotification(orderId, templateKey, "sent");
    }
    return { skipped: false, success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[WhatsApp] Network / client exception while sending message:", message);
    if (orderId) {
      await logNotification(orderId, templateKey, "failed");
    }
    // Caller must not throw - agent.md rule 7
    return { skipped: false, success: false, error: message };
  }
}

async function logNotification(orderId: string, templateKey: string, status: "sent" | "failed" | "skipped") {
  try {
    await prisma.messageNotificationLog.create({
      data: {
        order_id: orderId,
        channel: "whatsapp",
        template_name: templateKey,
        status,
      },
    });
  } catch (logErr) {
    console.error("[WhatsApp] Failed to write MessageNotificationLog:", logErr);
  }
}

export async function sendWhatsAppTextMessage({
  toE164,
  text,
  orderId,
}: {
  toE164: string;
  text: string;
  orderId?: string;
}): Promise<SendTemplateResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.info(`[WhatsApp Bot (Mock)] To: ${toE164} | Message:\n${text}`);
    if (orderId) {
      await logNotification(orderId, "bot_text_reply", "sent");
    }
    return { skipped: false, success: true };
  }

  try {
    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toE164,
        type: "text",
        text: { body: text, preview_url: true },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[WhatsApp Bot] Graph API error (${res.status}): ${errBody}`);
      if (orderId) {
        await logNotification(orderId, "bot_text_reply", "failed");
      }
      return { skipped: false, success: false, error: errBody };
    }

    if (orderId) {
      await logNotification(orderId, "bot_text_reply", "sent");
    }
    return { skipped: false, success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[WhatsApp Bot] Network exception sending message:", message);
    if (orderId) {
      await logNotification(orderId, "bot_text_reply", "failed");
    }
    return { skipped: false, success: false, error: message };
  }
}

export async function notifyCustomerReturnStatus({
  toE164,
  orderNumber,
  rmaNumber,
  status,
  refundAmountKobo,
  refundMethod,
  orderId,
  trackingNumber,
  courierName,
  creditCode,
  note,
}: {
  toE164: string;
  orderNumber: number;
  rmaNumber: string;
  status: string;
  refundAmountKobo?: number;
  refundMethod?: string;
  orderId?: string;
  trackingNumber?: string;
  courierName?: string;
  creditCode?: string;
  note?: string;
}): Promise<SendTemplateResult> {
  const formattedAmount = refundAmountKobo ? `₦${(refundAmountKobo / 100).toLocaleString()}` : "";
  let message = `📦 *Aura Store - Return Update (${rmaNumber})*\nOrder: #${orderNumber}\nStatus: *${status.toUpperCase().replace("_", " ")}*`;

  if (status === "approved") {
    message += `\n\n✅ Your return request has been approved.`;
    if (courierName) message += `\nCourier: ${courierName}`;
    if (trackingNumber) message += `\nPickup Tracking #: ${trackingNumber}`;
    message += `\nPlease package the items securely for pickup.`;
  } else if (status === "in_transit") {
    message += `\n\n🚚 Your returned item has been collected by ${courierName || "the courier"} and is in transit to our inspection facility.`;
  } else if (status === "received") {
    message += `\n\n🔍 Returned items have been received at our warehouse and passed inspection.`;
  } else if (status === "refunded") {
    message += `\n\n🎉 Refund of *${formattedAmount}* has been issued!`;
    if (refundMethod === "store_credit" && creditCode) {
      message += `\nStore Credit Coupon Code: *${creditCode}* (Apply during next checkout).`;
    } else {
      message += `\nRefund processed to your original payment card via Paystack.`;
    }
  } else if (status === "rejected") {
    message += `\n\n❌ Return request could not be approved.`;
    if (note) message += `\nReason: ${note}`;
  }

  return sendWhatsAppTextMessage({ toE164, text: message, orderId });
}

export async function notifyAdminReturnRequest({
  rmaNumber,
  orderNumber,
  customerName,
  reason,
  totalRefundKobo,
  orderId,
}: {
  rmaNumber: string;
  orderNumber: number;
  customerName: string;
  reason: string;
  totalRefundKobo: number;
  orderId?: string;
}): Promise<SendTemplateResult> {
  const formattedAmount = `₦${(totalRefundKobo / 100).toLocaleString()}`;
  const adminPhone = process.env.ADMIN_WHATSAPP_PHONE || "+2348000000001";
  const text = `🚨 *New Return Request (${rmaNumber})*\nOrder: #${orderNumber}\nCustomer: ${customerName}\nReason: ${reason.replace(/_/g, " ")}\nRefund Expected: ${formattedAmount}\n\nReview & Approve in Admin Dashboard: /admin?tab=returns`;

  return sendWhatsAppTextMessage({ toE164: adminPhone, text, orderId });
}

