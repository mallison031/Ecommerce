import { NextRequest, NextResponse } from "next/server";
import { validateCoupon } from "@/lib/promotions";
import { formatKoboToNaira } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, subtotalKobo, shippingFeeKobo, currentShippingFeeKobo, sectorSlug } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { success: false, valid: false, message: "Coupon code is required." },
        { status: 400 }
      );
    }

    const fee = Number(shippingFeeKobo ?? currentShippingFeeKobo ?? 0);

    const result = validateCoupon({
      code,
      subtotalKobo: Number(subtotalKobo) || 0,
      currentShippingFeeKobo: fee,
      sectorSlug,
    });

    return NextResponse.json({
      success: true,
      ...result,
      formattedDiscount: formatKoboToNaira(result.discountKobo),
      formattedFinalSubtotal: formatKoboToNaira(result.finalSubtotalKobo),
      formattedShippingDiscount: formatKoboToNaira(result.shippingDiscountKobo),
    });
  } catch (error: unknown) {
    console.error("[Coupon Validate API Error]:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
