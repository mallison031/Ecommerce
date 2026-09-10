import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productIds } = body;

    if (!Array.isArray(productIds)) {
      return NextResponse.json(
        { error: "productIds must be an array of string IDs." },
        { status: 400 }
      );
    }

    if (productIds.length === 0) {
      return NextResponse.json({ success: true, products: [] });
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        is_active: true,
      },
      include: {
        sector: {
          select: { slug: true, name: true },
        },
      },
    });

    const formatted = products.map((p) => ({
      productId: p.id,
      name: p.name,
      slug: p.slug,
      priceKobo: p.price_kobo,
      stockQty: p.stock_qty,
      inStock: p.stock_qty > 0,
      imageUrl: p.image_urls[0] || null,
      sectorSlug: p.sector.slug,
      sectorName: p.sector.name,
    }));

    return NextResponse.json({
      success: true,
      count: formatted.length,
      products: formatted,
    });
  } catch (error: unknown) {
    console.error("[Wishlist Details API Error]:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
