import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();

    const activeSales = await prisma.flashSale.findMany({
      where: {
        is_active: true,
        start_time: { lte: now },
        end_time: { gt: now },
      },
      include: {
        products: {
          include: {
            product: {
              include: {
                sector: {
                  select: { slug: true, name: true },
                },
              },
            },
          },
        },
      },
      orderBy: {
        end_time: "asc",
      },
    });

    const formatted = activeSales.map((sale) => {
      const remainingSeconds = Math.max(0, Math.floor((new Date(sale.end_time).getTime() - Date.now()) / 1000));
      return {
        id: sale.id,
        title: sale.title,
        description: sale.description,
        discount_percentage: sale.discount_percentage,
        banner_text: sale.banner_text || `⚡ ${sale.title}: ${sale.discount_percentage}% OFF!`,
        start_time: sale.start_time.toISOString(),
        end_time: sale.end_time.toISOString(),
        remaining_seconds: remainingSeconds,
        products: sale.products.map((p) => {
          const originalPrice = p.product.price_kobo;
          const discountMultiplier = (100 - sale.discount_percentage) / 100;
          const promoPrice = Math.round(originalPrice * discountMultiplier);
          return {
            id: p.product.id,
            name: p.product.name,
            slug: p.product.slug,
            sector_slug: p.product.sector.slug,
            sector_name: p.product.sector.name,
            price_kobo: originalPrice,
            promo_price_kobo: promoPrice,
            discount_percentage: sale.discount_percentage,
            image_urls: p.product.image_urls,
            stock_qty: p.product.stock_qty,
          };
        }),
      };
    });

    return NextResponse.json({
      success: true,
      active_sale: formatted[0] || null,
      sales: formatted,
    });
  } catch (error) {
    console.error("Error fetching active flash sales:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch flash sales" }, { status: 500 });
  }
}
