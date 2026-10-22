import { archiveDay, type ArchiveDay } from "../patro-tools-integration/staticCalendar";
import { KATHMANDU } from "../patro-tools/core/types";
import { defaultPanchang } from "../patro-tools/core/provider";
import { fromCalculatedDay, mergeVerifiedArchive, type PanchangDayContractV1, type PanchangElement, type PanchangInstant, type VerifiedArchiveOverlay } from "./contract";

type Named = { number?: unknown; index?: unknown; ne?: unknown; en?: unknown; name_ne?: unknown; name_en?: unknown; name?: unknown; end_npt?: unknown; start_npt?: unknown; ends_npt?: unknown; starts_npt?: unknown };
const asObject = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const numberOrNull = (value: unknown) => typeof value === "number" && Number.isInteger(value) ? value : null;
const stringOrNull = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;

/**
 * Archive timestamps are interpreted only when they carry an explicit UTC offset,
 * or a civil-date+clock pair explicitly marked NPT. Unqualified clock strings alone
 * must not silently become an invented event date.
 */
function validCivilDate(year:number,month:number,day:number):boolean {
  const value = new Date(0);
  value.setUTCFullYear(year, month - 1, day);
  value.setUTCHours(0, 0, 0, 0);
  return value.getUTCFullYear() === year && value.getUTCMonth() === month - 1 && value.getUTCDate() === day;
}
function validClock(hour:number,minute:number,second:number):boolean {
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59;
}
function archiveInstant(value: unknown, confidence: "high" | "unverified" = "unverified"): PanchangInstant | null {
  if (typeof value !== "string") return null;

  // These *_npt fields carry their civil-date/clock timezone in the field name.
  // Convert their wall clock explicitly rather than relying on the browser's timezone.
  const npt = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?$/);
  if (npt) {
    const year=Number(npt[1]), month=Number(npt[2]), day=Number(npt[3]);
    const hour=Number(npt[4]), minute=Number(npt[5]), second=Number(npt[6] ?? 0);
    const fraction=npt[7] ?? "";
    const millisecond=Number((fraction+"000").slice(0,3));
    if (!validCivilDate(year,month,day) || !validClock(hour,minute,second)) return null;
    const local = new Date(0);
    local.setUTCFullYear(year,month-1,day);
    local.setUTCHours(hour,minute,second,millisecond);
    // Nepal Standard Time is UTC+05:45 year-round; archive wall clock -> UTC instant.
    const parsed = new Date(local.getTime() - 345 * 60_000);
    return Number.isFinite(parsed.getTime()) ? { instantUtc: parsed.toISOString(), source: "archive", confidence } : null;
  }

  // Other timestamps must state their UTC offset. Date-only values and clock-only strings are ambiguous.
  const explicit = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|([+-])(\d{2}):(\d{2}))$/);
  if (!explicit) return null;
  const year=Number(explicit[1]), month=Number(explicit[2]), day=Number(explicit[3]);
  const hour=Number(explicit[4]), minute=Number(explicit[5]), second=Number(explicit[6] ?? 0);
  if (!validCivilDate(year,month,day) || !validClock(hour,minute,second)) return null;
  if (explicit[9]) {
    const offsetHour=Number(explicit[10]), offsetMinute=Number(explicit[11]);
    if (offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0)) return null;
  }
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? { instantUtc: parsed.toISOString(), source: "archive", confidence } : null;
}
/** Interpret a row-scoped HH:mm value only when the field's contract says it is NPT. */
function archiveNptClock(dateAd: string, value: unknown, confidence: "high" | "unverified" = "unverified"): PanchangInstant | null {
  if (typeof value === "number") {
    // Some existing archive shapes store wall-clock minutes after midnight.
    if (!Number.isInteger(value) || value < 0 || value >= 24 * 60) return null;
    const match = dateAd.match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
    if (!match) return null;
    const year=Number(match[1]), month=Number(match[2]), day=Number(match[3]);
    if (!validCivilDate(year,month,day)) return null;
    const local = new Date(0);
    local.setUTCFullYear(year,month-1,day);
    local.setUTCHours(0,value,0,0);
    const parsed = new Date(local.getTime() - 345 * 60_000);
    return { instantUtc: parsed.toISOString(), source: "archive", confidence };
  }
  if (typeof value !== "string") return null;
  const instant = archiveInstant(value, confidence);
  if (instant) return instant;
  const clock = value.match(/^(\\d{1,2}):(\\d{2})(?::(\\d{2})(?:\\.(\\d+))?)?$/);
  const date = dateAd.match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
  if (!clock || !date) return null;
  const year=Number(date[1]), month=Number(date[2]), day=Number(date[3]);
  const hour=Number(clock[1]), minute=Number(clock[2]), second=Number(clock[3] ?? 0);
  const millisecond=Number(((clock[4] ?? "")+"000").slice(0,3));
  if (!validCivilDate(year,month,day) || !validClock(hour,minute,second)) return null;
  const local = new Date(0);
  local.setUTCFullYear(year,month-1,day);
  local.setUTCHours(hour,minute,second,millisecond);
  const parsed = new Date(local.getTime() - 345 * 60_000);
  return { instantUtc: parsed.toISOString(), source: "archive", confidence };
}
function archiveNptBoundary(value: unknown, dateAd: string, confidence: "high" | "unverified"): PanchangInstant | null {
  return archiveNptClock(dateAd, value, confidence);
}
function archivedTithiTransition(value: unknown, dateAd: string, confidence: "high" | "unverified"): PanchangInstant | null {
  const transition = asObject(value);
  const byTime = archiveNptClock(dateAd, transition.time, confidence);
  const byMinutes = archiveNptClock(dateAd, transition.minutes, confidence);
  if (byTime && byMinutes && byTime.instantUtc !== byMinutes.instantUtc) return null;
  return byTime ?? byMinutes;
}

