"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Minus, Plus } from "lucide-react";
import { DayPicker, type DateRange } from "react-day-picker";
import { differenceInCalendarDays, format, isBefore, startOfDay } from "date-fns";
import { enUS as enUSLocale, es as esLocale } from "date-fns/locale";
import "react-day-picker/style.css";

import { MotionSection } from "./MotionSection";
import { rangeTouchesBooked, isBookedDay } from "@/lib/availability";
import {
  calculateStayPrice,
  quoteToLabeledBreakdown,
} from "@/lib/pricing";
import { formatQuoteLine } from "@/lib/i18n/quote-format";
import { useBookingData } from "@/hooks/useBookingData";
import { useI18n } from "@/components/providers/LanguageProvider";
import { formatMoneyAmount } from "@/lib/format-money";

const MAX_GUESTS = 4;
const PHONE_COUNTRY_CODES = [
  { iso: "US", dial: "+1" },
  { iso: "MX", dial: "+52" },
  { iso: "ES", dial: "+34" },
  { iso: "AR", dial: "+54" },
  { iso: "CO", dial: "+57" },
  { iso: "CL", dial: "+56" },
  { iso: "PE", dial: "+51" },
  { iso: "BR", dial: "+55" },
  { iso: "FR", dial: "+33" },
  { iso: "DE", dial: "+49" },
] as const;

