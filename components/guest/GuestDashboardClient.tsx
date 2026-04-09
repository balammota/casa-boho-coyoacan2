"use client";

import Link from "next/link";
import { useI18n } from "@/components/providers/LanguageProvider";

export function GuestDashboardClient({ userEmail }: { userEmail: string }) {
  const { t } = useI18n();
  return (
    <main className="min-h-screen bg-[var(--ivory)] px-6 pb-16 pt-24 text-[var(--charcoal)] md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="font-[family-name:var(--heading-font)] text-3xl font-semibold text-[var(--charcoal)]">
            {t("guestPortal.dashboard.title")}
          </h1>
          <form action="/api/guest/logout" method="post">
            <button className="rounded-full border border-[var(--dove-grey)] px-4 py-2 text-sm">
              {t("guestPortal.dashboard.signOut")}
            </button>
          </form>
        </div>
        <p className="mt-2 text-sm text-[var(--charcoal)]/65">{userEmail}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/guest/reservations"
            className="rounded-2xl border border-[var(--dove-grey)]/60 bg-white p-5 shadow-soft"
          >
            {t("guestPortal.dashboard.myReservations")}
          </Link>
          <Link
            href="/guest/profile"
            className="rounded-2xl border border-[var(--dove-grey)]/60 bg-white p-5 shadow-soft"
          >
            {t("guestPortal.dashboard.profileSettings")}
          </Link>
        </div>
      </div>
    </main>
  );
}
