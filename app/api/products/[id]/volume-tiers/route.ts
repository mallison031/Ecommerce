import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;

    const tiers = await prisma.productVolumeTier.findMany({
      where: { product_id: id },
      orderBy: { min_quantity: "asc" },
    });

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        price_kobo: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const formattedTiers = tiers.map((t) => {
      const discountRatio = t.discount_percentage / 100;
      const discountedUnitKobo = Math.round(product.price_kobo * (1 - discountRatio));
      return {
        id: t.id,
        min_quantity: t.min_quantity,
        max_quantity: t.max_quantity,
        discount_percentage: t.discount_percentage,
        unit_price_kobo: discountedUnitKobo,
        savings_per_unit_kobo: product.price_kobo - discountedUnitKobo,
      };
    });

  return NextResponse.json({
      success: true,
      product_id: product.id,
      base_price_kobo: product.price_kobo,
      tiers: formattedTiers,
    });
  } catch (error: any) {
    console.error("Error fetching product volume tiers:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch volume tiers" },
      { status: 500 }
    );
  }
}
