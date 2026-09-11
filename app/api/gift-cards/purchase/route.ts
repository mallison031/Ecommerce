import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const purchaseSchema = z.object({
  amount_kobo: z.number().int().min(100000, "Minimum gift card value is ₦1,000"), // 1,000 NGN in kobo
  recipient_name: z.string().min(2, "Recipient name is required"),
  recipient_email: z.string().email("Valid recipient email is required"),
  sender_name: z.string().min(2, "Sender name is required"),
  message: z.string().max(300).optional(),
  expires_in_days: z.number().int().min(1).max(365).default(90),
});

function generateGiftCardCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `AURA-${segment()}-${segment()}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = purchaseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const { amount_kobo, recipient_name, recipient_email, sender_name, message, expires_in_days } = parsed.data;

    let code = generateGiftCardCode();
    let existing = await prisma.giftCard.findUnique({ where: { code } });
    while (existing) {
      code = generateGiftCardCode();
      existing = await prisma.giftCard.findUnique({ where: { code } });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expires_in_days);

    const giftCard = await prisma.giftCard.create({
      data: {
        code,
        initial_value_kobo: amount_kobo,
        balance_kobo: amount_kobo,
        recipient_name,
        recipient_email,
        sender_name,
        message,
        expires_at: expiresAt,
        is_active: true,
      },
    });

    return NextResponse.json({
      success: true,
      gift_card: {
        id: giftCard.id,
        code: giftCard.code,
        initial_value_kobo: giftCard.initial_value_kobo,
        balance_kobo: giftCard.balance_kobo,
        currency: giftCard.currency,
        recipient_name: giftCard.recipient_name,
        recipient_email: giftCard.recipient_email,
        sender_name: giftCard.sender_name,
        message: giftCard.message,
        expires_at: giftCard.expires_at?.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/gift-cards/purchase:", error);
    return NextResponse.json({ success: false, error: "Failed to purchase gift card" }, { status: 500 });
  }
}
