import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";

export interface DefaultCampaignDef {
  type: string;
  name: string;
  description: string;
  delay_days: number;
  discount_percentage: number;
  channel: "email" | "whatsapp";
}

export const DEFAULT_CAMPAIGNS: DefaultCampaignDef[] = [
  {
    type: "WIN_BACK_60D",
    name: "60-Day Lapsed Customer Win-Back",
    description: "Re-engage customers who have not made a purchase in 60+ days with an exclusive incentive discount code.",
    delay_days: 60,
    discount_percentage: 15,
    channel: "email",
  },
  {
    type: "REPLENISHMENT_30D",
    name: "30-Day Replenishment & Care Check-in",
    description: "Follow up with customers 30 days after product delivery to suggest replenishment and repeat purchase essentials.",
    delay_days: 30,
    discount_percentage: 10,
    channel: "email",
  },
  {
    type: "VIP_SPEND_MILESTONE",
    name: "VIP Lifetime Spend Milestone (₦100,000+)",
    description: "Automatically reward top-tier customers when their lifetime confirmed purchases cross ₦100,000.",
    delay_days: 0,
    discount_percentage: 20,
    channel: "email",
  },
  {
    type: "BROWSE_ABANDONMENT",
    name: "Watchlist & Browse Follow-up Nudge",
    description: "Follow up with interested shoppers who saved items to their watchlist with a modest incentive nudge.",
    delay_days: 3,
    discount_percentage: 5,
    channel: "email",
  },
];

export async function ensureDefaultCampaignSettings() {
  for (const def of DEFAULT_CAMPAIGNS) {
    await prisma.marketingCampaignSetting.upsert({
      where: { type: def.type },
      update: {},
      create: {
        type: def.type,
        name: def.name,
        description: def.description,
        delay_days: def.delay_days,
        discount_percentage: def.discount_percentage,
        channel: def.channel,
        is_active: true,
      },
    });
  }
}

export function generateCampaignDiscountCode(prefix: string): string {
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${rand}`;
}

export function generateUnsubscribeToken(): string {
  return crypto.randomBytes(24).toString("hex");
}
