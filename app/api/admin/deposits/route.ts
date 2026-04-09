import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/admin-guard";
import { assertSameOrigin } from "@/lib/security/request-guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const originErr = assertSameOrigin(request);
  if (originErr) return originErr;

  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (typeof raw !== "object" || raw === null) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const body = raw as Record<string, unknown>;
  const reservationId = String(body.reservationId ?? "").trim();
  const status = String(body.status ?? "").trim() as
    | "received"
    | "returned"
    | "partially_withheld";
  const withheldAmount = Number(body.withheldAmount ?? 0);
  if (!reservationId) {
    return NextResponse.json({ error: "reservationId is required." }, { status: 400 });
  }
  if (!["received", "returned", "partially_withheld"].includes(status)) {
    return NextResponse.json({ error: "Invalid deposit status." }, { status: 400 });
  }
  if (!Number.isFinite(withheldAmount) || withheldAmount < 0) {
    return NextResponse.json({ error: "Invalid withheld amount." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { data: reservation, error: resErr } = await supabase
    .from("reservations")
    .select("deposit_amount")
    .eq("id", reservationId)
    .single();
  if (resErr || !reservation) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }
  const amount = Number(reservation.deposit_amount ?? 0);
  if (amount <= 0) {
    return NextResponse.json(
      { error: "This reservation has no security deposit." },
      { status: 400 }
    );
  }
  if (withheldAmount > amount) {
    return NextResponse.json(
      { error: "Withheld amount cannot exceed deposit amount." },
      { status: 400 }
    );
  }

  const payload = {
    reservation_id: reservationId,
    amount,
    status,
    withheld_amount: status === "partially_withheld" ? Math.round(withheldAmount) : 0,
    received_at:
      status === "received" || status === "partially_withheld"
        ? new Date().toISOString()
        : null,
    returned_at: status === "returned" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("deposits").upsert(payload, {
    onConflict: "reservation_id",
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
