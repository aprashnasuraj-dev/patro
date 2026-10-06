// Single runtime definition of the indexable BS-year window. scripts/seo-config.mjs uses the
// identical formula at build time, so a calendar/date URL is submitted exactly when runtime
// leaves it indexable. The current factual cohort is 35 years back + current + 10 years forward
// (46 BS years total when the archive contains the complete range).

export const INDEXABLE_PAST_YEARS = 35;
export const INDEXABLE_FUTURE_YEARS = 10;

/** Approximate Bikram Sambat year in Asia/Kathmandu (BS New Year treated as 14 April). */
export function approxBsYear(date: Date = new Date()): number {
  const parts: Record<string, number> = {};
  for (const part of new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kathmandu", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  const afterApproxNewYear = parts.month > 4 || (parts.month === 4 && parts.day >= 14);
  return parts.year + (afterApproxNewYear ? 57 : 56);
}

export function minIndexableBsYear(date: Date = new Date()): number {
  return approxBsYear(date) - INDEXABLE_PAST_YEARS;
}

export function maxIndexableBsYear(date: Date = new Date()): number {
  return approxBsYear(date) + INDEXABLE_FUTURE_YEARS;
}

export function isIndexableBsYear(year: number, date: Date = new Date()): boolean {
  return Number.isInteger(year) && year >= minIndexableBsYear(date) && year <= maxIndexableBsYear(date);
}

/** true when /calendar/YYYY[/MM] is outside the bounded factual discovery cohort and must be served noindex. */
export function historicalCalendarNoindex(path: string, date: Date = new Date()): boolean {
  const match = path.match(/^\/calendar\/(\d{4})(?:\/|$)/);
  if (!match) return false;
  return !isIndexableBsYear(Number(match[1]), date);
}
