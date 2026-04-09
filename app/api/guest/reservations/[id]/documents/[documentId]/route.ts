import { NextResponse } from "next/server";
import { requireGuestUser } from "@/lib/auth/guest-guard";
import { guestCanAccessReservation } from "@/lib/guest/reservation-access";
import { assertSameOrigin } from "@/lib/security/request-guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "guest-documents";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; documentId: string } }
) {
  const originErr = assertSameOrigin(request);
  if (originErr) return originErr;

  const auth = await requireGuestUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const reservationId = String(params.id ?? "").trim();
  const documentId = String(params.documentId ?? "").trim();
  if (!reservationId || !documentId) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createAdminSupabaseClient();
  } catch {
    return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
  }

  const { data: resRow, error: resErr } = await supabase
    .from("reservations")
    .select("id, guest_user_id, guest_email, booking_status")
    .eq("id", reservationId)
    .single();

  if (resErr || !resRow) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }
  if (!guestCanAccessReservation(resRow, auth.userId, auth.email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (resRow.booking_status === "cancelled") {
    return NextResponse.json({ error: "Reservation is cancelled." }, { status: 400 });
  }

  const { data: doc, error: docErr } = await supabase
    .from("guest_reservation_documents")
    .select("id, storage_path, guest_user_id, reservation_id")
    .eq("id", documentId)
    .maybeSingle();

  if (docErr || !doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }
  if (doc.reservation_id !== reservationId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (doc.guest_user_id !== auth.userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { error: rmErr } = await supabase.storage.from(BUCKET).remove([doc.storage_path]);
  if (rmErr) {
    return NextResponse.json({ error: rmErr.message }, { status: 502 });
  }

  const { error: delErr } = await supabase
    .from("guest_reservation_documents")
    .delete()
    .eq("id", documentId);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
