import type { SupabaseClient } from "@supabase/supabase-js";
import { isBefore, subDays } from "date-fns";
import { parseLocalYmd } from "@/lib/availability";

const NOTE_PREFIX = "__reservation_hold__:";

export function reservationHoldNote(reservationId: string): string {
  return `${NOTE_PREFIX}${reservationId}`;
}

function dateToLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Noches ocupadas: check_in (incl.) hasta la víspera de check_out (misma convención que rangeTouchesBooked).
 */
export function stayNightsToBlockedRange(
  checkInYmd: string,
  checkOutYmd: string
): { start_date: string; end_date: string } | null {
  const checkIn = parseLocalYmd(checkInYmd);
  const checkOut = parseLocalYmd(checkOutYmd);
  if (!isBefore(checkIn, checkOut)) return null;
  const lastNight = subDays(checkOut, 1);
  if (isBefore(lastNight, checkIn)) return null;
  return {
    start_date: dateToLocalYmd(checkIn),
    end_date: dateToLocalYmd(lastNight),
  };
}

export async function removeReservationHoldBlock(
  supabase: SupabaseClient,
  reservationId: string
): Promise<void> {
  const { error } = await supabase
    .from("blocked_date_ranges")
    .delete()
    .eq("note", reservationHoldNote(reservationId));
  if (error) {
    console.error("[reservation-hold-block] delete:", error.message);
  }
}

export async function syncReservationHoldBlock(
  supabase: SupabaseClient,
  reservationId: string,
  checkInYmd: string,
  checkOutYmd: string
): Promise<void> {
  await removeReservationHoldBlock(supabase, reservationId);
  const range = stayNightsToBlockedRange(checkInYmd, checkOutYmd);
  if (!range) return;

  const { error } = await supabase.from("blocked_date_ranges").insert({
    start_date: range.start_date,
    end_date: range.end_date,
    note: reservationHoldNote(reservationId),
  });
  if (error) {
    console.error("[reservation-hold-block] insert:", error.message);
  }
}
