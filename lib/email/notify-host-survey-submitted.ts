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

function consentLabel(v: boolean | null): string {
  if (v === null) return "Sin respuesta";
  return v ? "Sí" : "No";
}

/**
 * Avisa al anfitrión (BOOKING_INBOX_EMAIL) cuando el huésped envía la encuesta de satisfacción.
 */
export async function notifyHostSurveySubmitted(args: {
  request: Request;
  reservationId: string;
  publicId: string;
  guestName: string;
  guestEmail: string;
  ratingOverall: number;
  ratingClean: number;
  ratingComfort: number;
  ratingRecommend: number;
  comments: string;
  consentPublish: boolean | null;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const to = process.env.BOOKING_INBOX_EMAIL?.trim();
  if (!apiKey || !from || !to) {
    return;
  }

  const origin = publicOrigin(args.request);
  const adminLink = `${origin}/admin/reservations/${args.reservationId}#encuesta-satisfaccion`;
  const comments = args.comments.trim() || "(sin comentarios)";

  const subject = `Encuesta respondida · ${args.publicId} · Casa Boho Coyoacán`;
  const text = [
    "Un huésped envió la encuesta de satisfacción.",
    "",
    `Código: ${args.publicId}`,
    `Huésped: ${args.guestName}`,
    `Email: ${args.guestEmail}`,
    "",
    `Calificación general: ${args.ratingOverall}/5`,
    `Limpieza: ${args.ratingClean}/5`,
    `Comodidad: ${args.ratingComfort}/5`,
    `Recomendación: ${args.ratingRecommend}/5`,
    "",
    `Comentarios: ${comments}`,
    "",
    `Permiso publicar reseña: ${consentLabel(args.consentPublish)}`,
    "",
    `Ver en admin: ${adminLink}`,
  ].join("\n");

  const html = `
    <h2>Encuesta de satisfacción recibida</h2>
    <p>Un huésped envió la encuesta.</p>
    <ul>
      <li><strong>Código:</strong> ${escapeHtml(args.publicId)}</li>
      <li><strong>Huésped:</strong> ${escapeHtml(args.guestName)}</li>
      <li><strong>Email:</strong> ${escapeHtml(args.guestEmail)}</li>
      <li><strong>General:</strong> ${args.ratingOverall}/5</li>
      <li><strong>Limpieza:</strong> ${args.ratingClean}/5</li>
      <li><strong>Comodidad:</strong> ${args.ratingComfort}/5</li>
      <li><strong>Recomendación:</strong> ${args.ratingRecommend}/5</li>
      <li><strong>Publicar reseña:</strong> ${escapeHtml(consentLabel(args.consentPublish))}</li>
    </ul>
    <p><strong>Comentarios</strong></p>
    <p>${escapeHtml(comments).replace(/\n/g, "<br/>")}</p>
    <p><a href="${escapeHtml(adminLink)}">Ver respuestas en admin</a></p>
  `.trim();

  const replyTo = args.guestEmail.trim();
  const hasReplyTo = replyTo.includes("@");

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: [to],
      ...(hasReplyTo ? { replyTo } : {}),
      subject,
      text,
      html,
    });
  } catch (e) {
    console.error("[notify-host-survey-submitted] Resend:", e);
  }
}
