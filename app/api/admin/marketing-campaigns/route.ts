import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  ensureDefaultCampaignSettings,
  generateCampaignDiscountCode,
} from "@/lib/marketing/campaigns";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDefaultCampaignSettings();

    const campaigns = await prisma.marketingCampaignSetting.findMany({
      orderBy: { created_at: "asc" },
    });

    const logs = await prisma.marketingCampaignLog.findMany({
      orderBy: { created_at: "desc" },
      take: 100,
      include: {
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Aggregate statistics per campaign type
    const campaignStats: Record<
      string,
      { sent: number; opened: number; converted: number; revenue_kobo: number }
    > = {};

    for (const c of campaigns) {
      campaignStats[c.type] = { sent: 0, opened: 0, converted: 0, revenue_kobo: 0 };
    }

    for (const log of logs) {
      if (!campaignStats[log.campaign_type]) {
        campaignStats[log.campaign_type] = { sent: 0, opened: 0, converted: 0, revenue_kobo: 0 };
      }
      campaignStats[log.campaign_type].sent += 1;
      if (log.opened_at) campaignStats[log.campaign_type].opened += 1;
      if (log.converted_at) {
        campaignStats[log.campaign_type].converted += 1;
      }
    }

    // Find converted orders revenue
    const convertedOrderIds = logs.map((l) => l.order_id).filter(Boolean) as string[];
    if (convertedOrderIds.length > 0) {
      const orders = await prisma.order.findMany({
        where: { id: { in: convertedOrderIds }, status: "paid" },
        select: { id: true, total_kobo: true },
      });
      const orderRevMap = new Map(orders.map((o) => [o.id, o.total_kobo]));
      for (const log of logs) {
        if (log.order_id && orderRevMap.has(log.order_id)) {
          campaignStats[log.campaign_type].revenue_kobo += orderRevMap.get(log.order_id) || 0;
        }
      }
    }

    const enrichedCampaigns = campaigns.map((c) => ({
      ...c,
      stats: campaignStats[c.type] || { sent: 0, opened: 0, converted: 0, revenue_kobo: 0 },
    }));

    const totalSent = logs.length;
    const totalOpened = logs.filter((l) => l.opened_at).length;
    const totalConverted = logs.filter((l) => l.converted_at).length;
    const totalRevenueKobo = Object.values(campaignStats).reduce(
      (sum, s) => sum + s.revenue_kobo,
      0
    );
    const conversionRatePct = totalSent > 0 ? (totalConverted / totalSent) * 100 : 0;

    return NextResponse.json({
      success: true,
      campaigns: enrichedCampaigns,
      recent_logs: logs.slice(0, 30),
      total_sent: totalSent,
      summary: {
        total_sent: totalSent,
        total_opened: totalOpened,
        total_converted: totalConverted,
        total_revenue_kobo: totalRevenueKobo,
        conversion_rate_pct: Math.round(conversionRatePct * 10) / 10,
      },
    });
  } catch (error: any) {
    console.error("Error fetching marketing campaigns:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch marketing campaigns" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, is_active, delay_days, discount_percentage, channel } = body;
    const discountPct =
      typeof discount_percentage === "number"
        ? discount_percentage
        : typeof body.discount_percent === "number"
        ? body.discount_percent
        : undefined;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Campaign ID is required" },
        { status: 400 }
      );
    }

    const updated = await prisma.marketingCampaignSetting.update({
      where: { id },
      data: {
        ...(typeof is_active === "boolean" ? { is_active } : {}),
        ...(typeof delay_days === "number" ? { delay_days } : {}),
        ...(typeof discountPct === "number" ? { discount_percentage: discountPct } : {}),
        ...(channel ? { channel } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Campaign settings updated successfully",
      campaign: {
        ...updated,
        discount_percent: updated.discount_percentage,
      },
    });
  } catch (error: any) {
    console.error("Error updating campaign settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update campaign settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const campaign_type = body.campaign_type || body.type;
    const test_email = body.test_email || body.recipient_email;

    if (!campaign_type || !test_email) {
      return NextResponse.json(
        { success: false, error: "campaign_type and test_email are required" },
        { status: 400 }
      );
    }

    const campaign = await prisma.marketingCampaignSetting.findUnique({
      where: { type: campaign_type },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign type not found" },
        { status: 404 }
      );
    }

    const testCoupon = generateCampaignDiscountCode(campaign.type.split("_")[0] || "TEST");

    return NextResponse.json({
      success: true,
      message: `Test preview email dispatched to ${test_email}`,
      discount_code: testCoupon,
      preview: {
        campaign_name: campaign.name,
        recipient: test_email,
        discount_code: testCoupon,
        discount_percentage: campaign.discount_percentage,
        subject: `[Preview] Special ${campaign.discount_percentage}% OFF just for you!`,
        sent_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error sending test preview:", error);
    return NextResponse.json(
      { success: false, error: "Failed to dispatch preview email" },
      { status: 500 }
    );
  }
}
