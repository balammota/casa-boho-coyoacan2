import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  startOfDay,
} from "date-fns";

export const DEFAULT_RATES_MXN = {
  night: 1000,
  week: 5500,
  month: 20000,
} as const;

export const DEFAULT_RATES_USD = {
  night: 55,
  week: 300,
  month: 1100,
} as const;

export type StayRates = {
  night: number;
  week: number;
  month: number;
};

export type QuoteLine =
  | { kind: "feb28"; amount: number }
  | { kind: "months30"; count: number; amount: number }
  | { kind: "weeks7"; count: number; amount: number }
  | { kind: "nightsDaily"; count: number; amount: number };

export type StayQuote = {
  nights: number;
  total: number;
  lines: QuoteLine[];
};

export type PriceBreakdownLine = { label: string; amount: number };

export const RATE_NIGHT = DEFAULT_RATES_MXN.night;
export const RATE_WEEK = DEFAULT_RATES_MXN.week;
export const RATE_MONTH = DEFAULT_RATES_MXN.month;

function isEveryNightInFebruary(checkIn: Date, checkOut: Date): boolean {
  const start = startOfDay(checkIn);
  const end = startOfDay(checkOut);
  if (differenceInCalendarDays(end, start) <= 0) return false;
  const nights = eachDayOfInterval({
    start,
    end: addDays(end, -1),
  });
  return nights.length > 0 && nights.every((d) => d.getMonth() === 1);
}

export function calculateStayPrice(
  checkIn: Date,
  checkOut: Date,
  rates: StayRates
): StayQuote {
  const nights = differenceInCalendarDays(
    startOfDay(checkOut),
    startOfDay(checkIn)
  );
  if (nights <= 0) {
    return { nights: 0, total: 0, lines: [] };
  }

  const lines: QuoteLine[] = [];

  if (nights === 28 && isEveryNightInFebruary(checkIn, checkOut)) {
    lines.push({ kind: "feb28", amount: rates.month });
    return { nights, total: rates.month, lines };
  }

  let remaining = nights;

  const months30 = Math.floor(remaining / 30);
  if (months30 > 0) {
    const amount = months30 * rates.month;
    lines.push({ kind: "months30", count: months30, amount });
    remaining -= months30 * 30;
  }

  const weeks7 = Math.floor(remaining / 7);
  if (weeks7 > 0) {
    const amount = weeks7 * rates.week;
    lines.push({ kind: "weeks7", count: weeks7, amount });
    remaining -= weeks7 * 7;
  }

  if (remaining > 0) {
    lines.push({
      kind: "nightsDaily",
      count: remaining,
      amount: remaining * rates.night,
    });
  }

  const total = lines.reduce((s, l) => s + l.amount, 0);
  return { nights, total, lines };
}

/** Cotización con etiquetas ya resueltas (p. ej. mailto o email Resend). */
export function quoteToLabeledBreakdown(
  quote: StayQuote,
  formatLine: (line: QuoteLine) => string
): PriceBreakdownLine[] {
  return quote.lines.map((line) => ({
    label: formatLine(line),
    amount: line.amount,
  }));
}
