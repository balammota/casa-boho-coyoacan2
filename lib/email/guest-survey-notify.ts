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
  const enc = encodeURIComponent(publicId);
  return `${origin}/survey/${enc}`;
}

/**
 * Correo al marcar la estancia como completada (admin). Enlace a encuesta pública;
 * el huésped puede elegir español/inglés en la barra del sitio.
 * Best-effort si falta Resend.
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
  const nameEs = args.guestName.trim() || "estimado huésped";
  const nameEn = args.guestName.trim() || "guest";

  const subject = `Encuesta de satisfacción · Satisfaction survey · ${args.publicId} · Casa Boho`;

  const text = [
    `Hola ${nameEs},`,
    "",
    "Gracias por hospedarte con nosotros. Nos encantaría conocer tu opinión en una encuesta breve (5 preguntas).",
    "Puedes abrirla en el idioma que prefieras usando el selector de idioma en la parte superior de la página.",
    link,
    "",
    "---",
    "",
    `Hi ${nameEn},`,
    "",
    "Thank you for staying with us. We'd love your feedback in a short survey (5 questions).",
    "Open the link and choose Spanish or English using the language selector at the top of the page.",
    link,
    "",
    "Casa Boho Coyoacán / Casa Boho Coyoacan",
  ].join("\n");

  const html = `
    <h2>Casa Boho Coyoacán</h2>
    <p>Hola ${escapeHtml(nameEs)},</p>
    <p>Gracias por hospedarte con nosotros. Nos encantaría conocer tu opinión en una <strong>encuesta breve (5 preguntas)</strong>.</p>
    <p>En la página puedes cambiar el idioma (español / inglés) con el selector superior del sitio.</p>
    <p><a href="${escapeHtml(link)}">Responder encuesta</a></p>
    <hr style="margin:24px 0;border:none;border-top:1px solid #ddd" />
    <p>Hi ${escapeHtml(nameEn)},</p>
    <p>Thank you for staying with us. We'd love your feedback in a <strong>short survey (5 questions)</strong>.</p>
    <p>On the page you can switch language (Spanish / English) using the site’s language selector at the top.</p>
    <p><a href="${escapeHtml(link)}">Take the survey</a></p>
  `.trim();

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
