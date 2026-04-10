"use client";

import type { MouseEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DayPicker } from "react-day-picker";
import {
  addDays,
  differenceInCalendarDays,
  isBefore,
  startOfDay,
  subDays,
} from "date-fns";
import "react-day-picker/style.css";

import { notifyBookingDataChanged } from "@/lib/broadcast-booking";
import { tryCreateBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  bookedRangesFromApi,
  isBookedDay,
  parseLocalYmd,
} from "@/lib/availability";
import { DEFAULT_RATES_USD } from "@/lib/pricing";

type BlockedRow = {
  id: string;
  start_date: string;
  end_date: string;
  note: string | null;
};

type ReservationAdminRow = {
  id: string;
  public_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  currency: "MXN" | "USD";
  total_amount: number;
  stay_type: "short_stay" | "long_stay";
  contract_type: "short_stay_contract" | "long_stay_contract";
  booking_status:
    | "draft"
    | "pending_payment"
    | "confirmed"
    | "cancelled"
    | "completed";
  payment_status:
    | "draft"
    | "pending_payment"
    | "confirmed"
    | "cancelled"
    | "completed";
  deposit_amount: number;
  contract_accepted_at: string | null;
  created_at: string;
  guest_document_count?: number;
};

function dateToLocalYmd(d: Date): string {
  const t = startOfDay(d);
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const day = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function mergeYmdsToRanges(sortedUnique: string[]): {
  start_date: string;
  end_date: string;
}[] {
  if (sortedUnique.length === 0) return [];
  const ranges: { start_date: string; end_date: string }[] = [];
  let i = 0;
  while (i < sortedUnique.length) {
    let j = i;
    while (
      j + 1 < sortedUnique.length &&
      differenceInCalendarDays(
        parseLocalYmd(sortedUnique[j + 1]),
        parseLocalYmd(sortedUnique[j])
      ) === 1
    ) {
      j++;
    }
    ranges.push({
      start_date: sortedUnique[i],
      end_date: sortedUnique[j],
    });
    i = j + 1;
  }
  return ranges;
}

function findRangeContainingYmd(
  rows: BlockedRow[],
  ymd: string
): BlockedRow | null {
  const d = parseLocalYmd(ymd);
  for (const row of rows) {
    const from = parseLocalYmd(row.start_date);
    const to = parseLocalYmd(row.end_date);
    if (!isBefore(d, from) && !isBefore(to, d)) return row;
  }
  return null;
}

function withBufferRange(
  startYmd: string,
  endYmd: string,
  beforeDays: number,
  afterDays: number
): { start_date: string; end_date: string } {
  const start = parseLocalYmd(startYmd);
  const end = parseLocalYmd(endYmd);
  return {
    start_date: dateToLocalYmd(subDays(start, Math.max(0, beforeDays))),
    end_date: dateToLocalYmd(addDays(end, Math.max(0, afterDays))),
  };
}

export function AdminDashboard() {
  const router = useRouter();
  const [night, setNight] = useState("");
  const [week, setWeek] = useState("");
  const [month, setMonth] = useState("");
  const [nightUsd, setNightUsd] = useState("");
  const [weekUsd, setWeekUsd] = useState("");
  const [monthUsd, setMonthUsd] = useState("");
  const [minStayNights, setMinStayNights] = useState("2");
  const [blockBeforeDays, setBlockBeforeDays] = useState("1");
  const [blockAfterDays, setBlockAfterDays] = useState("1");
  const [savingRates, setSavingRates] = useState(false);
  const [ratesMessage, setRatesMessage] = useState<string | null>(null);

  const [blocked, setBlocked] = useState<BlockedRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingYmds, setPendingYmds] = useState<string[]>([]);
  const [reservations, setReservations] = useState<ReservationAdminRow[]>([]);
  const [reservationStatusFilter, setReservationStatusFilter] = useState<
    "" | "draft" | "pending_payment" | "confirmed" | "cancelled" | "completed"
  >("");
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [reservationMsg, setReservationMsg] = useState<string | null>(null);
  const [cancelModalId, setCancelModalId] = useState<string | null>(null);
  const [cancelMessage, setCancelMessage] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const supabase = useMemo(() => tryCreateBrowserSupabaseClient(), []);

  const bookedRanges = useMemo(
    () => bookedRangesFromApi(blocked),
    [blocked]
  );

  const pendingSet = useMemo(() => new Set(pendingYmds), [pendingYmds]);

  const loadAll = useCallback(async () => {
    if (!supabase) {
      setLoadError("Faltan variables NEXT_PUBLIC_SUPABASE_* en .env.local.");
      return;
    }
    setLoadError(null);
    const [pRes, bRes] = await Promise.all([
      supabase.from("pricing_settings").select("*").eq("id", 1).maybeSingle(),
      supabase
        .from("blocked_date_ranges")
        .select("id, start_date, end_date, note")
        .order("start_date", { ascending: true }),
    ]);
    if (pRes.error) setLoadError(pRes.error.message);
    else if (pRes.data) {
      const row = pRes.data as Record<string, unknown>;
      setNight(String(row.night_rate));
      setWeek(String(row.week_rate));
      setMonth(String(row.month_rate));
      setNightUsd(
        String(
          typeof row.night_rate_usd === "number"
            ? row.night_rate_usd
            : DEFAULT_RATES_USD.night
        )
      );
      setWeekUsd(
        String(
          typeof row.week_rate_usd === "number"
            ? row.week_rate_usd
            : DEFAULT_RATES_USD.week
        )
      );
      setMonthUsd(
        String(
          typeof row.month_rate_usd === "number"
            ? row.month_rate_usd
            : DEFAULT_RATES_USD.month
        )
      );
      setMinStayNights(
        String(
          typeof row.min_stay_nights === "number" && row.min_stay_nights >= 1
            ? row.min_stay_nights
            : 2
        )
      );
      setBlockBeforeDays(
        String(
          typeof row.block_buffer_before_days === "number" &&
            row.block_buffer_before_days >= 0
            ? row.block_buffer_before_days
            : 1
        )
      );
      setBlockAfterDays(
        String(
          typeof row.block_buffer_after_days === "number" &&
            row.block_buffer_after_days >= 0
            ? row.block_buffer_after_days
            : 1
        )
      );
    }
    if (bRes.error) setLoadError(bRes.error.message);
    else setBlocked((bRes.data as BlockedRow[]) ?? []);
  }, [supabase]);

  const loadReservations = useCallback(async () => {
    setLoadingReservations(true);
    setReservationMsg(null);
    const qs = reservationStatusFilter
      ? `?status=${reservationStatusFilter}`
      : "";
    try {
      const res = await fetch(`/api/admin/reservations${qs}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        reservations?: ReservationAdminRow[];
        error?: string;
      };
      if (!res.ok) {
        setReservationMsg(json.error ?? "No se pudieron cargar reservas.");
        setReservations([]);
      } else {
        setReservations(Array.isArray(json.reservations) ? json.reservations : []);
      }
    } catch {
      setReservationMsg("Error de red al cargar reservas.");
      setReservations([]);
    } finally {
      setLoadingReservations(false);
    }
  }, [reservationStatusFilter]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    void loadReservations();
  }, [loadReservations]);

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  const saveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setRatesMessage(null);
    const n = Number(night);
    const w = Number(week);
    const m = Number(month);
    const nu = Number(nightUsd);
    const wu = Number(weekUsd);
    const mu = Number(monthUsd);
    const minNights = Number(minStayNights);
    const beforeDays = Number(blockBeforeDays);
    const afterDays = Number(blockAfterDays);
    if (
      ![n, w, m, nu, wu, mu].every((x) => Number.isFinite(x) && x > 0)
    ) {
      setRatesMessage("Usa números enteros positivos.");
      return;
    }
    if (
      ![minNights].every((x) => Number.isFinite(x) && x >= 1) ||
      ![beforeDays, afterDays].every((x) => Number.isFinite(x) && x >= 0)
    ) {
      setRatesMessage(
        "Estancia mínima debe ser >= 1. Días de bloqueo antes/después deben ser >= 0."
      );
      return;
    }
    setSavingRates(true);
    const { error } = await supabase
      .from("pricing_settings")
      .update({
        night_rate: n,
        week_rate: w,
        month_rate: m,
        night_rate_usd: nu,
        week_rate_usd: wu,
        month_rate_usd: mu,
        min_stay_nights: minNights,
        block_buffer_before_days: beforeDays,
        block_buffer_after_days: afterDays,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    setSavingRates(false);
    if (!error) notifyBookingDataChanged();
    setRatesMessage(error ? error.message : "Tarifas guardadas.");
  };

  const addBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !newStart || !newEnd) return;
    if (newStart > newEnd) {
      setLoadError("La fecha inicio debe ser ≤ fecha fin.");
      return;
    }
    setAdding(true);
    setLoadError(null);
    // Temporalmente desactivado: no aplicar buffer automático.
    const beforeDays = 0;
    const afterDays = 0;
    const expanded = withBufferRange(newStart, newEnd, beforeDays, afterDays);
    const { error } = await supabase.from("blocked_date_ranges").insert({
      start_date: expanded.start_date,
      end_date: expanded.end_date,
      note: `Auto buffer: -${beforeDays} / +${afterDays}`,
    });
    setAdding(false);
    if (error) setLoadError(error.message);
    else {
      setNewStart("");
      setNewEnd("");
      await loadAll();
      notifyBookingDataChanged();
    }
  };

  const removeBlock = async (id: string) => {
    if (!supabase) return;
    setDeletingId(id);
    setLoadError(null);
    const { error } = await supabase.from("blocked_date_ranges").delete().eq("id", id);
    setDeletingId(null);
    if (error) setLoadError(error.message);
    else {
      await loadAll();
      notifyBookingDataChanged();
    }
  };

  const updateReservationStatus = async (
    reservationId: string,
    status: "draft" | "pending_payment" | "completed"
  ) => {
    setReservationMsg(null);
    try {
      const res = await fetch("/api/admin/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, status }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setReservationMsg(json.error ?? "No se pudo actualizar el estado.");
        return;
      }
      await loadReservations();
    } catch {
      setReservationMsg("Error de red al actualizar estado.");
    }
  };

  const submitAdminCancel = async () => {
    const msg = cancelMessage.trim();
    if (msg.length < 3) {
      setReservationMsg("Escribe un motivo de cancelación (mínimo 3 caracteres).");
      return;
    }
    if (!cancelModalId) return;
    setReservationMsg(null);
    setCancelSubmitting(true);
    try {
      const res = await fetch("/api/admin/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: cancelModalId,
          status: "cancelled",
          cancellationMessage: msg,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setReservationMsg(json.error ?? "No se pudo cancelar la reservación.");
        return;
      }
      setCancelModalId(null);
      setCancelMessage("");
      await loadReservations();
    } catch {
      setReservationMsg("Error de red al cancelar.");
    } finally {
      setCancelSubmitting(false);
    }
  };

  const confirmStay = async (reservationId: string) => {
    setReservationMsg(null);
    try {
      const res = await fetch("/api/admin/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, action: "confirm_stay" }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setReservationMsg(json.error ?? "No se pudo confirmar la estancia.");
        return;
      }
      await loadReservations();
    } catch {
      setReservationMsg("Error de red al confirmar la estancia.");
    }
  };

  const confirmPayment = async (reservationId: string) => {
    setReservationMsg(null);
    try {
      const res = await fetch("/api/admin/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, action: "confirm_payment" }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setReservationMsg(json.error ?? "No se pudo confirmar el pago.");
        return;
      }
      await loadReservations();
    } catch {
      setReservationMsg("Error de red al confirmar el pago.");
    }
  };

  const applyCalendarSelection = async () => {
    if (!supabase || pendingYmds.length === 0) return;
    const sorted = Array.from(new Set(pendingYmds)).sort();
    const ranges = mergeYmdsToRanges(sorted);
    // Temporalmente desactivado: no aplicar buffer automático.
    const beforeDays = 0;
    const afterDays = 0;
    setAdding(true);
    setLoadError(null);
    const { error } = await supabase.from("blocked_date_ranges").insert(
      ranges.map((r) => {
        const expanded = withBufferRange(
          r.start_date,
          r.end_date,
          beforeDays,
          afterDays
        );
        return {
          start_date: expanded.start_date,
          end_date: expanded.end_date,
          note: `Auto buffer: -${beforeDays} / +${afterDays}`,
        };
      })
    );
    setAdding(false);
    if (error) setLoadError(error.message);
    else {
      setPendingYmds([]);
      await loadAll();
      notifyBookingDataChanged();
    }
  };

  const onAdminDayClick = (
    day: Date,
    modifiers: { blocked?: boolean },
    e: MouseEvent
  ) => {
    const ymd = dateToLocalYmd(day);
    if (modifiers.blocked) {
      const row = findRangeContainingYmd(blocked, ymd);
      if (
        row &&
        window.confirm(
          `¿Eliminar el bloqueo del ${row.start_date} al ${row.end_date}?`
        )
      ) {
        void removeBlock(row.id);
      }
      return;
    }
    const multi = e.metaKey || e.ctrlKey;
    setPendingYmds((prev) => {
      if (multi) {
        const next = new Set(prev);
        if (next.has(ymd)) next.delete(ymd);
        else next.add(ymd);
        return Array.from(next).sort();
      }
      return [ymd];
    });
  };

  if (!supabase) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center text-[var(--charcoal)]">
        <p className="font-medium">
          Configura{" "}
          <code className="rounded bg-black/5 px-1.5 py-0.5 text-sm">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{" "}
          y{" "}
          <code className="rounded bg-black/5 px-1.5 py-0.5 text-sm">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>{" "}
          en <code className="text-sm">.env.local</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      <header className="flex flex-col gap-4 border-b border-[var(--dove-grey)]/60 pb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--heading-font)] text-2xl font-semibold text-[var(--charcoal)] md:text-3xl">
            Admin · Casa Boho
          </h1>
          <p className="mt-1 text-sm text-[var(--charcoal)]/60">
            Tarifas y fechas bloqueadas (Supabase).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded-full border border-[var(--dove-grey)] px-5 py-2.5 text-sm font-semibold text-[var(--charcoal)] transition-colors hover:border-[var(--gold)]/50"
        >
          Cerrar sesión
        </button>
      </header>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
          Tarifas (MXN y USD)
        </h2>
        <p className="mt-2 text-sm text-[var(--charcoal)]/60">
          MXN se muestra con el sitio en español; USD con el sitio en inglés.
          Asegúrate de haber aplicado la migración{" "}
          <code className="rounded bg-black/5 px-1 text-xs">
            003_pricing_usd.sql
          </code>{" "}
          en Supabase.
        </p>
        <form
          onSubmit={(e) => void saveRates(e)}
          className="mt-6 space-y-8"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--charcoal)]/50">
              Pesos (MXN)
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="font-medium text-[var(--charcoal)]/80">Noche</span>
            <input
              type="number"
              min={1}
              step={1}
              value={night}
              onChange={(e) => setNight(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--dove-grey)] bg-[var(--white)] px-3 py-2.5 text-[var(--charcoal)] outline-none focus:border-[var(--gold)]/50 focus:ring-2 focus:ring-[var(--gold)]/20"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[var(--charcoal)]/80">Semana (7 noches)</span>
            <input
              type="number"
              min={1}
              step={1}
              value={week}
              onChange={(e) => setWeek(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--dove-grey)] bg-[var(--white)] px-3 py-2.5 text-[var(--charcoal)] outline-none focus:border-[var(--gold)]/50 focus:ring-2 focus:ring-[var(--gold)]/20"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[var(--charcoal)]/80">Mes (30 noches)</span>
            <input
              type="number"
              min={1}
              step={1}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--dove-grey)] bg-[var(--white)] px-3 py-2.5 text-[var(--charcoal)] outline-none focus:border-[var(--gold)]/50 focus:ring-2 focus:ring-[var(--gold)]/20"
            />
          </label>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--charcoal)]/50">
              Dólares (USD)
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="font-medium text-[var(--charcoal)]/80">
                  Noche (USD)
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={nightUsd}
                  onChange={(e) => setNightUsd(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[var(--dove-grey)] bg-[var(--white)] px-3 py-2.5 text-[var(--charcoal)] outline-none focus:border-[var(--gold)]/50 focus:ring-2 focus:ring-[var(--gold)]/20"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-[var(--charcoal)]/80">
                  Semana — 7 noches (USD)
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={weekUsd}
                  onChange={(e) => setWeekUsd(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[var(--dove-grey)] bg-[var(--white)] px-3 py-2.5 text-[var(--charcoal)] outline-none focus:border-[var(--gold)]/50 focus:ring-2 focus:ring-[var(--gold)]/20"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-[var(--charcoal)]/80">
                  Mes — 30 noches (USD)
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={monthUsd}
                  onChange={(e) => setMonthUsd(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[var(--dove-grey)] bg-[var(--white)] px-3 py-2.5 text-[var(--charcoal)] outline-none focus:border-[var(--gold)]/50 focus:ring-2 focus:ring-[var(--gold)]/20"
                />
              </label>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--charcoal)]/50">
              Reglas de estancia
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="font-medium text-[var(--charcoal)]/80">
                  Estancia mínima (noches)
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={minStayNights}
                  onChange={(e) => setMinStayNights(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[var(--dove-grey)] bg-[var(--white)] px-3 py-2.5 text-[var(--charcoal)] outline-none focus:border-[var(--gold)]/50 focus:ring-2 focus:ring-[var(--gold)]/20"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-[var(--charcoal)]/80">
                  Bloquear antes (días)
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={blockBeforeDays}
                  onChange={(e) => setBlockBeforeDays(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[var(--dove-grey)] bg-[var(--white)] px-3 py-2.5 text-[var(--charcoal)] outline-none focus:border-[var(--gold)]/50 focus:ring-2 focus:ring-[var(--gold)]/20"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-[var(--charcoal)]/80">
                  Bloquear después (días)
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={blockAfterDays}
                  onChange={(e) => setBlockAfterDays(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[var(--dove-grey)] bg-[var(--white)] px-3 py-2.5 text-[var(--charcoal)] outline-none focus:border-[var(--gold)]/50 focus:ring-2 focus:ring-[var(--gold)]/20"
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-[var(--charcoal)]/55">
              Configuración guardada para uso futuro. Por ahora el buffer
              automático (antes/después) está desactivado.
            </p>
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={savingRates}
              className="rounded-full bg-[var(--gold)] px-6 py-2.5 text-sm font-semibold text-[var(--white)] shadow-soft transition-colors hover:bg-[var(--dark-gold)] disabled:opacity-50"
            >
              {savingRates ? "Guardando…" : "Guardar tarifas"}
            </button>
            {ratesMessage && (
              <p className="mt-3 text-sm text-[var(--charcoal)]/70">{ratesMessage}</p>
            )}
          </div>
        </form>
      </section>

      <section className="mt-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
            Reservaciones
          </h2>
          <select
            value={reservationStatusFilter}
            onChange={(e) =>
              setReservationStatusFilter(
                e.target.value as
                  | ""
                  | "draft"
                  | "pending_payment"
                  | "confirmed"
                  | "cancelled"
                  | "completed"
              )
            }
            className="rounded-lg border border-[var(--dove-grey)] bg-[var(--white)] px-3 py-2 text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="draft">Draft</option>
            <option value="pending_payment">Reserva: pago pendiente (sin estancia confirmada)</option>
            <option value="confirmed">Estancia confirmada</option>
            <option value="cancelled">Cancelada</option>
            <option value="completed">Completada</option>
          </select>
        </div>
        {reservationMsg && (
          <p className="mt-3 text-sm text-red-700/90">{reservationMsg}</p>
        )}
        {loadingReservations ? (
          <p className="mt-4 text-sm text-[var(--charcoal)]/60">Cargando reservas…</p>
        ) : reservations.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--charcoal)]/60">Sin reservas todavía.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {reservations.map((r) => (
              <article
                key={r.id}
                className="rounded-2xl border border-[var(--dove-grey)]/70 bg-[var(--white)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-sm text-[var(--charcoal)]">{r.public_id}</p>
                  <a
                    href={`/admin/reservations/${r.id}`}
                    className="text-xs font-semibold text-[var(--charcoal)] underline"
                  >
                    Ver detalle
                  </a>
                </div>
                <p className="mt-1 text-sm text-[var(--charcoal)]/80">
                  {r.guest_name} · {r.guest_email} · {r.guest_phone}
                </p>
                <p className="mt-1 text-sm text-[var(--charcoal)]/70">
                  {r.check_in} → {r.check_out} · {r.nights} noches · {r.guests} huésped(es)
                </p>
                <p className="mt-1 text-sm text-[var(--charcoal)]/70">
                  {r.stay_type === "long_stay" ? "Estancia larga" : "Estancia corta"} ·{" "}
                  {r.contract_type === "long_stay_contract"
                    ? "Contrato larga estancia"
                    : "Contrato corta estancia"}
                </p>
                <p className="mt-1 text-sm text-[var(--charcoal)]/70">
                  Total: {r.currency} {Number(r.total_amount).toLocaleString("en-US")} ·
                  Depósito: {r.currency} {Number(r.deposit_amount).toLocaleString("en-US")}
                </p>
                <p className="mt-1 text-xs text-[var(--charcoal)]/60">
                  Estancia: {r.booking_status} · Pago: {r.payment_status}
                  {" · "}
                  <a href={`/admin/reservations/${r.id}#documentos-huesped`} className="underline">
                    Documentos: {r.guest_document_count ?? 0}
                  </a>
                  {" · "}
                  <a href={`/admin/reservations/${r.id}#encuesta-satisfaccion`} className="underline">
                    Encuesta satisfacción
                  </a>
                </p>
                {r.booking_status === "completed" ? (
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Reservación completada
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.booking_status !== "confirmed" &&
                  r.booking_status !== "completed" &&
                  r.booking_status !== "cancelled" ? (
                    <button
                      type="button"
                      onClick={() => void confirmStay(r.id)}
                      className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Confirmar estancia
                    </button>
                  ) : null}
                  {r.booking_status === "confirmed" &&
                  r.payment_status !== "confirmed" &&
                  r.payment_status !== "cancelled" ? (
                    <button
                      type="button"
                      onClick={() => void confirmPayment(r.id)}
                      className="rounded-full bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Confirmar pago
                    </button>
                  ) : null}
                  {r.booking_status !== "cancelled" && r.booking_status !== "completed" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setReservationMsg(null);
                        setCancelModalId(r.id);
                        setCancelMessage("");
                      }}
                      className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Cancelar
                    </button>
                  ) : null}
                  {r.booking_status !== "completed" && r.booking_status !== "cancelled" ? (
                    <button
                      type="button"
                      onClick={() => void updateReservationStatus(r.id, "completed")}
                      className="rounded-full bg-[var(--charcoal)] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Marcar completada
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-14">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
          Fechas bloqueadas
        </h2>
        <p className="mt-2 text-sm text-[var(--charcoal)]/65">
          En el calendario: clic en un día libre para seleccionarlo. Mantén{" "}
          <kbd className="rounded border border-[var(--dove-grey)] bg-[var(--white)] px-1.5 py-0.5 font-mono text-[11px]">
            ⌘
          </kbd>{" "}
          (Mac) o{" "}
          <kbd className="rounded border border-[var(--dove-grey)] bg-[var(--white)] px-1.5 py-0.5 font-mono text-[11px]">
            Ctrl
          </kbd>{" "}
          (Windows) y haz clic en más días para añadirlos o quitarlos de la
          selección. Los días seguidos se guardan como un solo rango. Clic en un
          día ya bloqueado (rojo) elimina ese bloque completo.
        </p>

        <div className="admin-block-calendar mt-8 flex justify-center overflow-x-auto">
          <DayPicker
            numberOfMonths={2}
            pagedNavigation
            animate
            defaultMonth={startOfDay(new Date())}
            modifiers={{
              blocked: (d) => isBookedDay(d, bookedRanges),
              pending: (d) => pendingSet.has(dateToLocalYmd(d)),
            }}
            modifiersClassNames={{
              blocked: "admin-cal-blocked",
              pending: "admin-cal-pending",
            }}
            onDayClick={(day, modifiers, e) =>
              onAdminDayClick(day, modifiers, e)
            }
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-[var(--charcoal)]/65">
          <span className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full bg-[#dc2626] ring-2 ring-[#dc2626]/30"
              aria-hidden
            />
            Bloqueado
          </span>
          <span className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full ring-2 ring-[var(--gold)]"
              aria-hidden
            />
            Selección pendiente
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => void applyCalendarSelection()}
            disabled={adding || pendingYmds.length === 0}
            className="rounded-full bg-[var(--charcoal)] px-6 py-2.5 text-sm font-semibold text-[var(--white)] transition-colors hover:bg-[var(--gold)] disabled:opacity-50"
          >
            {adding ? "Guardando…" : "Bloquear días seleccionados"}
          </button>
          <button
            type="button"
            onClick={() => setPendingYmds([])}
            disabled={pendingYmds.length === 0}
            className="rounded-full border border-[var(--dove-grey)] px-6 py-2.5 text-sm font-semibold text-[var(--charcoal)] transition-colors hover:border-[var(--gold)]/50 disabled:opacity-50"
          >
            Limpiar selección
          </button>
          {pendingYmds.length > 0 && (
            <span className="w-full text-center text-xs text-[var(--charcoal)]/55 sm:w-auto">
              {pendingYmds.length} día{pendingYmds.length !== 1 ? "s" : ""}{" "}
              seleccionado{pendingYmds.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <p className="mt-10 text-sm font-medium text-[var(--charcoal)]/80">
          O define un rango manualmente
        </p>

        <form
          onSubmit={(e) => void addBlock(e)}
          className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        >
          <label className="block text-sm sm:w-40">
            <span className="font-medium text-[var(--charcoal)]/80">Desde</span>
            <input
              type="date"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--dove-grey)] bg-[var(--white)] px-3 py-2.5 text-[var(--charcoal)] outline-none focus:border-[var(--gold)]/50"
            />
          </label>
          <label className="block text-sm sm:w-40">
            <span className="font-medium text-[var(--charcoal)]/80">Hasta</span>
            <input
              type="date"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--dove-grey)] bg-[var(--white)] px-3 py-2.5 text-[var(--charcoal)] outline-none focus:border-[var(--gold)]/50"
            />
          </label>
          <button
            type="submit"
            disabled={adding || !newStart || !newEnd}
            className="rounded-full bg-[var(--charcoal)] px-6 py-2.5 text-sm font-semibold text-[var(--white)] transition-colors hover:bg-[var(--gold)] disabled:opacity-50"
          >
            {adding ? "Añadiendo…" : "Añadir bloqueo"}
          </button>
        </form>

        {loadError && (
          <p className="mt-4 text-sm text-red-700/90" role="alert">
            {loadError}
          </p>
        )}

        <ul className="mt-8 divide-y divide-[var(--dove-grey)]/50 rounded-2xl border border-[var(--dove-grey)]/60 bg-[var(--white)]">
          {blocked.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-[var(--charcoal)]/50">
              No hay bloqueos. El calendario del sitio queda abierto.
            </li>
          ) : (
            blocked.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-mono text-sm text-[var(--charcoal)]">
                  {row.start_date} → {row.end_date}
                </span>
                <button
                  type="button"
                  onClick={() => void removeBlock(row.id)}
                  disabled={deletingId === row.id}
                  className="shrink-0 rounded-full border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-800 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingId === row.id ? "…" : "Eliminar"}
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      <p className="mt-12 text-center text-xs text-[var(--charcoal)]/45">
        <a href="/" className="underline decoration-[var(--gold)]/50 hover:text-[var(--gold)]">
          Volver al sitio
        </a>
      </p>

      {cancelModalId ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--dove-grey)] bg-[var(--white)] p-5 shadow-xl">
            <h2
              id="cancel-modal-title"
              className="font-[family-name:var(--heading-font)] text-lg font-semibold text-[var(--charcoal)]"
            >
              Cancelar reservación
            </h2>
            <p className="mt-2 text-sm text-[var(--charcoal)]/70">
              El huésped recibirá un correo con esta actualización. Indica el motivo de la
              cancelación; también se guardará en las notas internas de la reserva.
            </p>
            <label className="mt-4 block text-sm font-medium text-[var(--charcoal)]">
              Motivo (obligatorio)
              <textarea
                value={cancelMessage}
                onChange={(e) => setCancelMessage(e.target.value)}
                rows={5}
                className="mt-1.5 w-full rounded-xl border border-[var(--dove-grey)] bg-[var(--white)] px-3 py-2.5 text-sm text-[var(--charcoal)] outline-none focus:border-[var(--gold)]/50"
                placeholder="Ej. Ya no hay disponibilidad para esas fechas…"
                disabled={cancelSubmitting}
              />
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!cancelSubmitting) {
                    setCancelModalId(null);
                    setCancelMessage("");
                  }
                }}
                className="rounded-full border border-[var(--dove-grey)] px-4 py-2 text-sm font-semibold text-[var(--charcoal)]"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => void submitAdminCancel()}
                disabled={cancelSubmitting}
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {cancelSubmitting ? "Cancelando…" : "Confirmar cancelación"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
