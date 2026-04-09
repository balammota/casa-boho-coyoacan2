"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/components/providers/LanguageProvider";

const MAX_MB = 4;

export type GuestDocumentRow = {
  id: string;
  original_filename: string;
  mime_type: string;
  document_category: string;
  file_size: number;
  created_at: string;
  downloadUrl: string | null;
};

type Props = {
  reservationId: string;
  stayType: "short_stay" | "long_stay";
};

const CATEGORIES = [
  "official_id",
  "passport",
  "income_proof",
  "other",
] as const;

function categoryLabelKey(c: string): string {
  switch (c) {
    case "official_id":
      return "catOfficialId";
    case "passport":
      return "catPassport";
    case "income_proof":
      return "catIncome";
    default:
      return "catOther";
  }
}

export function GuestDocumentsPanel({ reservationId, stayType }: Props) {
  const { t, locale } = useI18n();
  const [documents, setDocuments] = useState<GuestDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("official_id");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadDocs = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/guest/reservations/${reservationId}/documents`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        documents?: GuestDocumentRow[];
        error?: string;
      };
      if (!res.ok) {
        setLoadError(json.error ?? t("guestPortal.documents.loadError"));
        setDocuments([]);
      } else {
        setDocuments(json.documents ?? []);
      }
    } catch {
      setLoadError(t("guestPortal.detail.networkError"));
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [reservationId, t]);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  const onUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploadMsg(null);
    const form = e.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      setUploadMsg(t("guestPortal.documents.pickFile"));
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("category", category);
      const res = await fetch(`/api/guest/reservations/${reservationId}/documents`, {
        method: "POST",
        body: fd,
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setUploadMsg(json.error ?? t("guestPortal.documents.uploadError"));
      } else {
        if (input) input.value = "";
        await loadDocs();
      }
    } catch {
      setUploadMsg(t("guestPortal.detail.networkError"));
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (documentId: string) => {
    if (!window.confirm(t("guestPortal.documents.deleteConfirm"))) return;
    setDeletingId(documentId);
    setUploadMsg(null);
    try {
      const res = await fetch(
        `/api/guest/reservations/${reservationId}/documents/${documentId}`,
        { method: "DELETE" }
      );
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setUploadMsg(json.error ?? t("guestPortal.documents.deleteError"));
      } else {
        await loadDocs();
      }
    } catch {
      setUploadMsg(t("guestPortal.detail.networkError"));
    } finally {
      setDeletingId(null);
    }
  };

  const dateLocale = locale === "es" ? "es-MX" : "en-US";

  return (
    <section className="rounded-2xl border border-[var(--dove-grey)]/70 bg-white p-5 text-sm">
      <h2 className="font-[family-name:var(--heading-font)] text-lg font-semibold text-[var(--charcoal)]">
        {t("guestPortal.documents.sectionTitle")}
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-[var(--charcoal)]/75">
        {t("guestPortal.documents.intro")}
      </p>

      <div className="mt-4 rounded-xl border border-[var(--dove-grey)]/50 bg-[var(--ivory)]/50 p-4">
        <p className="text-xs font-semibold text-[var(--charcoal)]">
          {stayType === "long_stay"
            ? t("guestPortal.documents.reqLongTitle")
            : t("guestPortal.documents.reqShortTitle")}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--charcoal)]/70">
          {stayType === "long_stay"
            ? t("guestPortal.documents.reqLongBody")
            : t("guestPortal.documents.reqShortBody")}
        </p>
      </div>

      <p className="mt-3 text-xs text-[var(--charcoal)]/60">
        {t("guestPortal.documents.uploadAny")}
      </p>
      <p className="mt-1 text-xs text-[var(--charcoal)]/55">
        {t("guestPortal.documents.maxSize", { mb: MAX_MB })}
      </p>

      <form onSubmit={(e) => void onUpload(e)} className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block min-w-[10rem] flex-1 text-xs font-medium text-[var(--charcoal)]">
          {t("guestPortal.documents.categoryLabel")}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[var(--dove-grey)] bg-white px-3 py-2 text-sm text-[var(--charcoal)] outline-none focus:border-[var(--gold)]/50"
            disabled={uploading}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`guestPortal.documents.${categoryLabelKey(c)}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-[12rem] flex-1 text-xs font-medium text-[var(--charcoal)]">
          {t("guestPortal.documents.fileLabel")}
          <input
            name="file"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
            className="mt-1.5 block w-full text-xs text-[var(--charcoal)] file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--ivory)] file:px-3 file:py-2 file:font-semibold file:text-[var(--charcoal)]"
            disabled={uploading}
          />
        </label>
        <button
          type="submit"
          disabled={uploading}
          className="rounded-full bg-[var(--charcoal)] px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {uploading ? t("guestPortal.documents.uploading") : t("guestPortal.documents.upload")}
        </button>
      </form>
      {uploadMsg ? <p className="mt-2 text-xs text-red-700/90">{uploadMsg}</p> : null}

      <div className="mt-6 border-t border-[var(--dove-grey)]/50 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--charcoal)]/55">
          {t("guestPortal.documents.uploadedTitle")}
        </p>
        {loading ? (
          <p className="mt-2 text-xs text-[var(--charcoal)]/50">{t("guestPortal.detail.loading")}</p>
        ) : loadError ? (
          <p className="mt-2 text-xs text-red-700/90">{loadError}</p>
        ) : documents.length === 0 ? (
          <p className="mt-2 text-xs text-[var(--charcoal)]/55">{t("guestPortal.documents.empty")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {documents.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--dove-grey)]/40 bg-[var(--ivory)]/30 px-3 py-2 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[var(--charcoal)]">{d.original_filename}</p>
                  <p className="text-[var(--charcoal)]/55">
                    {t(`guestPortal.documents.${categoryLabelKey(d.document_category)}`)} ·{" "}
                    {new Date(d.created_at).toLocaleString(dateLocale)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {d.downloadUrl ? (
                    <a
                      href={d.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-[var(--dove-grey)] px-3 py-1 font-semibold text-[var(--charcoal)] hover:border-[var(--gold)]/40"
                    >
                      {t("guestPortal.documents.view")}
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void onDelete(d.id)}
                    disabled={deletingId === d.id}
                    className="rounded-full border border-red-200 px-3 py-1 font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === d.id ? "…" : t("guestPortal.documents.remove")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
