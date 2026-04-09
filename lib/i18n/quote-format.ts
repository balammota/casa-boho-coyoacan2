import type { QuoteLine } from "@/lib/pricing";
import type { Locale } from "./types";
import { quoteMessages } from "./quote-messages";

export function formatQuoteLine(line: QuoteLine, locale: Locale): string {
  const m = quoteMessages[locale];
  switch (line.kind) {
    case "feb28":
      return m.feb28;
    case "months30":
      return m.months30.replace("{{n}}", String(line.count));
    case "weeks7":
      return m.weeks7.replace("{{n}}", String(line.count));
    case "nightsDaily":
      return line.count === 1
        ? m.nightsOne.replace("{{n}}", String(line.count))
        : m.nightsMany.replace("{{n}}", String(line.count));
    default:
      return "";
  }
}

export function formatQuoteLineEnglish(line: QuoteLine): string {
  return formatQuoteLine(line, "en");
}
