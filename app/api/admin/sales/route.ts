import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const status = searchParams.get("status");

    const where: Record<string, any> = {};

    if (from || to) {
      where.created_at = {};
      if (from) where.created_at.gte = new Date(from);
      if (to) where.created_at.lte = new Date(to);
    }

    if (status) {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: true,
        items: true,
        sales_ledger: true,
      },
      orderBy: { created_at: "desc" },
    });

    const totalRevenueKobo = orders
      .filter((o) => ["paid", "shipped", "delivered"].includes(o.status))
      .reduce((sum, o) => sum + o.total_kobo, 0);

    const abandonedCount = orders.filter((o) => o.status === "abandoned").length;

    return NextResponse.json({
      totalOrders: orders.length,
      totalRevenueKobo,
      abandonedCount,
      orders,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
