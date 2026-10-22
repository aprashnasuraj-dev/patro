/**
 * Source-audited *candidate classification*, not an observance or personalized verdict.
 * Nakshatra numbers are one-based (Ashwini = 1, Revati = 27).
 * Source references and limitations: docs/panchang-jyotish-integration/08_RULE_SOURCE_AUDIT.md
 */
export const SOURCE_REVIEWED_NAKSHATRA_RULES = Object.freeze({
  panchak: [23,24,25,26,27],
  gandaMoola: [1,9,10,18,19,27],
  pushya: 8
} as const);
export type CandidateNakshatraRule = "panchak" | "gandaMoola" | "raviPushya" | "guruPushya";
export function classifyNakshatraCandidate(rule: CandidateNakshatraRule, nakshatraOneBased: number, weekday: number): boolean {
  if (!Number.isInteger(nakshatraOneBased) || nakshatraOneBased < 1 || nakshatraOneBased > 27 || !Number.isInteger(weekday) || weekday < 0 || weekday > 6) return false;
  if (rule === "panchak") return SOURCE_REVIEWED_NAKSHATRA_RULES.panchak.includes(nakshatraOneBased as 23);
  if (rule === "gandaMoola") return SOURCE_REVIEWED_NAKSHATRA_RULES.gandaMoola.includes(nakshatraOneBased as 1);
  if (rule === "raviPushya") return weekday === 0 && nakshatraOneBased === SOURCE_REVIEWED_NAKSHATRA_RULES.pushya;
  return weekday === 4 && nakshatraOneBased === SOURCE_REVIEWED_NAKSHATRA_RULES.pushya;
}
/** Convert a UTC instant to the Kathmandu civil weekday (Sunday=0). This is not a sunrise-to-sunrise Vara. */
export function kathmanduCivilWeekday(instant: Date): number {
  const localDate = new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(instant);
  const val = (type: string) => localDate.find(p=>p.type===type)?.value ?? "";
  const year=Number(val("year")),month=Number(val("month")),day=Number(val("day"));
  return new Date(Date.UTC(year,month-1,day)).getUTCDay();
}
