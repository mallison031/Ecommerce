import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const totalReferrals = await prisma.customer.count({
      where: { referred_by_id: { not: null } },
    });

    const rewards = await prisma.referralReward.findMany({
      include: {
        referrer: { select: { id: true, name: true, email: true, loyalty_points: true } },
      },
      orderBy: { created_at: "desc" },
    });

    const totalPointsAwarded = rewards.reduce((acc, r) => acc + r.reward_points, 0);

    // Group by top referrers
    const referrersMap = new Map<string, { id: string; name: string; email: string; count: number; points: number }>();

    for (const r of rewards) {
      const existing = referrersMap.get(r.referrer_id) || {
        id: r.referrer.id,
        name: r.referrer.name,
        email: r.referrer.email,
        count: 0,
        points: 0,
      };
      existing.count += 1;
      existing.points += r.reward_points;
      referrersMap.set(r.referrer_id, existing);
    }

    const topAdvocates = Array.from(referrersMap.values()).sort((a, b) => b.count - a.count).slice(0, 10);

    return NextResponse.json({
      success: true,
      metrics: {
        totalReferredCustomers: totalReferrals,
        totalRewardsGranted: rewards.length,
        totalPointsAwarded,
      },
      topAdvocates,
      recentRewards: rewards.slice(0, 20).map((r) => ({
        id: r.id,
        referrerName: r.referrer.name,
        rewardPoints: r.reward_points,
        status: r.status,
        createdAt: r.created_at,
      })),
    });
  } catch (error: any) {
    console.error("[Admin Referrals API Error]", error);
    return NextResponse.json({ error: error.message || "Failed to fetch referral metrics" }, { status: 500 });
  }
}
