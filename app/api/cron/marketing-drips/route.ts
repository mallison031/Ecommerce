import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  ensureDefaultCampaignSettings,
  generateCampaignDiscountCode,
} from "@/lib/marketing/campaigns";
import { createCoupon } from "@/lib/promotions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await ensureDefaultCampaignSettings();

    const campaignSettings = await prisma.marketingCampaignSetting.findMany();
    const settingsMap = new Map(campaignSettings.map((s) => [s.type, s]));

    const now = new Date();
    let winbackCount = 0;
    let replenishmentCount = 0;
    let vipCount = 0;
    const dispatchedLogs: any[] = [];

    // ----------------------------------------------------
    // 1. 60-DAY WIN-BACK CAMPAIGN
    // ----------------------------------------------------
    const winbackSetting = settingsMap.get("WIN_BACK_60D");
    if (winbackSetting && winbackSetting.is_active) {
      const days = winbackSetting.delay_days || 60;
      const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      // Customers who opted in to marketing
      const customers = await prisma.customer.findMany({
        where: {
          marketing_emails_opt_in: true,
          orders: {
            some: {
              status: { in: ["paid", "shipped", "delivered"] },
            },
          },
        },
        include: {
          orders: {
            where: { status: { in: ["paid", "shipped", "delivered"] } },
            orderBy: { created_at: "desc" },
            take: 1,
          },
          campaign_logs: {
            where: { campaign_type: "WIN_BACK_60D" },
            orderBy: { created_at: "desc" },
            take: 1,
          },
        },
      });

      for (const customer of customers) {
        const lastOrder = customer.orders[0];
        if (!lastOrder) continue;

        const lastOrderDate = lastOrder.created_at;
        const lastCampaignLog = customer.campaign_logs[0];

        // If last order is older than cutoff date and customer hasn't received a win-back in last 'days'
        const isLapsed = lastOrderDate <= cutoffDate;
        const recentlyContacted =
          lastCampaignLog && lastCampaignLog.created_at > cutoffDate;

        if (isLapsed && !recentlyContacted) {
          const discountCode = generateCampaignDiscountCode("WINBACK");
          const discountPct = winbackSetting.discount_percentage || 15;

          // Create dynamic coupon for this customer
          const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
          try {
            createCoupon({
              code: discountCode,
              description: `Win-back ${discountPct}% OFF incentive for ${customer.email}`,
              discountType: "PERCENTAGE",
              discountValue: discountPct,
              minSpendKobo: 0,
              usageLimit: 1,
              isActive: true,
              expiresAt: expiresAt.toISOString(),
            });
          } catch {}

          const log = await prisma.marketingCampaignLog.create({
            data: {
              campaign_type: "WIN_BACK_60D",
              customer_id: customer.id,
              channel: winbackSetting.channel || "email",
              recipient_email: customer.email,
              recipient_phone: customer.whatsapp_phone_e164 || customer.phone,
              discount_code: discountCode,
              subject: `We miss you, ${customer.name}! Here is ${discountPct}% OFF your next order`,
              content_snippet: `Use coupon code ${discountCode} at checkout to save ${discountPct}%. Valid for 14 days.`,
              status: "sent",
            },
          });

          dispatchedLogs.push(log);
          winbackCount++;
        }
      }
    }

    // ----------------------------------------------------
    // 2. 30-DAY REPLENISHMENT & REORDER DRIP
    // ----------------------------------------------------
    const replenishSetting = settingsMap.get("REPLENISHMENT_30D");
    if (replenishSetting && replenishSetting.is_active) {
      const days = replenishSetting.delay_days || 30;
      const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const deliveredOrders = await prisma.order.findMany({
        where: {
          status: "delivered",
          OR: [
            { delivered_at: { lte: cutoffDate } },
            { delivered_at: null, created_at: { lte: cutoffDate } },
          ],
          customer: {
            replenishment_opt_in: true,
          },
        },
        include: {
          customer: {
            include: {
              campaign_logs: {
                where: { campaign_type: "REPLENISHMENT_30D" },
              },
            },
          },
          items: {
            take: 1,
          },
        },
        take: 50,
      });

      for (const order of deliveredOrders) {
        const alreadyNotified = order.customer.campaign_logs.some(
          (log) => log.order_id === order.id
        );

        if (!alreadyNotified && order.customer) {
          const discountCode = generateCampaignDiscountCode("REPLENISH");
          const discountPct = replenishSetting.discount_percentage || 10;
          const itemName = order.items[0]?.product_name_snapshot || "your favorite essentials";

          const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
          try {
            createCoupon({
              code: discountCode,
              description: `Replenishment ${discountPct}% OFF incentive for ${order.customer.email}`,
              discountType: "PERCENTAGE",
              discountValue: discountPct,
              minSpendKobo: 0,
              usageLimit: 1,
              isActive: true,
              expiresAt: expiresAt.toISOString(),
            });
          } catch {}

          const log = await prisma.marketingCampaignLog.create({
            data: {
              campaign_type: "REPLENISHMENT_30D",
              customer_id: order.customer.id,
              channel: replenishSetting.channel || "email",
              recipient_email: order.customer.email,
              recipient_phone: order.customer.whatsapp_phone_e164 || order.customer.phone,
              discount_code: discountCode,
              order_id: order.id,
              subject: `Time to restock ${itemName}? Enjoy ${discountPct}% OFF!`,
              content_snippet: `Keep your collection fresh. Enjoy ${discountPct}% OFF your replenishment order with code ${discountCode}.`,
              status: "sent",
            },
          });

          dispatchedLogs.push(log);
          replenishmentCount++;
        }
      }
    }

    // ----------------------------------------------------
    // 3. VIP LIFETIME SPEND MILESTONE (₦100,000+)
    // ----------------------------------------------------
    const vipSetting = settingsMap.get("VIP_SPEND_MILESTONE");
    if (vipSetting && vipSetting.is_active) {
      // Find customers whose total completed orders >= 10,000,000 kobo (₦100,000)
      const topCustomers = await prisma.customer.findMany({
        where: {
          orders: {
            some: {
              status: { in: ["paid", "shipped", "delivered"] },
            },
          },
        },
        include: {
          orders: {
            where: { status: { in: ["paid", "shipped", "delivered"] } },
            select: { total_kobo: true },
          },
          campaign_logs: {
            where: { campaign_type: "VIP_SPEND_MILESTONE" },
          },
        },
      });

      for (const customer of topCustomers) {
        const totalSpentKobo = customer.orders.reduce((sum, o) => sum + o.total_kobo, 0);
        const hasVipReward = customer.campaign_logs.length > 0;

        if (totalSpentKobo >= 10000000 && !hasVipReward) {
          const discountPct = vipSetting.discount_percentage || 20;
          const discountCode = generateCampaignDiscountCode("VIP");

          const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          try {
            createCoupon({
              code: discountCode,
              description: `VIP Tier Milestone ${discountPct}% OFF for ${customer.email}`,
              discountType: "PERCENTAGE",
              discountValue: discountPct,
              minSpendKobo: 0,
              usageLimit: 1,
              isActive: true,
              expiresAt: expiresAt.toISOString(),
            });
          } catch {}

          const log = await prisma.marketingCampaignLog.create({
            data: {
              campaign_type: "VIP_SPEND_MILESTONE",
              customer_id: customer.id,
              channel: vipSetting.channel || "email",
              recipient_email: customer.email,
              recipient_phone: customer.whatsapp_phone_e164 || customer.phone,
              discount_code: discountCode,
              subject: `🌟 You've unlocked VIP status at Aura! Here is your exclusive ${discountPct}% voucher`,
              content_snippet: `Thank you for being one of our most valued patrons! Use ${discountCode} for ${discountPct}% off your next luxury order.`,
              status: "sent",
            },
          });

          dispatchedLogs.push(log);
          vipCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Automated marketing drips sweep completed successfully",
      summary: {
        winback_dispatched: winbackCount,
        replenishment_dispatched: replenishmentCount,
        vip_dispatched: vipCount,
        total_dispatched: winbackCount + replenishmentCount + vipCount,
      },
      processed: {
        win_back: winbackCount,
        replenishment: replenishmentCount,
        vip_milestone: vipCount,
        total: winbackCount + replenishmentCount + vipCount,
      },
      dispatched: dispatchedLogs.slice(0, 20),
    });
  } catch (error: any) {
    console.error("Error running marketing drips sweep:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute marketing drips sweep" },
      { status: 500 }
    );
  }
}

// Support GET for manual browser inspection or monitoring cron services
export async function GET(req: NextRequest) {
  return POST(req);
}
