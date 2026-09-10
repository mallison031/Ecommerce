import { NextRequest, NextResponse } from "next/server";
import {
  calculateShippingFee,
  NIGERIAN_STATES,
  LAGOS_ZONES,
  REGIONAL_SHIPPING_ZONES,
  FREE_SHIPPING_THRESHOLD_KOBO,
  LAGOS_EXPRESS_ADDON_KOBO,
} from "@/lib/shipping";
import { formatKoboToNaira } from "@/lib/utils";

export async function GET() {
  return NextResponse.json({
    states: NIGERIAN_STATES,
    lagosZones: LAGOS_ZONES,
    regionalZones: REGIONAL_SHIPPING_ZONES.map((z) => ({
      ...z,
      formattedBaseFee: formatKoboToNaira(z.baseFeeKobo),
    })),
    freeShippingThresholdKobo: FREE_SHIPPING_THRESHOLD_KOBO,
    formattedThreshold: formatKoboToNaira(FREE_SHIPPING_THRESHOLD_KOBO),
    expressAddonKobo: LAGOS_EXPRESS_ADDON_KOBO,
    formattedExpressAddon: formatKoboToNaira(LAGOS_EXPRESS_ADDON_KOBO),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { state, lagosZone, subtotalKobo, isExpress } = body;

    if (!state || typeof state !== "string") {
      return NextResponse.json({ error: "State is required" }, { status: 400 });
    }

    const calculation = calculateShippingFee({
      state,
      lagosZone,
      subtotalKobo: Number(subtotalKobo) || 0,
      isExpress: Boolean(isExpress),
    });

    return NextResponse.json({
      success: true,
      ...calculation,
      formattedShippingFee: formatKoboToNaira(calculation.shippingFeeKobo),
      formattedOriginalFee: formatKoboToNaira(calculation.originalFeeKobo),
      formattedAmountNeeded: formatKoboToNaira(calculation.amountNeededForFreeDeliveryKobo),
    });
  } catch (error: unknown) {
    console.error("[Shipping API] Calculation error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
