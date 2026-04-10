"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { testimonials } from "@/data/testimonials";
import { MotionSection } from "./MotionSection";
import { useI18n } from "@/components/providers/LanguageProvider";
import { testimonialOverrides } from "@/lib/i18n/testimonials-locale";

export function Testimonials() {
  const { t, locale } = useI18n();
  const es = testimonialOverrides.es;
  const reduceMotion = useReducedMotion();
  const [mobileIndex, setMobileIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const pointerStartX = useRef<number | null>(null);

  const slideVariants = useMemo(
    () => ({
      enter: (d: 1 | -1) => ({ x: d > 0 ? "100%" : "-100%" }),
      center: { x: "0%" },
      exit: (d: 1 | -1) => ({ x: d > 0 ? "-100%" : "100%" }),
    }),
    []
  );

  const slideTransition = useMemo(
    () =>
      reduceMotion
        ? { type: "tween" as const, duration: 0.2, ease: "easeOut" as const }
        : {
            type: "tween" as const,
            duration: 0.95,
            ease: [0.22, 0.1, 0.22, 1] as const,
          },
    [reduceMotion]
  );

  const goNext = () => {
    setDir(1);
    setMobileIndex((i) => (i + 1) % testimonials.length);
  };
  const goPrev = () => {
    setDir(-1);
    setMobileIndex((i) => (i - 1 + testimonials.length) % testimonials.length);
  };

  const active = testimonials[mobileIndex];
  const activeLoc = locale === "es" ? es?.[active.id] : undefined;
  const activeText = activeLoc?.text ?? active.text;
  const activeCountry = activeLoc?.country ?? active.country;
  const swipeThreshold = 40;

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

        <div className="mt-14 hidden gap-8 min-[500px]:grid md:grid-cols-2">
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

        <div className="mt-10 min-[500px]:hidden">
          <div className="relative overflow-hidden rounded-3xl bg-[var(--dove-grey)]/35 p-2 shadow-soft-lg">
            <div className="relative min-h-[290px] overflow-hidden">
              <AnimatePresence initial={false} mode="sync" custom={dir}>
                <motion.article
                  key={active.id}
                  custom={dir}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={slideTransition}
                  className="absolute inset-0 rounded-3xl bg-[var(--blush-pink)]/90 p-7 shadow-soft"
                  onPointerDown={(e) => {
                    pointerStartX.current = e.clientX;
                  }}
                  onPointerUp={(e) => {
                    if (pointerStartX.current === null) return;
                    const dx = e.clientX - pointerStartX.current;
                    pointerStartX.current = null;
                    if (dx < -swipeThreshold) goNext();
                    else if (dx > swipeThreshold) goPrev();
                  }}
                  onPointerCancel={() => {
                    pointerStartX.current = null;
                  }}
                >
                  <div
                    className="flex gap-1 text-[var(--gold)]"
                    aria-label={t("testimonials.stars", { n: active.stars })}
                  >
                    {Array.from({ length: active.stars }).map((_, si) => (
                      <Star key={si} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="mt-5 text-base leading-relaxed text-[var(--charcoal)]/90">
                    &ldquo;{activeText}&rdquo;
                  </p>
                  <footer className="mt-7 border-t border-[var(--charcoal)]/10 pt-5">
                    <p className="font-semibold text-[var(--charcoal)]">
                      {active.name}
                    </p>
                    <p className="text-sm text-[var(--charcoal)]/60">
                      {activeCountry}
                    </p>
                  </footer>
                </motion.article>
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={goPrev}
              className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--dove-grey)] bg-[var(--white)]/95 text-[var(--charcoal)] shadow-soft"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--dove-grey)] bg-[var(--white)]/95 text-[var(--charcoal)] shadow-soft"
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>

          <div className="mt-5 flex justify-center gap-2" role="tablist" aria-label="Testimonials position">
            {testimonials.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={i === mobileIndex}
                onClick={() => {
                  setDir(i > mobileIndex ? 1 : -1);
                  setMobileIndex(i);
                }}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  i === mobileIndex
                    ? "w-8 bg-[var(--gold)]"
                    : "w-2.5 bg-[var(--dove-grey)]"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </MotionSection>
  );
}
