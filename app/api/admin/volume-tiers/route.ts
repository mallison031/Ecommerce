import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const productsWithTiers = await prisma.product.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        slug: true,
        price_kobo: true,
        stock_qty: true,
        volume_tiers: {
          orderBy: { min_quantity: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      products: productsWithTiers,
      total_configured: productsWithTiers.filter((p) => p.volume_tiers.length > 0).length,
    });
  } catch (error: any) {
    console.error("Error fetching admin volume tiers:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch volume tiers" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { product_id, min_quantity, max_quantity, discount_percentage } = body;

    if (!product_id || !min_quantity || !discount_percentage) {
      return NextResponse.json(
        { success: false, error: "product_id, min_quantity, and discount_percentage are required" },
        { status: 400 }
      );
    }

    const minQty = Math.max(2, parseInt(min_quantity, 10));
    const maxQty = max_quantity ? parseInt(max_quantity, 10) : null;
    const discountPct = Math.min(90, Math.max(1, parseInt(discount_percentage, 10)));

    if (maxQty && maxQty <= minQty) {
      return NextResponse.json(
        { success: false, error: "max_quantity must be greater than min_quantity" },
        { status: 400 }
      );
    }

    const tier = await prisma.productVolumeTier.upsert({
      where: {
        product_id_min_quantity: {
          product_id,
          min_quantity: minQty,
        },
      },
      create: {
        product_id,
        min_quantity: minQty,
        max_quantity: maxQty,
        discount_percentage: discountPct,
      },
      update: {
        max_quantity: maxQty,
        discount_percentage: discountPct,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Volume tier created: Buy ${minQty}+ save ${discountPct}%`,
      tier,
    });
  } catch (error: any) {
    console.error("Error creating volume tier:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create volume tier" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    let id = url.searchParams.get("id");

    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Volume tier ID is required" },
        { status: 400 }
      );
    }

    await prisma.productVolumeTier.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Volume tier deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting volume tier:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete volume tier" },
      { status: 500 }
    );
  }
}
