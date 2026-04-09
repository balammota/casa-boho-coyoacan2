"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { GuestAuthLoadingFallback } from "@/components/guest/GuestAuthLoadingFallback";
import { useI18n } from "@/components/providers/LanguageProvider";
import { tryCreateBrowserSupabaseClient } from "@/lib/supabase/client";

function GuestLoginForm() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("reservation");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = tryCreateBrowserSupabaseClient();
    if (!supabase) {
      setError(t("guestPortal.login.supabaseNotConfigured"));
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    router.push(
      reservationId
        ? `/guest/reservations/${encodeURIComponent(reservationId)}`
        : "/guest/dashboard"
    );
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[var(--ivory)] px-6 pb-20 pt-24 text-[var(--charcoal)] md:px-10">
      <div className="mx-auto max-w-md rounded-3xl border border-[var(--dove-grey)]/70 bg-[var(--white)] p-8 shadow-soft">
        <h1 className="text-center font-[family-name:var(--heading-font)] text-2xl font-semibold">
          {t("guestPortal.login.title")}
        </h1>
        <div className="mt-3 text-center">
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-[var(--dove-grey)]/80 px-4 py-2 text-xs font-semibold tracking-[0.08em] text-[var(--charcoal)]/80 transition-colors hover:border-[var(--gold)]/60 hover:text-[var(--dark-gold)]"
          >
            {t("guestPortal.chrome.backToSite")}
          </Link>
        </div>
        <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="font-medium">{t("guestPortal.login.email")}</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--dove-grey)] px-4 py-3"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">{t("guestPortal.login.password")}</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--dove-grey)] px-4 py-3"
            />
          </label>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[var(--gold)] py-3 text-sm font-semibold text-white"
          >
            {submitting ? t("guestPortal.login.signingIn") : t("guestPortal.login.signIn")}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--charcoal)]/70">
          {t("guestPortal.login.noAccount")}{" "}
          <Link
            href={
              reservationId
                ? `/guest/register?reservation=${encodeURIComponent(reservationId)}`
                : "/guest/register"
            }
            className="text-[var(--gold)] underline"
          >
            {t("guestPortal.login.createOne")}
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function GuestLoginPage() {
  return (
    <Suspense fallback={<GuestAuthLoadingFallback />}>
      <GuestLoginForm />
    </Suspense>
  );
}
