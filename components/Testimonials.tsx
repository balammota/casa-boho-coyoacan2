"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { testimonials } from "@/data/testimonials";
import { MotionSection } from "./MotionSection";
import { useI18n } from "@/components/providers/LanguageProvider";
import { testimonialOverrides } from "@/lib/i18n/testimonials-locale";

export function Testimonials() {
  const { t, locale } = useI18n();
  const es = testimonialOverrides.es;

  return (
    <MotionSection
      id="testimonials"
      className="bg-[var(--ivory)] px-6 py-24 md:px-10 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
            {t("testimonials.kicker")}
          </p>
          <h2 className="mt-3 font-[family-name:var(--heading-font)] text-3xl font-semibold text-[var(--charcoal)] md:text-4xl">
            {t("testimonials.heading")}
          </h2>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-2">
          {testimonials.map((item, i) => {
            const loc = locale === "es" ? es?.[item.id] : undefined;
            const text = loc?.text ?? item.text;
            const country = loc?.country ?? item.country;
            return (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.55,
                  delay: i * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="rounded-3xl bg-[var(--blush-pink)]/90 p-8 shadow-soft transition-shadow duration-300 hover:shadow-soft-lg"
              >
                <div
                  className="flex gap-1 text-[var(--gold)]"
                  aria-label={t("testimonials.stars", { n: item.stars })}
                >
                  {Array.from({ length: item.stars }).map((_, si) => (
                    <Star key={si} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-5 text-lg leading-relaxed text-[var(--charcoal)]/90">
                  &ldquo;{text}&rdquo;
                </p>
                <footer className="mt-8 border-t border-[var(--charcoal)]/10 pt-6">
                  <p className="font-semibold text-[var(--charcoal)]">{item.name}</p>
                  <p className="text-sm text-[var(--charcoal)]/60">{country}</p>
                </footer>
              </motion.article>
            );
          })}
        </div>
      </div>
    </MotionSection>
  );
}
