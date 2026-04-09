import { differenceInCalendarDays } from "date-fns";
import { NextResponse } from "next/server";
import { calculateStayPrice, type StayRates } from "@/lib/pricing";
import { buildContractText } from "@/lib/reservations/contracts";
import { getLongStayPaymentInstructions } from "@/lib/reservations/long-stay-payment-instructions";
import { getShortStayPaymentInstructions } from "@/lib/reservations/short-stay-payment-instructions";
import { classifyStay, ReservationCreateSchema } from "@/lib/reservations/types";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { assertSameOrigin, getClientIp } from "@/lib/security/request-guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PricingRow = {
  night_rate: number;
  week_rate: number;
  month_rate: number;
  night_rate_usd?: number | null;
  week_rate_usd?: number | null;
  month_rate_usd?: number | null;
  min_stay_nights?: number | null;
};

function ymdToLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function mkPublicId() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `RSV-${y}${m}-${rnd}`;
}

export async function POST(request: Request) {
  const originErr = assertSameOrigin(request);
  if (originErr) return originErr;

  const ip = getClientIp(request);
  const limit = consumeRateLimit(`reservation:${ip}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = ReservationCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid reservation payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const body = parsed.data;
  if (body.website.trim().length > 0) return NextResponse.json({ ok: true });

  const checkInDate = ymdToLocalDate(body.checkIn);
  const checkOutDate = ymdToLocalDate(body.checkOut);
  const nights = differenceInCalendarDays(checkOutDate, checkInDate);
  if (nights <= 0 || nights > 365) {
    return NextResponse.json({ error: "Invalid stay range." }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createAdminSupabaseClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server not configured." },
      { status: 500 }
    );
  }

  const { data: pricing, error: pricingError } = await supabase
    .from("pricing_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (pricingError || !pricing) {
    return NextResponse.json({ error: "Pricing is not available." }, { status: 503 });
  }

  const row = pricing as PricingRow;
  const minStayNights =
    typeof row.min_stay_nights === "number" && row.min_stay_nights >= 1
      ? row.min_stay_nights
      : 2;
  if (nights < minStayNights) {
    return NextResponse.json(
      { error: `Minimum stay is ${minStayNights} nights.` },
      { status: 400 }
    );
  }

  const rates: StayRates =
    body.currency === "USD"
      ? {
          night: row.night_rate_usd ?? 55,
          week: row.week_rate_usd ?? 300,
          month: row.month_rate_usd ?? 1100,
        }
      : {
          night: row.night_rate,
          week: row.week_rate,
          month: row.month_rate,
        };

  const quote = calculateStayPrice(checkInDate, checkOutDate, rates);
  const { stayType, contractType } = classifyStay(quote.nights);
  const depositAmount = stayType === "long_stay" ? rates.month : 0;
  const publicId = mkPublicId();
  const acceptedAt = new Date().toISOString();
  const uiLocale = body.locale === "en" ? "en" : "es";
  const paymentInstructionsInsert =
    contractType === "long_stay_contract"
      ? getLongStayPaymentInstructions(uiLocale)
      : getShortStayPaymentInstructions(uiLocale);

  const contractText = buildContractText({
    contractType,
    guestName: body.name,
    guestEmail: body.email,
    guestPhone: body.phone,
    checkIn: body.checkIn,
    checkOut: body.checkOut,
    nights: quote.nights,
    totalAmount: quote.total,
    currency: body.currency,
    depositAmount,
    publicId,
    documentDateIso: acceptedAt,
  });

  const { data: createdReservation, error: resError } = await supabase
    .from("reservations")
    .insert({
      public_id: publicId,
      guest_name: body.name,
      guest_email: body.email,
      guest_phone: body.phone,
      check_in: body.checkIn,
      check_out: body.checkOut,
      nights: quote.nights,
      guests: body.guests,
      currency: body.currency,
      total_amount: quote.total,
      cleaning_fee: 0,
      stay_type: stayType,
      contract_type: contractType,
      booking_status: "pending_payment",
      payment_status: "pending_payment",
      deposit_amount: depositAmount,
      contract_accepted_at: acceptedAt,
      notes: body.message || null,
      payment_instructions: paymentInstructionsInsert,
    })
    .select("id, public_id, stay_type, contract_type, payment_status, deposit_amount, total_amount, currency, check_in, check_out")
    .single();

  if (resError || !createdReservation) {
    return NextResponse.json(
      { error: "Could not create reservation." },
      { status: 502 }
    );
  }

  const reservationId = createdReservation.id as string;

  const [{ error: contractErr }, { error: paymentErr }] = await Promise.all([
    supabase.from("contracts").insert({
      reservation_id: reservationId,
      contract_type: contractType,
      accepted: true,
      accepted_at: acceptedAt,
      content: contractText,
    }),
    supabase.from("payments").insert({
      reservation_id: reservationId,
      method: body.paymentMethod,
      status: "pending_payment",
      amount: quote.total,
    }),
  ]);

  if (contractErr || paymentErr) {
    await supabase.from("reservations").delete().eq("id", reservationId);
    return NextResponse.json(
      { error: "Could not persist reservation details." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    reservation: createdReservation,
  });
}
