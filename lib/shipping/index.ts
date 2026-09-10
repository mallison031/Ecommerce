export interface ShippingZone {
  code: string;
  name: string;
  baseFeeKobo: number;
  deliverySla: string;
  states: string[];
}

export const FREE_SHIPPING_THRESHOLD_KOBO = 5000000; // ₦50,000.00
export const LAGOS_EXPRESS_ADDON_KOBO = 150000; // ₦1,500.00

export const NIGERIAN_STATES = [
  "Abia",
  "Abuja (FCT)",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
] as const;

export type NigerianState = (typeof NIGERIAN_STATES)[number];

export const LAGOS_ZONES = [
  { code: "lagos_mainland", name: "Lagos Mainland (Ikeja, Yaba, Surulere, Maryland, etc.)", feeKobo: 200000, sla: "Same-Day / 24 Hours" },
  { code: "lagos_island", name: "Lagos Island (Ikoyi, VI, Lekki, Ajah, etc.)", feeKobo: 250000, sla: "Next-Day / 24 Hours" },
] as const;

export const REGIONAL_SHIPPING_ZONES: ShippingZone[] = [
  {
    code: "lagos_mainland",
    name: "Lagos Mainland",
    baseFeeKobo: 200000, // ₦2,000
    deliverySla: "Same-Day / 24 Hours",
    states: ["Lagos"],
  },
  {
    code: "lagos_island",
    name: "Lagos Island / Lekki",
    baseFeeKobo: 250000, // ₦2,500
    deliverySla: "Next-Day / 24 Hours",
    states: ["Lagos"],
  },
  {
    code: "south_west",
    name: "South-West Interstate",
    baseFeeKobo: 350000, // ₦3,500
    deliverySla: "1–2 Business Days",
    states: ["Ogun", "Oyo", "Osun", "Ondo", "Ekiti"],
  },
  {
    code: "abuja",
    name: "Abuja Capital Territory",
    baseFeeKobo: 400000, // ₦4,000
    deliverySla: "2 Business Days",
    states: ["Abuja (FCT)"],
  },
  {
    code: "south_south_east",
    name: "South-South & South-East",
    baseFeeKobo: 450000, // ₦4,500
    deliverySla: "2–3 Business Days",
    states: [
      "Rivers",
      "Delta",
      "Edo",
      "Akwa Ibom",
      "Cross River",
      "Bayelsa",
      "Anambra",
      "Enugu",
      "Imo",
      "Abia",
      "Ebonyi",
    ],
  },
  {
    code: "north_central",
    name: "North Central",
    baseFeeKobo: 500000, // ₦5,000
    deliverySla: "3–4 Business Days",
    states: ["Kwara", "Plateau", "Niger", "Benue", "Nasarawa", "Kogi"],
  },
  {
    code: "northern_states",
    name: "North-West & North-East",
    baseFeeKobo: 550000, // ₦5,500
    deliverySla: "3–5 Business Days",
    states: [
      "Kaduna",
      "Kano",
      "Katsina",
      "Sokoto",
      "Kebbi",
      "Zamfara",
      "Jigawa",
      "Borno",
      "Yobe",
      "Adamawa",
      "Bauchi",
      "Gombe",
      "Taraba",
    ],
  },
];

export interface ShippingCalculationParams {
  state: string;
  lagosZone?: "lagos_mainland" | "lagos_island";
  subtotalKobo: number;
  isExpress?: boolean;
}

export interface ShippingCalculationResult {
  shippingFeeKobo: number;
  originalFeeKobo: number;
  isFreeDelivery: boolean;
  amountNeededForFreeDeliveryKobo: number;
  freeDeliveryProgressPercent: number;
  deliverySla: string;
  zoneName: string;
  zoneCode: string;
  isExpressAvailable: boolean;
  expressAddonKobo: number;
}

export function calculateShippingFee({
  state,
  lagosZone = "lagos_mainland",
  subtotalKobo,
  isExpress = false,
}: ShippingCalculationParams): ShippingCalculationResult {
  const normalizedState = state.trim().toLowerCase();

  let matchedZone: ShippingZone | undefined;

  if (normalizedState === "lagos") {
    matchedZone = REGIONAL_SHIPPING_ZONES.find((z) => z.code === lagosZone) || REGIONAL_SHIPPING_ZONES[0];
  } else {
    matchedZone = REGIONAL_SHIPPING_ZONES.find((z) =>
      z.states.some((s) => s.toLowerCase() === normalizedState)
    );
  }

  // Fallback if state unrecognized
  if (!matchedZone) {
    matchedZone = REGIONAL_SHIPPING_ZONES[REGIONAL_SHIPPING_ZONES.length - 1]; // standard interstate
  }

  const isLagos = normalizedState === "lagos";
  const isExpressAvailable = isLagos;
  const expressAddon = isExpress && isExpressAvailable ? LAGOS_EXPRESS_ADDON_KOBO : 0;

  const originalFeeKobo = matchedZone.baseFeeKobo + expressAddon;
  const isFreeDelivery = subtotalKobo >= FREE_SHIPPING_THRESHOLD_KOBO;

  // Free delivery covers base standard shipping fee. Express add-on still applies if requested.
  const shippingFeeKobo = isFreeDelivery ? (isExpress ? expressAddon : 0) : originalFeeKobo;

  const amountNeeded = Math.max(0, FREE_SHIPPING_THRESHOLD_KOBO - subtotalKobo);
  const progressPercent = Math.min(100, Math.round((subtotalKobo / FREE_SHIPPING_THRESHOLD_KOBO) * 100));

  let deliverySla = matchedZone.deliverySla;
  if (isExpress && isExpressAvailable) {
    deliverySla = "Same-Day Priority (Within 4-6 Hours)";
  }

  return {
    shippingFeeKobo,
    originalFeeKobo,
    isFreeDelivery,
    amountNeededForFreeDeliveryKobo: amountNeeded,
    freeDeliveryProgressPercent: progressPercent,
    deliverySla,
    zoneName: matchedZone.name,
    zoneCode: matchedZone.code,
    isExpressAvailable,
    expressAddonKobo: expressAddon,
  };
}
