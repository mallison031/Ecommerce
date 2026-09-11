import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const bundles = await prisma.productBundle.findMany({
      include: {
        product: {
          include: { sector: true },
        },
        bundle_item: {
          include: { sector: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({
      success: true,
      bundles: bundles.map((b) => ({
        id: b.id,
        productId: b.product_id,
        productName: b.product.name,
        productPriceKobo: b.product.price_kobo,
        bundleItemId: b.bundle_item_id,
        bundleItemName: b.bundle_item.name,
        bundleItemPriceKobo: b.bundle_item.price_kobo,
        createdAt: b.created_at.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("[Admin Bundles GET] Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, bundleItemId } = body;

    if (!productId || !bundleItemId) {
      return NextResponse.json(
        { error: "Both productId and bundleItemId are required" },
        { status: 400 }
      );
    }

    if (productId === bundleItemId) {
      return NextResponse.json(
        { error: "A product cannot be bundled with itself" },
        { status: 400 }
      );
    }

    // Verify both products exist
    const [primary, item] = await Promise.all([
      prisma.product.findUnique({ where: { id: productId } }),
      prisma.product.findUnique({ where: { id: bundleItemId } }),
    ]);

    if (!primary || !item) {
      return NextResponse.json({ error: "One or both products not found" }, { status: 404 });
    }

    const bundle = await prisma.productBundle.upsert({
      where: {
        product_id_bundle_item_id: {
          product_id: productId,
          bundle_item_id: bundleItemId,
        },
      },
      update: {},
      create: {
        product_id: productId,
        bundle_item_id: bundleItemId,
      },
      include: {
        product: true,
        bundle_item: true,
      },
    });

    return NextResponse.json({
      success: true,
      bundle,
      message: `Paired "${primary.name}" with "${item.name}"`,
    });
  } catch (error: any) {
    console.error("[Admin Bundles POST] Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Bundle ID is required" }, { status: 400 });
    }

    await prisma.productBundle.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Bundle pairing deleted successfully" });
  } catch (error: any) {
    console.error("[Admin Bundles DELETE] Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
