"use client";

import Image from "next/image";
import { MotionSection } from "./MotionSection";
import { useI18n } from "@/components/providers/LanguageProvider";

/** Coloca el archivo en: public/images/coyoacan.jpg */
const STREET_IMAGE = "/images/coyoacan.jpg";

const highlightKeys = [
  "neighborhood.h1",
  "neighborhood.h2",
  "neighborhood.h3",
  "neighborhood.h4",
] as const;

export function Neighborhood() {
  const { t } = useI18n();

  return (
    <MotionSection
      id="neighborhood"
      className="bg-[var(--ivory)] px-6 py-24 md:px-10 md:py-32"
    >
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl shadow-soft-lg md:aspect-[3/4]">
          <Image
            src={STREET_IMAGE}
            alt={t("neighborhood.imageAlt")}
            fill
            className="object-cover transition-transform duration-700 hover:scale-[1.02]"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
        <div className="flex flex-col justify-center space-y-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
              {t("neighborhood.kicker")}
            </p>
            <h2 className="mt-3 font-[family-name:var(--heading-font)] text-3xl font-semibold text-[var(--charcoal)] md:text-4xl">
              {t("neighborhood.heading")}
            </h2>
          </div>
          <p className="text-lg leading-relaxed text-[var(--charcoal)]/80">
            {t("neighborhood.body")}
          </p>
          <ul className="space-y-4">
            {highlightKeys.map((key) => (
              <li
                key={key}
                className="flex items-start gap-3 text-[var(--charcoal)]/85"
              >
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--gold)]"
                  aria-hidden
                />
                <span className="leading-relaxed">{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </MotionSection>
  );
}
