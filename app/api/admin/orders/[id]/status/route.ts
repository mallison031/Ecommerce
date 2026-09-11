import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { notifyOrderStatusChange } from "@/lib/notify";
import { OrderStatus } from "@prisma/client";
import { getCourierTrackingUrl } from "@/lib/notifications/courier-tracking";
import { createAdminAlert } from "@/lib/notifications/admin-alerts";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { status, courier_name, tracking_number, dispatch_notes } = body;

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

    // Update status and optional dispatch fields
    const updateData: {
      status: OrderStatus;
      courier_name?: string | null;
      tracking_number?: string | null;
      dispatch_notes?: string | null;
      shipped_at?: Date;
      delivered_at?: Date;
    } = { status };

    if (courier_name !== undefined) updateData.courier_name = courier_name;
    if (tracking_number !== undefined) updateData.tracking_number = tracking_number;
    if (dispatch_notes !== undefined) updateData.dispatch_notes = dispatch_notes;
    if (status === "shipped") {
      updateData.shipped_at = new Date();
      if (!updateData.tracking_number && !order.tracking_number) {
        const prefix = (updateData.courier_name || order.courier_name || "TRK").replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "TRK";
        updateData.tracking_number = `${prefix}-${order.order_number}-${Date.now().toString().slice(-4)}`;
      }
    }
    if (status === "delivered") updateData.delivered_at = new Date();

    const updated = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    // Notify customer and admin via shared notify function (Rule 6)
    if (["paid", "shipped", "delivered", "returned"].includes(status)) {
      await notifyOrderStatusChange({
        orderId: order.id,
        status: status as "paid" | "shipped" | "delivered" | "returned",
      });
    }

    // When shipped with courier details, log explicit courier tracking dispatch message
    if (status === "shipped" && (updated.courier_name || updated.tracking_number)) {
      try {
        const courier = updated.courier_name || "Express Courier";
        const tracking = updated.tracking_number || "PENDING";
        const trackingUrl = getCourierTrackingUrl(courier, tracking);

        await prisma.messageNotificationLog.create({
          data: {
            order_id: updated.id,
            channel: "whatsapp",
            template_name: "order_dispatched_courier",
            status: "sent",
          },
        });

        await createAdminAlert({
          type: "order_shipped",
          title: `Order #${order.order_number} Dispatched`,
          message: `Handed over to ${courier} (Tracking: ${tracking})`,
          referenceId: updated.id,
          link: `/admin`,
        });
      } catch (logErr) {
        console.error("[Status Route] Courier dispatch notification error:", logErr);
      }
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
