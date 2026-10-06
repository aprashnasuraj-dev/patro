// Single runtime definition of the indexable BS-year window. scripts/seo-config.mjs (approxBsYear,
// SITEMAP_MIN_BS_YEAR) uses the identical formula at build time, so a calendar URL is in a sitemap
// exactly when this cutoff leaves it indexable. tests/seo-discovery-contract.test.mjs locks the parity.

/** Approximate Bikram Sambat year in Asia/Kathmandu (BS New Year treated as 14 April). */
export function approxBsYear(date: Date = new Date()): number {
  const parts: Record<string, number> = {};
  for (const part of new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kathmandu", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  const afterApproxNewYear = parts.month > 4 || (parts.month === 4 && parts.day >= 14);
  return parts.year + (afterApproxNewYear ? 57 : 56);
}

/** Oldest BS year whose /calendar/YYYY/MM pages are indexable (current BS year - 10). */
export function minIndexableBsYear(date: Date = new Date()): number {
  return approxBsYear(date) - 10;
}

/** true when /calendar/YYYY/... is older than the indexable window and must be served noindex. */
export function historicalCalendarNoindex(path: string, date: Date = new Date()): boolean {
  const match = path.match(/^\/calendar\/(\d{4})\//);
  if (!match) return false;
  return Number(match[1]) < minIndexableBsYear(date);
}
