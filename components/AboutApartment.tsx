"use client";

import { useMemo } from "react";
import { MotionSection } from "./MotionSection";
import { useBookingData } from "@/hooks/useBookingData";
import { useI18n } from "@/components/providers/LanguageProvider";
import { formatMoneyAmount } from "@/lib/format-money";

const amenityKeys = [
  "about.amenities.a1",
  "about.amenities.a2",
  "about.amenities.a3",
  "about.amenities.a4",
  "about.amenities.a5",
  "about.amenities.a6",
  "about.amenities.a7",
  "about.amenities.a8",
] as const;

export function AboutApartment() {
  const { t, currency } = useI18n();
  const { ratesMxn, ratesUsd } = useBookingData();
  const rates = currency === "USD" ? ratesUsd : ratesMxn;

  const pricingTiers = useMemo(
    () =>
      [
        {
          id: "night",
          labelKey: "about.pricingNight" as const,
          amount: rates.night,
          accent: false,
        },
        {
          id: "week",
          labelKey: "about.pricingWeek" as const,
          amount: rates.week,
          accent: true,
        },
        {
          id: "month",
          labelKey: "about.pricingMonth" as const,
          amount: rates.month,
          accent: false,
        },
      ] as const,
    [rates]
  );

  return (
    <MotionSection
      id="about"
      className="bg-[var(--white)] px-6 py-24 md:px-10 md:py-32"
    >
      <div className="mx-auto max-w-3xl lg:max-w-5xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
            {t("about.kicker")}
          </p>
          <h2 className="mt-3 font-[family-name:var(--heading-font)] text-3xl font-semibold text-[var(--charcoal)] md:text-4xl">
            {t("about.heading")}
          </h2>
        </div>

        <p className="mt-10 text-lg leading-relaxed text-[var(--charcoal)]/85">
          {t("about.intro")}
        </p>

        <p className="mt-10 text-lg font-medium text-[var(--charcoal)]">
          {t("about.amenitiesIntro")}
        </p>

        <ul className="mt-6 space-y-4">
          {amenityKeys.map((key) => (
            <li
              key={key}
              className="flex items-start gap-3 text-[var(--charcoal)]/85"
            >
              <span
                className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--gold)]"
                aria-hidden
              />
              <span className="leading-relaxed">{t(key)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-14">
          <p className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
            {t("about.pricingKicker")}
          </p>
          <div className="mt-8 flex flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-5">
            {pricingTiers.map((tier) => (
              <div
                key={tier.id}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center rounded-[999px] border px-8 py-7 text-center transition-all duration-300 sm:min-w-[200px] sm:flex-none sm:px-10 sm:py-8 ${
                  tier.accent
                    ? "border-[var(--gold)]/50 bg-[var(--ivory)] shadow-soft-lg ring-2 ring-[var(--gold)]/20"
                    : "border-[var(--dove-grey)]/70 bg-[var(--white)] shadow-soft hover:border-[var(--gold)]/35 hover:shadow-soft-lg"
                }`}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--charcoal)]/50">
                  {t(tier.labelKey)}
                </span>
                <span className="mt-2 font-[family-name:var(--heading-font)] text-2xl font-semibold tabular-nums text-[var(--charcoal)] sm:text-3xl md:text-4xl">
                  {formatMoneyAmount(tier.amount, currency)}
                </span>
                <span className="mt-1 text-xs font-semibold tracking-[0.12em] text-[var(--charcoal)]/55">
                  {currency}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-[var(--charcoal)]/55">
            {t("about.pricingFootnote")}
          </p>
        </div>
      </div>
    </MotionSection>
  );
}
