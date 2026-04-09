"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/providers/LanguageProvider";
import { guestMayCancelByLeadTime } from "@/lib/dates/ymd-local";
import { guestSeesHostConfirmedContent } from "@/lib/guest/reservation-redact";
import { isAllowedExternalDocUrl } from "@/lib/lease-template-urls";
import { GuestDocumentsPanel } from "@/components/guest/GuestDocumentsPanel";
import { StayPaymentPanel } from "@/components/guest/StayPaymentPanel";

type ReservationDetail = {
  id: string;
  public_id: string;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  currency: "MXN" | "USD";
  total_amount: number;
  cleaning_fee: number;
  deposit_amount: number;
  stay_type: "short_stay" | "long_stay";
  contract_type: "short_stay_contract" | "long_stay_contract";
  booking_status: string;
  payment_status: string;
  contract_accepted_at: string | null;
  payment_instructions: string | null;
  checkin_instructions: string | null;
};

export default function GuestReservationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { t, locale } = useI18n();
  const numLocale = locale === "es" ? "es-MX" : "en-US";
  const [row, setRow] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelSaving, setCancelSaving] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/guest/reservations/${params.id}`, {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as {
          reservation?: ReservationDetail;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) setError(json.error ?? t("guestPortal.detail.loadError"));
        else setRow(json.reservation ?? null);
      } catch {
        if (!cancelled) setError(t("guestPortal.detail.networkError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id, t]);

  const stayLabel =
    row?.stay_type === "long_stay"
      ? t("bookTour.stayTypeLong")
      : t("bookTour.stayTypeShort");
  const contractLabel =
    row?.contract_type === "long_stay_contract"
      ? t("guestPortal.detail.contractLongStay")
      : t("guestPortal.detail.contractShortStay");

  const bookingStatus = row?.booking_status ?? "";
  const isCancelled = bookingStatus === "cancelled";
  const isCompleted = bookingStatus === "completed";
  const hostAccepted =
    row != null && guestSeesHostConfirmedContent(bookingStatus);
  const showGuestCancel =
    row != null &&
    !isCancelled &&
    !isCompleted &&
    guestMayCancelByLeadTime(row.check_in);

  const fmt = (n: number) => Number(n).toLocaleString(numLocale);

  const cancelReservation = async () => {
    if (!row || !window.confirm(t("guestPortal.detail.cancelConfirm"))) return;
    setCancelSaving(true);
    setCancelMsg(null);
    try {
      const res = await fetch(`/api/guest/reservations/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setCancelMsg(json.error ?? t("guestPortal.detail.cancelError"));
      } else {
        setCancelMsg(t("guestPortal.detail.cancelSuccess"));
        const refreshed = await fetch(`/api/guest/reservations/${params.id}`, {
          cache: "no-store",
        });
        const refreshedJson = (await refreshed.json()) as {
          reservation?: ReservationDetail;
        };
        setRow(refreshedJson.reservation ?? null);
      }
    } catch {
      setCancelMsg(t("guestPortal.detail.networkError"));
    } finally {
      setCancelSaving(false);
    }
  };

  const longLease = row?.contract_type === "long_stay_contract";
  const leaseTemplateEs = (
    longLease
      ? process.env.NEXT_PUBLIC_LONG_STAY_LEASE_TEMPLATE_ES_URL
      : process.env.NEXT_PUBLIC_SHORT_STAY_LEASE_TEMPLATE_ES_URL
  )?.trim() ?? "";
  const leaseTemplateEn = (
    longLease
      ? process.env.NEXT_PUBLIC_LONG_STAY_LEASE_TEMPLATE_EN_URL
      : process.env.NEXT_PUBLIC_SHORT_STAY_LEASE_TEMPLATE_EN_URL
  )?.trim() ?? "";
  return (
    <main className="min-h-screen bg-[var(--ivory)] px-6 pb-16 pt-24 text-[var(--charcoal)] md:px-10">
      <div className="mx-auto max-w-3xl space-y-6">
        {loading ? <p>{t("guestPortal.detail.loading")}</p> : null}
        {error ? <p className="text-red-700">{error}</p> : null}
        {row ? (
          <>
            <h1 className="font-[family-name:var(--heading-font)] text-3xl font-semibold">
              {row.public_id}
            </h1>

            <section className="rounded-2xl border border-[var(--dove-grey)]/70 bg-white p-5 text-sm">
              <h2 className="font-[family-name:var(--heading-font)] text-lg font-semibold text-[var(--charcoal)]">
                {t("guestPortal.detail.summaryTitle")}
              </h2>
              <div className="mt-4 space-y-1">
                <p>
                  {t("guestPortal.detail.checkIn")}: {row.check_in}
                </p>
                <p>
                  {t("guestPortal.detail.checkOut")}: {row.check_out}
                </p>
                <p>
                  {t("guestPortal.detail.nights")}: {row.nights}
                </p>
                <p>
                  {t("guestPortal.detail.guests")}: {row.guests}
                </p>
                <p>
                  {t("guestPortal.detail.total")}: {row.currency} {fmt(row.total_amount)}
                </p>
                <p>
                  {t("guestPortal.detail.cleaningFee")}: {row.currency}{" "}
                  {fmt(row.cleaning_fee)}
                </p>
                <p>
                  {t("guestPortal.detail.deposit")}: {row.currency}{" "}
                  {fmt(row.deposit_amount)}
                </p>
                <p>
                  {t("guestPortal.detail.stayType")}: {stayLabel}
                </p>
                <p>
                  {t("guestPortal.detail.contractType")}: {contractLabel}
                </p>
                <p>
                  {t("guestPortal.detail.bookingStatus")}: {row.booking_status}
                </p>
                <p>
                  {t("guestPortal.detail.paymentStatus")}: {row.payment_status}
                </p>
              </div>
              {showGuestCancel ? (
                <div className="mt-6 border-t border-[var(--dove-grey)]/60 pt-5">
                  <button
                    type="button"
                    onClick={() => void cancelReservation()}
                    disabled={cancelSaving}
                    className="rounded-full border border-red-700/40 bg-white px-5 py-2.5 text-xs font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50"
                  >
                    {cancelSaving
                      ? t("guestPortal.detail.cancelling")
                      : t("guestPortal.detail.cancelReservation")}
                  </button>
                  {cancelMsg ? (
                    <p className="mt-2 text-xs text-[var(--charcoal)]/80">{cancelMsg}</p>
                  ) : null}
                </div>
              ) : null}
            </section>

            {row && !isCancelled ? (
              <GuestDocumentsPanel reservationId={row.id} stayType={row.stay_type} />
            ) : null}

            {row && !hostAccepted && !isCancelled ? (
              <section className="rounded-2xl border border-[var(--dove-grey)]/70 bg-white p-5 text-sm text-[var(--charcoal)]/80">
                <p className="leading-relaxed">
                  {t("guestPortal.detail.awaitingStayConfirmation")}
                </p>
              </section>
            ) : null}

            {hostAccepted ? (
              <>
                <section className="rounded-2xl border border-[var(--dove-grey)]/70 bg-white p-5 text-sm">
                  <h2 className="font-[family-name:var(--heading-font)] text-lg font-semibold text-[var(--charcoal)]">
                    {t("guestPortal.detail.sectionContract")}
                  </h2>
                  <p className="mt-2 text-[var(--charcoal)]/70">{contractLabel}</p>

                  <div className="mt-4 space-y-3 rounded-xl border border-[var(--dove-grey)]/60 bg-[var(--ivory)]/60 p-4">
                      <p className="font-[family-name:var(--heading-font)] text-sm font-semibold">
                        {t("guestPortal.detail.leaseTemplatesTitle")}
                      </p>
                      <p className="text-xs leading-relaxed text-[var(--charcoal)]/75">
                        {t("guestPortal.detail.leaseTemplatesIntro")}
                      </p>
                      {!leaseTemplateEs && !leaseTemplateEn ? (
                        <p className="text-xs text-[var(--charcoal)]/65">
                          {t("guestPortal.detail.leaseTemplatesNotConfigured")}
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {leaseTemplateEs && isAllowedExternalDocUrl(leaseTemplateEs) ? (
                            <a
                              href={leaseTemplateEs}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex rounded-full bg-[var(--charcoal)] px-4 py-2 text-xs font-semibold text-white"
                            >
                              {t("guestPortal.detail.leaseTemplateEs")}
                            </a>
                          ) : null}
                          {leaseTemplateEn && isAllowedExternalDocUrl(leaseTemplateEn) ? (
                            <a
                              href={leaseTemplateEn}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex rounded-full border border-[var(--charcoal)] bg-white px-4 py-2 text-xs font-semibold text-[var(--charcoal)]"
                            >
                              {t("guestPortal.detail.leaseTemplateEn")}
                            </a>
                          ) : null}
                        </div>
                      )}
                    </div>

                  <p className="mt-4 text-sm leading-relaxed text-[var(--charcoal)]/80">
                    {t("guestPortal.detail.leaseContractSignInPerson")}
                  </p>
                </section>

                <section className="rounded-2xl border border-[var(--dove-grey)]/70 bg-white p-5 text-sm">
                  <h2 className="font-[family-name:var(--heading-font)] text-lg font-semibold text-[var(--charcoal)]">
                    {t("guestPortal.detail.sectionPayment")}
                  </h2>
                  <p className="mt-3">
                    <span className="font-medium">{t("guestPortal.detail.paymentStatus")}:</span>{" "}
                    {row.payment_status}
                  </p>
                  <StayPaymentPanel row={row} />
                </section>
              </>
            ) : null}
          </>
        ) : null}
        <p className="pt-2">
          <Link href="/guest/reservations" className="text-sm underline">
            {t("guestPortal.detail.backList")}
          </Link>
        </p>
      </div>
    </main>
  );
}
