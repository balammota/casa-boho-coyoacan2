"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  galleryImages,
  type GalleryCategory,
  type GalleryImage,
} from "@/data/gallery";
import { MotionSection } from "./MotionSection";
import { useI18n } from "@/components/providers/LanguageProvider";
import { galleryAltEs } from "@/lib/i18n/gallery-alt-es";

const filterConfig: { key: GalleryCategory | "all"; labelKey: string }[] = [
  { key: "all", labelKey: "gallery.filterAll" },
  { key: "living", labelKey: "gallery.filterLiving" },
  { key: "bedrooms", labelKey: "gallery.filterBedrooms" },
  { key: "bathrooms", labelKey: "gallery.filterBathrooms" },
  { key: "kitchen", labelKey: "gallery.filterKitchen" },
  { key: "outdoor", labelKey: "gallery.filterOutdoor" },
];

function altFor(locale: string, img: GalleryImage): string {
  if (locale === "es" && galleryAltEs[img.id]) return galleryAltEs[img.id];
  return img.alt;
}

function expandTpl(s: string, vars: Record<string, string | number>): string {
  let out = s;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(String(v));
  }
  return out;
}

const AUTO_INTERVAL_MS = 4000;
const swipeThreshold = 40;

/** Lightbox: 0 = abrir desde galería (sin slide), 1 = siguiente, -1 = anterior */
const lightboxSlideVariants = {
  enter: (dir: number) => ({
    x: dir === 0 ? 0 : dir > 0 ? "100%" : "-100%",
  }),
  center: { x: "0%" },
  exit: (dir: number) => ({
    x: dir === 0 ? 0 : dir > 0 ? "-100%" : "100%",
  }),
};

function getVisibleImages(
  list: GalleryImage[],
  start: number
): GalleryImage[] {
  const n = list.length;
  if (n === 0) return [];
  if (n === 1) return [list[0]];
  if (n === 2) return [list[0], list[1]];
  return [
    list[start % n],
    list[(start + 1) % n],
    list[(start + 2) % n],
  ];
}

function gapPxForViewport(): number {
  if (typeof window === "undefined") return 8;
  return window.matchMedia("(min-width: 768px)").matches ? 16 : 8;
}

