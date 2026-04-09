"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/providers/LanguageProvider";

type Phase =
  | "loading"
  | "load_error"
  | "not_found"
  | "not_ready"
  | "already"
  | "form"
  | "thanks";

type Consent = "yes" | "no" | "skip";

const RATINGS = [1, 2, 3, 4, 5] as const;

type RowProps = {
  label: string;
  scalePrefix: string;
  value: number | null;
  onChange: (n: number) => void;
  t: (path: string) => string;
};

function RatingRow({ label, scalePrefix, value, onChange, t }: RowProps) {
  return (
    <fieldset className="border-t border-[var(--dove-grey)]/40 pt-6 first:border-t-0 first:pt-0">
      <legend className="text-sm font-semibold text-[var(--charcoal)]">{label}</legend>
      <div className="mt-3 space-y-2">
        {RATINGS.map((n) => (
          <label
            key={n}
            className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--white)]/80"
          >
            <input
              type="radio"
              name={scalePrefix}
              checked={value === n}
              onChange={() => onChange(n)}
              className="mt-1"
            />
            <span className="text-sm text-[var(--charcoal)]/90">
              <span className="text-[var(--gold)]" aria-hidden>
                ★{" "}
              </span>
              {n} — {t(`${scalePrefix}.r${n}`)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function StaySurveyPageClient({ publicId }: { publicId: string }) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("loading");
  const [ratingOverall, setRatingOverall] = useState<number | null>(null);
  const [ratingClean, setRatingClean] = useState<number | null>(null);
  const [ratingComfort, setRatingComfort] = useState<number | null>(null);
  const [ratingRecommend, setRatingRecommend] = useState<number | null>(null);
  const [comments, setComments] = useState("");
  const [consent, setConsent] = useState<Consent>("skip");
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);

  const apiBase = `/api/survey/${encodeURIComponent(publicId)}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiBase, { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          found?: boolean;
          reservationCompleted?: boolean;
          alreadySubmitted?: boolean;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setPhase("load_error");
          return;
        }
        if (!json.found) {
          setPhase("not_found");
          return;
        }
        if (!json.reservationCompleted) {
          setPhase("not_ready");
          return;
        }
        if (json.alreadySubmitted) {
          setPhase("already");
          return;
        }
        setPhase("form");
      } catch {
        if (!cancelled) setPhase("load_error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  const submit = async () => {
    setFormMsg(null);
    if (
      ratingOverall == null ||
      ratingClean == null ||
      ratingComfort == null ||
      ratingRecommend == null
    ) {
      setFormMsg(t("staySurvey.requiredHint"));
      return;
    }
    setSubmitting(true);
    try {
      const consentPublish =
        consent === "yes" ? true : consent === "no" ? false : null;
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ratingOverall,
          ratingClean,
          ratingComfort,
          ratingRecommend,
          comments: comments.trim(),
          consentPublish,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 409) {
        setPhase("already");
        return;
      }
      if (!res.ok) {
        setFormMsg(json.error ?? t("staySurvey.submitError"));
        return;
      }
      setPhase("thanks");
    } catch {
      setFormMsg(t("staySurvey.submitError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--ivory)] px-6 pb-24 pt-24 text-[var(--charcoal)] md:px-10">
      <div className="mx-auto max-w-xl">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-[var(--gold)]">
          Casa Boho Coyoacán
        </p>
        <h1 className="mt-2 text-center font-[family-name:var(--heading-font)] text-2xl font-semibold md:text-3xl">
          {t("staySurvey.pageTitle")}
        </h1>

        {phase === "loading" ? (
          <p className="mt-10 text-center text-sm text-[var(--charcoal)]/70">
            {t("staySurvey.loading")}
          </p>
        ) : null}

        {phase === "load_error" ? (
          <p className="mt-10 text-center text-sm text-rose-700">
            {t("staySurvey.loadError")}
          </p>
        ) : null}

        {phase === "not_found" ? (
          <p className="mt-10 text-center text-sm text-[var(--charcoal)]/80">
            {t("staySurvey.notFound")}
          </p>
        ) : null}

        {phase === "not_ready" ? (
          <div className="mt-10 rounded-2xl border border-[var(--dove-grey)] bg-[var(--white)]/60 p-6 text-center">
            <p className="font-semibold">{t("staySurvey.notReadyTitle")}</p>
            <p className="mt-2 text-sm text-[var(--charcoal)]/75">
              {t("staySurvey.notReadyBody")}
            </p>
          </div>
        ) : null}

        {phase === "already" || phase === "thanks" ? (
          <div className="mt-10 rounded-2xl border border-[var(--dove-grey)] bg-[var(--white)]/60 p-6 text-center">
            <p className="font-semibold">
              {phase === "thanks"
                ? t("staySurvey.thanksTitle")
                : t("staySurvey.alreadyTitle")}
            </p>
            <p className="mt-2 text-sm text-[var(--charcoal)]/75">
              {phase === "thanks"
                ? t("staySurvey.thanksBody")
                : t("staySurvey.alreadyBody")}
            </p>
          </div>
        ) : null}

        {phase === "form" ? (
          <div className="mt-8">
            <p className="text-center text-sm text-[var(--charcoal)]/80">
              {t("staySurvey.intro")}
            </p>
            <p className="mt-2 text-center text-xs text-[var(--charcoal)]/60">
              {t("staySurvey.langHint")}
            </p>

            <div className="mt-8 rounded-2xl border border-[var(--dove-grey)] bg-[var(--white)]/80 p-6 shadow-sm">
              <RatingRow
                label={t("staySurvey.q1")}
                scalePrefix="staySurvey.scaleOverall"
                value={ratingOverall}
                onChange={setRatingOverall}
                t={t}
              />
              <RatingRow
                label={t("staySurvey.q2")}
                scalePrefix="staySurvey.scaleClean"
                value={ratingClean}
                onChange={setRatingClean}
                t={t}
              />
              <RatingRow
                label={t("staySurvey.q3")}
                scalePrefix="staySurvey.scaleComfort"
                value={ratingComfort}
                onChange={setRatingComfort}
                t={t}
              />
              <RatingRow
                label={t("staySurvey.q4")}
                scalePrefix="staySurvey.scaleRecommend"
                value={ratingRecommend}
                onChange={setRatingRecommend}
                t={t}
              />

              <div className="mt-8 border-t border-[var(--dove-grey)]/40 pt-6">
                <label className="text-sm font-semibold text-[var(--charcoal)]">
                  {t("staySurvey.q5")}
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={4}
                  maxLength={4000}
                  placeholder={t("staySurvey.q5Placeholder")}
                  className="mt-2 w-full rounded-xl border border-[var(--dove-grey)] bg-[var(--white)] px-3 py-2 text-sm text-[var(--charcoal)] outline-none ring-[var(--gold)]/30 focus:ring-2"
                />
              </div>

              <fieldset className="mt-8 border-t border-[var(--dove-grey)]/40 pt-6">
                <legend className="text-sm font-semibold text-[var(--charcoal)]">
                  {t("staySurvey.consent")}
                </legend>
                <div className="mt-3 space-y-2">
                  {(
                    [
                      ["yes", "staySurvey.consentYes"],
                      ["no", "staySurvey.consentNo"],
                      ["skip", "staySurvey.consentSkip"],
                    ] as const
                  ).map(([val, key]) => (
                    <label
                      key={val}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="radio"
                        name="consent"
                        checked={consent === val}
                        onChange={() => setConsent(val)}
                      />
                      {t(key)}
                    </label>
                  ))}
                </div>
              </fieldset>

              {formMsg ? (
                <p className="mt-4 text-sm text-rose-700">{formMsg}</p>
              ) : null}

              <button
                type="button"
                disabled={submitting}
                onClick={() => void submit()}
                className="mt-6 w-full rounded-full bg-[var(--gold)] py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitting ? t("staySurvey.submitting") : t("staySurvey.submit")}
              </button>
            </div>
          </div>
        ) : null}

        <p className="mt-12 text-center">
          <Link
            href="/"
            className="text-sm font-semibold text-[var(--gold)] underline-offset-4 hover:underline"
          >
            ← {t("guestPortal.chrome.backToSite")}
          </Link>
        </p>
      </div>
    </main>
  );
}
