"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useI18n } from "@/components/providers/LanguageProvider";

/** Imagen en disco: public/images/sala-main2.jpeg → URL /images/sala-main2.jpeg */
const HERO_IMAGE = "/images/sala-main2.jpeg";

export function Hero() {
  const { t } = useI18n();

  return (
    <section
      id="home"
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0">
        <Image
          src={HERO_IMAGE}
          alt={t("hero.imageAlt")}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-[var(--charcoal)]/55 via-[var(--charcoal)]/35 to-[var(--ivory)]/90"
          aria-hidden
        />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 pb-32 pt-28 text-center md:px-8 md:pb-40 md:pt-32">
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="font-[family-name:var(--heading-font)] text-4xl font-semibold tracking-tight text-[var(--white)] text-balance drop-shadow-sm md:text-6xl md:leading-tight"
        >
          {t("hero.title")}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--white)] drop-shadow-sm md:text-xl"
        >
          {t("hero.subtitle")}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10"
        >
          <a
            href="#about"
            className="inline-flex items-center justify-center rounded-full bg-[var(--gold)] px-8 py-3.5 text-sm font-semibold uppercase tracking-wider text-[var(--white)] shadow-soft transition-all duration-300 hover:bg-[var(--dark-gold)] hover:shadow-soft-lg"
          >
            {t("hero.cta")}
          </a>
        </motion.div>
      </div>
    </section>
  );
}
