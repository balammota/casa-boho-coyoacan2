import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  DEFAULT_RATES_MXN,
  DEFAULT_RATES_USD,
  type StayRates,
} from "@/lib/pricing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FALLBACK_PRICING: { mxn: StayRates; usd: StayRates } = {
  mxn: { ...DEFAULT_RATES_MXN },
  usd: { ...DEFAULT_RATES_USD },
};
const FALLBACK_STAY_RULES = {
  minStayNights: 2,
  blockBeforeDays: 1,
  blockAfterDays: 1,
} as const;

const NO_STORE = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
} as const;

type BlockedRow = { id: string; start_date: string; end_date: string };

/** Lectura directa PostgREST (misma API que Table Editor); evita capas raras del cliente en el servidor. */
async function fetchBlockedViaRest(
  supabaseUrl: string,
  bearerToken: string
): Promise<{ rows: BlockedRow[]; error: string | null }> {
  const base = supabaseUrl.replace(/\/+$/, "");
  const endpoint = `${base}/rest/v1/blocked_date_ranges?select=id,start_date,end_date&order=start_date.asc`;
  try {
    const res = await fetch(endpoint, {
      headers: {
        apikey: bearerToken,
        Authorization: `Bearer ${bearerToken}`,
        Accept: "application/json",
        Prefer: "return=representation",
      },
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        rows: [],
        error: `PostgREST ${res.status}: ${text.slice(0, 300)}`,
      };
    }
    const data = JSON.parse(text) as unknown;
    if (!Array.isArray(data)) {
      return { rows: [], error: "PostgREST: respuesta no es un array" };
    }
    return { rows: data as BlockedRow[], error: null };
  } catch (e) {
    return {
      rows: [],
      error: e instanceof Error ? e.message : "fetch blocked_date_ranges falló",
    };
  }
}

function pickServerSupabaseKey(): {
  url: string;
  key: string;
  keySource: "service" | "anon";
} | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonRaw = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRaw = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceKey =
    typeof serviceRaw === "string" && serviceRaw.trim().length > 0
      ? serviceRaw.trim()
      : undefined;
  const anonKey =
    typeof anonRaw === "string" && anonRaw.trim().length > 0
      ? anonRaw.trim()
      : undefined;
  const key = serviceKey ?? anonKey;
  if (!url || !key) return null;
  return { url, key, keySource: serviceKey ? "service" : "anon" };
}

export async function GET() {
  const picked = pickServerSupabaseKey();
  if (!picked) {
    return NextResponse.json(
      {
        pricing: FALLBACK_PRICING,
        stayRules: FALLBACK_STAY_RULES,
        blockedRanges: [],
        diagnostics: {
          supabaseKey: "none" as const,
          blockedRowCount: 0,
          blockedError: null,
          pricingError: null,
        },
      },
      { headers: NO_STORE }
    );
  }

  const { url, key, keySource } = picked;

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [pricingRes, blockedRest] = await Promise.all([
    supabase.from("pricing_settings").select("*").eq("id", 1).maybeSingle(),
    fetchBlockedViaRest(url, key),
  ]);

  if (pricingRes.error) {
    console.error("[booking-data] pricing_settings:", pricingRes.error.message);
  }
  if (blockedRest.error) {
    console.error("[booking-data] blocked_date_ranges REST:", blockedRest.error);
  }

  const blockedRanges = blockedRest.rows;

  type PricingRow = {
    night_rate: number;
    week_rate: number;
    month_rate: number;
    night_rate_usd?: number | null;
    week_rate_usd?: number | null;
    month_rate_usd?: number | null;
    min_stay_nights?: number | null;
    block_buffer_before_days?: number | null;
    block_buffer_after_days?: number | null;
  };

  const row = pricingRes.data as PricingRow | null;
  const pricing: { mxn: StayRates; usd: StayRates } = row
    ? {
        mxn: {
          night: row.night_rate,
          week: row.week_rate,
          month: row.month_rate,
        },
        usd: {
          night:
            typeof row.night_rate_usd === "number" && row.night_rate_usd > 0
              ? row.night_rate_usd
              : DEFAULT_RATES_USD.night,
          week:
            typeof row.week_rate_usd === "number" && row.week_rate_usd > 0
              ? row.week_rate_usd
              : DEFAULT_RATES_USD.week,
          month:
            typeof row.month_rate_usd === "number" && row.month_rate_usd > 0
              ? row.month_rate_usd
              : DEFAULT_RATES_USD.month,
        },
      }
    : FALLBACK_PRICING;
  const stayRules = row
    ? {
        minStayNights:
          typeof row.min_stay_nights === "number" && row.min_stay_nights >= 1
            ? row.min_stay_nights
            : FALLBACK_STAY_RULES.minStayNights,
        blockBeforeDays:
          typeof row.block_buffer_before_days === "number" &&
          row.block_buffer_before_days >= 0
            ? row.block_buffer_before_days
            : FALLBACK_STAY_RULES.blockBeforeDays,
        blockAfterDays:
          typeof row.block_buffer_after_days === "number" &&
          row.block_buffer_after_days >= 0
            ? row.block_buffer_after_days
            : FALLBACK_STAY_RULES.blockAfterDays,
      }
    : FALLBACK_STAY_RULES;

  return NextResponse.json(
    {
      pricing,
      stayRules,
      blockedRanges,
      diagnostics: {
        supabaseKey: keySource,
        blockedRowCount: blockedRanges.length,
        blockedError: blockedRest.error,
        pricingError: pricingRes.error?.message ?? null,
      },
    },
    { headers: NO_STORE }
  );
}
