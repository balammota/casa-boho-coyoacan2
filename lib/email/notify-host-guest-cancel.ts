import { Resend } from "resend";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function publicOrigin(request: Request): string {
  try {
    return new URL(request.url).origin;
  } catch {
    return (
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000"
    );
  }
}

/**
 * Avisa al anfitrión (BOOKING_INBOX_EMAIL) cuando el huésped cancela desde el portal.
 * Si faltan variables de Resend o el inbox, no hace nada y no lanza.
 */
export async function notifyHostGuestCancelled(args: {
  request: Request;
  reservationId: string;
  publicId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  currency: string;
  totalAmount: number;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const to = process.env.BOOKING_INBOX_EMAIL?.trim();
  if (!apiKey || !from || !to) {
    return;
  }

  const origin = publicOrigin(args.request);
  const adminLink = `${origin}/admin/reservations/${args.reservationId}`;
  const total = Number(args.totalAmount);
  const money = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: args.currency === "USD" ? "USD" : "MXN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(total) ? total : 0);

  const subject = `Cancelación por huésped · ${args.publicId} · Casa Boho Coyoacán`;
  const text = [
    "Un huésped canceló su reservación desde el portal.",
    "",
    `Código: ${args.publicId}`,
    `Huésped: ${args.guestName}`,
    `Email: ${args.guestEmail}`,
    `Teléfono: ${args.guestPhone}`,
    `Entrada: ${args.checkIn} · Salida: ${args.checkOut}`,
    `Total cotizado: ${money}`,
    "",
    `Ver en admin: ${adminLink}`,
  ].join("\n");

  const html = `
    <h2>Cancelación por huésped</h2>
    <p>Un huésped canceló su reservación desde el panel de huésped.</p>
    <ul>
      <li><strong>Código:</strong> ${escapeHtml(args.publicId)}</li>
      <li><strong>Huésped:</strong> ${escapeHtml(args.guestName)}</li>
      <li><strong>Email:</strong> ${escapeHtml(args.guestEmail)}</li>
      <li><strong>Teléfono:</strong> ${escapeHtml(args.guestPhone)}</li>
      <li><strong>Fechas:</strong> ${escapeHtml(args.checkIn)} → ${escapeHtml(args.checkOut)}</li>
      <li><strong>Total cotizado:</strong> ${escapeHtml(money)}</li>
    </ul>
    <p><a href="${escapeHtml(adminLink)}">Abrir detalle en admin</a></p>
  `.trim();

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: [to],
      subject,
      text,
      html,
    });
  } catch (e) {
    console.error("[notify-host-guest-cancel] Resend:", e);
  }
}
