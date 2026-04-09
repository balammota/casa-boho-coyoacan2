import { differenceInCalendarDays } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireGuestUser } from "@/lib/auth/guest-guard";
import { guestMayCancelByLeadTime } from "@/lib/dates/ymd-local";
import { buildContractText } from "@/lib/reservations/contracts";
import { getLongStayPaymentInstructions } from "@/lib/reservations/long-stay-payment-instructions";
import { getShortStayPaymentInstructions } from "@/lib/reservations/short-stay-payment-instructions";
import { assertSameOrigin } from "@/lib/security/request-guards";
import { notifyHostGuestCancelled } from "@/lib/email/notify-host-guest-cancel";
import { redactReservationForGuestResponse } from "@/lib/guest/reservation-redact";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FinalizeSchema = z.object({
  paymentMethod: z.enum(["bank_transfer", "cash_payment"]),
  contractAccepted: z.literal(true),
  locale: z.enum(["es", "en"]).optional(),
});

const CancelBodySchema = z.object({ action: z.literal("cancel") });

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireGuestUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const reservationId = String(params.id ?? "").trim();
  if (!reservationId) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("reservations")
    .select(
      "id, public_id, guest_user_id, guest_name, guest_email, guest_phone, check_in, check_out, nights, guests, currency, total_amount, cleaning_fee, stay_type, contract_type, booking_status, payment_status, deposit_amount, contract_accepted_at, payment_instructions, checkin_instructions, notes, created_at"
    )
    .eq("id", reservationId)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }
  if (data.guest_user_id && data.guest_user_id !== auth.userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (!data.guest_user_id) {
    const rEmail = String(data.guest_email ?? "").trim().toLowerCase();
    if (rEmail !== auth.email.trim().toLowerCase()) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  }
  return NextResponse.json({
    reservation: redactReservationForGuestResponse(data),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const originErr = assertSameOrigin(request);
  if (originErr) return originErr;

  const auth = await requireGuestUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const reservationId = String(params.id ?? "").trim();
  if (!reservationId) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const raw = await request.json().catch(() => null);
  const cancelParsed = CancelBodySchema.safeParse(raw);

  const supabase = createAdminSupabaseClient();
  const { data: reservation, error: rError } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", reservationId)
    .single();
  if (rError || !reservation) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  if (
    reservation.guest_user_id &&
    reservation.guest_user_id !== auth.userId
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (reservation.guest_email?.toLowerCase() !== auth.email.toLowerCase()) {
    return NextResponse.json(
      { error: "Reservation email does not match your account email." },
      { status: 403 }
    );
  }

  if (cancelParsed.success) {
    const status = String(reservation.booking_status ?? "");
    if (status === "cancelled") {
      return NextResponse.json({ error: "Already cancelled." }, { status: 400 });
    }
    if (status === "completed") {
      return NextResponse.json({ error: "Cannot cancel a completed stay." }, { status: 400 });
    }
    if (!guestMayCancelByLeadTime(String(reservation.check_in ?? ""))) {
      return NextResponse.json(
        { error: "Cancellation is not allowed within 7 days of check-in." },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    const { error: cancelErr } = await supabase
      .from("reservations")
      .update({
        booking_status: "cancelled",
        payment_status: "cancelled",
        updated_at: now,
      })
      .eq("id", reservationId);
    if (cancelErr) {
      return NextResponse.json({ error: cancelErr.message }, { status: 502 });
    }

    await supabase
      .from("payments")
      .update({
        status: "cancelled",
        updated_at: now,
      })
      .eq("reservation_id", reservationId);

    await notifyHostGuestCancelled({
      request,
      reservationId,
      publicId: String(reservation.public_id ?? ""),
      guestName: String(reservation.guest_name ?? ""),
      guestEmail: String(reservation.guest_email ?? ""),
      guestPhone: String(reservation.guest_phone ?? ""),
      checkIn: String(reservation.check_in ?? ""),
      checkOut: String(reservation.check_out ?? ""),
      currency: String(reservation.currency ?? "MXN"),
      totalAmount: Number(reservation.total_amount ?? 0),
    });

    return NextResponse.json({ ok: true });
  }

  const parsed = FinalizeSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const nights = differenceInCalendarDays(
    new Date(reservation.check_out),
    new Date(reservation.check_in)
  );
  if (nights < 1) {
    return NextResponse.json({ error: "Invalid reservation dates." }, { status: 400 });
  }

  const acceptedAt = new Date().toISOString();
  const uiLocale = body.locale === "en" ? "en" : "es";
  const paymentInstructions =
    reservation.contract_type === "long_stay_contract"
      ? getLongStayPaymentInstructions(uiLocale)
      : getShortStayPaymentInstructions(uiLocale);
  const contractText = buildContractText({
    contractType: reservation.contract_type,
    guestName: reservation.guest_name,
    guestEmail: reservation.guest_email,
    guestPhone: reservation.guest_phone,
    checkIn: reservation.check_in,
    checkOut: reservation.check_out,
    nights: reservation.nights,
    totalAmount: reservation.total_amount,
    currency: reservation.currency,
    depositAmount: reservation.deposit_amount,
    publicId: reservation.public_id,
    documentDateIso: acceptedAt,
  });

  const { error: updateErr } = await supabase
    .from("reservations")
    .update({
      guest_user_id: auth.userId,
      booking_status: "pending_payment",
      payment_status: "pending_payment",
      contract_accepted_at: acceptedAt,
      payment_instructions: paymentInstructions,
      updated_at: acceptedAt,
    })
    .eq("id", reservationId);
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 502 });
  }

  // Sync guest profile from contact form data captured in reservation.
  const { error: userProfileErr } = await supabase.from("users").upsert({
    id: auth.userId,
    email: auth.email,
    full_name: reservation.guest_name ?? null,
    phone: reservation.guest_phone ?? null,
    updated_at: acceptedAt,
  });
  if (userProfileErr) {
    return NextResponse.json({ error: userProfileErr.message }, { status: 502 });
  }

  const [{ error: contractErr }, paymentLookup] = await Promise.all([
    supabase.from("contracts").upsert(
      {
        reservation_id: reservationId,
        contract_type: reservation.contract_type,
        accepted: true,
        accepted_at: acceptedAt,
        content: contractText,
        updated_at: acceptedAt,
      },
      { onConflict: "reservation_id" }
    ),
    supabase
      .from("payments")
      .select("id")
      .eq("reservation_id", reservationId)
      .maybeSingle(),
  ]);
  let paymentErr: { message?: string } | null = null;
  if (!paymentLookup.error && paymentLookup.data?.id) {
    const { error } = await supabase
      .from("payments")
      .update({
        method: body.paymentMethod,
        status: "pending_payment",
        amount: reservation.total_amount,
        updated_at: acceptedAt,
      })
      .eq("id", paymentLookup.data.id);
    paymentErr = error;
  } else {
    const { error } = await supabase.from("payments").insert({
      reservation_id: reservationId,
      method: body.paymentMethod,
      status: "pending_payment",
      amount: reservation.total_amount,
      updated_at: acceptedAt,
    });
    paymentErr = error;
  }

  if (contractErr || paymentErr) {
    return NextResponse.json(
      { error: contractErr?.message || paymentErr?.message || "Finalize failed." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
