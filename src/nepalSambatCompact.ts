/**
 * Nepal Sambat day-only text for compact calendar and date cards.
 * Never change the original archival/SEO/detail text.
 */
type NsLanguage = "ne" | "en";
type NsLike = {
  formatted_ne?: unknown; formatted?: unknown;
  month?: { dev?: unknown; roman?: unknown; ne?: unknown };
  paksha_dev?: unknown; paksha?: unknown; tithi_name_ne?: unknown;
  tithi_number?: unknown; tithi_ordinal?: unknown; day?: unknown;
};
function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}
export function compactNepalSambat(value: unknown, language: NsLanguage = "ne"): string {
  if (value == null) return "";
  let raw = "";
  if (typeof value === "string") raw = value;
  else if (typeof value === "object") {
    const ns = value as NsLike;
    raw = text(language === "en" ? ns.formatted || ns.formatted_ne : ns.formatted_ne || ns.formatted);
    if (!raw) {
      const month = language === "en" ? text(ns.month?.roman || ns.month?.dev) : text(ns.month?.dev || ns.month?.ne || ns.month?.roman);
      const paksha = language === "en" ? text(ns.paksha || ns.paksha_dev) : text(ns.paksha_dev || ns.paksha);
      const tithi = text(ns.tithi_name_ne || ns.tithi_number || ns.tithi_ordinal || ns.day);
      raw = [month, paksha, tithi].filter(Boolean).join(" ");
    }
  }
  return raw
    .replace(/^(?:(?:ने\.?\s*सं\.?|नेसं|नेपाल\s*(?:संवत्?|सम्बत्?)|N\.?\s*S\.?|Nepal\s+Sambat)\s*[:.\-–]?\s*)(?:[0-9०-९]{3,4}\s*)?/iu, "")
    .replace(/^[0-9०-९]{4}\s+(?=\S)/u, "")
    .replace(/^[\s,·:।\-–]+/u, "")
    .trim();
}
