import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sector = searchParams.get("sector");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const allSectors = await prisma.sector.findMany({
      orderBy: { display_order: "asc" },
    });

    const where: Record<string, any> = {};

    if (sector && sector !== "all") {
      const targetSector = allSectors.find(
        (s) => s.slug.toLowerCase() === sector.toLowerCase() || s.id === sector
      );
      if (targetSector) {
        where.sector_id = targetSector.id;
      }
    }

    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: "insensitive" } },
        { slug: { contains: search.trim(), mode: "insensitive" } },
        { description: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        sector: true,
        _count: {
          select: {
            stock_waitlist: { where: { notified: false } },
            adjustment_logs: true,
          },
        },
      },
      orderBy: [{ stock_qty: "asc" }, { name: "asc" }],
    });

    // Compute status and filter by status if requested
    const enrichedProducts = products.map((p) => {
      let stockStatus: "out_of_stock" | "low_stock" | "in_stock" = "in_stock";
      if (p.stock_qty <= 0) {
        stockStatus = "out_of_stock";
      } else if (p.stock_qty <= 5) {
        stockStatus = "low_stock";
      }

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price_kobo: p.price_kobo,
        currency: p.currency,
        stock_qty: p.stock_qty,
        is_active: p.is_active,
        image_urls: p.image_urls,
        sector: p.sector,
        stockStatus,
        waitlistCount: p._count.stock_waitlist,
        adjustmentLogsCount: p._count.adjustment_logs,
        created_at: p.created_at,
        updated_at: p.updated_at,
      };
    });

    const filteredByStatus = status && status !== "all"
      ? enrichedProducts.filter((p) => p.stockStatus === status)
      : enrichedProducts;

    // Aggregate inventory-wide metrics across all products (unfiltered for full warehouse snapshot)
    const allWarehouseProducts = await prisma.product.findMany({
      select: { price_kobo: true, stock_qty: true },
    });

    let totalStockUnits = 0;
    let totalValuationKobo = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let inStockCount = 0;

    for (const p of allWarehouseProducts) {
      totalStockUnits += Math.max(0, p.stock_qty);
      totalValuationKobo += Math.max(0, p.stock_qty) * p.price_kobo;
      if (p.stock_qty <= 0) {
        outOfStockCount++;
      } else if (p.stock_qty <= 5) {
        lowStockCount++;
      } else {
        inStockCount++;
      }
    }

    return NextResponse.json({
      metrics: {
        totalProducts: allWarehouseProducts.length,
        totalStockUnits,
        totalValuationKobo,
        lowStockCount,
        outOfStockCount,
        inStockCount,
      },
      products: filteredByStatus,
      sectors: allSectors,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
