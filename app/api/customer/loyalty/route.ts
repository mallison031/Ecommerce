import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function getTierInfo(points: number) {
  if (points >= 5000) {
    return {
      name: "Platinum VIP",
      badgeColor: "bg-slate-900 text-amber-300 border-amber-400",
      nextTier: null,
      pointsToNext: 0,
      progressPercent: 100,
      perks: ["VIP Early Access", "Free Express Delivery", "Dedicated Concierge"],
    };
  }
  if (points >= 1500) {
    return {
      name: "Gold Member",
      badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
      nextTier: "Platinum VIP",
      pointsToNext: 5000 - points,
      progressPercent: Math.round(((points - 1500) / (5000 - 1500)) * 100),
      perks: ["Priority Customer Support", "Birthday Gift Box", "Special Seasonal Drops"],
    };
  }
  if (points >= 500) {
    return {
      name: "Silver Member",
      badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
      nextTier: "Gold Member",
      pointsToNext: 1500 - points,
      progressPercent: Math.round(((points - 500) / (1500 - 500)) * 100),
      perks: ["Member-Only Sales", "Exclusive Brand Updates"],
    };
  }
  return {
    name: "Bronze Member",
    badgeColor: "bg-orange-50 text-orange-800 border-orange-200",
    nextTier: "Silver Member",
    pointsToNext: 500 - points,
    progressPercent: Math.round((points / 500) * 100),
    perks: ["Earn 1 Point per ₦100 spent", "Early Notifications"],
  };
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "") || req.cookies.get("customer_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const session = await prisma.customerSession.findUnique({
      where: { token },
      include: {
        customer: {
          include: {
            loyalty_ledger: {
              orderBy: { created_at: "desc" },
              take: 20,
            },
          },
        },
      },
    });

    if (!session || session.expires_at < new Date()) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const customer = session.customer;
    const points = customer.loyalty_points || 0;
    const tier = getTierInfo(points);

    return NextResponse.json({
      success: true,
      points,
      tier,
      redemptionStatus: "unlocking_soon",
      redemptionNotice: "Points redemption is unlocking soon with VIP tier perks. Continue shopping to climb tiers!",
      ledger: customer.loyalty_ledger.map((entry) => ({
        id: entry.id,
        points: entry.points,
        reason: entry.reason,
        createdAt: entry.created_at.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("[Customer Loyalty GET] Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
