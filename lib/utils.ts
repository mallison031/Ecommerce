import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format integer kobo into standard Nigerian Naira string: e.g. 150000 -> ₦1,500.00
 */
export function formatKoboToNaira(kobo: number): string {
  const naira = kobo / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(naira);
}

/**
 * Clean and format a local Nigerian phone number into standard E.164 (+234...)
 */
export function formatToE164(phone: string): string {
  const cleaned = phone.replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  if (cleaned.startsWith("234")) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith("0")) {
    return `+234${cleaned.slice(1)}`;
  }
  return `+234${cleaned}`;
}
