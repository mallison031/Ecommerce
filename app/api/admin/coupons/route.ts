import { NextRequest, NextResponse } from "next/server";
import {
  getAllCoupons,
  createCoupon,
  getActiveFlashSales,
  createFlashSale,
  DiscountType,
} from "@/lib/promotions";
import { formatKoboToNaira } from "@/lib/utils";

export async function GET() {
  try {
    const coupons = getAllCoupons();
    const flashSales = getActiveFlashSales();

    const totalTimesUsed = coupons.reduce((sum, c) => sum + c.timesUsed, 0);

    return NextResponse.json({
      success: true,
      stats: {
        totalCoupons: coupons.length,
        activeCoupons: coupons.filter((c) => c.isActive).length,
        totalRedemptions: totalTimesUsed,
        activeFlashSalesCount: flashSales.length,
      },
      coupons: coupons.map((c) => ({
        ...c,
        formattedMinSpend: formatKoboToNaira(c.minSpendKobo),
        formattedDiscount:
          c.discountType === "PERCENTAGE"
            ? `${c.discountValue}%`
            : c.discountType === "FIXED_AMOUNT"
            ? formatKoboToNaira(c.discountValue)
            : "Free Delivery",
      })),
      flashSales,
    });
  } catch (error: unknown) {
    console.error("[Admin Coupons GET Error]:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = "create_coupon" } = body;

    if (action === "create_flash_sale") {
      const { sectorSlug, title, discountPercent, promoCode, bannerBg, durationHours } = body;

      if (!sectorSlug || !title || !promoCode) {
        return NextResponse.json(
          { error: "sectorSlug, title, and promoCode are required" },
          { status: 400 }
        );
      }

      const hours = Number(durationHours) || 48;
      const endsAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

      const newSale = createFlashSale({
        sectorSlug,
        title,
        discountPercent: Number(discountPercent) || 10,
        promoCode: String(promoCode).toUpperCase(),
        bannerBg: bannerBg || "from-pink-600 via-rose-600 to-amber-600",
        endsAt,
        isActive: true,
      });

      return NextResponse.json({ success: true, flashSale: newSale });
    }

    // Default: create coupon
    const {
      code,
      discountType,
      discountValue,
      minSpendKobo,
      maxDiscountKobo,
      sectorRestriction,
      usageLimit,
      expiresAt,
      description,
    } = body;

    if (!code || !discountType || discountValue === undefined) {
      return NextResponse.json(
        { error: "code, discountType, and discountValue are required" },
        { status: 400 }
      );
    }

    const created = createCoupon({
      code: String(code).trim().toUpperCase(),
      discountType: discountType as DiscountType,
      discountValue: Number(discountValue),
      minSpendKobo: Number(minSpendKobo) || 0,
      maxDiscountKobo: maxDiscountKobo ? Number(maxDiscountKobo) : undefined,
      sectorRestriction: sectorRestriction || null,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      isActive: true,
      expiresAt: expiresAt || null,
      description: description || "Promotional discount code",
    });

    return NextResponse.json({ success: true, coupon: created });
  } catch (error: unknown) {
    console.error("[Admin Coupons POST Error]:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
