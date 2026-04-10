"use client";

import { format, parseISO } from "date-fns";
import { enUS, es as esLocale } from "date-fns/locale";
import { useMemo, useState } from "react";
import { useI18n } from "@/components/providers/LanguageProvider";
import { getLongStayPaymentInstructions } from "@/lib/reservations/long-stay-payment-instructions";
import { getShortStayPaymentInstructions } from "@/lib/reservations/short-stay-payment-instructions";

const BANK_TRANSFER_MXN = {
  bank: "BBVA México",
  beneficiary: "Alejandro Balam Mota Carrillo",
  clabe: "012 180 01541509141 3",
  account: "154 150 9141",
} as const;

/** Zelle (USD); mismo número que aparece en la app. */
const ZELLE_PHONE_DISPLAY = "+1 (725) 260-6690";

/** QR estático en `public/images/Balams_qr_code.jpeg`. */
const ZELLE_QR_PUBLIC_PATH = "/images/Balams_qr_code.jpeg";

export type StayPaymentPanelRow = {
  public_id: string;
  check_in: string;
  contract_type: "short_stay_contract" | "long_stay_contract";
  deposit_amount: number;
  total_amount: number;
  cleaning_fee: number;
  currency: "MXN" | "USD";
};
type MoneyCurrency = "MXN" | "USD";

