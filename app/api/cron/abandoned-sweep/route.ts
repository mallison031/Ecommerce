import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  // Validate cron secret if configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const resendApiKey = process.env.RESEND_API_KEY;
  const resend = resendApiKey ? new Resend(resendApiKey) : null;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "orders@resend.dev";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  let remindersSent = 0;
  let ordersMarkedAbandoned = 0;

  try {
    // 1. Send 1-Hour Reminder Email (atomic check-and-set)
    // Find pending orders created more than 1 hour ago without a reminder sent
    const pendingEligibleForReminder = await prisma.order.findMany({
      where: {
        status: "pending_payment",
        created_at: { lte: oneHourAgo },
        reminder_sent_at: null,
      },
      include: {
        customer: true,
      },
      take: 50,
    });

    for (const order of pendingEligibleForReminder) {
      // Atomic check-and-set on reminder_sent_at
      const updated = await prisma.order.updateMany({
        where: {
          id: order.id,
          status: "pending_payment",
          reminder_sent_at: null,
        },
        data: {
          reminder_sent_at: now,
        },
      });

      if (updated.count > 0 && order.customer.email) {
        remindersSent++;
        if (resend) {
          try {
            await resend.emails.send({
              from: fromEmail,
              to: order.customer.email,
              subject: `Complete your purchase - Order #${order.order_number}`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2>Did you leave something behind?</h2>
                  <p>Hi ${order.customer.name},</p>
                  <p>We noticed you started checkout for order <strong>#${order.order_number}</strong> but didn't finish.</p>
                  <p style="margin: 25px 0;">
                    <a href="${appUrl}/checkout" style="background: #111827; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                      Complete Your Order
                    </a>
                  </p>
                  <p style="font-size: 13px; color: #6b7280;">If you encountered an issue or have questions, feel free to message our support on WhatsApp.</p>
                </div>
              `,
            });
          } catch (emailErr) {
            console.error(`[Cron Sweep] Failed sending reminder email for order #${order.order_number}:`, emailErr);
          }
        }
      }
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

    ordersMarkedAbandoned = abandonedOrders.count;

    return NextResponse.json({
      success: true,
      remindersSent,
      ordersMarkedAbandoned,
    });
  } catch (error: unknown) {
    console.error("[Cron Sweep] Error running abandoned cart sweep:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
