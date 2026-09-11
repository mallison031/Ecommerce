import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCustomerReferralStats, ensureCustomerReferralCode } from "@/lib/referrals/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const sessionToken = authHeader?.replace("Bearer ", "").trim();

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await prisma.customerSession.findUnique({
      where: { token: sessionToken },
      include: { customer: true },
    });

    if (!session || session.expires_at < new Date()) {
      return NextResponse.json({ error: "Session expired or invalid" }, { status: 401 });
    }

    const stats = await getCustomerReferralStats(session.customer.id);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error("[Referrals API Error]", error);
    return NextResponse.json({ error: error.message || "Failed to fetch referrals" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const sessionToken = authHeader?.replace("Bearer ", "").trim();

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await prisma.customerSession.findUnique({
      where: { token: sessionToken },
      include: { customer: true },
    });

    if (!session || session.expires_at < new Date()) {
      return NextResponse.json({ error: "Session expired or invalid" }, { status: 401 });
    }

    const body = await req.json();
    const { referralCode } = body;

    if (!referralCode || typeof referralCode !== "string") {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
    }

    const cleanCode = referralCode.trim().toUpperCase();

    // Verify referrer exists and is not the customer themself
    const referrer = await prisma.customer.findUnique({
      where: { referral_code: cleanCode },
    });

    if (!referrer) {
      return NextResponse.json({ error: "Referral code not found" }, { status: 404 });
    }

    if (referrer.id === session.customer.id) {
      return NextResponse.json({ error: "You cannot refer yourself" }, { status: 400 });
    }

    if (session.customer.referred_by_id) {
      return NextResponse.json({ error: "Referral code already applied" }, { status: 400 });
    }

    // Bind referrer to referee
    await prisma.customer.update({
      where: { id: session.customer.id },
      data: { referred_by_id: referrer.id },
    });

    return NextResponse.json({
      success: true,
      message: `Referral code ${cleanCode} successfully attached to your account!`,
      referrerName: referrer.name.split(" ")[0],
    });
  } catch (error: any) {
    console.error("[Apply Referral API Error]", error);
    return NextResponse.json({ error: error.message || "Failed to apply referral" }, { status: 500 });
  }
}
