import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const sector = (searchParams.get("sector") || "").trim();
    const minPrice = searchParams.get("min_price");
    const maxPrice = searchParams.get("max_price");
    const inStockOnly = searchParams.get("in_stock") === "true" || searchParams.get("in_stock") === "1";
    const sort = searchParams.get("sort") || "relevance";
    const type = searchParams.get("type") || "full";
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || (type === "autocomplete" ? "6" : "24"), 10)), 100);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const skip = (page - 1) * limit;

    // Build Prisma query condition
    const where: Record<string, any> = {
      is_active: true,
    };

    // Text search query across name, description, slug, and sector name
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { sector: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    // Sector filtering
    if (sector && sector !== "all") {
      where.sector = {
        OR: [
          { slug: { equals: sector, mode: "insensitive" } },
          { id: sector },
        ],
      };
    }

    // In-Stock Only filter
    if (inStockOnly) {
      where.stock_qty = { gt: 0 };
    }

    // Price range filters (input in NGN, stored in Kobo)
    if (minPrice || maxPrice) {
      where.price_kobo = {};
      if (minPrice && !isNaN(Number(minPrice))) {
        where.price_kobo.gte = Math.round(Number(minPrice) * 100);
      }
      if (maxPrice && !isNaN(Number(maxPrice))) {
        where.price_kobo.lte = Math.round(Number(maxPrice) * 100);
      }
    }

    // Sorting order
    let orderBy: any = [{ stock_qty: "desc" }, { created_at: "desc" }];
    if (sort === "price_asc") {
      orderBy = { price_kobo: "asc" };
    } else if (sort === "price_desc") {
      orderBy = { price_kobo: "desc" };
    } else if (sort === "newest") {
      orderBy = { created_at: "desc" };
    }

    // Execute queries in parallel: matching products, total count, all sectors
    const [products, totalCount, allSectors] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          sector: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
      prisma.sector.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: {
              products: {
                where: { is_active: true },
              },
            },
          },
        },
        orderBy: { display_order: "asc" },
      }),
    ]);

    // Format products for consumer
    const formattedProducts = products.map((p) => {
      let stockStatus: "in_stock" | "low_stock" | "out_of_stock" = "in_stock";
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
        stock_qty: p.stock_qty,
        stockStatus,
        image_urls: p.image_urls,
        sector_id: p.sector_id,
        sector_name: p.sector.name,
        sector_slug: p.sector.slug,
        created_at: p.created_at,
      };
    });

    // Compute sector facet counts for the current search text
    const sectorFacets = allSectors.map((sec) => ({
      id: sec.id,
      name: sec.name,
      slug: sec.slug,
      totalCatalogProducts: sec._count.products,
    }));

    // If autocomplete, also provide matched sector suggestions
    let sectorSuggestions: Array<{ name: string; slug: string }> = [];
    if (q) {
      sectorSuggestions = allSectors
        .filter((s) => s.name.toLowerCase().includes(q.toLowerCase()))
        .map((s) => ({ name: s.name, slug: s.slug }));
    }

    return NextResponse.json({
      success: true,
      query: q,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
      products: formattedProducts,
      sectorFacets,
      sectorSuggestions,
      activeFilters: {
        sector: sector || "all",
        minPrice: minPrice ? Number(minPrice) : null,
        maxPrice: maxPrice ? Number(maxPrice) : null,
        inStockOnly,
        sort,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
