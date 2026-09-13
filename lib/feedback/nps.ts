import crypto from "crypto";

export interface NpsMetrics {
  total_responses: number;
  nps_score: number; // -100 to +100
  promoters_count: number;
  promoters_pct: number;
  passives_count: number;
  passives_pct: number;
  detractors_count: number;
  detractors_pct: number;
  avg_delivery_speed: number; // 1-5
  avg_packaging: number; // 1-5
  avg_product_quality: number; // 1-5
}

export const POPULAR_FEEDBACK_TAGS = [
  "⚡ Speedy Delivery",
  "📦 Pristine Packaging",
  "🤝 Courteous Courier",
  "✨ Flawless Quality",
  "🏷️ Accurate Sizing",
  "💬 Proactive WhatsApp Updates",
  "🐢 Delayed Dispatch",
  "📦 Damaged Parcel Box",
  "🔄 Wrong Item Received",
] as const;

export function generateSurveyToken(): string {
  return `srv_${crypto.randomBytes(16).toString("hex")}`;
}

export function calculateNpsMetrics(feedbacks: {
  nps_score?: number | null;
  delivery_speed_rating?: number | null;
  packaging_rating?: number | null;
  product_quality_rating?: number | null;
}[]): NpsMetrics {
  const scored = feedbacks.filter((f) => typeof f.nps_score === "number" && f.nps_score >= 1 && f.nps_score <= 10);
  const total = scored.length;

  if (total === 0) {
    return {
      total_responses: 0,
      nps_score: 0,
      promoters_count: 0,
      promoters_pct: 0,
      passives_count: 0,
      passives_pct: 0,
      detractors_count: 0,
      detractors_pct: 0,
      avg_delivery_speed: 0,
      avg_packaging: 0,
      avg_product_quality: 0,
    };
  }

  let promoters = 0;
  let passives = 0;
  let detractors = 0;

  let speedSum = 0;
  let speedCount = 0;
  let packSum = 0;
  let packCount = 0;
  let qualSum = 0;
  let qualCount = 0;

  for (const item of feedbacks) {
    if (typeof item.nps_score === "number") {
      if (item.nps_score >= 9) promoters++;
      else if (item.nps_score >= 7) passives++;
      else detractors++;
    }

    if (item.delivery_speed_rating) {
      speedSum += item.delivery_speed_rating;
      speedCount++;
    }
    if (item.packaging_rating) {
      packSum += item.packaging_rating;
      packCount++;
    }
    if (item.product_quality_rating) {
      qualSum += item.product_quality_rating;
      qualCount++;
    }
  }

  const promotersPct = Math.round((promoters / total) * 100);
  const passivesPct = Math.round((passives / total) * 100);
  const detractorsPct = Math.round((detractors / total) * 100);
  const npsScore = promotersPct - detractorsPct;

  return {
    total_responses: total,
    nps_score: npsScore,
    promoters_count: promoters,
    promoters_pct: promotersPct,
    passives_count: passives,
    passives_pct: passivesPct,
    detractors_count: detractors,
    detractors_pct: detractorsPct,
    avg_delivery_speed: speedCount > 0 ? Math.round((speedSum / speedCount) * 10) / 10 : 0,
    avg_packaging: packCount > 0 ? Math.round((packSum / packCount) * 10) / 10 : 0,
    avg_product_quality: qualCount > 0 ? Math.round((qualSum / qualCount) * 10) / 10 : 0,
  };
}
