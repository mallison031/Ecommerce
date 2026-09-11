import { prisma } from "@/lib/db/prisma";

export function generateReferralCode(name: string, id: string): string {
  const cleanName = (name || "FRIEND")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 5) || "VIP";
  const suffix = id.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase() || "7799";
  return `${cleanName}-${suffix}`;
}

export async function ensureCustomerReferralCode(customerId: string): Promise<string> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, referral_code: true },
  });

  if (!customer) throw new Error("Customer not found");
  if (customer.referral_code) return customer.referral_code;

  let code = generateReferralCode(customer.name, customer.id);
  // Ensure uniqueness
  const existing = await prisma.customer.findUnique({ where: { referral_code: code } });
  if (existing) {
    code = `${code}-${Math.floor(100 + Math.random() * 900)}`;
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: { referral_code: code },
  });

  return code;
}

export async function getCustomerReferralStats(customerId: string) {
  const referralCode = await ensureCustomerReferralCode(customerId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const referralLink = `${baseUrl}/?ref=${referralCode}`;

  const rewards = await prisma.referralReward.findMany({
    where: { referrer_id: customerId },
    orderBy: { created_at: "desc" },
  });

  const referees = await prisma.customer.findMany({
    where: { referred_by_id: customerId },
    select: {
      id: true,
      name: true,
      email: true,
      created_at: true,
      orders: {
        where: { status: { in: ["paid", "shipped", "delivered"] } },
        select: { id: true, total_kobo: true },
      },
    },
    orderBy: { created_at: "desc" },
  });

  const totalPointsEarned = rewards.reduce((acc, r) => acc + (r.status === "awarded" ? r.reward_points : 0), 0);

  return {
    referralCode,
    referralLink,
    totalReferredCount: referees.length,
    convertedOrdersCount: referees.filter((r) => r.orders.length > 0).length,
    totalPointsEarned,
    rewardPerReferral: 500,
    friends: referees.map((f) => ({
      id: f.id,
      name: f.name.slice(0, 1) + "*** " + (f.name.split(" ")[1] || ""),
      joinedAt: f.created_at,
      hasOrdered: f.orders.length > 0,
    })),
  };
}

export async function processReferralRewardOnPayment(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  });

  if (!order || !order.customer.referred_by_id) return null;

  const referrerId = order.customer.referred_by_id;

  // Check if reward was already issued for this order or this customer
  const existingReward = await prisma.referralReward.findFirst({
    where: {
      referrer_id: referrerId,
      referee_id: order.customer.id,
    },
  });

  if (existingReward) return null;

  const rewardPoints = 500;

  // 1. Create ReferralReward record
  const reward = await prisma.referralReward.create({
    data: {
      referrer_id: referrerId,
      referee_id: order.customer.id,
      order_id: order.id,
      reward_points: rewardPoints,
      status: "awarded",
    },
  });

  // 2. Increment referrer's loyalty_points
  await prisma.customer.update({
    where: { id: referrerId },
    data: {
      loyalty_points: { increment: rewardPoints },
    },
  });

  // 3. Create LoyaltyPointsLedger entry for referrer
  await prisma.loyaltyPointsLedger.create({
    data: {
      customer_id: referrerId,
      order_id: order.id,
      points: rewardPoints,
      reason: `Referral Reward: Friend ${order.customer.name.slice(0, 3)}*** placed first order (#${order.order_number})`,
    },
  });

  return reward;
}
