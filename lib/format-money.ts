import type { CurrencyCode } from "@/lib/i18n/types";

export function formatMoneyAmount(amount: number, currency: CurrencyCode): string {
  const localeTag = currency === "MXN" ? "es-MX" : "en-US";
  return new Intl.NumberFormat(localeTag, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
