"use client";

import { useCallback, useEffect, useState } from "react";
import { subscribeBookingDataRefresh } from "@/lib/broadcast-booking";
import { bookedRangesFromApi, type BookedRange } from "@/lib/availability";
import {
  DEFAULT_RATES_MXN,
  DEFAULT_RATES_USD,
  type StayRates,
} from "@/lib/pricing";

type ApiRow = { start_date: string; end_date: string };

type ApiPricing = { mxn: StayRates; usd: StayRates };
type StayRules = {
  minStayNights: number;
  blockBeforeDays: number;
  blockAfterDays: number;
};
const DEFAULT_STAY_RULES: StayRules = {
  minStayNights: 2,
  blockBeforeDays: 1,
  blockAfterDays: 1,
};

function isStayRates(x: unknown): x is StayRates {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.night === "number" &&
    typeof o.week === "number" &&
    typeof o.month === "number"
  );
}

function parsePricing(raw: unknown): ApiPricing {
  if (typeof raw !== "object" || raw === null) {
    return {
      mxn: { ...DEFAULT_RATES_MXN },
      usd: { ...DEFAULT_RATES_USD },
    };
  }
  const o = raw as Record<string, unknown>;
  if (isStayRates(o.mxn) && isStayRates(o.usd)) {
    return { mxn: o.mxn, usd: o.usd };
  }
  if (isStayRates(raw)) {
    return { mxn: raw, usd: { ...DEFAULT_RATES_USD } };
  }
  return {
    mxn: { ...DEFAULT_RATES_MXN },
    usd: { ...DEFAULT_RATES_USD },
  };
}

function parseStayRules(raw: unknown): StayRules {
  if (typeof raw !== "object" || raw === null) return DEFAULT_STAY_RULES;
  const o = raw as Record<string, unknown>;
  const minStayNights =
    typeof o.minStayNights === "number" && o.minStayNights >= 1
      ? Math.floor(o.minStayNights)
      : DEFAULT_STAY_RULES.minStayNights;
  const blockBeforeDays =
    typeof o.blockBeforeDays === "number" && o.blockBeforeDays >= 0
      ? Math.floor(o.blockBeforeDays)
      : DEFAULT_STAY_RULES.blockBeforeDays;
  const blockAfterDays =
    typeof o.blockAfterDays === "number" && o.blockAfterDays >= 0
      ? Math.floor(o.blockAfterDays)
      : DEFAULT_STAY_RULES.blockAfterDays;
  return { minStayNights, blockBeforeDays, blockAfterDays };
}

export function useBookingData() {
  const [ratesMxn, setRatesMxn] = useState<StayRates>(DEFAULT_RATES_MXN);
  const [ratesUsd, setRatesUsd] = useState<StayRates>(DEFAULT_RATES_USD);
  const [bookedRanges, setBookedRanges] = useState<BookedRange[]>([]);
  const [stayRules, setStayRules] = useState<StayRules>(DEFAULT_STAY_RULES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => {
    setLoading(true);
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch(`/api/booking-data?ts=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Could not load rates or availability.");
        const data = (await res.json()) as {
          pricing: unknown;
          stayRules?: unknown;
          blockedRanges: ApiRow[];
          diagnostics?: {
            blockedError: string | null;
            pricingError: string | null;
            supabaseKey: string;
            blockedRowCount: number;
          };
        };
        if (cancelled) return;
        const parsed = parsePricing(data.pricing);
        setRatesMxn(parsed.mxn);
        setRatesUsd(parsed.usd);
        setStayRules(parseStayRules(data.stayRules));
        setBookedRanges(bookedRangesFromApi(data.blockedRanges ?? []));
        setError(data.diagnostics?.blockedError ?? null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error de red");
          setRatesMxn({ ...DEFAULT_RATES_MXN });
          setRatesUsd({ ...DEFAULT_RATES_USD });
          setStayRules(DEFAULT_STAY_RULES);
          setBookedRanges([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) refetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    const unsubBroadcast = subscribeBookingDataRefresh(refetch);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
      unsubBroadcast();
    };
  }, [refetch]);

  return {
    ratesMxn,
    ratesUsd,
    stayRules,
    bookedRanges,
    loading,
    error,
    refetch,
  };
}
