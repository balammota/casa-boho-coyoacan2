import {
  addDays,
  eachDayOfInterval,
  isBefore,
  startOfDay,
} from "date-fns";

export type BookedRange = { from: Date; to: Date };

/**
 * Parsea fecha de API (YYYY-MM-DD o ISO con hora) en día local de calendario.
 */
export function parseLocalYmd(ymd: string): Date {
  const raw = String(ymd).trim();
  const ymdPart = raw.length >= 10 ? raw.slice(0, 10) : raw;
  const [y, m, d] = ymdPart.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return startOfDay(new Date(raw));
  }
  return startOfDay(new Date(y, m - 1, d));
}

export function bookedRangesFromApi(
  rows: { start_date?: string | null; end_date?: string | null }[]
): BookedRange[] {
  return rows
    .filter(
      (r) =>
        r.start_date != null &&
        r.end_date != null &&
        String(r.start_date).length > 0 &&
        String(r.end_date).length > 0
    )
    .map((r) => ({
      from: parseLocalYmd(String(r.start_date)),
      to: parseLocalYmd(String(r.end_date)),
    }));
}

function normalizeRange(range: BookedRange): { start: Date; end: Date } {
  return {
    start: startOfDay(range.from),
    end: startOfDay(range.to),
  };
}

/** Día marcado como no disponible para check-in / estancia. */
export function isBookedDay(date: Date, ranges: BookedRange[]): boolean {
  const d = startOfDay(date);
  return ranges.some((range) => {
    const { start, end } = normalizeRange(range);
    return !isBefore(d, start) && !isBefore(end, d);
  });
}

/** Alguna noche entre check-in (incl.) y check-out (excl.) cae en día ocupado. */
export function rangeTouchesBooked(
  checkIn: Date,
  checkOut: Date,
  ranges: BookedRange[]
): boolean {
  const start = startOfDay(checkIn);
  const end = startOfDay(checkOut);
  if (!isBefore(start, end)) return true;
  const days = eachDayOfInterval({ start, end: addDays(end, -1) });
  return days.some((d) => isBookedDay(d, ranges));
}
