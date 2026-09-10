import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedCustomer } from "@/lib/customer-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: orderId } = params;

    const order = await prisma.order.findFirst({
      where: { id: orderId, customer_id: customer.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                sector: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Process reorder items with live stock checks
    const reorderItems = [];
    const unavailableItems = [];

    for (const item of order.items) {
      if (!item.product || !item.product.is_active) {
        unavailableItems.push({
          name: item.product_name_snapshot,
          reason: "Product is no longer available",
        });
        continue;
      }

      if (item.product.stock_qty <= 0) {
        unavailableItems.push({
          name: item.product.name,
          reason: "Out of stock",
        });
        continue;
      }

      const availableQty = Math.min(item.qty, item.product.stock_qty);

      reorderItems.push({
        productId: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        priceKobo: item.product.price_kobo,
        imageUrl: item.product.image_urls[0] || "",
        qty: availableQty,
        requestedQty: item.qty,
        isStockAdjusted: availableQty < item.qty,
        sectorSlug: item.product.sector.slug,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${reorderItems.length} item(s) prepared for reorder.`,
      orderNumber: order.order_number,
      reorderItems,
      unavailableItems,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
