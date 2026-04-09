import { NextResponse } from "next/server";
import { requireGuestUser } from "@/lib/auth/guest-guard";
import { redactReservationForGuestResponse } from "@/lib/guest/reservation-redact";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireGuestUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const supabase = createAdminSupabaseClient();
  const columns =
    "id, public_id, check_in, check_out, nights, guests, currency, total_amount, cleaning_fee, stay_type, contract_type, booking_status, payment_status, deposit_amount, contract_accepted_at, payment_instructions, checkin_instructions, created_at";

  const emailNorm = auth.email.trim().toLowerCase();

  const [byUser, unclaimedByEmail] = await Promise.all([
    supabase
      .from("reservations")
      .select(columns)
      .eq("guest_user_id", auth.userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("reservations")
      .select(columns)
      .is("guest_user_id", null)
      .ilike("guest_email", emailNorm)
      .order("created_at", { ascending: false }),
  ]);

  if (byUser.error) {
    return NextResponse.json({ error: byUser.error.message }, { status: 502 });
  }
  if (unclaimedByEmail.error) {
    return NextResponse.json(
      { error: unclaimedByEmail.error.message },
      { status: 502 }
    );
  }

  const merged = new Map<string, (typeof byUser.data)[number]>();
  for (const row of byUser.data ?? []) {
    if (row?.id) merged.set(row.id, row);
  }
  for (const row of unclaimedByEmail.data ?? []) {
    if (row?.id && !merged.has(row.id)) merged.set(row.id, row);
  }
  const reservations = Array.from(merged.values())
    .map((r) => redactReservationForGuestResponse(r))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  return NextResponse.json({ reservations });
}
