import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedCustomer } from "@/lib/customer-auth";

export async function POST(req: NextRequest) {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Please log in to redeem gift cards to your wallet." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { success: false, error: "Gift card code is required" },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();

    // Look up gift card
    const giftCard = await prisma.giftCard.findUnique({
      where: { code: cleanCode },
    });

    if (!giftCard) {
      return NextResponse.json(
        { success: false, error: "Invalid gift card code. Please check and try again." },
        { status: 404 }
      );
    }

    if (!giftCard.is_active) {
      return NextResponse.json(
        { success: false, error: "This gift card has been deactivated or claimed." },
        { status: 400 }
      );
    }

    if (giftCard.expires_at && giftCard.expires_at < new Date()) {
      return NextResponse.json(
        { success: false, error: "This gift card has expired." },
        { status: 400 }
      );
    }

    if (giftCard.balance_kobo <= 0) {
      return NextResponse.json(
        { success: false, error: "This gift card has a zero balance." },
        { status: 400 }
      );
    }

    const amountToCredit = giftCard.balance_kobo;

    // Perform atomic transaction: zero out gift card, credit customer, record ledger
    const [updatedCustomer, updatedGiftCard, transaction] = await prisma.$transaction([
      prisma.customer.update({
        where: { id: customer.id },
        data: {
          wallet_balance_kobo: { increment: amountToCredit },
        },
      }),
      prisma.giftCard.update({
        where: { id: giftCard.id },
        data: {
          balance_kobo: 0,
          is_active: false, // marked claimed/spent
        },
      }),
      prisma.walletTransaction.create({
        data: {
          customer_id: customer.id,
          type: "GIFT_CARD_REDEEM",
          amount_kobo: amountToCredit,
          balance_after_kobo: customer.wallet_balance_kobo + amountToCredit,
          description: `Redeemed Gift Card ${cleanCode}`,
          reference: cleanCode,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Successfully credited ₦${(amountToCredit / 100).toLocaleString()} to your store wallet!`,
      amount_credited_kobo: amountToCredit,
      new_balance_kobo: updatedCustomer.wallet_balance_kobo,
    });
  } catch (error: any) {
    console.error("Error redeeming gift card to wallet:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to redeem gift card" },
      { status: 500 }
    );
  }
}
