"use client";

import type { LucideIcon } from "lucide-react";
import {
  Clock,
  DoorOpen,
  Moon,
  Ban,
  CigaretteOff,
  HeartHandshake,
} from "lucide-react";
import { MotionSection } from "./MotionSection";
import { useI18n } from "@/components/providers/LanguageProvider";

const rules: {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
}[] = [
  { icon: Clock, titleKey: "houseRules.checkinTitle", descKey: "houseRules.checkinDesc" },
  { icon: DoorOpen, titleKey: "houseRules.checkoutTitle", descKey: "houseRules.checkoutDesc" },
  { icon: Ban, titleKey: "houseRules.eventsTitle", descKey: "houseRules.eventsDesc" },
  { icon: CigaretteOff, titleKey: "houseRules.smokingTitle", descKey: "houseRules.smokingDesc" },
  { icon: HeartHandshake, titleKey: "houseRules.neighborsTitle", descKey: "houseRules.neighborsDesc" },
  { icon: Moon, titleKey: "houseRules.quietTitle", descKey: "houseRules.quietDesc" },
];

export function HouseRules() {
  const { t } = useI18n();

  return (
    <MotionSection
      id="house-rules"
      className="bg-[var(--white)] px-6 py-24 md:px-10 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
            {t("houseRules.kicker")}
          </p>
          <h2 className="mt-3 font-[family-name:var(--heading-font)] text-3xl font-semibold text-[var(--charcoal)] md:text-4xl">
            {t("houseRules.heading")}
          </h2>
          <p className="mt-4 text-[var(--charcoal)]/75">
            {t("houseRules.sub")}
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rules.map(({ icon: Icon, titleKey, descKey }) => (
            <div
              key={titleKey}
              className="flex gap-4 rounded-2xl border border-[var(--dove-grey)]/80 bg-[var(--ivory)]/50 p-6 shadow-soft transition-all duration-300 hover:border-[var(--gold)]/25 hover:shadow-soft-lg"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--white)] text-[var(--dark-gold)] shadow-soft">
                <Icon className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-[family-name:var(--heading-font)] text-lg font-semibold text-[var(--charcoal)]">
                  {t(titleKey)}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--charcoal)]/70">
                  {t(descKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MotionSection>
  );
}
