"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useI18n } from "@/components/providers/LanguageProvider";
import type { Locale } from "@/lib/i18n/types";

const navHrefs = [
  "#home",
  "#about",
  "#neighborhood",
  "#gallery",
  "#testimonials",
  "#house-rules",
  "#location",
] as const;

const navKeys = [
  "nav.home",
  "nav.about",
  "nav.neighborhood",
  "nav.gallery",
  "nav.testimonials",
  "nav.houseRules",
  "nav.location",
] as const;

function LangButton({
  code,
  active,
  label,
  onSelect,
}: {
  code: Locale;
  active: boolean;
  label: string;
  onSelect: (l: Locale) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(code)}
      aria-pressed={active}
      className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wide transition-colors ${
        active
          ? "bg-[var(--gold)] text-[var(--white)]"
          : "text-[var(--charcoal)]/60 hover:bg-[var(--blush-pink)]/50 hover:text-[var(--charcoal)]"
      }`}
    >
      {label}
    </button>
  );
}

export function Navbar() {
  const { t, locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`fixed left-4 right-4 top-4 z-50 mx-auto max-w-6xl transition-all duration-300 md:left-8 md:right-8 ${
        scrolled ? "md:top-3" : ""
      }`}
    >
      <nav
        className={`flex items-center justify-between gap-4 rounded-2xl px-5 py-3 backdrop-blur-md transition-all duration-300 ${
          scrolled
            ? "border border-[var(--dove-grey)]/60 bg-[var(--white)]/85 shadow-soft-lg"
            : "border border-white/30 bg-[var(--charcoal)]/20 shadow-none"
        }`}
        aria-label="Main"
      >
        <Link
          href="#home"
          className={`font-[family-name:var(--heading-font)] text-lg font-semibold tracking-tight transition-colors ${
            scrolled
              ? "text-[var(--charcoal)] hover:text-[var(--dark-gold)]"
              : "text-[var(--white)] hover:text-[var(--ivory)]"
          }`}
          onClick={() => setOpen(false)}
        >
          Casa Boho Coyoacán
        </Link>

        <div className="hidden items-center gap-2 lg:flex">
          <a
            href="#book-tour"
            className={`rounded-full px-4 py-2.5 text-sm font-semibold text-[var(--white)] shadow-soft transition-all duration-300 ${
              scrolled
                ? "bg-[var(--gold)] hover:bg-[var(--dark-gold)] hover:shadow-soft-lg"
                : "bg-[var(--gold)]/90 hover:bg-[var(--gold)]"
            }`}
          >
            {t("nav.bookTour")}
          </a>
          <Link
            href="/guest"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              scrolled
                ? "border border-[var(--dove-grey)]/70 text-[var(--charcoal)] hover:border-[var(--gold)]/50 hover:text-[var(--dark-gold)]"
                : "border border-white/40 text-[var(--white)] hover:border-white/70 hover:text-[var(--ivory)]"
            }`}
          >
            {t("footer.guestPortal")}
          </Link>
          <div
            className="ml-1 flex items-center gap-0.5 border-l border-[var(--dove-grey)]/60 pl-2"
            role="group"
            aria-label={t("nav.language")}
          >
            <LangButton
              code="en"
              active={locale === "en"}
              label="EN"
              onSelect={setLocale}
            />
            <LangButton
              code="es"
              active={locale === "es"}
              label="ES"
              onSelect={setLocale}
            />
          </div>
        </div>

        <div className="hidden items-center gap-2 min-[500px]:flex lg:hidden">
          <a
            href="#book-tour"
            className="rounded-full bg-[var(--gold)] px-3.5 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--white)] shadow-soft"
          >
            {t("nav.bookTour")}
          </a>
          <Link
            href="/guest"
            className="rounded-full border border-[var(--dove-grey)]/70 px-3 py-2 text-xs font-semibold text-[var(--charcoal)]"
          >
            {t("footer.guestPortal")}
          </Link>
        </div>

        <button
          type="button"
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
            scrolled
              ? "border border-[var(--dove-grey)] bg-[var(--ivory)] text-[var(--charcoal)] hover:border-[var(--gold)]/40 hover:text-[var(--dark-gold)]"
              : "border-white/40 bg-white/10 text-[var(--white)] hover:border-white/70"
          }`}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={`mt-3 max-h-[calc(100vh-7.5rem)] overflow-y-auto overscroll-contain rounded-2xl p-4 shadow-soft-lg backdrop-blur-md ${
              scrolled
                ? "border border-[var(--dove-grey)]/60 bg-[var(--white)]/95"
                : "border border-white/30 bg-[var(--charcoal)]/50"
            }`}
          >
            <div className="mb-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
              <a
                href="#book-tour"
                className={`rounded-full px-4 py-2.5 text-center text-sm font-semibold text-[var(--white)] transition-all ${
                  scrolled
                    ? "bg-[var(--gold)] hover:bg-[var(--dark-gold)]"
                    : "bg-[var(--gold)]/90 hover:bg-[var(--gold)]"
                }`}
                onClick={() => setOpen(false)}
              >
                {t("nav.bookTour")}
              </a>
              <Link
                href="/guest"
                className={`rounded-full px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                  scrolled
                    ? "border border-[var(--dove-grey)]/70 text-[var(--charcoal)] hover:border-[var(--gold)]/50 hover:text-[var(--dark-gold)]"
                    : "border border-white/40 text-[var(--white)] hover:border-white/70 hover:text-[var(--ivory)]"
                }`}
                onClick={() => setOpen(false)}
              >
                {t("footer.guestPortal")}
              </Link>
            </div>
            <ul className="flex flex-col gap-1">
              {navHrefs.map((href, i) => {
                return (
                  <li key={href}>
                    <a
                      href={href}
                      className={`block rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                        scrolled
                          ? "text-[var(--charcoal)] hover:bg-[var(--blush-pink)]/60 hover:text-[var(--dark-gold)]"
                          : "text-[var(--white)] hover:bg-white/15 hover:text-[var(--ivory)]"
                      }`}
                      onClick={() => setOpen(false)}
                    >
                      {t(navKeys[i])}
                    </a>
                  </li>
                );
              })}
            </ul>
            <div
              className={`mt-4 flex items-center justify-center gap-2 border-t pt-4 ${
                scrolled ? "border-[var(--dove-grey)]/50" : "border-white/25"
              }`}
              role="group"
              aria-label={t("nav.language")}
            >
              <span
                className={`text-xs ${
                  scrolled ? "text-[var(--charcoal)]/50" : "text-[var(--white)]/75"
                }`}
              >
                {t("nav.language")}:
              </span>
              <LangButton
                code="en"
                active={locale === "en"}
                label={t("nav.english")}
                onSelect={(l) => {
                  setLocale(l);
                  setOpen(false);
                }}
              />
              <LangButton
                code="es"
                active={locale === "es"}
                label={t("nav.spanish")}
                onSelect={(l) => {
                  setLocale(l);
                  setOpen(false);
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
