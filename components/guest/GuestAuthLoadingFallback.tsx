"use client";

import { useI18n } from "@/components/providers/LanguageProvider";

export function GuestAuthLoadingFallback() {
  const { t } = useI18n();
  return (
    <main className="min-h-screen bg-[var(--ivory)] px-6 pb-20 pt-24 text-[var(--charcoal)] md:px-10">
      <div className="mx-auto max-w-md rounded-3xl border border-[var(--dove-grey)]/70 bg-[var(--white)] p-8 shadow-soft">
        <p className="text-center text-sm text-[var(--charcoal)]/60">
          {t("guestPortal.login.loading")}
        </p>
      </div>
    </main>
  );
}
