import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedCustomer } from "@/lib/customer-auth";

export async function GET(req: NextRequest) {
  try {
    const customer = await getAuthenticatedCustomer(req);
    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const transactions = await prisma.walletTransaction.findMany({
      where: { customer_id: customer.id },
      orderBy: { created_at: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      wallet_balance_kobo: customer.wallet_balance_kobo,
      currency: "NGN",
      transactions,
    });
  } catch (error: any) {
    console.error("Error fetching customer wallet:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch wallet information" },
      { status: 500 }
    );
  }
}
