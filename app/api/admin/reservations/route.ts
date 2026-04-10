import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/admin-guard";
import { sendGuestReservationNotify } from "@/lib/email/guest-reservation-notify";
import { assertSameOrigin } from "@/lib/security/request-guards";
import {
  removeReservationHoldBlock,
  syncReservationHoldBlock,
} from "@/lib/booking/reservation-hold-block";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReservationRow = {
  id: string;
  booking_status: string;
  payment_status: string;
  total_amount: number;
  guest_name: string;
  guest_email: string;
  public_id: string;
  currency: string;
  notes: string | null;
  check_in: string;
  check_out: string;
};

function appendAdminCancellationNote(existing: string | null, message: string): string {
  const stamp = new Date().toISOString();
  const block = `\n\n--- Cancelación (admin, ${stamp}) ---\n${message}`;
  return `${(existing ?? "").trimEnd()}${block}`;
}

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  const supabase = createAdminSupabaseClient();
  let q = supabase
    .from("reservations")
    .select(
      "id, public_id, guest_name, guest_email, guest_phone, check_in, check_out, nights, guests, currency, total_amount, cleaning_fee, stay_type, contract_type, booking_status, payment_status, deposit_amount, contract_accepted_at, created_at, notes, payment_instructions"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (
    status &&
    ["draft", "pending_payment", "confirmed", "cancelled", "completed"].includes(status)
  ) {
    q = q.eq("booking_status", status);
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  const reservations = data ?? [];
  const ids = reservations.map((r: { id: string }) => r.id);
  const countMap = new Map<string, number>();
  if (ids.length > 0) {
    const { data: docRows, error: docErr } = await supabase
      .from("guest_reservation_documents")
      .select("reservation_id")
      .in("reservation_id", ids);
    if (!docErr && docRows) {
      for (const row of docRows) {
        const rid = String((row as { reservation_id: string }).reservation_id);
        countMap.set(rid, (countMap.get(rid) ?? 0) + 1);
      }
    }
  }

  const withCounts = reservations.map((r: { id: string }) => ({
    ...r,
    guest_document_count: countMap.get(r.id) ?? 0,
  }));

  return NextResponse.json({ reservations: withCounts });
}

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
  if (!reservationId) {
    return NextResponse.json({ error: "reservationId is required." }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action.trim() : "";
  const status = typeof body.status === "string" ? body.status.trim() : "";

  if (action && status) {
    return NextResponse.json(
      { error: "Send either action or status, not both." },
      { status: 400 }
    );
  }

  const supabase = createAdminSupabaseClient();
  const { data: reservation, error: fetchErr } = await supabase
    .from("reservations")
    .select(
      "id, booking_status, payment_status, total_amount, guest_name, guest_email, public_id, currency, notes, check_in, check_out"
    )
    .eq("id", reservationId)
    .single();

  if (fetchErr || !reservation) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  const row = reservation as ReservationRow;
  const currency: "MXN" | "USD" = row.currency === "USD" ? "USD" : "MXN";
  const now = new Date().toISOString();

  if (action === "confirm_stay") {
    const bs = row.booking_status;
    if (bs === "cancelled" || bs === "completed") {
      return NextResponse.json({ error: "Cannot confirm a cancelled or completed reservation." }, { status: 400 });
    }
    if (bs === "confirmed") {
      return NextResponse.json({ error: "Stay is already confirmed." }, { status: 400 });
    }
    const nextPayment =
      row.payment_status === "draft" ? "pending_payment" : row.payment_status;

    const { error: upErr } = await supabase
      .from("reservations")
      .update({
        booking_status: "confirmed",
        payment_status: nextPayment,
        updated_at: now,
      })
      .eq("id", reservationId);
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 502 });
    }

    await syncReservationHoldBlock(
      supabase,
      reservationId,
      String(row.check_in ?? ""),
      String(row.check_out ?? "")
    );

    await sendGuestReservationNotify({
      request,
      kind: "stay_confirmed",
      guestName: row.guest_name,
      guestEmail: row.guest_email,
      publicId: row.public_id,
      reservationId,
      currency,
    });

    return NextResponse.json({ ok: true });
  }

  if (action === "confirm_payment") {
    const bs = row.booking_status;
    if (bs !== "confirmed" && bs !== "completed") {
      return NextResponse.json(
        { error: "Confirm the stay first before marking payment." },
        { status: 400 }
      );
    }
    const ps = row.payment_status;
    if (ps === "cancelled") {
      return NextResponse.json({ error: "Reservation payment is cancelled." }, { status: 400 });
    }
    if (ps === "confirmed") {
      return NextResponse.json({ error: "Payment is already confirmed." }, { status: 400 });
    }

    const { error: upErr } = await supabase
      .from("reservations")
      .update({
        payment_status: "confirmed",
        updated_at: now,
      })
      .eq("id", reservationId);
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 502 });
    }

    const { data: payRow } = await supabase
      .from("payments")
      .select("id")
      .eq("reservation_id", reservationId)
      .maybeSingle();

    if (payRow?.id) {
      const { error: payErr } = await supabase
        .from("payments")
        .update({
          status: "confirmed",
          confirmed_at: now,
          confirmed_by: auth.userId,
          updated_at: now,
        })
        .eq("id", payRow.id);
      if (payErr) {
        return NextResponse.json({ error: payErr.message }, { status: 502 });
      }
    } else {
      const { error: insErr } = await supabase.from("payments").insert({
        reservation_id: reservationId,
        method: "bank_transfer",
        status: "confirmed",
        amount: row.total_amount,
        confirmed_at: now,
        confirmed_by: auth.userId,
        updated_at: now,
      });
      if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 502 });
      }
    }

    await sendGuestReservationNotify({
      request,
      kind: "payment_confirmed",
      guestName: row.guest_name,
      guestEmail: row.guest_email,
      publicId: row.public_id,
      reservationId,
      currency,
    });

    return NextResponse.json({ ok: true });
  }

  if (action) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  if (!status) {
    return NextResponse.json({ error: "Missing status or action." }, { status: 400 });
  }

  if (status === "confirmed") {
    return NextResponse.json(
      { error: "Use action confirm_stay or confirm_payment instead of status confirmed." },
      { status: 400 }
    );
  }

  if (status === "cancelled") {
    const cancellationMessage = String(body.cancellationMessage ?? "").trim();
    if (cancellationMessage.length < 3) {
      return NextResponse.json(
        {
          error:
            "cancellationMessage is required when cancelling (at least 3 characters).",
        },
        { status: 400 }
      );
    }
    if (cancellationMessage.length > 8000) {
      return NextResponse.json({ error: "cancellationMessage is too long." }, { status: 400 });
    }

    const newNotes = appendAdminCancellationNote(row.notes, cancellationMessage);

    const { error: upRes } = await supabase
      .from("reservations")
      .update({
        booking_status: "cancelled",
        payment_status: "cancelled",
        notes: newNotes,
        updated_at: now,
      })
      .eq("id", reservationId);
    if (upRes) {
      return NextResponse.json({ error: upRes.message }, { status: 502 });
    }

    await removeReservationHoldBlock(supabase, reservationId);

    await supabase
      .from("payments")
      .update({
        status: "cancelled",
        confirmed_at: null,
        confirmed_by: null,
        updated_at: now,
      })
      .eq("reservation_id", reservationId);

    await sendGuestReservationNotify({
      request,
      kind: "cancelled",
      guestName: row.guest_name,
      guestEmail: row.guest_email,
      publicId: row.public_id,
      reservationId,
      currency,
      cancellationMessage,
    });

    return NextResponse.json({ ok: true });
  }

  if (!["draft", "pending_payment", "completed"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const wasCompleted = row.booking_status === "completed";
  const nextPaymentStatus =
    status === "completed"
      ? row.payment_status === "cancelled"
        ? "cancelled"
        : "confirmed"
      : status;

  const { error } = await supabase
    .from("reservations")
    .update({
      booking_status: status,
      payment_status: nextPaymentStatus,
      updated_at: now,
    })
    .eq("id", reservationId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  await supabase
    .from("payments")
    .update(
      status === "completed"
        ? {
            status: nextPaymentStatus,
            updated_at: now,
          }
        : {
            status: nextPaymentStatus,
            confirmed_at: null,
            confirmed_by: null,
            updated_at: now,
          }
    )
    .eq("reservation_id", reservationId);

  if (status === "completed" && !wasCompleted) {
    await sendGuestReservationNotify({
      request,
      kind: "stay_completed_survey",
      guestName: row.guest_name,
      guestEmail: row.guest_email,
      publicId: row.public_id,
      reservationId,
      currency,
    });
  }

  return NextResponse.json({ ok: true });
}
