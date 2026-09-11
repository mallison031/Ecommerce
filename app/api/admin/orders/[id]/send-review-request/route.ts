import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { sendReviewRequestNotification } from "@/lib/whatsapp/send";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const order = await prisma.order.findUnique({
      where: { id },
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
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const itemWithProduct = order.items.find((i) => i.product && i.product.sector);
    if (!itemWithProduct || !itemWithProduct.product) {
      return NextResponse.json(
        { error: "No reviewable products found in this order" },
        { status: 400 }
      );
    }

    const product = itemWithProduct.product;
    const sectorSlug = product.sector?.slug || "products";
    const productSlug = product.slug;
    const customerPhone = order.customer.whatsapp_phone_e164 || order.customer.phone;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { review_reminder_sent_at: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: `Review reminder sent to ${order.customer.name}`,
      reviewUrl,
      review_url: reviewUrl,
      order: updated,
    });
  } catch (error: any) {
    console.error("[Manual Review Reminder POST] Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
