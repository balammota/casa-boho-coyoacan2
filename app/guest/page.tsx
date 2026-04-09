"use client";

import Link from "next/link";
import { useI18n } from "@/components/providers/LanguageProvider";

export default function GuestPortalPage() {
  const { t } = useI18n();

  return (
    <main className="min-h-screen bg-[var(--ivory)] px-6 pb-24 pt-24 text-[var(--charcoal)] md:px-10">
      <div className="mx-auto max-w-lg text-center">
        <h1 className="font-[family-name:var(--heading-font)] text-3xl font-semibold">
          {t("guestPage.kicker")}
        </h1>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link
            href="/guest/login"
            className="rounded-full bg-[var(--gold)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            {t("guestPortal.landing.signIn")}
          </Link>
          <Link
            href="/guest/register"
            className="rounded-full border border-[var(--dove-grey)] px-5 py-2.5 text-sm font-semibold text-[var(--charcoal)]"
          >
            {t("guestPortal.landing.createAccount")}
          </Link>
        </div>
        <p className="mt-10">
          <Link
            href="/"
            className="text-sm font-semibold text-[var(--gold)] underline-offset-4 hover:underline"
          >
            {t("guestPage.back")}
          </Link>
        </p>
      </div>
    </main>
  );
}
