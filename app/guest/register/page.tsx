"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { GuestAuthLoadingFallback } from "@/components/guest/GuestAuthLoadingFallback";
import { useI18n } from "@/components/providers/LanguageProvider";
import {
  formatGuestSignupError,
  shouldRetrySignupWithoutRedirect,
} from "@/lib/auth/format-signup-error";
import { tryCreateBrowserSupabaseClient } from "@/lib/supabase/client";

function GuestRegisterForm() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("reservation");
  const prefillName = (searchParams.get("name") ?? "").trim().slice(0, 200);
  const prefillPhone = (searchParams.get("phone") ?? "").trim().slice(0, 80);
  const prefillEmail = (searchParams.get("email") ?? "").trim().slice(0, 320);
  const [fullName, setFullName] = useState(prefillName);
  const [phone, setPhone] = useState(prefillPhone);
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = tryCreateBrowserSupabaseClient();
    if (!supabase) {
      setError(t("guestPortal.register.supabaseNotConfigured"));
      return;
    }
    setSubmitting(true);
    setError(null);
    setInfo(null);

    const origin = window.location.origin;
    const emailRedirectTo = `${origin}/auth/guest-callback`;

    const { data: firstData, error: firstError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo },
    });

    const retryWithoutRedirect =
      firstError && shouldRetrySignupWithoutRedirect(firstError);

    let payload = firstData;
    let signError = firstError;
    let usedSignupWithoutRedirect = false;

    if (retryWithoutRedirect) {
      const { data: secondData, error: secondError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      payload = secondData;
      signError = secondError;
      usedSignupWithoutRedirect = !secondError;
    }

    if (signError) {
      setSubmitting(false);
      setError(formatGuestSignupError(signError, emailRedirectTo, locale));
      return;
    }

    const uid = payload?.user?.id;
    if (uid) {
      await supabase.from("users").upsert({
        id: uid,
        email: email.trim(),
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        updated_at: new Date().toISOString(),
      });
    }
    setSubmitting(false);
    if (!payload?.session) {
      setInfo(
        usedSignupWithoutRedirect
          ? t("guestPortal.register.infoConfirmEmailFallback")
          : t("guestPortal.register.infoConfirmEmail")
      );
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
          {t("guestPortal.register.title")}
        </h1>
        <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="font-medium">{t("guestPortal.register.fullName")}</span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--dove-grey)] px-4 py-3"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">{t("guestPortal.register.phone")}</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--dove-grey)] px-4 py-3"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">{t("guestPortal.register.email")}</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--dove-grey)] px-4 py-3"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">{t("guestPortal.register.password")}</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--dove-grey)] px-4 py-3"
            />
          </label>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {info ? <p className="text-sm text-emerald-700">{info}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[var(--gold)] py-3 text-sm font-semibold text-white"
          >
            {submitting
              ? t("guestPortal.register.creating")
              : t("guestPortal.register.createAccount")}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--charcoal)]/70">
          {t("guestPortal.register.hasAccount")}{" "}
          <Link
            href={
              reservationId
                ? `/guest/login?reservation=${encodeURIComponent(reservationId)}`
                : "/guest/login"
            }
            className="text-[var(--gold)] underline"
          >
            {t("guestPortal.register.signIn")}
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function GuestRegisterPage() {
  return (
    <Suspense fallback={<GuestAuthLoadingFallback />}>
      <GuestRegisterForm />
    </Suspense>
  );
}
