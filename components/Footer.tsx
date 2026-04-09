"use client";

import Link from "next/link";
import { useI18n } from "@/components/providers/LanguageProvider";

const showGuestPortal =
  process.env.NEXT_PUBLIC_ENABLE_GUEST_PORTAL === "true";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="bg-[var(--charcoal)] px-6 py-16 text-[var(--white)] md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 text-center">
        <div>
          <p className="font-[family-name:var(--heading-font)] text-xl font-semibold">
            Casa Boho Coyoacán
          </p>
          <p className="mt-2 text-sm text-[var(--white)]/70">{t("footer.city")}</p>
        </div>

        <nav
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium uppercase tracking-[0.12em] text-[var(--white)]/45"
          aria-label={t("footer.utilitiesNav")}
        >
          <Link
            href="/admin"
            className="transition-colors hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
          >
            {t("footer.hostAdmin")}
          </Link>
          {showGuestPortal ? (
            <Link
              href="/guest"
              className="transition-colors hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
            >
              {t("footer.guestPortal")}
            </Link>
          ) : null}
        </nav>

        <p className="text-sm text-[var(--white)]/55">
          {t("footer.rights", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