export function Gallery() {
  const { t, locale } = useI18n();
  const reduceMotion = useReducedMotion();
  const [filter, setFilter] = useState<GalleryCategory | "all">("all");
  const [windowStart, setWindowStart] = useState(0);
  const [lightboxId, setLightboxId] = useState<number | null>(null);
  const [lightboxSlideDir, setLightboxSlideDir] = useState(0);
  const [pauseAuto, setPauseAuto] = useState(false);
  const [cellW, setCellW] = useState(0);
  const [stepPx, setStepPx] = useState(0);

  const viewportRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const isAnimatingRef = useRef(false);
  const pendingPrevAnim = useRef(false);
  const pointerStartX = useRef<number | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return galleryImages;
    return galleryImages.filter((img) => img.category === filter);
  }, [filter]);

  const total = filtered.length;
  const visible = useMemo(
    () => getVisibleImages(filtered, windowStart),
    [filtered, windowStart]
  );

  const lightboxIndex = useMemo(
    () => filtered.findIndex((i) => i.id === lightboxId),
    [filtered, lightboxId]
  );
  const lightboxImage =
    lightboxIndex >= 0 ? filtered[lightboxIndex] : null;

  const canRotate = total >= 3;

  const slideTransition = useMemo(
    () =>
      reduceMotion
        ? { type: "tween" as const, duration: 0.2, ease: "easeOut" as const }
        : {
            type: "tween" as const,
            duration: 0.95,
            ease: [0.22, 0.1, 0.22, 1] as const,
          },
    [reduceMotion]
  );

  const measureStrip = useCallback(() => {
    const el = viewportRef.current;
    if (!el || !canRotate) return;
    const w = el.clientWidth;
    const g = gapPxForViewport();
    if (w < 24) return;
    const cell = (w - 2 * g) / 3;
    if (cell <= 0) return;
    setCellW(cell);
    setStepPx(cell + g);
  }, [canRotate]);

  useLayoutEffect(() => {
    measureStrip();
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measureStrip());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureStrip, filter]);

  useEffect(() => {
    setWindowStart(0);
    pendingPrevAnim.current = false;
    isAnimatingRef.current = false;
    x.set(0);
  }, [filter, x]);

  const advanceNext = useCallback(() => {
    if (total < 3 || isAnimatingRef.current || stepPx <= 0) return;
    isAnimatingRef.current = true;
    animate(x, -stepPx, slideTransition).then(() => {
      setWindowStart((s) => (s + 1) % total);
      x.set(0);
      isAnimatingRef.current = false;
    });
  }, [total, stepPx, x, slideTransition]);

  const goPrevWindow = useCallback(() => {
    if (total < 3 || isAnimatingRef.current || stepPx <= 0) return;
    isAnimatingRef.current = true;
    pendingPrevAnim.current = true;
    setWindowStart((s) => (s - 1 + total) % total);
  }, [total, stepPx]);

  useLayoutEffect(() => {
    if (!pendingPrevAnim.current) return;
    if (stepPx <= 0 || total < 3) {
      pendingPrevAnim.current = false;
      isAnimatingRef.current = false;
      return;
    }
    pendingPrevAnim.current = false;
    x.set(-stepPx);
    animate(x, 0, slideTransition).then(() => {
      isAnimatingRef.current = false;
    });
  }, [windowStart, stepPx, total, x, slideTransition]);

  useEffect(() => {
    if (!canRotate || lightboxId !== null || pauseAuto || stepPx <= 0) return;
    const id = window.setInterval(() => advanceNext(), AUTO_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [
    canRotate,
    lightboxId,
    pauseAuto,
    stepPx,
    advanceNext,
    filter,
  ]);

  const goToWindow = useCallback(
    (start: number) => {
      if (total < 3) return;
      const target = ((start % total) + total) % total;
      if (target === windowStart) return;
      pendingPrevAnim.current = false;
      isAnimatingRef.current = false;
      x.set(0);
      setWindowStart(target);
    },
    [total, windowStart, x]
  );

  const closeLightbox = useCallback(() => {
    setLightboxSlideDir(0);
    setLightboxId(null);
  }, []);

  const openLightbox = useCallback((id: number) => {
    setLightboxSlideDir(0);
    setLightboxId(id);
  }, []);

  const lightboxPrev = useCallback(() => {
    if (total === 0 || lightboxIndex < 0) return;
    const ni = (lightboxIndex - 1 + total) % total;
    setLightboxSlideDir(-1);
    setLightboxId(filtered[ni].id);
  }, [filtered, lightboxIndex, total]);

  const lightboxNext = useCallback(() => {
    if (total === 0 || lightboxIndex < 0) return;
    const ni = (lightboxIndex + 1) % total;
    setLightboxSlideDir(1);
    setLightboxId(filtered[ni].id);
  }, [filtered, lightboxIndex, total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && lightboxId !== null) {
        closeLightbox();
        return;
      }
      if (lightboxId !== null) {
        if (e.key === "ArrowLeft") lightboxPrev();
        if (e.key === "ArrowRight") lightboxNext();
        return;
      }
      if (e.key === "ArrowLeft") goPrevWindow();
      if (e.key === "ArrowRight") advanceNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    lightboxId,
    closeLightbox,
    lightboxPrev,
    lightboxNext,
    goPrevWindow,
    advanceNext,
  ]);

  const gridClass =
    total === 1
      ? "mx-auto grid max-w-2xl grid-cols-1 gap-4"
      : total === 2
        ? "grid grid-cols-2 gap-3 md:gap-5"
        : "";

  const aspectCell =
    total === 1
      ? "relative aspect-[4/3] w-full overflow-hidden rounded-2xl md:aspect-[16/10] md:rounded-3xl"
      : "relative shrink-0 overflow-hidden rounded-xl md:rounded-2xl";

  const stripRowHeight = cellW > 0 ? (cellW * 4) / 3 : undefined;

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartX.current = e.clientX;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerStartX.current === null) return;
    const dx = e.clientX - pointerStartX.current;
    pointerStartX.current = null;
    if (dx < -swipeThreshold) advanceNext();
    else if (dx > swipeThreshold) goPrevWindow();
  };

  return (
    <MotionSection
      id="gallery"
      className="bg-[var(--white)] px-6 py-24 md:px-10 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
            {t("gallery.kicker")}
          </p>
          <h2 className="mt-3 font-[family-name:var(--heading-font)] text-3xl font-semibold text-[var(--charcoal)] md:text-4xl">
            {t("gallery.heading")}
          </h2>
          <p className="mt-4 text-[var(--charcoal)]/75">
            {t("gallery.sub")}
          </p>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
          {filterConfig.map(({ key, labelKey }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                filter === key
                  ? "bg-[var(--gold)] text-[var(--white)] shadow-soft"
                  : "bg-[var(--ivory)] text-[var(--charcoal)]/80 hover:bg-[var(--blush-pink)]/70 hover:text-[var(--charcoal)]"
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        <div
          className="relative mt-14"
          role="region"
          aria-roledescription="carousel"
          aria-label={t("gallery.carousel")}
        >
          {total === 0 ? (
            <p className="py-16 text-center text-[var(--charcoal)]/60">
              {t("gallery.empty")}
            </p>
          ) : (
            <>
              <div
                className="relative overflow-hidden rounded-3xl bg-[var(--dove-grey)]/40 p-2 shadow-soft-lg md:p-3"
                onMouseEnter={() => setPauseAuto(true)}
                onMouseLeave={() => setPauseAuto(false)}
              >
                {canRotate ? (
                  <div
                    ref={viewportRef}
                    className="relative w-full min-h-[200px] overflow-hidden md:min-h-[260px]"
                    style={
                      stripRowHeight
                        ? { height: stripRowHeight }
                        : undefined
                    }
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={() => {
                      pointerStartX.current = null;
                    }}
                  >
                    <motion.div
                      className="flex h-full cursor-grab gap-2 active:cursor-grabbing md:gap-4"
                      style={{ x, width: "max-content" }}
                    >
                      {[0, 1, 2, 3].map((offset) => {
                        const img =
                          filtered[(windowStart + offset) % total];
                        const a = altFor(locale, img);
                        return (
                          <button
                            key={`${windowStart}-${offset}-${img.id}`}
                            type="button"
                            className={`${aspectCell} group h-full bg-[var(--dove-grey)] text-left shadow-soft ring-0 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2`}
                            style={{
                              width: cellW > 0 ? cellW : "33.333%",
                              minWidth: cellW > 0 ? cellW : undefined,
                            }}
                            onClick={() => openLightbox(img.id)}
                            aria-label={expandTpl(t("gallery.openFullScreen"), {
                              alt: a,
                            })}
                          >
                            <div className="relative h-full w-full min-h-[180px] md:min-h-[220px]">
                              <Image
                                src={img.src}
                                alt={a}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                sizes="(max-width: 768px) 34vw, 240px"
                                priority={offset === 0}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  </div>
                ) : (
                  <div className={`${gridClass}`}>
                    {visible.map((img) => {
                      const a = altFor(locale, img);
                      return (
                      <button
                        key={`${filter}-${img.id}`}
                        type="button"
                        className={`relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-[var(--dove-grey)] text-left shadow-soft ring-0 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2 md:aspect-[4/5] md:rounded-2xl group`}
                        onClick={() => openLightbox(img.id)}
                        aria-label={expandTpl(t("gallery.openFullScreen"), {
                          alt: a,
                        })}
                      >
                        <Image
                          src={img.src}
                          alt={a}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          sizes={
                            total === 1
                              ? "(max-width: 768px) 100vw, 672px"
                              : "(max-width: 768px) 50vw, 25vw"
                          }
                          priority={img.id === visible[0]?.id}
                        />
                      </button>
                    );
                    })}
                  </div>
                )}

                {canRotate && (
                  <>
                    <button
                      type="button"
                      onClick={goPrevWindow}
                      className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--dove-grey)] bg-[var(--white)]/95 text-[var(--charcoal)] shadow-soft transition-all hover:border-[var(--gold)]/50 hover:text-[var(--dark-gold)] md:left-4 md:h-12 md:w-12"
                      aria-label={t("gallery.prev")}
                    >
                      <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      onClick={advanceNext}
                      className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--dove-grey)] bg-[var(--white)]/95 text-[var(--charcoal)] shadow-soft transition-all hover:border-[var(--gold)]/50 hover:text-[var(--dark-gold)] md:right-4 md:h-12 md:w-12"
                      aria-label={t("gallery.next")}
                    >
                      <ChevronRight className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.5} />
                    </button>
                  </>
                )}
              </div>

              <div className="mt-6 flex flex-col items-center gap-4">
                <p
                  className="text-center text-sm font-medium text-[var(--charcoal)]/70"
                  aria-live="polite"
                >
                  {canRotate ? (
                    <>
                      {t("gallery.showing")}{" "}
                      {[0, 1, 2]
                        .map((k) => ((windowStart + k) % total) + 1)
                        .join(" · ")}{" "}
                      {t("gallery.ofTotal", { total })}
                      <span className="mx-2 text-[var(--dove-grey)]">·</span>
                      <span className="text-[var(--charcoal)]/55">
                        {t("gallery.autoPause", {
                          sec: AUTO_INTERVAL_MS / 1000,
                        })}
                      </span>
                    </>
                  ) : (
                    <>
                      {t("gallery.photosCount", { n: total })}
                      <span className="mx-2 text-[var(--dove-grey)]">·</span>
                      <span className="text-[var(--charcoal)]/55">
                        {t("gallery.hintSingle")}
                      </span>
                    </>
                  )}
                </p>

                {canRotate && (
                  <div
                    className="flex max-w-full flex-wrap justify-center gap-2 px-2"
                    role="tablist"
                    aria-label={t("gallery.position")}
                  >
                    {filtered.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        role="tab"
                        aria-selected={i === windowStart}
                        aria-label={t("gallery.photoOf", {
                          current: i + 1,
                          total,
                        })}
                        onClick={() => goToWindow(i)}
                        className={`h-2.5 rounded-full transition-all duration-300 ${
                          i === windowStart
                            ? "w-8 bg-[var(--gold)]"
                            : "w-2.5 bg-[var(--dove-grey)] hover:bg-[var(--gold)]/50"
                        }`}
                      />
                    ))}
                  </div>
                )}

                <p className="text-center text-xs text-[var(--charcoal)]/45">
                  {canRotate ? t("gallery.hintMulti") : t("gallery.hintSingle")}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {lightboxImage && (
          <motion.div
            key="lightbox-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={t("gallery.lightbox")}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--charcoal)]/88 p-3 backdrop-blur-sm sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeLightbox}
          >
            <div
              className="relative w-full max-w-6xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="absolute right-2 top-2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--white)]/95 text-[var(--charcoal)] shadow-soft transition-colors hover:bg-[var(--gold)] hover:text-[var(--white)] sm:right-4 sm:top-4 sm:h-11 sm:w-11"
                onClick={closeLightbox}
                aria-label={t("gallery.close")}
              >
                <X className="h-5 w-5" />
              </button>

              {total > 1 && (
                <>
                  <button
                    type="button"
                    className="absolute left-0 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--white)]/20 bg-[var(--charcoal)]/80 text-[var(--white)] shadow-soft backdrop-blur-sm transition-colors hover:bg-[var(--gold)] hover:text-[var(--white)] sm:left-2 sm:h-12 sm:w-12 md:left-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      lightboxPrev();
                    }}
                    aria-label={t("gallery.prevOne")}
                  >
                    <ChevronLeft className="h-6 w-6" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    className="absolute right-0 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--white)]/20 bg-[var(--charcoal)]/80 text-[var(--white)] shadow-soft backdrop-blur-sm transition-colors hover:bg-[var(--gold)] hover:text-[var(--white)] sm:right-2 sm:h-12 sm:w-12 md:right-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      lightboxNext();
                    }}
                    aria-label={t("gallery.nextOne")}
                  >
                    <ChevronRight className="h-6 w-6" strokeWidth={1.5} />
                  </button>
                </>
              )}

              <div className="relative mx-auto aspect-[4/3] max-h-[85vh] w-full overflow-hidden rounded-2xl bg-[var(--charcoal)] shadow-soft-lg sm:aspect-[16/10]">
                <AnimatePresence
                  initial={false}
                  mode="sync"
                  custom={lightboxSlideDir}
                >
                  <motion.div
                    key={lightboxId}
                    custom={lightboxSlideDir}
                    variants={lightboxSlideVariants}
                    initial={lightboxSlideDir === 0 ? false : "enter"}
                    animate="center"
                    exit="exit"
                    transition={slideTransition}
                    className="absolute inset-0"
                  >
                    <Image
                      src={lightboxImage.src}
                      alt={altFor(locale, lightboxImage)}
                      fill
                      className="object-contain"
                      sizes="100vw"
                      priority
                    />
                  </motion.div>
                </AnimatePresence>
              </div>

              <p className="mt-4 text-center text-sm text-[var(--white)]/85">
                {altFor(locale, lightboxImage)}
                <span className="mx-2 text-[var(--white)]/40">·</span>
                {lightboxIndex + 1} / {total}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionSection>
  );
}
