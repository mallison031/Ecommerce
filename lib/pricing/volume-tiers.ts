export interface VolumeTierRule {
  id?: string;
  min_quantity: number;
  max_quantity?: number | null;
  discount_percentage: number;
}

export interface VolumeDiscountResult {
  tier_applied: boolean;
  discount_percentage: number;
  unit_price_kobo: number;
  discounted_unit_price_kobo: number;
  total_discount_kobo: number;
  total_kobo: number;
  tier?: VolumeTierRule | null;
}

export function calculateVolumeDiscount(
  basePriceKobo: number,
  quantity: number,
  tiers: VolumeTierRule[] = []
): VolumeDiscountResult {
  if (!tiers || tiers.length === 0 || quantity <= 0) {
    return {
      tier_applied: false,
      discount_percentage: 0,
      unit_price_kobo: basePriceKobo,
      discounted_unit_price_kobo: basePriceKobo,
      total_discount_kobo: 0,
      total_kobo: basePriceKobo * quantity,
      tier: null,
    };
  }

  // Find all matching tiers where quantity satisfies min_quantity and (max_quantity == null or quantity <= max_quantity)
  const matchingTiers = tiers.filter((t) => {
    if (quantity < t.min_quantity) return false;
    if (t.max_quantity && quantity > t.max_quantity) return false;
    return true;
  });

  if (matchingTiers.length === 0) {
    return {
      tier_applied: false,
      discount_percentage: 0,
      unit_price_kobo: basePriceKobo,
      discounted_unit_price_kobo: basePriceKobo,
      total_discount_kobo: 0,
      total_kobo: basePriceKobo * quantity,
      tier: null,
    };
  }

  // Choose the tier with the highest discount percentage
  const bestTier = matchingTiers.reduce((prev, current) =>
    current.discount_percentage > prev.discount_percentage ? current : prev
  );

  const discountRatio = bestTier.discount_percentage / 100;
  const discountedUnitPriceKobo = Math.round(basePriceKobo * (1 - discountRatio));
  const unitSavingsKobo = basePriceKobo - discountedUnitPriceKobo;
  const totalDiscountKobo = unitSavingsKobo * quantity;
  const totalKobo = discountedUnitPriceKobo * quantity;

  return {
    tier_applied: true,
    discount_percentage: bestTier.discount_percentage,
    unit_price_kobo: basePriceKobo,
    discounted_unit_price_kobo: discountedUnitPriceKobo,
    total_discount_kobo: totalDiscountKobo,
    total_kobo: totalKobo,
    tier: bestTier,
  };
}
