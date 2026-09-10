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
