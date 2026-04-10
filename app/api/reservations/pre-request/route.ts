import { differenceInCalendarDays } from "date-fns";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { calculateStayPrice, type StayRates } from "@/lib/pricing";
import { classifyStay } from "@/lib/reservations/types";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { assertSameOrigin, getClientIp } from "@/lib/security/request-guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PreRequestSchema = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(6).max(80),
  message: z.string().trim().max(5000).optional().default(""),
  guests: z.number().int().min(1).max(20),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  locale: z.enum(["es", "en"]).optional(),
  currency: z.enum(["MXN", "USD"]),
  website: z.string().optional().default(""),
});

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendGuestPortalEmail(args: {
  requestUrl: string;
  reservationId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  language: "es" | "en";
  existingAccount: boolean;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) return;

  const origin = new URL(args.requestUrl).origin;
  const signUpUrl = new URL("/guest/register", origin);
  signUpUrl.searchParams.set("reservation", args.reservationId);
  signUpUrl.searchParams.set("name", args.guestName);
  signUpUrl.searchParams.set("email", args.guestEmail);
  signUpUrl.searchParams.set("phone", args.guestPhone);
  signUpUrl.searchParams.set("lang", args.language);

  const signInUrl = new URL("/guest/login", origin);
  signInUrl.searchParams.set("reservation", args.reservationId);
  signInUrl.searchParams.set("lang", args.language);

  const resend = new Resend(apiKey);
  const isEs = args.language === "es";
  const subject =
    args.existingAccount && isEs
      ? "Inicia sesion para continuar tu reservacion - Casa Boho Coyoacan"
      : args.existingAccount && !isEs
        ? "Sign in to continue your reservation - Casa Boho Coyoacan"
        : isEs
          ? "Completa tu registro - Casa Boho Coyoacan"
          : "Complete your sign up - Casa Boho Coyoacan";
  const text =
    args.existingAccount && isEs
      ? [
          `Hola ${args.guestName},`,
          "",
          "Recibimos tu solicitud. Detectamos que ya tienes cuenta, asi que continua iniciando sesion aqui:",
          signInUrl.toString(),
          "",
          "Equipo Casa Boho Coyoacan",
        ].join("\n")
      : args.existingAccount && !isEs
        ? [
            `Hi ${args.guestName},`,
            "",
            "We received your request. We found your account, so please continue by signing in here:",
            signInUrl.toString(),
            "",
            "Casa Boho Coyoacan team",
          ].join("\n")
        : isEs
          ? [
              `Hola ${args.guestName},`,
              "",
              "Recibimos tu solicitud. Para continuar con tu reservacion, crea tu cuenta con este enlace:",
              signUpUrl.toString(),
              "",
              "Tu nombre, telefono y email ya vienen precargados; solo te pediremos definir tu contrasena.",
              "",
              "Si ya tienes cuenta, inicia sesion aqui:",
              signInUrl.toString(),
              "",
              "Equipo Casa Boho Coyoacan",
            ].join("\n")
          : [
              `Hi ${args.guestName},`,
              "",
              "We received your request. To continue your reservation, create your account here:",
              signUpUrl.toString(),
              "",
              "Your name, phone, and email are pre-filled, so you only need to set your password.",
              "",
              "If you already have an account, sign in here:",
              signInUrl.toString(),
              "",
              "Casa Boho Coyoacan team",
            ].join("\n");
  const html =
    args.existingAccount && isEs
      ? `
    <h2>Casa Boho Coyoacan</h2>
    <p>Hola ${escapeHtml(args.guestName)},</p>
    <p>Recibimos tu solicitud. Detectamos que ya tienes cuenta, asi que continua iniciando sesion aqui:</p>
    <p><a href="${escapeHtml(signInUrl.toString())}">Iniciar sesion</a></p>
  `.trim()
      : args.existingAccount && !isEs
        ? `
    <h2>Casa Boho Coyoacan</h2>
    <p>Hi ${escapeHtml(args.guestName)},</p>
    <p>We received your request. We found your account, so please continue by signing in here:</p>
    <p><a href="${escapeHtml(signInUrl.toString())}">Sign in</a></p>
  `.trim()
        : isEs
          ? `
    <h2>Casa Boho Coyoacan</h2>
    <p>Hola ${escapeHtml(args.guestName)},</p>
    <p>Recibimos tu solicitud. Para continuar con tu reservacion, crea tu cuenta con este enlace:</p>
    <p><a href="${escapeHtml(signUpUrl.toString())}">Crear cuenta y continuar</a></p>
    <p>Tu nombre, telefono y email ya vienen precargados; solo te pediremos definir tu contrasena.</p>
    <p>Si ya tienes cuenta: <a href="${escapeHtml(signInUrl.toString())}">Iniciar sesion</a></p>
  `.trim()
          : `
    <h2>Casa Boho Coyoacan</h2>
    <p>Hi ${escapeHtml(args.guestName)},</p>
    <p>We received your request. To continue your reservation, create your account here:</p>
    <p><a href="${escapeHtml(signUpUrl.toString())}">Create account and continue</a></p>
    <p>Your name, phone, and email are pre-filled, so you only need to set your password.</p>
    <p>If you already have an account: <a href="${escapeHtml(signInUrl.toString())}">Sign in</a></p>
  `.trim();

  await resend.emails.send({
    from,
    to: [args.guestEmail],
    subject,
    text,
    html,
  });
}

