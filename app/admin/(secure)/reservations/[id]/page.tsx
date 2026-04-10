import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth/admin-guard";
import { guestDocumentCategoryLabelEs } from "@/lib/guest/document-category-labels";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const BUCKET = "guest-documents";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function surveyRatingLabel(kind: "overall" | "clean" | "comfort" | "recommend", n: number): string {
  const v = Number.isFinite(n) ? Math.max(1, Math.min(5, Math.round(n))) : 1;
  if (kind === "overall") {
    return ["Muy mala", "Mala", "Regular", "Buena", "Excelente"][v - 1];
  }
  if (kind === "clean") {
    return ["Muy mal", "Mal", "Aceptable", "Limpio", "Muy limpio"][v - 1];
  }
  if (kind === "comfort") {
    return ["Muy incómodo", "Incómodo", "Regular", "Cómodo", "Muy cómodo"][v - 1];
  }
  return ["Definitivamente no", "Probablemente no", "Tal vez", "Probablemente sí", "Definitivamente sí"][v - 1];
}

export default async function AdminReservationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    redirect("/admin/login?error=forbidden");
  }

  const supabase = createAdminSupabaseClient();
  const { data: reservation, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", params.id)
    .single();
  if (error || !reservation) return notFound();

  type DocRow = {
    id: string;
    original_filename: string;
    mime_type: string;
    document_category: string;
    file_size: number;
    created_at: string;
    storage_path: string;
  };

  let guestDocs: (DocRow & { downloadUrl: string | null })[] = [];
  const { data: rawDocs, error: docsErr } = await supabase
    .from("guest_reservation_documents")
    .select(
      "id, original_filename, mime_type, document_category, file_size, created_at, storage_path"
    )
    .eq("reservation_id", params.id)
    .order("created_at", { ascending: false });

  if (!docsErr && rawDocs?.length) {
    guestDocs = await Promise.all(
      rawDocs.map(async (d) => {
        const { data: signed } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(d.storage_path, 7200);
        return {
          ...d,
          downloadUrl: signed?.signedUrl ?? null,
        };
      })
    );
  }

  type SurveyRow = {
    id: string;
    rating_overall: number;
    rating_clean: number;
    rating_comfort: number;
    rating_recommend: number;
    comments: string;
    consent_publish: boolean | null;
    created_at: string;
  };
  const { data: survey, error: surveyErr } = await supabase
    .from("guest_stay_surveys")
    .select(
      "id, rating_overall, rating_clean, rating_comfort, rating_recommend, comments, consent_publish, created_at"
    )
    .eq("reservation_id", params.id)
    .maybeSingle<SurveyRow>();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold)]">
        Detalle de reservación
      </p>
      <h1 className="mt-2 font-[family-name:var(--heading-font)] text-2xl font-semibold">
        {reservation.public_id}
      </h1>
      <div className="mt-6 rounded-2xl border border-[var(--dove-grey)]/70 bg-white p-5 text-sm text-[var(--charcoal)]/85">
        <p>Entrada: {reservation.check_in}</p>
        <p>Salida: {reservation.check_out}</p>
        <p>
          Total: {reservation.currency}{" "}
          {Number(reservation.total_amount).toLocaleString("es-MX")}
        </p>
        <p>
          Limpieza: {reservation.currency}{" "}
          {Number(reservation.cleaning_fee).toLocaleString("es-MX")}
        </p>
        <p>
          Depósito: {reservation.currency}{" "}
          {Number(reservation.deposit_amount).toLocaleString("es-MX")}
        </p>
        <p>Tipo de estancia: {reservation.stay_type}</p>
        <p>Contrato: {reservation.contract_type}</p>
        <p>Estado del pago: {reservation.payment_status}</p>
        <p>Estado de la reserva: {reservation.booking_status}</p>
        <p className="mt-3">
          <a href="#encuesta-satisfaccion" className="text-[var(--gold)] underline">
            Ver respuestas de encuesta de satisfacción
          </a>
        </p>
      </div>

      <section
        id="documentos-huesped"
        className="mt-8 scroll-mt-24 rounded-2xl border border-[var(--dove-grey)]/70 bg-white p-5 text-sm"
      >
        <h2 className="font-[family-name:var(--heading-font)] text-lg font-semibold text-[var(--charcoal)]">
          Documentos del huésped
        </h2>
        <p className="mt-2 text-xs text-[var(--charcoal)]/65">
          Archivos subidos desde el portal. Los enlaces caducan en unas horas; vuelve a abrir esta
          página si necesitas descargar de nuevo.
        </p>
        {docsErr ? (
          <p className="mt-4 text-xs text-amber-800/90">
            No se pudieron cargar los documentos. Si acabas de desplegar el proyecto, aplica la
            migración <code className="rounded bg-black/5 px-1">009_guest_reservation_documents</code>{" "}
            y crea el bucket <code className="rounded bg-black/5 px-1">guest-documents</code>.
          </p>
        ) : guestDocs.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--charcoal)]/55">
            Aún no hay archivos subidos por el huésped para esta reservación.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--dove-grey)]/40 border border-[var(--dove-grey)]/40 rounded-xl">
            {guestDocs.map((d) => (
              <li
                key={d.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--charcoal)]">{d.original_filename}</p>
                  <p className="text-xs text-[var(--charcoal)]/60">
                    {guestDocumentCategoryLabelEs(d.document_category)} · {d.mime_type} ·{" "}
                    {formatBytes(d.file_size)} ·{" "}
                    {new Date(d.created_at).toLocaleString("es-MX", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                {d.downloadUrl ? (
                  <a
                    href={d.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-full bg-[var(--gold)] px-4 py-2 text-center text-xs font-semibold text-white hover:opacity-90"
                  >
                    Descargar
                  </a>
                ) : (
                  <span className="shrink-0 text-xs text-amber-800/90">Enlace no disponible</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        id="encuesta-satisfaccion"
        className="mt-8 scroll-mt-24 rounded-2xl border border-[var(--dove-grey)]/70 bg-white p-5 text-sm"
      >
        <h2 className="font-[family-name:var(--heading-font)] text-lg font-semibold text-[var(--charcoal)]">
          Encuesta de satisfacción
        </h2>
        {surveyErr ? (
          <p className="mt-3 text-xs text-amber-800/90">
            No se pudieron cargar respuestas. Verifica que esté aplicada la migración{" "}
            <code className="rounded bg-black/5 px-1">010_guest_stay_surveys</code>.
          </p>
        ) : !survey ? (
          <p className="mt-3 text-sm text-[var(--charcoal)]/60">
            Este huésped todavía no ha respondido la encuesta.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-[var(--charcoal)]/60">
              Respondida el{" "}
              {new Date(survey.created_at).toLocaleString("es-MX", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
            <ul className="space-y-2 rounded-xl border border-[var(--dove-grey)]/40 bg-[var(--ivory)]/45 p-4">
              <li>
                <strong>1) Estancia general:</strong> {survey.rating_overall}/5 ·{" "}
                {surveyRatingLabel("overall", survey.rating_overall)}
              </li>
              <li>
                <strong>2) Limpieza:</strong> {survey.rating_clean}/5 ·{" "}
                {surveyRatingLabel("clean", survey.rating_clean)}
              </li>
              <li>
                <strong>3) Comodidad:</strong> {survey.rating_comfort}/5 ·{" "}
                {surveyRatingLabel("comfort", survey.rating_comfort)}
              </li>
              <li>
                <strong>4) Recomendación:</strong> {survey.rating_recommend}/5 ·{" "}
                {surveyRatingLabel("recommend", survey.rating_recommend)}
              </li>
              <li>
                <strong>5) Comentarios:</strong>{" "}
                {survey.comments?.trim() ? survey.comments : "Sin comentarios."}
              </li>
              <li>
                <strong>Permiso para publicar reseña:</strong>{" "}
                {survey.consent_publish === null
                  ? "Sin respuesta"
                  : survey.consent_publish
                    ? "Sí"
                    : "No"}
              </li>
            </ul>
          </div>
        )}
      </section>

      <p className="mt-6">
        <Link href="/admin" className="text-[var(--gold)] underline">
          Volver a admin
        </Link>
      </p>
    </main>
  );
}
