"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/providers/LanguageProvider";

type Reservation = {
  id: string;
  public_id: string;
  check_in: string;
  check_out: string;
  total_amount: number;
  currency: "MXN" | "USD";
  booking_status: string;
  payment_status: string;
  stay_type: "short_stay" | "long_stay";
};

export default function GuestReservationsPage() {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const numLocale = locale === "es" ? "es-MX" : "en-US";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/guest/reservations", { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as {
          reservations?: Reservation[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? t("guestPortal.reservations.loadError"));
          setRows([]);
        } else {
          setRows(Array.isArray(json.reservations) ? json.reservations : []);
        }
      } catch {
        if (!cancelled) setError(t("guestPortal.reservations.networkError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <main className="min-h-screen bg-[var(--ivory)] px-6 pb-16 pt-24 text-[var(--charcoal)] md:px-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-[family-name:var(--heading-font)] text-3xl font-semibold">
          {t("guestPortal.reservations.title")}
        </h1>
        {loading ? <p className="mt-4 text-sm">{t("guestPortal.reservations.loading")}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        <div className="mt-6 space-y-4">
          {rows.map((r) => (
            <article
              key={r.id}
              className="rounded-2xl border border-[var(--dove-grey)]/70 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-sm">{r.public_id}</p>
                <Link href={`/guest/reservations/${r.id}`} className="text-xs underline">
                  {t("guestPortal.reservations.viewDetails")}
                </Link>
              </div>
              <p className="mt-1 text-sm">
                {r.check_in} → {r.check_out}
              </p>
              <p className="mt-1 text-sm">
                {r.currency}{" "}
                {Number(r.total_amount).toLocaleString(numLocale)}
              </p>
              <p className="mt-1 text-xs text-[var(--charcoal)]/60">
                {t("guestPortal.reservations.booking")}: {r.booking_status} ·{" "}
                {t("guestPortal.reservations.payment")}: {r.payment_status} ·{" "}
                {r.stay_type === "long_stay"
                  ? t("bookTour.stayTypeLong")
                  : t("bookTour.stayTypeShort")}
              </p>
            </article>
          ))}
        </div>
        <p className="mt-8">
          <Link href="/guest/dashboard" className="text-sm underline">
            {t("guestPortal.reservations.backDashboard")}
          </Link>
        </p>
      </div>
    </main>
  );
}
