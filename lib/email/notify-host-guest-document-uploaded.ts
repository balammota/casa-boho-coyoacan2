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
 * Avisa al anfitrión cuando el huésped sube un documento.
 * Best-effort: si faltan variables o falla Resend, no rompe el flujo.
 */
export async function notifyHostGuestDocumentUploaded(args: {
  request: Request;
  reservationId: string;
  publicId: string;
  guestName: string;
  guestEmail: string;
  fileName: string;
  category: "official_id" | "passport" | "income_proof" | "other";
  fileSize: number;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const to = process.env.BOOKING_INBOX_EMAIL?.trim();
  if (!apiKey || !from || !to) {
    return;
  }

  const origin = publicOrigin(args.request);
  const adminLink = `${origin}/admin/reservations/${args.reservationId}#documentos-huesped`;
  const sizeMb = (Math.max(0, args.fileSize) / (1024 * 1024)).toFixed(2);

  const categoryMap: Record<typeof args.category, string> = {
    official_id: "Identificación oficial",
    passport: "Pasaporte",
    income_proof: "Comprobante de ingresos",
    other: "Otro",
  };
  const catLabel = categoryMap[args.category] ?? args.category;

  const subject = `Documento subido por huésped · ${args.publicId} · Casa Boho Coyoacán`;
  const text = [
    "El huésped subió un documento en su reservación.",
    "",
    `Código: ${args.publicId}`,
    `Huésped: ${args.guestName}`,
    `Email: ${args.guestEmail}`,
    `Categoría: ${catLabel}`,
    `Archivo: ${args.fileName}`,
    `Tamaño: ${sizeMb} MB`,
    "",
    `Ver en admin: ${adminLink}`,
  ].join("\n");

  const html = `
    <h2>Documento subido por huésped</h2>
    <p>Se subió un nuevo documento desde el portal de huésped.</p>
    <ul>
      <li><strong>Código:</strong> ${escapeHtml(args.publicId)}</li>
      <li><strong>Huésped:</strong> ${escapeHtml(args.guestName)}</li>
      <li><strong>Email:</strong> ${escapeHtml(args.guestEmail)}</li>
      <li><strong>Categoría:</strong> ${escapeHtml(catLabel)}</li>
      <li><strong>Archivo:</strong> ${escapeHtml(args.fileName)}</li>
      <li><strong>Tamaño:</strong> ${escapeHtml(sizeMb)} MB</li>
    </ul>
    <p><a href="${escapeHtml(adminLink)}">Abrir documentos en admin</a></p>
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
    console.error("[notify-host-guest-document-uploaded] Resend:", e);
  }
}
