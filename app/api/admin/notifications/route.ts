import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "25", 10);

    // Fetch existing records in AdminNotification
    const storedNotifications = await prisma.adminNotification.findMany({
      orderBy: { created_at: "desc" },
      take: limit,
    });

    const unreadCount = await prisma.adminNotification.count({
      where: { is_read: false },
    });

    // Also get quick live stats for badge indicators
    const [openTickets, pendingRMAs, lowStockCount] = await Promise.all([
      prisma.supportTicket.count({ where: { status: "open" } }),
      prisma.returnRequest.count({ where: { status: "requested" } }),
      prisma.product.count({ where: { stock_qty: { lte: 5 }, is_active: true } }),
    ]);

    return NextResponse.json({
      success: true,
      unreadCount,
      notifications: storedNotifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link || "/admin",
        referenceId: n.reference_id,
        isRead: n.is_read,
        createdAt: n.created_at,
      })),
      liveSummary: {
        openTickets,
        pendingRMAs,
        lowStockCount,
      },
    });
  } catch (error: any) {
    console.error("[Admin Notifications GET Error]", error);
    return NextResponse.json({ error: error.message || "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, markAll } = body;

    if (markAll) {
      await prisma.adminNotification.updateMany({
        where: { is_read: false },
        data: { is_read: true },
      });
      return NextResponse.json({ success: true, message: "All notifications marked as read" });
    }

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing or invalid notification id" }, { status: 400 });
    }

    await prisma.adminNotification.update({
      where: { id },
      data: { is_read: true },
    });

    return NextResponse.json({ success: true, message: "Notification marked as read" });
  } catch (error: any) {
    console.error("[Admin Notifications PATCH Error]", error);
    return NextResponse.json({ error: error.message || "Failed to update notification" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, title, message, link, referenceId } = body;

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
    }

    const notification = await prisma.adminNotification.create({
      data: {
        type: type || "general",
        title,
        message,
        link,
        reference_id: referenceId,
      },
    });

    return NextResponse.json({ success: true, notification });
  } catch (error: any) {
    console.error("[Admin Notifications POST Error]", error);
    return NextResponse.json({ error: error.message || "Failed to create notification" }, { status: 500 });
  }
}
