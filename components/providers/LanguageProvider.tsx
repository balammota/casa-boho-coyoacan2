"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { getLeafString, messages } from "@/lib/i18n/dictionaries";
import type { CurrencyCode, Locale } from "@/lib/i18n/types";

const STORAGE_KEY = "casa-boho-locale";

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
  currency: CurrencyCode;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("es");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored === "en" || stored === "es") {
        setLocaleState(stored);
      } else {
        const nav = navigator.language?.slice(0, 2).toLowerCase();
        setLocaleState(nav === "es" ? "es" : "en");
      }
    } catch {
      setLocaleState("en");
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale === "es" ? "es" : "en";
    const title =
      getLeafString(messages[locale], "meta.title") ??
      getLeafString(messages.en, "meta.title");
    if (title) document.title = title;
  }, [locale, ready]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) => {
      let s =
        getLeafString(messages[locale], path) ??
        getLeafString(messages.en, path) ??
        path;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.split(`{{${k}}}`).join(String(v));
        }
      }
      return s;
    },
    [locale]
  );

  const currency: CurrencyCode = locale === "en" ? "USD" : "MXN";

  const value = useMemo(
    () => ({ locale, setLocale, t, currency }),
    [locale, setLocale, t, currency]
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within LanguageProvider");
  }
  return ctx;
}
