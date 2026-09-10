import { prisma } from "@/lib/db/prisma";
import { formatKoboToNaira } from "@/lib/utils";
import { sendWhatsAppTextMessage, sendWhatsAppTemplate } from "@/lib/whatsapp/send";
import { Resend } from "resend";

export interface SendRecoveryResult {
  success: boolean;
  emailSent: boolean;
  whatsappSent: boolean;
  error?: string;
}

export async function sendOrderRecoveryNotifications({
  orderId,
  discountCode = "SAVE5",
}: {
  orderId: string;
  discountCode?: string;
}): Promise<SendRecoveryResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      items: true,
    },
  });

  if (!order) {
    return { success: false, emailSent: false, whatsappSent: false, error: "Order not found" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const recoveryUrl = `${appUrl}/checkout/resume?order=${order.id}${discountCode ? `&code=${discountCode}` : ""}`;
  const totalNaira = formatKoboToNaira(order.total_kobo);

  let emailSent = false;
  let whatsappSent = false;

  // 1. Send Recovery Email via Resend (or Mock log)
  if (order.customer.email) {
    const resendApiKey = process.env.RESEND_API_KEY;
    const resend = resendApiKey ? new Resend(resendApiKey) : null;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "orders@resend.dev";

    const itemsListHtml = order.items
      .map(
        (item) => `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #1e293b; font-weight: 500;">${item.product_name_snapshot}</td>
            <td style="padding: 10px 0; text-align: center; color: #64748b;">x${item.qty}</td>
            <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #0f172a;">${formatKoboToNaira(item.line_total_kobo)}</td>
          </tr>`
      )
      .join("");

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #334155; line-height: 1.5;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">Did you leave something behind?</h1>
          <p style="font-size: 14px; color: #64748b; margin: 0;">We saved your shopping bag for Order #${order.order_number}</p>
        </div>

        <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
          <p style="font-size: 14px; margin-top: 0;">Hi <strong>${order.customer.name}</strong>,</p>
          <p style="font-size: 14px; color: #475569;">
            You started checking out but haven't finalized your payment. Good news: your reserved items are waiting, but popular stock sells fast!
          </p>

          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase;">
                <th style="padding-bottom: 8px;">Item</th>
                <th style="padding-bottom: 8px; text-align: center;">Qty</th>
                <th style="padding-bottom: 8px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsListHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding-top: 12px; font-weight: 700; color: #0f172a;">Total Amount</td>
                <td style="padding-top: 12px; text-align: right; font-weight: 800; color: #0f172a; font-size: 15px;">${totalNaira}</td>
              </tr>
            </tfoot>
          </table>

          <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; text-align: center; margin-top: 16px;">
            <span style="font-size: 13px; color: #92400e; font-weight: 600;">Special incentive: Use coupon <strong>${discountCode}</strong> to save on completion!</span>
          </div>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${recoveryUrl}" style="background-color: #0f172a; color: #ffffff; padding: 14px 32px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px; display: inline-block;">
            Resume Checkout & Pay (1-Click)
          </a>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;">
          <p>Delivering to: ${order.delivery_address}</p>
          <p>Have questions or prefer manual bank transfer? Simply reply to this email or reach us on WhatsApp.</p>
        </div>
      </div>
    `;

    try {
      if (resend) {
        await resend.emails.send({
          from: fromEmail,
          to: order.customer.email,
          subject: `Complete your order #${order.order_number} before items sell out!`,
          html: emailHtml,
        });
      } else {
        console.info(`[Email Recovery (Mock)] Sent recovery email to ${order.customer.email} for order #${order.order_number}`);
      }

      await prisma.messageNotificationLog.create({
        data: {
          order_id: order.id,
          channel: "email",
          template_name: "abandoned_cart_email",
          status: "sent",
        },
      });
      emailSent = true;
    } catch (err) {
      console.error(`[Abandoned Cart] Failed to send recovery email for #${order.order_number}:`, err);
      await prisma.messageNotificationLog.create({
        data: {
          order_id: order.id,
          channel: "email",
          template_name: "abandoned_cart_email",
          status: "failed",
        },
      });
    }
  }

  // 2. Send WhatsApp Recovery Notification (if opted-in & valid E.164 phone)
  if (order.customer.whatsapp_phone_e164) {
    const itemsSummary = order.items
      .map((i) => `• ${i.product_name_snapshot} (x${i.qty})`)
      .join("\n");

    const whatsappMessage = `Hi ${order.customer.name}! 👋\n\nWe noticed you didn't finish checking out Order *#${order.order_number}*! 🛍️\n\nYour items:\n${itemsSummary}\n\n*Total:* ${totalNaira}\n\n👉 Complete your purchase in 1 click here:\n${recoveryUrl}\n\n💡 Use code *${discountCode}* to save on your order!\n\nNeed bank transfer details or assistance? Reply to this message and our team will help right away!`;

    try {
      // Send interactive text message
      await sendWhatsAppTextMessage({
        toE164: order.customer.whatsapp_phone_e164,
        text: whatsappMessage,
        orderId: order.id,
      });

      // Also attempt template if approved
      try {
        await sendWhatsAppTemplate({
          toE164: order.customer.whatsapp_phone_e164,
          templateKey: "abandoned_cart_reminder",
          variables: [order.customer.name, `#${order.order_number}`, recoveryUrl],
          orderId: order.id,
        });
      } catch (tmplErr) {
        // Template fallback safe
      }

      await prisma.messageNotificationLog.create({
        data: {
          order_id: order.id,
          channel: "whatsapp",
          template_name: "abandoned_cart_reminder",
          status: "sent",
        },
      });
      whatsappSent = true;
    } catch (waErr) {
      console.error(`[Abandoned Cart] Failed sending WhatsApp for #${order.order_number}:`, waErr);
    }
  }

  // Mark reminder sent timestamp atomically
  await prisma.order.update({
    where: { id: order.id },
    data: { reminder_sent_at: new Date() },
  });

  return { success: true, emailSent, whatsappSent };
}

export async function sweepAbandonedOrders({
  thresholdMinutes = 30,
}: {
  thresholdMinutes?: number;
} = {}) {
  const now = new Date();
  const reminderThreshold = new Date(now.getTime() - thresholdMinutes * 60 * 1000 + 1000);
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  let remindersSentEmail = 0;
  let remindersSentWhatsApp = 0;

  // 1. Find pending orders created >= thresholdMinutes ago without a reminder sent
  const eligibleOrders = await prisma.order.findMany({
    where: {
      status: "pending_payment",
      created_at: { lte: reminderThreshold },
      reminder_sent_at: null,
    },
    take: 50,
  });

  for (const order of eligibleOrders) {
    const res = await sendOrderRecoveryNotifications({ orderId: order.id });
    if (res.emailSent) remindersSentEmail++;
    if (res.whatsappSent) remindersSentWhatsApp++;
  }

  // 2. Mark 48-Hour Unpaid Orders as Abandoned
  const abandonedOrders = await prisma.order.updateMany({
    where: {
      status: "pending_payment",
      created_at: { lte: fortyEightHoursAgo },
      abandoned_at: null,
    },
    data: {
      status: "abandoned",
      abandoned_at: now,
    },
  });

  return {
    evaluatedCount: eligibleOrders.length,
    remindersSentEmail,
    remindersSentWhatsApp,
    ordersMarkedAbandoned: abandonedOrders.count,
  };
}
