import { NextResponse } from "next/server";
import { Resend } from "resend";
import { formatQuoteLineEnglish } from "@/lib/i18n/quote-format";
import type { CurrencyCode } from "@/lib/i18n/types";
import {
  quoteToLabeledBreakdown,
  type QuoteLine,
  type StayQuote,
} from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type BreakdownLine = { label: string; amount: number };

function parseQuoteLines(raw: unknown): QuoteLine[] {
  if (!Array.isArray(raw)) return [];
  const out: QuoteLine[] = [];
  for (const item of raw.slice(0, 20)) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    const kind = o.kind;
    if (kind === "feb28") {
      const amount = Number(o.amount);
      if (Number.isFinite(amount) && amount >= 0) {
        out.push({ kind: "feb28", amount: Math.round(amount) });
      }
      continue;
    }
    if (kind === "months30" || kind === "weeks7" || kind === "nightsDaily") {
      const count = Number(o.count);
      const amount = Number(o.amount);
      if (
        !Number.isFinite(count) ||
        count < 1 ||
        count > 400 ||
        !Number.isFinite(amount)
      ) {
        continue;
      }
      out.push({
        kind,
        count: Math.round(count),
        amount: Math.round(amount),
      } as QuoteLine);
    }
  }
  return out;
}

function formatMoneyEmail(amount: number, currency: CurrencyCode): string {
  const loc = currency === "MXN" ? "es-MX" : "en-US";
  return new Intl.NumberFormat(loc, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const to = process.env.BOOKING_INBOX_EMAIL?.trim();

  if (!apiKey || !from || !to) {
    return NextResponse.json(
      { error: "Email service is not configured.", code: "not_configured" },
      { status: 503 }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  if (typeof raw !== "object" || raw === null) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const b = raw as Record<string, unknown>;

  if (typeof b.website === "string" && b.website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const name = String(b.name ?? "").trim().slice(0, 200);
  const email = String(b.email ?? "").trim().slice(0, 320);
  const phone = String(b.phone ?? "").trim().slice(0, 80);
  const message = String(b.message ?? "").trim().slice(0, 5000);
  const guests = Number(b.guests);
  const checkIn = String(b.checkIn ?? "").trim();
  const checkOut = String(b.checkOut ?? "").trim();
  const nights = Number(b.nights);
  const currency: CurrencyCode = b.currency === "USD" ? "USD" : "MXN";
  const totalRaw = b.total ?? b.totalMxn;
  const total = Math.round(Number(totalRaw));

  if (!name || !email || !phone) {
    return NextResponse.json(
      { error: "Name, email, and phone are required." },
      { status: 400 }
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  if (!YMD.test(checkIn) || !YMD.test(checkOut)) {
    return NextResponse.json({ error: "Invalid dates." }, { status: 400 });
  }

  if (checkIn >= checkOut) {
    return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
  }

  if (!Number.isFinite(guests) || guests < 1 || guests > 20) {
    return NextResponse.json({ error: "Invalid guests." }, { status: 400 });
  }

  if (!Number.isFinite(nights) || nights < 1 || nights > 365) {
    return NextResponse.json({ error: "Invalid nights." }, { status: 400 });
  }

  if (!Number.isFinite(total) || total < 0 || total > 50_000_000) {
    return NextResponse.json({ error: "Invalid total." }, { status: 400 });
  }

  const quoteLines = parseQuoteLines(b.quoteLines);
  let breakdown: BreakdownLine[] = [];

  if (quoteLines.length > 0) {
    const sumLines = quoteLines.reduce((s, l) => s + l.amount, 0);
    if (Math.abs(sumLines - total) > 2) {
      return NextResponse.json(
        { error: "Quote does not match total." },
        { status: 400 }
      );
    }
    const pseudoQuote: StayQuote = { nights, total, lines: quoteLines };
    breakdown = quoteToLabeledBreakdown(pseudoQuote, formatQuoteLineEnglish);
  } else if (Array.isArray(b.breakdown)) {
    breakdown = b.breakdown
      .filter(
        (x): x is BreakdownLine =>
          typeof x === "object" &&
          x !== null &&
          typeof (x as BreakdownLine).label === "string" &&
          typeof (x as BreakdownLine).amount === "number"
      )
      .slice(0, 20)
      .map((x) => ({
        label: String(x.label).slice(0, 200),
        amount: Math.round(Number(x.amount)) || 0,
      }));
  }

  const totalLine =
    total > 0
      ? `Total (estimate): ${formatMoneyEmail(total, currency)}`
      : "";

  const breakdownText =
    breakdown.length > 0
      ? breakdown
          .map(
            (l) =>
              `  • ${l.label}: ${formatMoneyEmail(l.amount, currency)}`
          )
          .join("\n")
      : "";

  const textBody = [
    `New booking request — Casa Boho Coyoacán`,
    ``,
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    ...(message ? [`Message:`, message, ``] : []),
    `---`,
    `Check-in: ${checkIn}`,
    `Check-out: ${checkOut}`,
    `Nights: ${nights}`,
    `Guests: ${guests}`,
    ``,
    `Estimated total (utilities included):`,
    breakdownText,
    totalLine,
    ``,
    `Reply directly to this email to reach the guest (${email}).`,
  ]
    .filter(Boolean)
    .join("\n");

  const htmlBody = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #363636;">
  <h2 style="color: #b8860b;">Booking request — Casa Boho Coyoacán</h2>
  <p><strong>Name:</strong> ${escapeHtml(name)}<br/>
  <strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a><br/>
  <strong>Phone:</strong> ${escapeHtml(phone)}</p>
  ${message ? `<p><strong>Message</strong></p><p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>` : ""}
  <hr style="border: none; border-top: 1px solid #eae0e0;" />
  <p><strong>Check-in:</strong> ${escapeHtml(checkIn)}<br/>
  <strong>Check-out:</strong> ${escapeHtml(checkOut)}<br/>
  <strong>Nights:</strong> ${nights}<br/>
  <strong>Guests:</strong> ${guests}</p>
  <p><strong>Estimate (${currency})</strong></p>
  <ul>${breakdown.map((l) => `<li>${escapeHtml(l.label)}: ${escapeHtml(formatMoneyEmail(l.amount, currency))}</li>`).join("")}</ul>
  ${totalLine ? `<p><strong>${escapeHtml(totalLine)}</strong></p>` : ""}
  <p style="font-size: 12px; color: #666;">Utilities included in estimate — confirm with guest.</p>
</body>
</html>`.trim();

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    replyTo: email,
    subject: `Booking request — ${name} — Casa Boho Coyoacán`,
    text: textBody,
    html: htmlBody,
  });

  if (error) {
    console.error("[send-booking] Resend:", error);
    return NextResponse.json(
      { error: "Could not send email. Try again later." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, id: data?.id ?? null });
}
