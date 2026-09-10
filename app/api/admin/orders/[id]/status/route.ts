import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { notifyOrderStatusChange } from "@/lib/notify";
import { OrderStatus } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { status } = body;

    const allowedStatuses: OrderStatus[] = [
      "paid",
      "shipped",
      "delivered",
      "returned",
      "cancelled",
      "refunded",
    ];

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update status
    const updated = await prisma.order.update({
      where: { id },
      data: { status },
    });

    // Notify customer and admin via shared notify function (Rule 6)
    if (["paid", "shipped", "delivered", "returned"].includes(status)) {
      await notifyOrderStatusChange({
        orderId: order.id,
        status: status as "paid" | "shipped" | "delivered" | "returned",
      });
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
