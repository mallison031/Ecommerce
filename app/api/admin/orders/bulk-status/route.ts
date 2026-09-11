import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCourierTrackingUrl } from "@/lib/notifications/courier-tracking";
import { createAdminAlert } from "@/lib/notifications/admin-alerts";
import { notifyOrderStatusChange } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderIds, status, courier_name } = body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: "orderIds array must be provided and not empty" },
        { status: 400 }
      );
    }

    if (!status || !["paid", "shipped", "delivered", "returned", "abandoned"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value provided" }, { status: 400 });
    }

    const ordersToUpdate = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, order_number: true, courier_name: true, tracking_number: true },
    });

    const now = new Date();

    for (const order of ordersToUpdate) {
      const orderUpdate: Record<string, any> = {
        status,
        updated_at: now,
      };

      let assignedCourier = courier_name || order.courier_name || null;
      let assignedTracking = order.tracking_number;

      if (status === "shipped") {
        orderUpdate.shipped_at = now;
        if (courier_name) {
          orderUpdate.courier_name = courier_name;
          assignedCourier = courier_name;
        }
        if (!assignedTracking) {
          const prefix = (assignedCourier || "TRK").replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "TRK";
          assignedTracking = `${prefix}-${order.order_number}-${Date.now().toString().slice(-4)}`;
          orderUpdate.tracking_number = assignedTracking;
        }
      } else if (status === "delivered") {
        orderUpdate.delivered_at = now;
      }

      await prisma.order.update({
        where: { id: order.id },
        data: orderUpdate,
      });

      // Notify customer and admin via shared notify function
      if (["paid", "shipped", "delivered", "returned"].includes(status)) {
        await notifyOrderStatusChange({
          orderId: order.id,
          status: status as "paid" | "shipped" | "delivered" | "returned",
        });
      }

      // If shipped, log courier tracking dispatch alert
      if (status === "shipped" && assignedTracking) {
        try {
          const courier = assignedCourier || "Express Courier";
          const trackingUrl = getCourierTrackingUrl(courier, assignedTracking);

          await prisma.messageNotificationLog.create({
            data: {
              order_id: order.id,
              channel: "whatsapp",
              template_name: "order_dispatched_courier",
              status: "sent",
            },
          });
        } catch (dispatchErr) {
          console.error("[Bulk Status] Courier dispatch notification error:", dispatchErr);
        }
      }
    }

    // Post consolidated admin alert
    if (status === "shipped") {
      await createAdminAlert({
        type: "order_shipped",
        title: `Batch Dispatch: ${ordersToUpdate.length} Orders Shipped`,
        message: `${ordersToUpdate.length} orders dispatched with ${courier_name || "designated couriers"}`,
        link: "/admin",
      });
    }

    return NextResponse.json({
      success: true,
      updatedCount: ordersToUpdate.length,
      message: `Successfully updated ${ordersToUpdate.length} orders to ${status}`,
    });
  } catch (error: any) {
    console.error("[Bulk Order Status POST] Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
