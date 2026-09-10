import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { sendOrderRecoveryNotifications, sweepAbandonedOrders } from "@/lib/abandoned-cart";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter"); // "reminded", "unreminded", "recovered"

    // Fetch all pending and abandoned orders, as well as recovered orders
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { status: "pending_payment" },
          { status: "abandoned" },
          {
            reminder_sent_at: { not: null },
            status: { in: ["paid", "shipped", "delivered"] },
          },
        ],
      },
      include: {
        customer: true,
        items: true,
      },
      orderBy: { created_at: "desc" },
      take: 100,
    });

    let totalPendingOrAbandoned = 0;
    let remindersSentCount = 0;
    let recoveredCount = 0;
    let recoveredRevenueKobo = 0;
    let atRiskRevenueKobo = 0;

    for (const ord of orders) {
      const isRecovered =
        ord.reminder_sent_at !== null &&
        (ord.status === "paid" || ord.status === "shipped" || ord.status === "delivered");

      if (isRecovered) {
        recoveredCount++;
        recoveredRevenueKobo += ord.total_kobo;
      } else if (ord.status === "pending_payment" || ord.status === "abandoned") {
        totalPendingOrAbandoned++;
        atRiskRevenueKobo += ord.total_kobo;
      }

      if (ord.reminder_sent_at !== null) {
        remindersSentCount++;
      }
    }

    const recoveryRatePercent =
      remindersSentCount > 0 ? Math.round((recoveredCount / remindersSentCount) * 100) : 0;

    let filteredOrders = orders;
    if (filter === "reminded") {
      filteredOrders = orders.filter((o) => o.reminder_sent_at !== null && o.status === "pending_payment");
    } else if (filter === "unreminded") {
      filteredOrders = orders.filter((o) => o.reminder_sent_at === null && o.status === "pending_payment");
    } else if (filter === "recovered") {
      filteredOrders = orders.filter(
        (o) => o.reminder_sent_at !== null && (o.status === "paid" || o.status === "shipped" || o.status === "delivered")
      );
    }

    return NextResponse.json({
      success: true,
      metrics: {
        totalPendingOrAbandoned,
        remindersSentCount,
        recoveredCount,
        recoveredRevenueKobo,
        atRiskRevenueKobo,
        recoveryRatePercent,
      },
      orders: filteredOrders.map((o) => ({
        id: o.id,
        order_number: o.order_number,
        status: o.status,
        total_kobo: o.total_kobo,
        created_at: o.created_at,
        reminder_sent_at: o.reminder_sent_at,
        customer: {
          name: o.customer.name,
          email: o.customer.email,
          phone: o.customer.phone,
          whatsapp_opt_in: o.customer.whatsapp_opt_in,
          whatsapp_phone_e164: o.customer.whatsapp_phone_e164,
        },
        items: o.items.map((i) => ({
          product_name_snapshot: i.product_name_snapshot,
          qty: i.qty,
          line_total_kobo: i.line_total_kobo,
        })),
      })),
    });
  } catch (error: unknown) {
    console.error("[Admin Abandoned API] Error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, orderId, thresholdMinutes } = body;

    if (action === "sweep") {
      const result = await sweepAbandonedOrders({
        thresholdMinutes: thresholdMinutes || 30,
      });
      return NextResponse.json({ success: true, result });
    }

    if (orderId) {
      const result = await sendOrderRecoveryNotifications({ orderId });
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: "Invalid action or orderId" }, { status: 400 });
  } catch (error: unknown) {
    console.error("[Admin Abandoned POST Error]:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
