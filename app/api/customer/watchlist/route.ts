import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedCustomer } from "@/lib/customer-auth";

export async function GET(req: NextRequest) {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }
    const customerId = customer.id;

    const items = await prisma.productWatchlist.findMany({
      where: {
        customer_id: customerId,
        is_active: true,
      },
      include: {
        product: {
          include: {
            sector: {
              select: {
                slug: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const enrichedItems = items.map((item) => {
      const currentPrice = item.product.price_kobo;
      const initialPrice = item.initial_price_kobo;
      const isPriceDropped = currentPrice < initialPrice;
      const priceDropAmount = isPriceDropped ? initialPrice - currentPrice : 0;
      const priceDropPercentage = isPriceDropped
        ? Math.round((priceDropAmount / initialPrice) * 100)
        : 0;
      const isBackInStock = item.product.stock_qty > 0;

      return {
        id: item.id,
        product_id: item.product.id,
        product_name: item.product.name,
        product_slug: item.product.slug,
        sector_slug: item.product.sector.slug,
        sector_name: item.product.sector.name,
        image_url: item.product.image_urls[0] || null,
        current_price_kobo: currentPrice,
        initial_price_kobo: initialPrice,
        target_price_kobo: item.target_price_kobo,
        is_price_dropped: isPriceDropped,
        price_drop_amount_kobo: priceDropAmount,
        price_drop_percentage: priceDropPercentage,
        stock_qty: item.product.stock_qty,
        is_back_in_stock: isBackInStock,
        notify_price_drop: item.notify_price_drop,
        notify_restock: item.notify_restock,
        created_at: item.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      watchlist: enrichedItems,
      total: enrichedItems.length,
    });
  } catch (error: any) {
    console.error("Error fetching customer watchlist:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch watchlist" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    const customerId = customer.id;

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const productId = url.searchParams.get("productId");

    if (!id && !productId) {
      return NextResponse.json(
        { success: false, error: "Missing watchlist item id or productId" },
        { status: 400 }
      );
    }

    if (id) {
      await prisma.productWatchlist.updateMany({
        where: { id, customer_id: customerId },
        data: { is_active: false },
      });
    } else if (productId) {
      await prisma.productWatchlist.updateMany({
        where: { product_id: productId, customer_id: customerId },
        data: { is_active: false },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Removed item from your watchlist",
    });
  } catch (error: any) {
    console.error("Error removing watchlist item:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove item from watchlist" },
      { status: 500 }
    );
  }
}
