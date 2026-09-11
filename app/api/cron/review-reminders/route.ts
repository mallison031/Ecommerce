import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { sendReviewRequestNotification } from "@/lib/whatsapp/send";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleReviewRemindersSweep(req);
}

export async function POST(req: NextRequest) {
  return handleReviewRemindersSweep(req);
}

async function handleReviewRemindersSweep(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hoursParam = searchParams.get("hoursAgo");
    const isTestAll = searchParams.get("all") === "true";

    const whereClause: any = {
      status: "delivered",
      review_reminder_sent_at: null,
    };

    if (hoursParam && !isTestAll) {
      const hours = parseFloat(hoursParam) || 48;
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
      whereClause.delivered_at = { lte: cutoff };
    }

    const eligibleOrders = await prisma.order.findMany({
      where: whereClause,
      include: {
        customer: true,
        items: {
          include: {
            product: {
              include: { sector: true },
            },
          },
        },
      },
      take: 50,
      orderBy: { delivered_at: "asc" },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const sentList: any[] = [];

    for (const order of eligibleOrders) {
      const itemWithProduct = order.items.find((i) => i.product && i.product.sector);
      if (!itemWithProduct || !itemWithProduct.product) continue;

      const product = itemWithProduct.product;
      const sectorSlug = product.sector?.slug || "products";
      const productSlug = product.slug;
      const customerPhone = order.customer.whatsapp_phone_e164 || order.customer.phone;

      const reviewUrl = `${appUrl}/${sectorSlug}/${productSlug}?review=true&orderNumber=${order.order_number}&customerEmail=${encodeURIComponent(
        order.customer.email
      )}&customerName=${encodeURIComponent(order.customer.name)}`;

      await sendReviewRequestNotification({
        toE164: customerPhone || "+2348000000000",
        customerName: order.customer.name,
        orderNumber: order.order_number,
        productName: product.name,
        reviewUrl,
        orderId: order.id,
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { review_reminder_sent_at: new Date() },
      });

      sentList.push({
        order_id: order.id,
        order_number: order.order_number,
        customer_name: order.customer.name,
        product_name: product.name,
        review_url: reviewUrl,
      });
    }

    return NextResponse.json({
      success: true,
      processed_count: sentList.length,
      remindersSent: sentList.length,
      reminders: sentList,
    });
  } catch (error: any) {
    console.error("[Review Reminders Cron] Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
