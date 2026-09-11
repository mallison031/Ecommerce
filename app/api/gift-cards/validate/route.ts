import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const validateSchema = z.object({
  code: z.string().min(3, "Gift card code is required"),
  total_kobo: z.number().int().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = validateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, valid: false, error: parsed.error.errors[0]?.message || "Invalid code" },
        { status: 400 }
      );
    }

    const rawCode = parsed.data.code.trim().toUpperCase();
    const totalKobo = parsed.data.total_kobo || 0;

    const giftCard = await prisma.giftCard.findUnique({
      where: { code: rawCode },
    });

    if (!giftCard) {
      return NextResponse.json(
        { success: false, valid: false, error: "Invalid gift card code. Please check and try again." },
        { status: 404 }
      );
    }

    if (!giftCard.is_active) {
      return NextResponse.json(
        { success: false, valid: false, error: "This gift card has been deactivated." },
        { status: 400 }
      );
    }

    if (giftCard.expires_at && giftCard.expires_at < new Date()) {
      return NextResponse.json(
        { success: false, valid: false, error: "This gift card has expired." },
        { status: 400 }
      );
    }

    if (giftCard.balance_kobo <= 0) {
      return NextResponse.json(
        { success: false, valid: false, error: "This gift card has zero remaining balance." },
        { status: 400 }
      );
    }

    const deductionKobo = totalKobo > 0 ? Math.min(giftCard.balance_kobo, totalKobo) : giftCard.balance_kobo;
    const remainingTotalKobo = totalKobo > 0 ? Math.max(0, totalKobo - deductionKobo) : 0;

    return NextResponse.json({
      success: true,
      valid: true,
      code: giftCard.code,
      balance_kobo: giftCard.balance_kobo,
      initial_value_kobo: giftCard.initial_value_kobo,
      currency: giftCard.currency,
      recipient_name: giftCard.recipient_name,
      deduction_kobo: deductionKobo,
      remaining_total_kobo: remainingTotalKobo,
      expires_at: giftCard.expires_at?.toISOString() || null,
    });
  } catch (error) {
    console.error("Error in POST /api/gift-cards/validate:", error);
    return NextResponse.json(
      { success: false, valid: false, error: "Failed to validate gift card" },
      { status: 500 }
    );
  }
}
