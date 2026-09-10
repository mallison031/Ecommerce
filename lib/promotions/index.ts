export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";

export interface Coupon {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number; // e.g. 10 for 10%, or 200000 kobo for ₦2,000
  minSpendKobo: number;
  maxDiscountKobo?: number;
  sectorRestriction?: string | null; // sector slug e.g. "jewelry"
  usageLimit?: number | null;
  timesUsed: number;
  isActive: boolean;
  expiresAt: string | null;
  description: string;
}

export interface FlashSale {
  id: string;
  sectorSlug: string;
  title: string;
  discountPercent: number;
  promoCode: string;
  bannerBg: string; // Tailwind class or color
  endsAt: string; // ISO date string
  isActive: boolean;
}

// In-memory store initialized with enterprise defaults and persistent in-process state
let activeCoupons: Coupon[] = [
  {
    id: "coup_1",
    code: "WELCOME10",
    discountType: "PERCENTAGE",
    discountValue: 10,
    minSpendKobo: 500000, // ₦5,000
    maxDiscountKobo: 1000000, // Max ₦10,000 off
    sectorRestriction: null,
    usageLimit: 1000,
    timesUsed: 42,
    isActive: true,
    expiresAt: "2027-12-31T23:59:59Z",
    description: "10% off storewide for first-time shoppers (min ₦5,000)",
  },
  {
    id: "coup_2",
    code: "SAVE5",
    discountType: "PERCENTAGE",
    discountValue: 5,
    minSpendKobo: 300000, // ₦3,000
    sectorRestriction: null,
    usageLimit: null,
    timesUsed: 119,
    isActive: true,
    expiresAt: null,
    description: "5% off shopping cart recovery incentive",
  },
  {
    id: "coup_3",
    code: "AURA2000",
    discountType: "FIXED_AMOUNT",
    discountValue: 200000, // ₦2,000
    minSpendKobo: 2000000, // ₦20,000
    sectorRestriction: null,
    usageLimit: 500,
    timesUsed: 18,
    isActive: true,
    expiresAt: "2027-12-31T23:59:59Z",
    description: "Flat ₦2,000 off on premium orders over ₦20,000",
  },
  {
    id: "coup_4",
    code: "JEWELRY15",
    discountType: "PERCENTAGE",
    discountValue: 15,
    minSpendKobo: 1500000, // ₦15,000
    sectorRestriction: "jewelry",
    usageLimit: 200,
    timesUsed: 31,
    isActive: true,
    expiresAt: "2027-12-31T23:59:59Z",
    description: "15% off all Fine & Fashion Jewelry pieces",
  },
  {
    id: "coup_5",
    code: "FREESHIP",
    discountType: "FREE_SHIPPING",
    discountValue: 100, // 100% off shipping
    minSpendKobo: 1000000, // ₦10,000
    sectorRestriction: null,
    usageLimit: 300,
    timesUsed: 67,
    isActive: true,
    expiresAt: "2027-12-31T23:59:59Z",
    description: "Complimentary courier dispatch on orders over ₦10,000",
  },
  {
    id: "coup_6",
    code: "VIP5000",
    discountType: "FIXED_AMOUNT",
    discountValue: 500000, // ₦5,000
    minSpendKobo: 4000000, // ₦40,000
    sectorRestriction: null,
    usageLimit: 100,
    timesUsed: 9,
    isActive: true,
    expiresAt: "2027-12-31T23:59:59Z",
    description: "₦5,000 VIP discount on luxury bundles over ₦40,000",
  },
];

let activeFlashSales: FlashSale[] = [
  {
    id: "flash_1",
    sectorSlug: "jewelry",
    title: "✨ Luxe Jewelry Weekend Flash Sale",
    discountPercent: 15,
    promoCode: "JEWELRY15",
    bannerBg: "from-amber-600 via-yellow-600 to-amber-700",
    endsAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    isActive: true,
  },
  {
    id: "flash_2",
    sectorSlug: "content-accessories",
    title: "🎙️ Creator Studio Spotlight — Special Savings",
    discountPercent: 10,
    promoCode: "WELCOME10",
    bannerBg: "from-indigo-600 via-purple-600 to-indigo-800",
    endsAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    isActive: true,
  },
];

export interface ValidateCouponParams {
  code: string;
  subtotalKobo: number;
  currentShippingFeeKobo?: number;
  sectorSlug?: string;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: Coupon;
  discountKobo: number;
  shippingDiscountKobo: number;
  finalSubtotalKobo: number;
  message: string;
}

