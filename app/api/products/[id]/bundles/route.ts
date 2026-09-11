import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Find primary product
    const primaryProduct = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        sector: true,
      },
    });

    if (!primaryProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // 1. Fetch explicitly configured bundles
    const explicitBundles = await prisma.productBundle.findMany({
      where: {
        product_id: primaryProduct.id,
      },
      include: {
        bundle_item: {
          include: { sector: true },
        },
      },
      take: 2,
    });

    let bundleProducts = explicitBundles
      .map((b) => b.bundle_item)
      .filter((p) => p.is_active && p.stock_qty > 0);

    // 2. If fewer than 2 bundle products found, supplement with smart complementary products
    if (bundleProducts.length < 2) {
      const existingIds = [primaryProduct.id, ...bundleProducts.map((p) => p.id)];
      const needed = 2 - bundleProducts.length;

      // Prefer products from other sectors first for cross-sector discovery, then same sector
      const complementary = await prisma.product.findMany({
        where: {
          id: { notIn: existingIds },
          is_active: true,
          stock_qty: { gt: 0 },
        },
        include: { sector: true },
        orderBy: [{ created_at: "desc" }],
        take: needed,
      });

      bundleProducts = [...bundleProducts, ...complementary];
    }

    return NextResponse.json({
      success: true,
      primaryProduct: {
        id: primaryProduct.id,
        name: primaryProduct.name,
        slug: primaryProduct.slug,
        price_kobo: primaryProduct.price_kobo,
        stock_qty: primaryProduct.stock_qty,
        image_urls: primaryProduct.image_urls,
        sector_slug: primaryProduct.sector.slug,
        sector_name: primaryProduct.sector.name,
      },
      bundleItems: bundleProducts.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price_kobo: p.price_kobo,
        stock_qty: p.stock_qty,
        image_urls: p.image_urls,
        sector_slug: p.sector.slug,
        sector_name: p.sector.name,
      })),
    });
  } catch (error: any) {
    console.error("[Bundle API GET] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
