import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const issueGiftCardSchema = z.object({
  code: z.string().optional(),
  amount_kobo: z.number().int().min(10000, "Minimum gift card amount is ₦100"),
  recipient_name: z.string().optional(),
  recipient_email: z.string().optional(),
  sender_name: z.string().optional(),
  message: z.string().optional(),
  expires_in_days: z.number().int().optional().default(180),
});

const updateGiftCardSchema = z.object({
  id: z.string(),
  is_active: z.boolean().optional(),
  balance_kobo: z.number().int().min(0).optional(),
});

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `AURA-${seg()}-${seg()}`;
}

export async function GET() {
  try {
    const giftCards = await prisma.giftCard.findMany({
      include: {
        redemptions: {
          include: {
            order: {
              select: {
                order_number: true,
                total_kobo: true,
                customer: {
                  select: { name: true },
                },
              },
            },
          },
          orderBy: { redeemed_at: "desc" },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const totalIssuedKobo = giftCards.reduce((acc, gc) => acc + gc.initial_value_kobo, 0);
    const outstandingLiabilityKobo = giftCards
      .filter((gc) => gc.is_active && (!gc.expires_at || gc.expires_at > new Date()))
      .reduce((acc, gc) => acc + gc.balance_kobo, 0);
    const totalRedeemedKobo = giftCards.reduce(
      (acc, gc) => acc + (gc.initial_value_kobo - gc.balance_kobo),
      0
    );

    return NextResponse.json({
      success: true,
      stats: {
        total_cards: giftCards.length,
        total_issued_kobo: totalIssuedKobo,
        outstanding_liability_kobo: outstandingLiabilityKobo,
        total_redeemed_kobo: totalRedeemedKobo,
      },
      gift_cards: giftCards.map((gc) => ({
        id: gc.id,
        code: gc.code,
        initial_value_kobo: gc.initial_value_kobo,
        balance_kobo: gc.balance_kobo,
        currency: gc.currency,
        recipient_name: gc.recipient_name,
        recipient_email: gc.recipient_email,
        sender_name: gc.sender_name,
        message: gc.message,
        is_active: gc.is_active,
        expires_at: gc.expires_at?.toISOString() || null,
        created_at: gc.created_at.toISOString(),
        redemptions: gc.redemptions.map((r) => ({
          id: r.id,
          amount_kobo: r.amount_kobo,
          redeemed_at: r.redeemed_at.toISOString(),
          order_number: r.order.order_number,
          customer_name: r.order.customer.name,
        })),
      })),
    });
  } catch (error) {
    console.error("Error in GET /api/admin/gift-cards:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch gift cards" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = issueGiftCardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const { code: rawCode, amount_kobo, recipient_name, recipient_email, sender_name, message, expires_in_days } = parsed.data;

    let finalCode = (rawCode?.trim().toUpperCase()) || generateCode();
    let existing = await prisma.giftCard.findUnique({ where: { code: finalCode } });
    if (rawCode && existing) {
      return NextResponse.json({ success: false, error: "Gift card code already exists" }, { status: 400 });
    }
    while (existing) {
      finalCode = generateCode();
      existing = await prisma.giftCard.findUnique({ where: { code: finalCode } });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expires_in_days);

    const giftCard = await prisma.giftCard.create({
      data: {
        code: finalCode,
        initial_value_kobo: amount_kobo,
        balance_kobo: amount_kobo,
        recipient_name,
        recipient_email,
        sender_name: sender_name || "Aura Store Admin",
        message,
        expires_at: expiresAt,
        is_active: true,
      },
    });

    return NextResponse.json({ success: true, gift_card: giftCard }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/gift-cards:", error);
    return NextResponse.json({ success: false, error: "Failed to issue gift card" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = updateGiftCardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid update payload" },
        { status: 400 }
      );
    }

    const { id, is_active, balance_kobo } = parsed.data;
    const updateData: Record<string, unknown> = {};
    if (typeof is_active === "boolean") updateData.is_active = is_active;
    if (typeof balance_kobo === "number") updateData.balance_kobo = balance_kobo;

    const updated = await prisma.giftCard.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, gift_card: updated });
  } catch (error) {
    console.error("Error in PATCH /api/admin/gift-cards:", error);
    return NextResponse.json({ success: false, error: "Failed to update gift card" }, { status: 500 });
  }
}
