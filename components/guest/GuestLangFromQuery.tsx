"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/components/providers/LanguageProvider";
import type { Locale } from "@/lib/i18n/types";

export function GuestLangFromQuery() {
  const searchParams = useSearchParams();
  const { setLocale } = useI18n();

  useEffect(() => {
    const raw = searchParams.get("lang");
    if (raw === "es" || raw === "en") setLocale(raw as Locale);
  }, [searchParams, setLocale]);

  return null;
}
