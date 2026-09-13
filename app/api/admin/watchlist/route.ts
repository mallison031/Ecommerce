import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const activeWatchlists = await prisma.productWatchlist.findMany({
      where: { is_active: true },
      include: {
        product: {
          include: {
            sector: {
              select: { name: true, slug: true },
            },
          },
        },
        customer: {
          select: { name: true, email: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const totalSubscribers = activeWatchlists.length;
    let restockAlertsCount = 0;
    let priceDropAlertsCount = 0;

    // Group by product
    const productMap = new Map<
      string,
      {
        product_id: string;
        product_name: string;
        product_slug: string;
        sector_name: string;
        price_kobo: number;
        stock_qty: number;
        total_subscribers: number;
        restock_subscribers: number;
        price_drop_subscribers: number;
        subscribers: Array<{
          email: string;
          phone: string | null;
          customer_name: string | null;
          target_price_kobo: number | null;
          created_at: Date;
        }>;
      }
    >();

    for (const w of activeWatchlists) {
      if (w.notify_restock) restockAlertsCount++;
      if (w.notify_price_drop) priceDropAlertsCount++;

      let entry = productMap.get(w.product_id);
      if (!entry) {
        entry = {
          product_id: w.product.id,
          product_name: w.product.name,
          product_slug: w.product.slug,
          sector_name: w.product.sector.name,
          price_kobo: w.product.price_kobo,
          stock_qty: w.product.stock_qty,
          total_subscribers: 0,
          restock_subscribers: 0,
          price_drop_subscribers: 0,
          subscribers: [],
        };
        productMap.set(w.product_id, entry);
      }

      entry.total_subscribers++;
      if (w.notify_restock) entry.restock_subscribers++;
      if (w.notify_price_drop) entry.price_drop_subscribers++;
      entry.subscribers.push({
        email: w.email,
        phone: w.phone,
        customer_name: w.customer?.name || null,
        target_price_kobo: w.target_price_kobo,
        created_at: w.created_at,
      });
    }

    const demandByProduct = Array.from(productMap.values()).sort(
      (a, b) => b.total_subscribers - a.total_subscribers
    );

    const outOfStockDemand = demandByProduct.filter((p) => p.stock_qty <= 0);

    return NextResponse.json({
      success: true,
      metrics: {
        total_subscribers: totalSubscribers,
        restock_alerts_count: restockAlertsCount,
        price_drop_alerts_count: priceDropAlertsCount,
        products_watched_count: demandByProduct.length,
        out_of_stock_backlog_items: outOfStockDemand.length,
      },
      demand_by_product: demandByProduct,
      recent_subscribers: activeWatchlists.slice(0, 20).map((w) => ({
        id: w.id,
        email: w.email,
        phone: w.phone,
        product_name: w.product.name,
        sector_name: w.product.sector.name,
        target_price_kobo: w.target_price_kobo,
        notify_price_drop: w.notify_price_drop,
        notify_restock: w.notify_restock,
        created_at: w.created_at,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching admin watchlist analytics:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch watchlist analytics" },
      { status: 500 }
    );
  }
}
