import { archiveDay, type ArchiveDay } from "../patro-tools-integration/staticCalendar";
import { KATHMANDU } from "../patro-tools/core/types";
import { defaultPanchang } from "../patro-tools/core/provider";
import { fromCalculatedDay, mergeVerifiedArchive, type PanchangDayContractV1, type PanchangElement, type PanchangInstant, type VerifiedArchiveOverlay } from "./contract";

type Named = { number?: unknown; index?: unknown; ne?: unknown; en?: unknown; name_ne?: unknown; name_en?: unknown; name?: unknown; end_npt?: unknown; start_npt?: unknown };
const asObject = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const numberOrNull = (value: unknown) => typeof value === "number" && Number.isInteger(value) ? value : null;
const stringOrNull = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;

/**
 * Archive timestamps are interpreted only when they carry an explicit UTC offset,
 * or a civil-date+clock pair explicitly marked NPT. Unqualified clock strings alone
 * must not silently become an invented event date.
 */
function archiveInstant(value: unknown, confidence: "high" | "unverified" = "unverified"): PanchangInstant | null {
  if (typeof value !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? { instantUtc: parsed.toISOString(), source: "archive", confidence } : null;
}
function namedElement(value: unknown, confidence: "high" | "unverified", kind: "tithi" | "other"): Partial<PanchangElement> {
  const item = asObject(value) as Named;
  // The static schema documents Tithi number (1..30); other numeric conventions are not assumed.
  const candidate = kind === "tithi" ? numberOrNull(item.number) : numberOrNull(item.index);
  const index = candidate !== null && (kind === "tithi" ? candidate >= 1 && candidate <= 30 : candidate >= 0 && candidate <= 26) ? candidate : null;
  return {
    ...(index !== null ? { index } : {}),
    ...(stringOrNull(item.ne) ?? stringOrNull(item.name_ne) ? { nameNe: stringOrNull(item.ne) ?? stringOrNull(item.name_ne) } : {}),
    ...(stringOrNull(item.en) ?? stringOrNull(item.name_en) ? { nameEn: stringOrNull(item.en) ?? stringOrNull(item.name_en) } : {}),
    ...(archiveInstant(item.start_npt, confidence) ? { starts: archiveInstant(item.start_npt, confidence) } : {}),
    ...(archiveInstant(item.end_npt, confidence) ? { ends: archiveInstant(item.end_npt, confidence) } : {})
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
  const tithi = namedElement(p.tithi, confidence, "tithi");
  const nk = namedElement(p.nakshatra, confidence, "other");
  const nak = asObject(p.nakshatra);
  const pada = numberOrNull(nak.pada) ?? numberOrNull(p.nakshatra_pada);
  return {
    dateAd, timezone: "Asia/Kathmandu", sourceId: "existing-calendar-year-archive",
    confidence, bs: { year: row.bs.year, month: row.bs.month, day: row.bs.day },
    nepalSambat: nsText(row.ns ?? row.nepal_sambat),
    elements: {
      tithi,
      nakshatra: { ...namedElement(p.nakshatra, confidence, "other"), pada: pada !== null && pada >= 1 && pada <= 4 ? pada : calculated.elements.nakshatra.pada },
      yoga: namedElement(p.yoga, confidence, "other"),
      karana: namedElement(p.karana, confidence, "other")
    }
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
