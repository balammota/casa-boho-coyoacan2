import { differenceInCalendarDays, startOfToday } from "date-fns";

/** Parse YYYY-MM-DD as a calendar date in the local timezone. */
export function ymdToLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Calendar days from start of today (local) to check-in (local). */
export function calendarDaysUntilCheckIn(checkInYmd: string): number {
  return differenceInCalendarDays(ymdToLocalDate(checkInYmd), startOfToday());
}

/** Hide / disallow guest self-cancel when check-in is this many days away or sooner. */
export const GUEST_CANCEL_LEAD_DAYS_CUTOFF = 7;

export function guestMayCancelByLeadTime(checkInYmd: string): boolean {
  return calendarDaysUntilCheckIn(checkInYmd) > GUEST_CANCEL_LEAD_DAYS_CUTOFF;
}