export function validateCoupon({
  code,
  subtotalKobo,
  currentShippingFeeKobo = 0,
  sectorSlug,
}: ValidateCouponParams): CouponValidationResult {
  const normalized = code.trim().toUpperCase();

  const coupon = activeCoupons.find((c) => c.code.toUpperCase() === normalized);

  if (!coupon) {
    return {
      valid: false,
      discountKobo: 0,
      shippingDiscountKobo: 0,
      finalSubtotalKobo: subtotalKobo,
      message: `Coupon code '${code}' is invalid or does not exist.`,
    };
  }

  if (!coupon.isActive) {
    return {
      valid: false,
      discountKobo: 0,
      shippingDiscountKobo: 0,
      finalSubtotalKobo: subtotalKobo,
      message: `Coupon '${coupon.code}' is no longer active.`,
    };
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return {
      valid: false,
      discountKobo: 0,
      shippingDiscountKobo: 0,
      finalSubtotalKobo: subtotalKobo,
      message: `Coupon '${coupon.code}' expired on ${new Date(coupon.expiresAt).toLocaleDateString()}.`,
    };
  }

  if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.timesUsed >= coupon.usageLimit) {
    return {
      valid: false,
      discountKobo: 0,
      shippingDiscountKobo: 0,
      finalSubtotalKobo: subtotalKobo,
      message: `Coupon '${coupon.code}' has reached its maximum redemption limit.`,
    };
  }

  if (subtotalKobo < coupon.minSpendKobo) {
    const minNaira = (coupon.minSpendKobo / 100).toLocaleString("en-NG", {
      style: "currency",
      currency: "NGN",
    });
    return {
      valid: false,
      discountKobo: 0,
      shippingDiscountKobo: 0,
      finalSubtotalKobo: subtotalKobo,
      message: `Coupon '${coupon.code}' requires a minimum cart total of ${minNaira}.`,
    };
  }

  if (coupon.sectorRestriction && sectorSlug && coupon.sectorRestriction !== sectorSlug) {
    return {
      valid: false,
      discountKobo: 0,
      shippingDiscountKobo: 0,
      finalSubtotalKobo: subtotalKobo,
      message: `Coupon '${coupon.code}' is valid exclusively in the '${coupon.sectorRestriction}' category.`,
    };
  }

  let discountKobo = 0;
  let shippingDiscountKobo = 0;

  if (coupon.discountType === "PERCENTAGE") {
    discountKobo = Math.round((subtotalKobo * coupon.discountValue) / 100);
    if (coupon.maxDiscountKobo && discountKobo > coupon.maxDiscountKobo) {
      discountKobo = coupon.maxDiscountKobo;
    }
  } else if (coupon.discountType === "FIXED_AMOUNT") {
    discountKobo = Math.min(subtotalKobo, coupon.discountValue);
  } else if (coupon.discountType === "FREE_SHIPPING") {
    shippingDiscountKobo = currentShippingFeeKobo;
  }

  const finalSubtotalKobo = Math.max(0, subtotalKobo - discountKobo);

  return {
    valid: true,
    coupon,
    discountKobo,
    shippingDiscountKobo,
    finalSubtotalKobo,
    message: `Coupon '${coupon.code}' applied successfully!`,
  };
}

export function recordCouponRedemption(code: string): boolean {
  const normalized = code.trim().toUpperCase();
  const index = activeCoupons.findIndex((c) => c.code.toUpperCase() === normalized);
  if (index !== -1) {
    activeCoupons[index].timesUsed++;
    return true;
  }
  return false;
}

export function getAllCoupons(): Coupon[] {
  return [...activeCoupons];
}

export function createCoupon(newCoupon: Omit<Coupon, "id" | "timesUsed">): Coupon {
  const coupon: Coupon = {
    ...newCoupon,
    id: `coup_${Date.now()}`,
    code: newCoupon.code.trim().toUpperCase(),
    timesUsed: 0,
  };
  activeCoupons.unshift(coupon);
  return coupon;
}

export function getActiveFlashSales(sectorSlug?: string): FlashSale[] {
  const now = new Date();
  const sales = activeFlashSales.filter(
    (s) => s.isActive && new Date(s.endsAt) > now
  );
  if (sectorSlug) {
    return sales.filter((s) => s.sectorSlug === sectorSlug);
  }
  return sales;
}

export function createFlashSale(sale: Omit<FlashSale, "id">): FlashSale {
  const newSale: FlashSale = {
    ...sale,
    id: `flash_${Date.now()}`,
  };
  activeFlashSales.unshift(newSale);
  return newSale;
}