function formatMoney(amount: number, currency: "MXN" | "USD", lang: "es" | "en") {
  const localeTag = lang === "es" ? "es-MX" : "en-US";
  return new Intl.NumberFormat(localeTag, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function StayPaymentPanel({ row }: { row: StayPaymentPanelRow }) {
  const { t, locale } = useI18n();
  const lang = locale === "en" ? "en" : "es";
  const isLong = row.contract_type === "long_stay_contract";
  const [displayCurrency, setDisplayCurrency] = useState<MoneyCurrency>(row.currency);
  const mxnPerUsd = useMemo(() => {
    const raw = Number(process.env.NEXT_PUBLIC_MXN_PER_USD ?? "17");
    return Number.isFinite(raw) && raw > 0 ? raw : 17;
  }, []);

  const toDisplay = (amount: number): number => {
    if (displayCurrency === row.currency) return amount;
    if (row.currency === "MXN" && displayCurrency === "USD") return amount / mxnPerUsd;
    return amount * mxnPerUsd;
  };

  const money = (amount: number) => formatMoney(toDisplay(amount), displayCurrency, lang);

  const monthly = row.deposit_amount;
  const deposit = row.deposit_amount;
  const longTotal = monthly + deposit;
  const shortStayQuoted = row.total_amount;
  const cleaning = row.cleaning_fee;
  const shortGrandTotal = shortStayQuoted + cleaning;

  const cashEnvelopeTotal = isLong ? longTotal : shortGrandTotal;

  const dateLocale = lang === "es" ? esLocale : enUS;
  const signingDate = format(parseISO(row.check_in), "EEEE d MMMM yyyy", {
    locale: dateLocale,
  });
  const intro = isLong
    ? getLongStayPaymentInstructions(locale)
    : getShortStayPaymentInstructions(locale);

  const transferFields = (
    <dl className="mt-3 space-y-2 text-xs text-[var(--charcoal)]/90">
      <div>
        <dt className="font-semibold text-[var(--charcoal)]">
          {t("guestPortal.detail.longStayPayBank")}
        </dt>
        <dd>{BANK_TRANSFER_MXN.bank}</dd>
      </div>
      <div>
        <dt className="font-semibold text-[var(--charcoal)]">
          {t("guestPortal.detail.longStayPayBeneficiary")}
        </dt>
        <dd>{BANK_TRANSFER_MXN.beneficiary}</dd>
      </div>
      <div>
        <dt className="font-semibold text-[var(--charcoal)]">
          {t("guestPortal.detail.longStayPayClabe")}
        </dt>
        <dd className="font-mono">{BANK_TRANSFER_MXN.clabe}</dd>
      </div>
      <div>
        <dt className="font-semibold text-[var(--charcoal)]">
          {t("guestPortal.detail.longStayPayAccount")}
        </dt>
        <dd className="font-mono">{BANK_TRANSFER_MXN.account}</dd>
      </div>
      <div>
        <dt className="font-semibold text-[var(--charcoal)]">
          {t("guestPortal.detail.longStayPayReference")}
        </dt>
        <dd className="font-mono">{row.public_id}</dd>
      </div>
    </dl>
  );

  return (
    <div className="mt-3 space-y-5">
      <p className="whitespace-pre-line leading-relaxed text-[var(--charcoal)]/85">{intro}</p>

      <div className="rounded-2xl border border-[var(--dove-grey)]/70 bg-[var(--ivory)]/80 p-4">
        <p className="font-[family-name:var(--heading-font)] text-sm font-semibold text-[var(--charcoal)]">
          {isLong
            ? t("guestPortal.detail.longStayPayDueTitle")
            : t("guestPortal.detail.shortStayPayDueTitle")}
        </p>
        {isLong ? (
          <ul className="mt-3 space-y-2 text-sm text-[var(--charcoal)]/90">
            <li className="flex flex-wrap justify-between gap-2">
              <span>{t("guestPortal.detail.longStayPayFirstMonth")}</span>
              <span className="font-semibold tabular-nums">
                {money(monthly)}
              </span>
            </li>
            <li className="flex flex-wrap justify-between gap-2">
              <span>{t("guestPortal.detail.longStayPayDepositLine")}</span>
              <span className="font-semibold tabular-nums">
                {money(deposit)}
              </span>
            </li>
            <li className="flex flex-wrap justify-between gap-2 border-t border-[var(--dove-grey)]/50 pt-2 text-base">
              <span className="font-semibold">{t("guestPortal.detail.longStayPayTotal")}</span>
              <span className="font-bold tabular-nums text-[var(--charcoal)]">
                {money(longTotal)}
              </span>
            </li>
          </ul>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-[var(--charcoal)]/90">
            <li className="flex flex-wrap justify-between gap-2">
              <span>{t("guestPortal.detail.shortStayPayQuotedTotal")}</span>
              <span className="font-semibold tabular-nums">
                {money(shortStayQuoted)}
              </span>
            </li>
            {cleaning > 0 ? (
              <li className="flex flex-wrap justify-between gap-2">
                <span>{t("guestPortal.detail.shortStayPayCleaningFee")}</span>
                <span className="font-semibold tabular-nums">
                  {money(cleaning)}
                </span>
              </li>
            ) : null}
            <li className="flex flex-wrap justify-between gap-2 border-t border-[var(--dove-grey)]/50 pt-2 text-base">
              <span className="font-semibold">{t("guestPortal.detail.shortStayPayTotalDue")}</span>
              <span className="font-bold tabular-nums text-[var(--charcoal)]">
                {money(shortGrandTotal)}
              </span>
            </li>
          </ul>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--dove-grey)]/50 pt-3">
          <span className="text-xs text-[var(--charcoal)]/65">{t("guestPortal.detail.viewAmountsIn")}</span>
          <div className="inline-flex rounded-full border border-[var(--dove-grey)]/70 bg-white p-1">
            {(["MXN", "USD"] as const).map((cur) => (
              <button
                key={cur}
                type="button"
                onClick={() => setDisplayCurrency(cur)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  displayCurrency === cur
                    ? "bg-[var(--gold)] text-white"
                    : "text-[var(--charcoal)]/75"
                }`}
                aria-pressed={displayCurrency === cur}
              >
                {cur}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-[var(--charcoal)]/80">
          <span className="font-semibold">
            {isLong
              ? t("guestPortal.detail.longStayPaySigningDate")
              : t("guestPortal.detail.shortStayPaySigningDate")}
          </span>
          <br />
          <span>{signingDate}</span>
        </p>
      </div>

      <p className="text-xs font-medium text-amber-800/90">
        {t("guestPortal.detail.longStayPayPlaceholderWarning")}{" "}
        <span className="font-normal text-[var(--charcoal)]/80">
          {t("guestPortal.detail.fxApprox", { rate: mxnPerUsd.toFixed(2) })}
        </span>
      </p>

      <div className="space-y-3">
        <div className="rounded-2xl border-2 border-[var(--dove-grey)]/60 bg-white p-4 shadow-sm">
          <p className="font-[family-name:var(--heading-font)] text-sm font-semibold text-[var(--charcoal)]">
            {t("guestPortal.detail.longStayPayTransferBubble")}
          </p>
          {lang === "en" ? (
            <p className="mt-1 text-xs text-[var(--charcoal)]/65">
              {t("guestPortal.detail.longStayPayTransferMxnNoteEn")}
            </p>
          ) : null}
          {transferFields}
        </div>

        {lang === "en" ? (
          <div className="rounded-2xl border-2 border-[var(--dove-grey)]/60 bg-white p-4 shadow-sm">
            <p className="font-[family-name:var(--heading-font)] text-sm font-semibold text-[var(--charcoal)]">
              {t("guestPortal.detail.longStayPayZelleBubble")}
            </p>
            <p className="mt-2 text-xs text-[var(--charcoal)]/75">
              {t("guestPortal.detail.longStayPayZelleIntro")}
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-[var(--charcoal)]">
              {ZELLE_PHONE_DISPLAY}
            </p>
            <div className="mt-3 flex justify-center">
              <img
                src={ZELLE_QR_PUBLIC_PATH}
                alt={t("guestPortal.detail.longStayPayZelleQrAlt")}
                width={240}
                height={240}
                className="max-h-64 max-w-[min(100%,260px)] rounded-lg border border-[var(--dove-grey)]/40 bg-white object-contain p-2"
              />
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border-2 border-[var(--dove-grey)]/60 bg-white p-4 shadow-sm">
          <p className="font-[family-name:var(--heading-font)] text-sm font-semibold text-[var(--charcoal)]">
            {t("guestPortal.detail.longStayPayCashBubble")}
          </p>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[var(--charcoal)]/85">
            {t("guestPortal.detail.longStayPayCashInstructions", {
              total: money(cashEnvelopeTotal),
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
