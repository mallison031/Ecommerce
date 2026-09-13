import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ensureDefaultCurrencies } from "@/lib/currency/currency-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDefaultCurrencies();

    const currencies = await prisma.currencySetting.findMany({
      orderBy: { code: "asc" },
    });

    return NextResponse.json({
      success: true,
      currencies,
    });
  } catch (error: any) {
    console.error("Error fetching admin currency settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch currency settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, exchange_rate_to_ngn, is_active } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Currency code is required" },
        { status: 400 }
      );
    }

    const updated = await prisma.currencySetting.update({
      where: { code: code.toUpperCase() },
      data: {
        ...(typeof exchange_rate_to_ngn === "number" ? { exchange_rate_to_ngn } : {}),
        ...(typeof is_active === "boolean" ? { is_active } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Currency ${updated.code} updated successfully`,
      currency: updated,
    });
  } catch (error: any) {
    console.error("Error updating currency settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update currency setting" },
      { status: 500 }
    );
  }
}
