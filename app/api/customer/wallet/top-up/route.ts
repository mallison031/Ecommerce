import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedCustomer } from "@/lib/customer-auth";

export async function POST(req: NextRequest) {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { amount_kobo, payment_reference } = body;

    const topUpAmount = Number(amount_kobo);
    if (!topUpAmount || isNaN(topUpAmount) || topUpAmount < 100000) {
      return NextResponse.json(
        { success: false, error: "Minimum wallet top-up is ₦1,000 (100,000 kobo)." },
        { status: 400 }
      );
    }

    const ref = payment_reference || `WALLET-TOPUP-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Execute atomic update
    const [updatedCustomer, transaction] = await prisma.$transaction([
      prisma.customer.update({
        where: { id: customer.id },
        data: {
          wallet_balance_kobo: { increment: topUpAmount },
        },
      }),
      prisma.walletTransaction.create({
        data: {
          customer_id: customer.id,
          type: "TOPUP",
          amount_kobo: topUpAmount,
          balance_after_kobo: customer.wallet_balance_kobo + topUpAmount,
          description: `Direct Wallet Top-up via Paystack`,
          reference: ref,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Successfully topped up ₦${(topUpAmount / 100).toLocaleString()} to your wallet!`,
      credited_kobo: topUpAmount,
      new_balance_kobo: updatedCustomer.wallet_balance_kobo,
      transaction_id: transaction.id,
      reference: ref,
    });
  } catch (error: any) {
    console.error("Error topping up customer wallet:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process wallet top-up" },
      { status: 500 }
    );
  }
}
