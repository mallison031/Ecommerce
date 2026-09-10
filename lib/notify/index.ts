import { prisma } from "@/lib/db/prisma";
import { sendWhatsAppTemplate } from "@/lib/whatsapp/send";
import { formatKoboToNaira } from "@/lib/utils";
import { Resend } from "resend";

export type OrderNotificationStatus = "paid" | "shipped" | "delivered" | "returned";

interface NotifyOrderOptions {
  orderId: string;
  status: OrderNotificationStatus;
}

export async function notifyOrderStatusChange({ orderId, status }: NotifyOrderOptions): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      items: true,
    },
  });

  if (!order) {
    console.error(`[Notify] Order not found: ${orderId}`);
    return;
  }

  const { customer } = order;

  // 1. UNCONDITIONAL EMAIL NOTIFICATION (Rule 6)
  await sendCustomerEmail({
    toEmail: customer.email,
    customerName: customer.name,
    orderNumber: order.order_number,
    status,
    totalNaira: formatKoboToNaira(order.total_kobo),
  });

  // 2. WHATSAPP CUSTOMER NOTIFICATION (if opted-in & valid E.164 phone)
  if (customer.whatsapp_opt_in && customer.whatsapp_phone_e164) {
    const templateMap: Record<OrderNotificationStatus, "order_confirmed" | "order_shipped" | "order_delivered" | "order_returned"> = {
      paid: "order_confirmed",
      shipped: "order_shipped",
      delivered: "order_delivered",
      returned: "order_returned",
    };

    const templateKey = templateMap[status];

    // Safe invocation: WhatsApp failure must NEVER throw out or block execution (Rule 7)
    try {
      await sendWhatsAppTemplate({
        toE164: customer.whatsapp_phone_e164,
        templateKey,
        variables: [String(order.order_number), formatKoboToNaira(order.total_kobo)],
        orderId: order.id,
      });
    } catch (waErr) {
      console.error(`[Notify] WhatsApp notification error swallowed:`, waErr);
    }
  }

  // 3. ADMIN NOTIFICATION (on 'paid' for new orders or 'returned' for courier issues)
  if (status === "paid" || status === "returned") {
    await notifyAdmins({
      orderId: order.id,
      orderNumber: order.order_number,
      customerName: customer.name,
      totalNaira: formatKoboToNaira(order.total_kobo),
      status,
    });
  }
}

async function sendCustomerEmail({
  toEmail,
  customerName,
  orderNumber,
  status,
  totalNaira,
}: {
  toEmail: string;
  customerName: string;
  orderNumber: number;
  status: OrderNotificationStatus;
  totalNaira: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "orders@resend.dev";

  const statusTitles: Record<OrderNotificationStatus, { subject: string; headline: string }> = {
    paid: {
      subject: `Order Confirmed - #${orderNumber}`,
      headline: "Your payment was successful and your order is confirmed!",
    },
    shipped: {
      subject: `Order Shipped - #${orderNumber}`,
      headline: "Good news! Your order is on its way to you.",
    },
    delivered: {
      subject: `Order Delivered - #${orderNumber}`,
      headline: "Your order has been delivered. Enjoy your items!",
    },
    returned: {
      subject: `Order Returned - #${orderNumber}`,
      headline: "Your shipment has been flagged as returned. Our team will contact you.",
    },
  };

  const info = statusTitles[status];

  if (!apiKey) {
    console.info(`[Email (Mock)] To: ${toEmail} | Subject: ${info.subject} | Status: ${status}`);
    return;
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: info.subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111;">
          <h2>${info.headline}</h2>
          <p>Hi ${customerName},</p>
          <p>This is an update regarding order <strong>#${orderNumber}</strong> totaling <strong>${totalNaira}</strong>.</p>
          <p>Status: <span style="display:inline-block; padding: 4px 10px; background: #e0f2fe; color: #0369a1; border-radius: 4px; font-weight: bold; text-transform: uppercase;">${status}</span></p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="font-size: 13px; color: #6b7280;">If you have any questions, you can contact us via our WhatsApp customer care link.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[Email] Failed to send email via Resend:", err);
  }
}

async function notifyAdmins({
  orderNumber,
  customerName,
  totalNaira,
  status,
  orderId,
}: {
  orderNumber: number;
  customerName: string;
  totalNaira: string;
  status: "paid" | "returned";
  orderId: string;
}) {
  try {
    const admins = await prisma.adminUser.findMany({
      where: {
        whatsapp_phone_e164: { not: null },
      },
      select: { whatsapp_phone_e164: true },
    });

    for (const admin of admins) {
      if (!admin.whatsapp_phone_e164) continue;

      if (status === "paid") {
        await sendWhatsAppTemplate({
          toE164: admin.whatsapp_phone_e164,
          templateKey: "admin_new_order",
          variables: [String(orderNumber), customerName, totalNaira],
          orderId,
        });
      } else if (status === "returned") {
        await sendWhatsAppTemplate({
          toE164: admin.whatsapp_phone_e164,
          templateKey: "admin_return_alert",
          variables: [String(orderNumber)],
          orderId,
        });
      }
    }
  } catch (err) {
    console.error("[Notify] Failed notifying admins:", err);
  }
}