export function BookTour() {
  const { t, locale, currency } = useI18n();
  const {
    ratesMxn,
    ratesUsd,
    stayRules,
    bookedRanges,
    loading: dataLoading,
    error: dataError,
  } = useBookingData();
  const rates = currency === "USD" ? ratesUsd : ratesMxn;
  const dateLocale = locale === "es" ? esLocale : enUSLocale;

  const [expanded, setExpanded] = useState(false);
  const availabilityAnchorRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+1");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [sendState, setSendState] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [sendErrorMsg, setSendErrorMsg] = useState<string | null>(null);
  const [preRequestId, setPreRequestId] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");

  const contactComplete =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    phone.trim().length > 0;
  const fullPhone = `${phoneCountryCode} ${phone.trim()}`.trim();

  const disabledMatchers = useMemo(
    () => [
      { before: startOfDay(new Date()) },
      (date: Date) => isBookedDay(date, bookedRanges),
    ],
    [bookedRanges]
  );

  const onRangeSelect = useCallback(
    (next: DateRange | undefined) => {
      setRangeError(null);
      if (!next?.from) {
        setRange(next);
        return;
      }
      if (next.from && next.to) {
        const start = startOfDay(next.from);
        const end = startOfDay(next.to);
        const nights = differenceInCalendarDays(end, start);
        if (
          isBefore(start, end) &&
          rangeTouchesBooked(next.from, next.to, bookedRanges)
        ) {
          setRangeError(t("bookTour.rangeError"));
          setRange({ from: next.from, to: undefined });
          return;
        }
        if (isBefore(start, end) && nights < stayRules.minStayNights) {
          setRangeError(
            t("bookTour.minStayError", { min: stayRules.minStayNights })
          );
          setRange({ from: next.from, to: undefined });
          return;
        }
      }
      setRange(next);
    },
    [bookedRanges, stayRules.minStayNights, t]
  );

  const quote = useMemo(() => {
    if (!range?.from || !range?.to) return null;
    if (!isBefore(startOfDay(range.from), startOfDay(range.to))) return null;
    const nights = differenceInCalendarDays(
      startOfDay(range.to),
      startOfDay(range.from)
    );
    if (nights < stayRules.minStayNights) return null;
    if (rangeTouchesBooked(range.from, range.to, bookedRanges)) return null;
    return calculateStayPrice(range.from, range.to, rates);
  }, [range, bookedRanges, rates, stayRules.minStayNights]);
  const stayType = quote
    ? quote.nights >= 30
      ? "long_stay"
      : "short_stay"
    : null;
  const depositAmount = quote
    ? stayType === "long_stay"
      ? rates.month
      : 0
    : 0;

  const labeledBreakdown = useMemo(() => {
    if (!quote) return [];
    return quoteToLabeledBreakdown(quote, (line) =>
      formatQuoteLine(line, locale)
    );
  }, [quote, locale]);

  const mailtoHref = useMemo(() => {
    const base =
      "mailto:contacto@casabohocoyoacan.com?subject=" +
      encodeURIComponent(t("bookTour.mailSubject"));
    if (!range?.from || !range?.to || !quote || !contactComplete) return base;

    const contactBlock = [
      `${t("bookTour.mailName")}`,
      name.trim(),
      "",
      `${t("bookTour.mailEmail")}`,
      email.trim(),
      "",
      `${t("bookTour.mailPhone")}`,
      fullPhone,
      "",
      ...(message.trim()
        ? [`${t("bookTour.mailMessage")}`, message.trim(), ""]
        : []),
    ];

    const body = [
      ...contactBlock,
      t("bookTour.mailSep"),
      `${t("bookTour.mailCheckIn")} ${format(range.from, "PPP", { locale: dateLocale })}`,
      `${t("bookTour.mailCheckOut")} ${format(range.to, "PPP", { locale: dateLocale })}`,
      `${t("bookTour.mailNights")} ${quote.nights}`,
      `${t("bookTour.mailGuests")} ${guests} ${t("bookTour.mailGuestsMax", { max: MAX_GUESTS })}`,
      "",
      t("bookTour.mailEstimated"),
      ...labeledBreakdown.map(
        (l) =>
          `  • ${l.label}: ${formatMoneyAmount(l.amount, currency)}`
      ),
      `  — ${t("bookTour.mailTotal")} ${formatMoneyAmount(quote.total, currency)}`,
      "",
      t("bookTour.mailBodyClosing"),
    ].join("\n");
    return `${base}&body=${encodeURIComponent(body)}`;
  }, [
    range,
    quote,
    guests,
    name,
    email,
    fullPhone,
    message,
    contactComplete,
    t,
    labeledBreakdown,
    currency,
    dateLocale,
  ]);

  const rangeFromKey = range?.from?.getTime() ?? null;
  const rangeToKey = range?.to?.getTime() ?? null;

  useEffect(() => {
    setSendState("idle");
    setSendErrorMsg(null);
  }, [rangeFromKey, rangeToKey]);

  const submitBookingRequest = useCallback(async () => {
    if (!quote || !range?.from || !range?.to || !contactComplete) return;
    setSendState("sending");
    setSendErrorMsg(null);
    try {
      const res = await fetch("/api/reservations/pre-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: fullPhone,
          message: message.trim(),
          guests,
          checkIn: format(range.from, "yyyy-MM-dd"),
          checkOut: format(range.to, "yyyy-MM-dd"),
          locale,
          currency,
          website: honeypot,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        reservation?: { id?: string };
        error?: string;
        code?: string;
      };
      if (res.ok && json.ok) {
        setPreRequestId(typeof json.reservation?.id === "string" ? json.reservation.id : null);
        setSendState("success");
        return;
      }
      setSendErrorMsg(
        typeof json.error === "string"
          ? json.error
          : t("bookTour.sendFailed")
      );
      setSendState("error");
    } catch {
      setSendErrorMsg(t("bookTour.networkError"));
      setSendState("error");
    }
  }, [
    quote,
    range,
    contactComplete,
    name,
    email,
    fullPhone,
    message,
    guests,
    honeypot,
    locale,
    currency,
    t,
  ]);

  const openAvailabilityPreview = useCallback(() => {
    setExpanded(true);
    requestAnimationFrame(() => {
      availabilityAnchorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  const nightsGuestsLabel = quote
    ? `${quote.nights} ${quote.nights === 1 ? t("bookTour.night_one") : t("bookTour.night_other")} · ${guests} ${guests === 1 ? t("bookTour.guest_one") : t("bookTour.guest_other")}`
    : "";

  return (
    <MotionSection
      id="book-tour"
      className="bg-[var(--blush-pink)]/40 px-6 py-20 md:px-10 md:py-24"
    >
      <div className="mx-auto max-w-3xl rounded-3xl border border-[var(--dove-grey)]/50 bg-[var(--white)]/90 px-8 py-12 text-center shadow-soft-lg backdrop-blur-sm md:px-14">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
          {t("bookTour.kicker")}
        </p>
        <h2 className="mt-3 font-[family-name:var(--heading-font)] text-2xl font-semibold text-[var(--charcoal)] md:text-3xl">
          {t("bookTour.heading")}
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[var(--charcoal)]/75">
          {t("bookTour.intro")}
        </p>
        <button
          type="button"
          onClick={openAvailabilityPreview}
          className="mt-8 inline-flex items-center justify-center rounded-full bg-[var(--gold)] px-8 py-3.5 text-sm font-semibold uppercase tracking-wider text-[var(--white)] shadow-soft transition-all duration-300 hover:bg-[var(--dark-gold)]"
        >
          {t("bookTour.requestTour")}
        </button>

        <div
          ref={availabilityAnchorRef}
          className="relative mt-10 scroll-mt-28 border-t border-[var(--dove-grey)]/60 pt-10"
        >
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl border border-[var(--dove-grey)]/70 bg-[var(--ivory)]/80 px-5 py-4 text-sm font-semibold text-[var(--charcoal)] transition-colors hover:border-[var(--gold)]/40 hover:bg-[var(--blush-pink)]/30"
            aria-expanded={expanded}
            aria-controls="availability-preview"
          >
            {t("bookTour.availabilityToggle")}
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-[var(--gold)]" />
            ) : (
              <ChevronDown className="h-5 w-5 text-[var(--gold)]" />
            )}
          </button>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                id="availability-preview"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden text-left"
              >
                <div className="pt-10">
                  <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
                    {t("bookTour.availKicker")}
                  </p>
                  <p className="mx-auto mt-2 max-w-xl text-center text-sm text-[var(--charcoal)]/65">
                    {t("bookTour.availHelp")}
                  </p>
                  <p className="mx-auto mt-2 max-w-xl text-center text-xs text-[var(--charcoal)]/55">
                    {t("bookTour.minStayHint", {
                      min: stayRules.minStayNights,
                    })}
                  </p>

                  {dataError && (
                    <p
                      className="mx-auto mt-4 max-w-xl text-center text-sm text-amber-800/90"
                      role="status"
                    >
                      {t("bookTour.loadCalendarError")} {dataError}
                    </p>
                  )}
                  {dataLoading && !dataError && (
                    <p className="mt-4 text-center text-xs text-[var(--charcoal)]/45">
                      {t("bookTour.loadingCalendar")}
                    </p>
                  )}

                  <div className="book-tour-calendar mt-8 flex justify-center overflow-x-auto">
                    <DayPicker
                      mode="range"
                      locale={dateLocale}
                      numberOfMonths={1}
                      pagedNavigation
                      animate
                      selected={range}
                      onSelect={onRangeSelect}
                      disabled={disabledMatchers}
                      excludeDisabled
                      defaultMonth={startOfDay(new Date())}
                      modifiers={{
                        booked: (d) => isBookedDay(d, bookedRanges),
                      }}
                      modifiersClassNames={{
                        booked: "booked",
                      }}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-[var(--charcoal)]/65">
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-full bg-[var(--gold)]" />
                      {t("bookTour.legendStay")}
                    </span>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full bg-[#dc2626] ring-2 ring-[#dc2626]/30"
                        aria-hidden
                      />
                      <span className="font-medium text-[#b91c1c]">
                        {t("bookTour.legendBlocked")}
                      </span>
                    </span>
                  </div>

                  {rangeError && (
                    <p
                      className="mt-4 text-center text-sm text-red-700/90"
                      role="alert"
                    >
                      {rangeError}
                    </p>
                  )}

                  <div className="mx-auto mt-10 max-w-lg space-y-8">
                    <div className="space-y-4">
                      <p className="text-center text-sm font-semibold text-[var(--charcoal)]">
                        {t("bookTour.yourDetails")}
                      </p>
                      <div className="relative space-y-3">
                        <div className="sr-only" aria-hidden>
                          <label htmlFor="req-website">Website</label>
                          <input
                            id="req-website"
                            type="text"
                            name="website"
                            tabIndex={-1}
                            autoComplete="off"
                            value={honeypot}
                            onChange={(e) => setHoneypot(e.target.value)}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="req-name"
                            className="mb-1.5 block text-left text-xs font-semibold uppercase tracking-wider text-[var(--charcoal)]/70"
                          >
                            {t("bookTour.labelName")}
                          </label>
                          <input
                            id="req-name"
                            type="text"
                            name="name"
                            autoComplete="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-xl border border-[var(--dove-grey)] bg-[var(--white)] px-4 py-3 text-[var(--charcoal)] outline-none transition-shadow placeholder:text-[var(--charcoal)]/35 focus:border-[var(--gold)]/50 focus:ring-2 focus:ring-[var(--gold)]/25"
                            placeholder={t("bookTour.phName")}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="req-email"
                            className="mb-1.5 block text-left text-xs font-semibold uppercase tracking-wider text-[var(--charcoal)]/70"
                          >
                            {t("bookTour.labelEmail")}
                          </label>
                          <input
                            id="req-email"
                            type="email"
                            name="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-xl border border-[var(--dove-grey)] bg-[var(--white)] px-4 py-3 text-[var(--charcoal)] outline-none transition-shadow placeholder:text-[var(--charcoal)]/35 focus:border-[var(--gold)]/50 focus:ring-2 focus:ring-[var(--gold)]/25"
                            placeholder={t("bookTour.phEmail")}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="req-phone"
                            className="mb-1.5 block text-left text-xs font-semibold uppercase tracking-wider text-[var(--charcoal)]/70"
                          >
                            {t("bookTour.labelPhone")}
                          </label>
                          <div className="grid grid-cols-[120px_1fr] gap-2">
                            <select
                              id="req-phone-country"
                              name="phoneCountry"
                              value={phoneCountryCode}
                              onChange={(e) => setPhoneCountryCode(e.target.value)}
                              className="rounded-xl border border-[var(--dove-grey)] bg-[var(--white)] px-3 py-3 text-[var(--charcoal)] outline-none transition-shadow focus:border-[var(--gold)]/50 focus:ring-2 focus:ring-[var(--gold)]/25"
                              aria-label={
                                locale === "es" ? "Codigo de pais" : "Country code"
                              }
                            >
                              {PHONE_COUNTRY_CODES.map((item) => (
                                <option key={item.iso} value={item.dial}>
                                  {item.iso} {item.dial}
                                </option>
                              ))}
                            </select>
                            <input
                              id="req-phone"
                              type="tel"
                              name="phone"
                              autoComplete="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className="w-full rounded-xl border border-[var(--dove-grey)] bg-[var(--white)] px-4 py-3 text-[var(--charcoal)] outline-none transition-shadow placeholder:text-[var(--charcoal)]/35 focus:border-[var(--gold)]/50 focus:ring-2 focus:ring-[var(--gold)]/25"
                              placeholder={t("bookTour.phPhone")}
                            />
                          </div>
                        </div>
                        <div>
                          <label
                            htmlFor="req-message"
                            className="mb-1.5 block text-left text-xs font-semibold uppercase tracking-wider text-[var(--charcoal)]/70"
                          >
                            {t("bookTour.labelMessage")}{" "}
                            <span className="font-normal normal-case text-[var(--charcoal)]/45">
                              {t("bookTour.messageOptional")}
                            </span>
                          </label>
                          <textarea
                            id="req-message"
                            name="message"
                            rows={3}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full resize-y rounded-xl border border-[var(--dove-grey)] bg-[var(--white)] px-4 py-3 text-[var(--charcoal)] outline-none transition-shadow placeholder:text-[var(--charcoal)]/35 focus:border-[var(--gold)]/50 focus:ring-2 focus:ring-[var(--gold)]/25"
                            placeholder={t("bookTour.phMessage")}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="guests"
                        className="block text-center text-sm font-semibold text-[var(--charcoal)]"
                      >
                        {t("bookTour.guestsLabel", { max: MAX_GUESTS })}
                      </label>
                      <div className="mt-3 flex items-center justify-center gap-4">
                        <button
                          type="button"
                          className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--dove-grey)] bg-[var(--white)] text-[var(--charcoal)] transition-colors hover:border-[var(--gold)]/50 disabled:opacity-40"
                          disabled={guests <= 1}
                          onClick={() => setGuests((g) => Math.max(1, g - 1))}
                          aria-label={t("bookTour.fewerGuests")}
                        >
                          <Minus className="h-5 w-5" />
                        </button>
                        <span
                          id="guests"
                          className="min-w-[2ch] text-center font-[family-name:var(--heading-font)] text-2xl font-semibold tabular-nums text-[var(--charcoal)]"
                        >
                          {guests}
                        </span>
                        <button
                          type="button"
                          className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--dove-grey)] bg-[var(--white)] text-[var(--charcoal)] transition-colors hover:border-[var(--gold)]/50 disabled:opacity-40"
                          disabled={guests >= MAX_GUESTS}
                          onClick={() =>
                            setGuests((g) => Math.min(MAX_GUESTS, g + 1))
                          }
                          aria-label={t("bookTour.moreGuests")}
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--dove-grey)]/70 bg-[var(--ivory)]/60 px-6 py-6 shadow-soft">
                      <p className="text-center text-sm font-semibold uppercase tracking-[0.15em] text-[var(--gold)]">
                        {t("bookTour.estimate")}
                      </p>
                      {!quote ? (
                        <p className="mt-4 text-center text-sm text-[var(--charcoal)]/55">
                          {t("bookTour.estimatePickDates")}
                        </p>
                      ) : (
                        <>
                          <p className="mt-2 text-center text-sm text-[var(--charcoal)]/70">
                            {nightsGuestsLabel}
                          </p>
                          <ul className="mt-4 space-y-2 border-t border-[var(--dove-grey)]/50 pt-4 text-sm text-[var(--charcoal)]/85">
                            {labeledBreakdown.map((line) => (
                              <li
                                key={`${line.label}-${line.amount}`}
                                className="flex justify-between gap-4"
                              >
                                <span>{line.label}</span>
                                <span className="shrink-0 tabular-nums font-medium">
                                  {formatMoneyAmount(line.amount, currency)} {currency}
                                </span>
                              </li>
                            ))}
                          </ul>
                          <p className="mt-4 flex justify-between border-t border-[var(--dove-grey)]/50 pt-4 font-[family-name:var(--heading-font)] text-lg font-semibold text-[var(--charcoal)]">
                            <span>{t("bookTour.total")}</span>
                            <span className="tabular-nums">
                              {formatMoneyAmount(quote.total, currency)} {currency}
                            </span>
                          </p>
                          <p className="mt-3 text-center text-xs text-[var(--charcoal)]/45">
                            {t("bookTour.estimateNote")}
                          </p>
                          <p className="mt-1 text-center text-xs text-[var(--charcoal)]/55">
                            {t("bookTour.stayTypeLabel")}:{" "}
                            {stayType === "long_stay"
                              ? t("bookTour.stayTypeLong")
                              : t("bookTour.stayTypeShort")}
                          </p>
                          <p className="mt-1 text-center text-xs text-[var(--charcoal)]/55">
                            {t("bookTour.depositLabel")}:{" "}
                            {depositAmount > 0
                              ? `${formatMoneyAmount(depositAmount, currency)} ${currency}`
                              : t("bookTour.noDeposit")}
                          </p>
                        </>
                      )}
                    </div>

                    <p className="text-center text-xs text-[var(--charcoal)]/45">
                      {!quote
                        ? t("bookTour.hintNoQuote")
                        : !contactComplete
                          ? t("bookTour.hintNoContact")
                          : null}
                    </p>

                    {sendState === "success" && (
                      <p
                        className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-900"
                        role="status"
                      >
                        {t("bookTour.successMsg")}{" "}
                        <span className="block pt-1">
                          <Link
                            href={`/guest/login${preRequestId ? `?reservation=${encodeURIComponent(preRequestId)}` : ""}`}
                            className="underline"
                          >
                            Continue in Guest Panel (Login)
                          </Link>{" "}
                          ·{" "}
                          <Link
                            href={`/guest/register${preRequestId ? `?reservation=${encodeURIComponent(preRequestId)}` : ""}`}
                            className="underline"
                          >
                            Create account
                          </Link>
                        </span>
                      </p>
                    )}
                    {sendErrorMsg && (
                      <p
                        className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-900"
                        role="alert"
                      >
                        {sendErrorMsg}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => void submitBookingRequest()}
                      disabled={
                        !quote ||
                        !contactComplete ||
                        sendState === "sending" ||
                        sendState === "success"
                      }
                      className={`flex w-full items-center justify-center rounded-full px-8 py-3.5 text-sm font-semibold uppercase tracking-wider shadow-soft transition-all duration-300 ${
                        quote && contactComplete && sendState !== "success"
                          ? "bg-[var(--charcoal)] text-[var(--white)] hover:bg-[var(--gold)] disabled:opacity-50"
                          : "bg-[var(--dove-grey)] text-[var(--charcoal)]/40"
                      }`}
                    >
                      {sendState === "sending"
                        ? t("bookTour.sending")
                        : sendState === "success"
                          ? t("bookTour.sent")
                          : t("bookTour.sendRequest")}
                    </button>

                    <p className="text-center text-xs text-[var(--charcoal)]/50">
                      <a
                        href={mailtoHref}
                        className={`font-semibold underline decoration-[var(--gold)]/50 underline-offset-2 ${
                          quote && contactComplete
                            ? "text-[var(--gold)] hover:text-[var(--dark-gold)]"
                            : "pointer-events-none text-[var(--charcoal)]/30"
                        }`}
                        aria-disabled={!quote || !contactComplete}
                        tabIndex={quote && contactComplete ? 0 : -1}
                      >
                        {t("bookTour.mailtoFallback")}
                      </a>
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MotionSection>
  );
}
