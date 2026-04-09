"use client";

import { MotionSection } from "./MotionSection";
import { useI18n } from "@/components/providers/LanguageProvider";

/** Zona aproximada: colonia Parque San Andrés, Coyoacán (sin dirección exacta). */
const MAP_EMBED =
  "https://maps.google.com/maps?q=Parque+San+Andr%C3%A9s,+Coyoac%C3%A1n,+Ciudad+de+M%C3%A9xico&hl=es&z=15&output=embed";

export function Location() {
  const { t } = useI18n();

  return (
    <MotionSection
      id="location"
      className="bg-[var(--ivory)] px-6 py-24 md:px-10 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
            {t("location.kicker")}
          </p>
          <h2 className="mt-3 font-[family-name:var(--heading-font)] text-3xl font-semibold text-[var(--charcoal)] md:text-4xl">
            {t("location.heading")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-[var(--charcoal)]/80">
            {t("location.bodyPrefix")}{" "}
            <span className="font-medium text-[var(--charcoal)]">
              {t("location.area")}
            </span>
            {t("location.bodySuffix")}
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-3xl border border-[var(--dove-grey)]/60 shadow-soft-lg">
          <div className="relative aspect-[16/10] w-full bg-[var(--dove-grey)] md:aspect-[21/9]">
            <iframe
              title={t("location.mapTitle")}
              src={MAP_EMBED}
              className="absolute inset-0 h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </MotionSection>
  );
}
