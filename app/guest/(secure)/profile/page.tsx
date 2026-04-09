"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/providers/LanguageProvider";

type Profile = {
  email: string;
  full_name: string | null;
  phone: string | null;
};

export default function GuestProfilePage() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/guest/profile", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as {
        profile?: Profile;
      };
      if (json.profile) {
        setProfile(json.profile);
        setFullName(json.profile.full_name ?? "");
        setPhone(json.profile.phone ?? "");
      }
    })();
  }, []);

  const save = async () => {
    setMsg(null);
    const res = await fetch("/api/guest/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, phone }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setMsg(json.error ?? t("guestPortal.profile.saveError"));
      return;
    }
    setMsg(t("guestPortal.profile.saveSuccess"));
  };

  return (
    <main className="min-h-screen bg-[var(--ivory)] px-6 pb-16 pt-24 text-[var(--charcoal)] md:px-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-[family-name:var(--heading-font)] text-3xl font-semibold">
          {t("guestPortal.profile.title")}
        </h1>
        <div className="mt-6 rounded-2xl border border-[var(--dove-grey)]/70 bg-white p-5">
          <p className="text-sm text-[var(--charcoal)]/70">
            {t("guestPortal.profile.emailLabel")}: {profile?.email ?? "—"}
          </p>
          <label className="mt-4 block text-sm">
            <span className="font-medium">{t("guestPortal.profile.fullName")}</span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--dove-grey)] px-4 py-3"
            />
          </label>
          <label className="mt-3 block text-sm">
            <span className="font-medium">{t("guestPortal.profile.phone")}</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--dove-grey)] px-4 py-3"
            />
          </label>
          <button
            type="button"
            onClick={() => void save()}
            className="mt-4 rounded-full bg-[var(--gold)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            {t("guestPortal.profile.save")}
          </button>
          {msg ? <p className="mt-3 text-sm">{msg}</p> : null}
        </div>
        <p className="mt-8">
          <Link href="/guest/dashboard" className="text-sm underline">
            {t("guestPortal.profile.backDashboard")}
          </Link>
        </p>
      </div>
    </main>
  );
}
