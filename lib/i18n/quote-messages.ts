import type { Locale } from "./types";

export const quoteMessages: Record<
  Locale,
  {
    feb28: string;
    months30: string;
    weeks7: string;
    nightsOne: string;
    nightsMany: string;
  }
> = {
  en: {
    feb28: "28 nights in February (monthly rate)",
    months30: "{{n}} × 30 nights (monthly)",
    weeks7: "{{n}} × 7 nights (weekly)",
    nightsOne: "{{n}} night (daily rate)",
    nightsMany: "{{n}} nights (daily rate)",
  },
  es: {
    feb28: "28 noches en febrero (tarifa mensual)",
    months30: "{{n}} × 30 noches (mensual)",
    weeks7: "{{n}} × 7 noches (semanal)",
    nightsOne: "{{n}} noche (tarifa diaria)",
    nightsMany: "{{n}} noches (tarifa diaria)",
  },
};
