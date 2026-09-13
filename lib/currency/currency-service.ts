import { prisma } from "@/lib/db/prisma";

export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  exchange_rate_to_ngn: number;
  is_active: boolean;
}

export const DEFAULT_CURRENCIES: CurrencyConfig[] = [
  {
    code: "NGN",
    name: "Nigerian Naira",
    symbol: "₦",
    exchange_rate_to_ngn: 1.0,
    is_active: true,
  },
  {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    exchange_rate_to_ngn: 1550.0,
    is_active: true,
  },
  {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    exchange_rate_to_ngn: 1980.0,
    is_active: true,
  },
  {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    exchange_rate_to_ngn: 1680.0,
    is_active: true,
  },
];

export async function ensureDefaultCurrencies(): Promise<void> {
  const existingCount = await prisma.currencySetting.count();
  if (existingCount === 0) {
    for (const c of DEFAULT_CURRENCIES) {
      await prisma.currencySetting.upsert({
        where: { code: c.code },
        create: c,
        update: {},
      });
    }
  }
}

export function convertFromKobo(
  kobo: number,
  targetCurrency: string,
  rateToNgn: number
): { amount: number; formatted: string } {
  const nairaAmount = kobo / 100;

  if (targetCurrency === "NGN" || rateToNgn <= 0) {
    return {
      amount: nairaAmount,
      formatted: `₦${nairaAmount.toLocaleString("en-NG", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })}`,
    };
  }

  const foreignAmount = nairaAmount / rateToNgn;

  let symbol = "$";
  if (targetCurrency === "GBP") symbol = "£";
  if (targetCurrency === "EUR") symbol = "€";

  const formatted = `${symbol}${foreignAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return {
    amount: Math.round(foreignAmount * 100) / 100,
    formatted,
  };
}
