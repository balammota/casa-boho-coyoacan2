import { Resend } from "resend";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type GuestReservationNotifyKind =
  | "stay_confirmed"
  | "payment_confirmed"
  | "stay_completed_survey"
  | "cancelled";

function portalUrl(request: Request, reservationId: string): string {
  let origin: string;
  try {
    origin = new URL(request.url).origin;
  } catch {
    origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  }
  return `${origin}/guest/reservations/${reservationId}`;
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
 * Notifica al huésped por correo (best-effort: sin API key no hace nada).
 * Errores de envío se registran en consola y no se propagan.
 */
export async function sendGuestReservationNotify(args: {
  request: Request;
  kind: GuestReservationNotifyKind;
  guestName: string;
  guestEmail: string;
  publicId: string;
  reservationId: string;
  currency: "MXN" | "USD";
  cancellationMessage?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    return;
  }

  const lang = args.currency === "USD" ? "en" : "es";
  const link = portalUrl(args.request, args.reservationId);
  const surveyLink = surveyUrl(args.request, args.publicId);
  const name =
    args.guestName.trim() || (lang === "es" ? "estimado huésped" : "guest");

  let subject: string;
  let text: string;
  let html: string;

  if (args.kind === "stay_confirmed") {
    if (lang === "es") {
      subject = `Tu estancia ha sido confirmada · ${args.publicId} · Casa Boho Coyoacán`;
      text = [
        `Hola ${name},`,
        "",
        `Confirmamos tu reservación ${args.publicId}. Ya puedes entrar a tu panel de huésped para ver las plantillas del contrato y las instrucciones de pago.`,
        link,
        "",
        "Equipo Casa Boho Coyoacán",
      ].join("\n");
      html = `
    <h2>Casa Boho Coyoacán</h2>
    <p>Hola ${escapeHtml(name)},</p>
    <p>Confirmamos tu reservación <strong>${escapeHtml(args.publicId)}</strong>. Ya puedes entrar a tu panel de huésped para ver las plantillas del contrato y las instrucciones de pago.</p>
    <p><a href="${escapeHtml(link)}">Abrir mi reservación</a></p>
  `.trim();
    } else {
      subject = `Your stay has been confirmed · ${args.publicId} · Casa Boho Coyoacan`;
      text = [
        `Hi ${name},`,
        "",
        `We've confirmed your reservation ${args.publicId}. You can open your guest portal to see contract templates and payment instructions.`,
        link,
        "",
        "Casa Boho Coyoacan team",
      ].join("\n");
      html = `
    <h2>Casa Boho Coyoacan</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>We've confirmed your reservation <strong>${escapeHtml(args.publicId)}</strong>. Open your guest portal to see contract templates and payment instructions.</p>
    <p><a href="${escapeHtml(link)}">View my reservation</a></p>
  `.trim();
    }
  } else if (args.kind === "payment_confirmed") {
    if (lang === "es") {
      subject = `Hemos registrado tu pago · ${args.publicId} · Casa Boho Coyoacán`;
      text = [
        `Hola ${name},`,
        "",
        `Te confirmamos que registramos el pago de tu reservación ${args.publicId}. Gracias.`,
        link,
        "",
        "Equipo Casa Boho Coyoacán",
      ].join("\n");
      html = `
    <h2>Casa Boho Coyoacán</h2>
    <p>Hola ${escapeHtml(name)},</p>
    <p>Registramos el pago de tu reservación <strong>${escapeHtml(args.publicId)}</strong>. Gracias.</p>
    <p><a href="${escapeHtml(link)}">Ver mi reservación</a></p>
  `.trim();
    } else {
      subject = `Payment received · ${args.publicId} · Casa Boho Coyoacan`;
      text = [
        `Hi ${name},`,
        "",
        `We've recorded payment for your reservation ${args.publicId}. Thank you.`,
        link,
        "",
        "Casa Boho Coyoacan team",
      ].join("\n");
      html = `
    <h2>Casa Boho Coyoacan</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>We've recorded payment for your reservation <strong>${escapeHtml(args.publicId)}</strong>. Thank you.</p>
    <p><a href="${escapeHtml(link)}">View my reservation</a></p>
  `.trim();
    }
  } else if (args.kind === "stay_completed_survey") {
    // Tono transaccional y HTML mínimo para reducir clasificación como Promociones en Gmail.
    if (lang === "es") {
      subject = `Reservación ${args.publicId}: estancia finalizada — Casa Boho Coyoacán`;
      text = [
        `Hola ${name},`,
        "",
        `Tu reservación ${args.publicId} quedó registrada como finalizada por el anfitrión.`,
        "Si puedes dedicar un minuto, este enlace abre un formulario breve (5 preguntas) para comentar tu experiencia:",
        surveyLink,
        "",
        "Casa Boho Coyoacán",
      ].join("\n");
      html = `<p style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#363636">Hola ${escapeHtml(name)},</p>
<p style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#363636">Tu reservación <strong>${escapeHtml(args.publicId)}</strong> quedó registrada como finalizada por el anfitrión.</p>
<p style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#363636">Si puedes dedicar un minuto, este enlace abre un formulario breve (5 preguntas) para comentar tu experiencia:</p>
<p style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#363636"><a href="${escapeHtml(surveyLink)}">${escapeHtml(surveyLink)}</a></p>
<p style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;color:#555">Casa Boho Coyoacán</p>`.trim();
    } else {
      subject = `Reservation ${args.publicId}: stay closed — Casa Boho Coyoacan`;
      text = [
        `Hi ${name},`,
        "",
        `Your reservation ${args.publicId} has been marked as completed by the host.`,
        "If you have a minute, this link opens a short form (5 questions) about your stay:",
        surveyLink,
        "",
        "Casa Boho Coyoacan",
      ].join("\n");
      html = `<p style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#363636">Hi ${escapeHtml(name)},</p>
<p style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#363636">Your reservation <strong>${escapeHtml(args.publicId)}</strong> has been marked as completed by the host.</p>
<p style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#363636">If you have a minute, this link opens a short form (5 questions) about your stay:</p>
<p style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#363636"><a href="${escapeHtml(surveyLink)}">${escapeHtml(surveyLink)}</a></p>
<p style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;color:#555">Casa Boho Coyoacan</p>`.trim();
    }
  } else {
    const reason = (args.cancellationMessage ?? "").trim();
    const reasonHtml = reason ? `<p><strong>${lang === "es" ? "Mensaje del anfitrión" : "Message from the host"}:</strong></p><p>${escapeHtml(reason).replace(/\n/g, "<br/>")}</p>` : "";
    if (lang === "es") {
      subject = `Tu reservación fue cancelada · ${args.publicId} · Casa Boho Coyoacán`;
      text = [
        `Hola ${name},`,
        "",
        `Te informamos que tu reservación ${args.publicId} ha sido cancelada.`,
        reason ? `\nMotivo:\n${reason}\n` : "",
        link,
        "",
        "Equipo Casa Boho Coyoacán",
      ].join("\n");
      html = `
    <h2>Casa Boho Coyoacán</h2>
    <p>Hola ${escapeHtml(name)},</p>
    <p>Tu reservación <strong>${escapeHtml(args.publicId)}</strong> ha sido cancelada.</p>
    ${reasonHtml}
    <p><a href="${escapeHtml(link)}">Ver detalle en el panel</a></p>
  `.trim();
    } else {
      subject = `Your reservation was cancelled · ${args.publicId} · Casa Boho Coyoacan`;
      text = [
        `Hi ${name},`,
        "",
        `Your reservation ${args.publicId} has been cancelled.`,
        reason ? `\nMessage:\n${reason}\n` : "",
        link,
        "",
        "Casa Boho Coyoacan team",
      ].join("\n");
      html = `
    <h2>Casa Boho Coyoacan</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>Your reservation <strong>${escapeHtml(args.publicId)}</strong> has been cancelled.</p>
    ${reasonHtml}
    <p><a href="${escapeHtml(link)}">View in guest portal</a></p>
  `.trim();
    }
  }

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
    console.error("[guest-reservation-notify] Resend:", e);
  }
}