function namedElement(value: unknown, dateAd: string, confidence: "high" | "unverified", kind: "tithi" | "other"): Partial<PanchangElement> {
  const item = asObject(value) as Named;
  // The static schema documents Tithi number (1..30); other numeric conventions are not assumed.
  const candidate = kind === "tithi" ? numberOrNull(item.number) : numberOrNull(item.index);
  const index = candidate !== null && (kind === "tithi" ? candidate >= 1 && candidate <= 30 : candidate >= 0 && candidate <= 26) ? candidate : null;
  const nameNe=stringOrNull(item.ne) ?? stringOrNull(item.name_ne);
  const nameEn=stringOrNull(item.en) ?? stringOrNull(item.name_en);
  const starts=archiveNptBoundary(item.starts_npt ?? item.start_npt, dateAd, confidence);
  const ends=archiveNptBoundary(item.ends_npt ?? item.end_npt, dateAd, confidence);
  return {
    ...(index !== null ? { index } : {}),
    ...(nameNe ? { nameNe } : {}),
    ...(nameEn ? { nameEn } : {}),
    ...(starts ? { starts } : {}),
    ...(ends ? { ends } : {})
  };
}
function nsText(value: unknown): string | null {
  if (typeof value === "string") return stringOrNull(value);
  const item = asObject(value);
  return stringOrNull(item.formatted_ne) ?? stringOrNull(item.formatted) ?? null;
}
export function overlayFromStaticArchive(dateAd: string, row: ArchiveDay, calculated: PanchangDayContractV1): VerifiedArchiveOverlay {
  if (row.ad !== dateAd || !row.bs || !row.panchang?.tithi) throw new Error("archive_row_incomplete");
  const p = asObject(row.panchang);
  const confidence = "unverified" as const; // Packaged archive has no per-field audited confidence guarantee.
  const tithi = namedElement(p.tithi, dateAd, confidence, "tithi");
  const transitionEnd = archivedTithiTransition(p.tithi_transition, dateAd, confidence);
  const tithiWithBoundary = tithi.ends || !transitionEnd ? tithi : { ...tithi, ends: transitionEnd };
  const nak = asObject(p.nakshatra);
  const nk = namedElement(p.nakshatra, dateAd, confidence, "other");
  const pada = numberOrNull(nak.pada) ?? numberOrNull(p.nakshatra_pada);
  const elements: VerifiedArchiveOverlay["elements"] = {
    ...(Object.keys(tithiWithBoundary).length ? { tithi: tithiWithBoundary } : {}),
    ...(Object.keys(nk).length || (pada !== null && pada >= 1 && pada <= 4)
      ? { nakshatra: { ...nk, ...(pada !== null && pada >= 1 && pada <= 4 ? { pada } : {}) } }
      : {}),
    ...(Object.keys(namedElement(p.yoga, dateAd, confidence, "other")).length ? { yoga: namedElement(p.yoga, dateAd, confidence, "other") } : {}),
    ...(Object.keys(namedElement(p.karana, dateAd, confidence, "other")).length ? { karana: namedElement(p.karana, dateAd, confidence, "other") } : {})
  };
  const location = stringOrNull(p.location)?.toLocaleLowerCase("en") ?? "";
  const archiveIsKathmandu = location.includes("kathmandu");
  const sunrise = archiveIsKathmandu ? archiveNptClock(dateAd, p.sunrise, confidence) : null;
  const sunset = archiveIsKathmandu ? archiveNptClock(dateAd, p.sunset, confidence) : null;
  return {
    dateAd, timezone: "Asia/Kathmandu", sourceId: "existing-calendar-year-archive",
    confidence, bs: { year: row.bs.year, month: row.bs.month, day: row.bs.day },
    nepalSambat: nsText(row.ns ?? row.nepal_sambat),
    ...(Object.keys(elements).length ? { elements } : {}),
    ...(sunrise || sunset ? { sun: { ...(sunrise ? { sunrise } : {}), ...(sunset ? { sunset } : {}) } } : {})
  };
}
export type PanchangResolvedDay = { value: PanchangDayContractV1; archive: "loaded" | "unavailable"; warning: string | null };

/** Reuses an existing public static archive asset; no new Worker route, D1 call or writes. */
export async function resolveNepalPanchangDay(dateAd: string, signal?: AbortSignal): Promise<PanchangResolvedDay> {
  const calculated = fromCalculatedDay(defaultPanchang.day(dateAd, KATHMANDU), KATHMANDU);
  try {
    const row = await archiveDay(dateAd, signal);
    const overlay = overlayFromStaticArchive(dateAd, row, calculated);
    return { value: mergeVerifiedArchive(calculated, overlay), archive: "loaded", warning: null };
  } catch (error) {
    if (signal?.aborted) throw error;
    return { value: calculated, archive: "unavailable", warning: "verified_archive_unavailable_using_calculated_fallback" };
  }
}