async function sendHostInquiryEmail(args: {
  requestUrl: string;
  reservationId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  message: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  currency: "MXN" | "USD";
  total: number;
  publicId: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const to = process.env.BOOKING_INBOX_EMAIL?.trim();
  if (!apiKey || !from || !to) return;

  const fmt = new Intl.NumberFormat(args.currency === "USD" ? "en-US" : "es-MX", {
    style: "currency",
    currency: args.currency,
    maximumFractionDigits: 0,
  });
  const total = fmt.format(args.total);
  const msg = args.message.trim();
  const resend = new Resend(apiKey);
  const adminLink = `${new URL(args.requestUrl).origin}/admin/reservations/${args.reservationId}`;

  const text = [
    "Nueva solicitud inicial (inquiry) — Casa Boho Coyoacan",
    "",
    `Codigo: ${args.publicId}`,
    `Nombre: ${args.guestName}`,
    `Email: ${args.guestEmail}`,
    `Telefono: ${args.guestPhone}`,
    ...(msg ? ["", "Mensaje:", msg] : []),
    "",
    "---",
    `Check-in: ${args.checkIn}`,
    `Check-out: ${args.checkOut}`,
    `Noches: ${args.nights}`,
    `Huespedes: ${args.guests}`,
    `Total estimado: ${total} (${args.currency})`,
    "",
    `Ver solicitud en admin: ${adminLink}`,
    "",
    `Responde a este correo para contactar a ${args.guestEmail}.`,
  ].join("\n");

  const html = `
    <h2>Casa Boho Coyoacan</h2>
    <p><strong>Nueva solicitud inicial (inquiry)</strong></p>
    <p>
      <strong>Codigo:</strong> ${escapeHtml(args.publicId)}<br/>
      <strong>Nombre:</strong> ${escapeHtml(args.guestName)}<br/>
      <strong>Email:</strong> <a href="mailto:${escapeHtml(args.guestEmail)}">${escapeHtml(args.guestEmail)}</a><br/>
      <strong>Telefono:</strong> ${escapeHtml(args.guestPhone)}
    </p>
    ${
      msg
        ? `<p><strong>Mensaje:</strong><br/>${escapeHtml(msg).replace(/\n/g, "<br/>")}</p>`
        : ""
    }
    <hr style="border:none;border-top:1px solid #eae0e0" />
    <p>
      <strong>Check-in:</strong> ${escapeHtml(args.checkIn)}<br/>
      <strong>Check-out:</strong> ${escapeHtml(args.checkOut)}<br/>
      <strong>Noches:</strong> ${args.nights}<br/>
      <strong>Huespedes:</strong> ${args.guests}<br/>
      <strong>Total estimado:</strong> ${escapeHtml(total)} (${args.currency})
    </p>
    <p style="margin-top: 18px;">
      <a href="${escapeHtml(adminLink)}" style="display:inline-block;background:#363636;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:999px;font-weight:600;">
        Ver solicitud en Admin
      </a>
    </p>
  `.trim();

  await resend.emails.send({
    from,
    to: [to],
    replyTo: args.guestEmail,
    subject: `Inquiry nueva — ${args.guestName} — ${args.publicId}`,
    text,
    html,
  });
}

export async function POST(request: Request) {
  const originErr = assertSameOrigin(request);
  if (originErr) return originErr;

  const ip = getClientIp(request);
  const limit = consumeRateLimit(`reservation:pre:${ip}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  const raw = await request.json().catch(() => null);
  const parsed = PreRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", details: parsed.error.flatten() },
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

  const supabase = createAdminSupabaseClient();
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

  const { data: reservation, error } = await supabase
    .from("reservations")
    .insert({
      public_id: mkPublicId(),
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
      booking_status: "draft",
      payment_status: "draft",
      deposit_amount: depositAmount,
      notes: body.message || null,
    })
    .select(
      "id, public_id, stay_type, contract_type, payment_status, deposit_amount, total_amount, currency, check_in, check_out, booking_status"
    )
    .single();
  if (error || !reservation) {
    return NextResponse.json({ error: "Could not create pre-request." }, { status: 502 });
  }

  try {
    const { data: existingUser, error: existingUserError } = await supabase
      .from("users")
      .select("id")
      .ilike("email", body.email)
      .limit(1)
      .maybeSingle();
    if (existingUserError) {
      console.error(
        "[reservations/pre-request] existing user check error:",
        existingUserError
      );
    }
    const language: "es" | "en" =
      body.locale === "es" || body.locale === "en"
        ? body.locale
        : body.currency === "USD"
          ? "en"
          : "es";
    await sendGuestPortalEmail({
      requestUrl: request.url,
      reservationId: reservation.id,
      guestName: body.name,
      guestEmail: body.email,
      guestPhone: body.phone,
      language,
      existingAccount: Boolean(existingUser?.id),
    });
  } catch (emailErr) {
    console.error("[reservations/pre-request] guest email error:", emailErr);
  }

  try {
    await sendHostInquiryEmail({
      requestUrl: request.url,
      reservationId: reservation.id,
      guestName: body.name,
      guestEmail: body.email,
      guestPhone: body.phone,
      message: body.message,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      nights: quote.nights,
      guests: body.guests,
      currency: body.currency,
      total: quote.total,
      publicId: reservation.public_id,
    });
  } catch (emailErr) {
    console.error("[reservations/pre-request] host inbox email error:", emailErr);
  }

  return NextResponse.json({ ok: true, reservation });
}
