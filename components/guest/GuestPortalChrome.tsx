"use client";

import Link from "next/link";
import { useI18n } from "@/components/providers/LanguageProvider";
import type { Locale } from "@/lib/i18n/types";

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
          : "text-[var(--charcoal)]/55 hover:bg-[var(--blush-pink)]/50 hover:text-[var(--charcoal)]"
      }`}
    >
      {label}
    </button>
  );
}

export function GuestPortalChrome() {
  const { t, locale, setLocale } = useI18n();
  return (
    <header className="fixed left-0 right-0 top-0 z-[60] border-b border-[var(--dove-grey)]/40 bg-[var(--ivory)]/92 px-4 py-3 backdrop-blur-md md:px-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <Link
          href="/"
          className="text-xs font-semibold tracking-[0.06em] text-[var(--charcoal)]/80 underline-offset-4 hover:text-[var(--dark-gold)] hover:underline"
        >
          {t("guestPortal.chrome.backToSite")}
        </Link>
        <div
          className="flex items-center gap-1 rounded-xl border border-[var(--dove-grey)]/50 bg-[var(--white)]/90 px-1.5 py-1"
          role="group"
          aria-label={t("nav.language")}
        >
          <LangButton code="en" active={locale === "en"} label="EN" onSelect={setLocale} />
          <LangButton code="es" active={locale === "es"} label="ES" onSelect={setLocale} />
        </div>
      </div>
    </header>
  );
}
