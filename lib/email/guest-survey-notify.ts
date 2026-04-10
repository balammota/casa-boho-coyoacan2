import { Resend } from "resend";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function surveyUrl(request: Request, publicId: string): string {
  let origin: string;
  try {
    origin = new URL(request.url).origin;
  } catch {
    origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  }
  return `${origin}/survey/${encodeURIComponent(publicId)}`;
}

/**
 * Respaldo / uso puntual. El flujo admin usa `sendGuestReservationNotify` con
 * `stay_completed_survey`. Mismo tono transaccional aquí por consistencia.
 */
export async function sendGuestStaySurveyEmail(args: {
  request: Request;
  guestName: string;
  guestEmail: string;
  publicId: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    return;
  }

  const link = surveyUrl(args.request, args.publicId);
  const name = args.guestName.trim() || "estimado huésped";

  const subject = `Reservación ${args.publicId}: estancia finalizada — Casa Boho Coyoacán`;
  const text = [
    `Hola ${name},`,
    "",
    `Tu reservación ${args.publicId} quedó registrada como finalizada por el anfitrión.`,
    "Si puedes dedicar un minuto, este enlace abre un formulario breve (5 preguntas) para comentar tu experiencia:",
    link,
    "",
    "Casa Boho Coyoacán",
  ].join("\n");

  const html = `<p style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#363636">Hola ${escapeHtml(name)},</p>
<p style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#363636">Tu reservación <strong>${escapeHtml(args.publicId)}</strong> quedó registrada como finalizada por el anfitrión.</p>
<p style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#363636">Si puedes dedicar un minuto, este enlace abre un formulario breve (5 preguntas) para comentar tu experiencia:</p>
<p style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#363636"><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>
<p style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;color:#555">Casa Boho Coyoacán</p>`.trim();

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: [args.guestEmail.trim()],
      subject,
      text,
      html,
    });
  } catch (e) {
    console.error("[guest-survey-notify] Resend:", e);
  }
}
