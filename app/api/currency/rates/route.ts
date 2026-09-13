import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ensureDefaultCurrencies } from "@/lib/currency/currency-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDefaultCurrencies();

    const currencies = await prisma.currencySetting.findMany({
      where: { is_active: true },
      orderBy: { code: "asc" },
    });

    const ratesMap: Record<string, number> = {};
    for (const c of currencies) {
      ratesMap[c.code] = c.exchange_rate_to_ngn;
    }

    return NextResponse.json({
      success: true,
      base: "NGN",
      base_currency: "NGN",
      currencies,
      rates: ratesMap,
    });
  } catch (error: any) {
    console.error("Error fetching currency rates:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch currency rates" },
      { status: 500 }
    );
  }
}
