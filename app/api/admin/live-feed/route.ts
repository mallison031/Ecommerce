import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

interface LiveFeedEvent {
  id: string;
  type: "order_paid" | "order_created" | "order_delivered" | "return_requested" | "review_submitted" | "low_stock";
  title: string;
  description: string;
  timestamp: string;
  amountKobo?: number;
  badge: "paid" | "return" | "review" | "warning" | "info";
  linkTab: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sinceParam = searchParams.get("since");
    const limit = Math.min(Number(searchParams.get("limit")) || 30, 100);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // Look back up to 48 hours if no `since` provided
    const lookbackDate = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 48 * 60 * 60 * 1000);

    // 1. Fetch recent orders
    const recentOrders = await prisma.order.findMany({
      where: {
        created_at: { gte: lookbackDate },
      },
      include: {
        customer: true,
        items: true,
      },
      orderBy: { created_at: "desc" },
      take: 25,
    });

    // 2. Fetch recent return requests (RMAs)
    const recentReturns = await prisma.returnRequest.findMany({
      where: {
        created_at: { gte: lookbackDate },
      },
      include: {
        order: {
          include: { customer: true },
        },
      },
      orderBy: { created_at: "desc" },
      take: 15,
    });

    // 3. Fetch recent reviews
    const recentReviews = await prisma.productReview.findMany({
      where: {
        created_at: { gte: lookbackDate },
      },
      include: {
        product: true,
      },
      orderBy: { created_at: "desc" },
      take: 10,
    });

    // 4. Fetch low stock items (stock_qty <= 5)
    const lowStockProducts = await prisma.product.findMany({
      where: {
        stock_qty: { lte: 5 },
        is_active: true,
      },
      select: {
        id: true,
        name: true,
        stock_qty: true,
        updated_at: true,
      },
      orderBy: { stock_qty: "asc" },
      take: 10,
    });

    // 5. Build unified event list
    const events: LiveFeedEvent[] = [];

    for (const ord of recentOrders) {
      const isPaid = ord.status === "paid" || ord.status === "shipped" || ord.status === "delivered";
      const totalNgn = (ord.total_kobo / 100).toLocaleString();

      if (isPaid) {
        events.push({
          id: `order-paid-${ord.id}`,
          type: "order_paid",
          title: `Order #${ord.order_number} Paid`,
          description: `₦${totalNgn} received from ${ord.customer.name} (${ord.items.length} item${ord.items.length > 1 ? "s" : ""})`,
          timestamp: ord.created_at.toISOString(),
          amountKobo: ord.total_kobo,
          badge: "paid",
          linkTab: "orders",
        });
      } else {
        events.push({
          id: `order-created-${ord.id}`,
          type: "order_created",
          title: `New Order #${ord.order_number}`,
          description: `₦${totalNgn} order initiated by ${ord.customer.name} (${ord.status})`,
          timestamp: ord.created_at.toISOString(),
          amountKobo: ord.total_kobo,
          badge: "info",
          linkTab: "orders",
        });
      }
    }

    for (const ret of recentReturns) {
      const refAmt = (ret.refund_amount_kobo / 100).toLocaleString();
      events.push({
        id: `return-${ret.id}`,
        type: "return_requested",
        title: `Return Request #${ret.order.order_number}`,
        description: `Customer ${ret.order.customer.name} requested ₦${refAmt} return (${ret.reason.replace(/_/g, " ").toLowerCase()})`,
        timestamp: ret.created_at.toISOString(),
        amountKobo: ret.refund_amount_kobo,
        badge: "return",
        linkTab: "returns",
      });
    }

    for (const rev of recentReviews) {
      events.push({
        id: `review-${rev.id}`,
        type: "review_submitted",
        title: `★ ${rev.rating}/5 Review on ${rev.product.name}`,
        description: `"${rev.comment.slice(0, 75)}${rev.comment.length > 75 ? "..." : ""}" by ${rev.customer_name}`,
        timestamp: rev.created_at.toISOString(),
        badge: "review",
        linkTab: "reviews",
      });
    }

    for (const p of lowStockProducts) {
      events.push({
        id: `stock-${p.id}`,
        type: "low_stock",
        title: `Low Stock Alert: ${p.name}`,
        description: `Only ${p.stock_qty} unit${p.stock_qty === 1 ? "" : "s"} left in inventory. Consider restocking immediately.`,
        timestamp: p.updated_at.toISOString(),
        badge: "warning",
        linkTab: "inventory",
      });
    }

    // Sort chronologically descending
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Calculate live pulse counters for today
    const [todayOrdersList, pendingDispatchesCount, pendingReturnsCount] = await Promise.all([
      prisma.order.findMany({
        where: {
          created_at: { gte: todayStart },
          status: { in: ["paid", "shipped", "delivered", "returned"] },
        },
        select: { total_kobo: true },
      }),
      prisma.order.count({
        where: { status: "paid" },
      }),
      prisma.returnRequest.count({
        where: { status: "requested" },
      }),
    ]);

    const todayOrdersCount = todayOrdersList.length;
    const todayRevenueKobo = todayOrdersList.reduce((acc, o) => acc + o.total_kobo, 0);

    return NextResponse.json({
      success: true,
      serverTime: new Date().toISOString(),
      summary: {
        todayOrdersCount,
        todayRevenueKobo,
        todayRevenueFormatted: `₦${(todayRevenueKobo / 100).toLocaleString()}`,
        pendingDispatchesCount,
        pendingReturnsCount,
        lowStockCount: lowStockProducts.length,
      },
      events: events.slice(0, limit),
    });
  } catch (error: any) {
    console.error("Error fetching live feed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch live feed" },
      { status: 500 }
    );
  }
}
