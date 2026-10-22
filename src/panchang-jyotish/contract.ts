import type { DayPanchang, GeoLocation } from "../patro-tools/core/types";

/**
 * A stable read-only bridge for all new Panchang surfaces. The archive is authoritative
 * for published archive fields; calculated fields are separately labelled and never
 * promoted to official without a source. No new profile, endpoint or storage is required.
 */
export const PANCHANG_CONTRACT_VERSION = "1.0.0" as const;
export type PanchangProvenance = "archive" | "calculated" | "published";
export type PanchangConfidence = "high" | "medium" | "low" | "unverified";
export type PanchangInstant = { instantUtc: string | null; source: PanchangProvenance; confidence: PanchangConfidence };
export type PanchangElement = {
  index: number | null;
  nameNe: string | null;
  nameEn: string | null;
  starts: PanchangInstant | null;
  ends: PanchangInstant | null;
  source: PanchangProvenance;
};
export interface PanchangDayContractV1 {
  version: typeof PANCHANG_CONTRACT_VERSION;
  dateAd: string;
  timezone: string;
  location: { latitude: number; longitude: number; altitudeM?: number; label?: string };
  calendars: {
    bs: { year: number; month: number; day: number } | null;
    nepalSambat: string | null;
    /** Optional English/transliterated representation for the same archived NS value. */
    nepalSambatEn?: string | null;
  };
  calculatedAtUtc: string | null;
  /** Reported archive metadata is preserved separately from independent verification. */
  archiveProvenance?: null | {
    sourceId: string;
    reportedSource: string | null;
    reportedVerifiedAt: string | null;
    confidence: PanchangConfidence;
  };
  method: { ayanamsha: string; referenceInstant: "sunrise" | "selected"; engineVersion: string };
  elements: {
    tithi: PanchangElement;
    nakshatra: PanchangElement & { pada: number | null };
    yoga: PanchangElement;
    karana: PanchangElement;
    sunRashi: PanchangElement;
    moonRashi: PanchangElement;
  };
  sun: { sunrise: PanchangInstant | null; sunset: PanchangInstant | null };
  moon: { moonrise: PanchangInstant | null; moonset: PanchangInstant | null };
  lunarMonth: { amantaIndex: number | null; adhika: boolean | null; kshaya: boolean | null };
  officialObservances: Array<{ key: string; dateAd: string; titleNe: string; titleEn: string; sourceUrl: string; verifiedOn: string }>;
  discrepancies: Array<{ field: string; archive: string; calculated: string; note: string }>;
}
const instant = (date: Date | null | undefined, source: PanchangProvenance, confidence: PanchangConfidence = "unverified"): PanchangInstant | null =>
  date && Number.isFinite(date.getTime()) ? { instantUtc: date.toISOString(), source, confidence } : null;
const element = (index: number | null, source: PanchangProvenance): PanchangElement => ({
  index, nameNe: null, nameEn: null, starts: null, ends: null, source
});
export function fromCalculatedDay(day: DayPanchang, location: GeoLocation, engineVersion = "existing-js-fallback"): PanchangDayContractV1 {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date)) throw new Error("invalid_date_ad");
  return {
    version: PANCHANG_CONTRACT_VERSION,
    dateAd: day.date,
    timezone: location.tz,
    location: { latitude: location.lat, longitude: location.lon, altitudeM: location.height, label: location.name },
    calendars: { bs: null, nepalSambat: null, nepalSambatEn: null },
    calculatedAtUtc: day.sunrise.toISOString(),
    archiveProvenance: null,
    method: { ayanamsha: "existing-linear-Lahiri-approximation", referenceInstant: "sunrise", engineVersion },
    elements: {
      tithi: { ...element(day.tithi, "calculated"), ends: instant(day.tithiEnds, "calculated") },
      nakshatra: { ...element(day.nakshatra, "calculated"), pada: day.nakshatraPada },
      yoga: element(day.yoga, "calculated"),
      karana: element(day.karana, "calculated"),
      sunRashi: element(day.sunRashi, "calculated"),
      moonRashi: element(day.moonRashi, "calculated")
    },
    sun: { sunrise: instant(day.sunrise, "calculated"), sunset: instant(day.sunset, "calculated") },
    moon: { moonrise: null, moonset: null },
    lunarMonth: { amantaIndex: day.lunarMonth.amantaIndex, adhika: day.lunarMonth.adhik, kshaya: day.lunarMonth.kshaya },
    officialObservances: [],
    discrepancies: []
  };
}
export type VerifiedArchiveOverlay = {
  dateAd: string;
  timezone: string;
  bs?: { year: number; month: number; day: number } | null;
  nepalSambat?: string | null;
  nepalSambatEn?: string | null;
  elements?: Partial<Record<keyof PanchangDayContractV1["elements"], Partial<PanchangElement> & { pada?: number | null }>>;
  sun?: Partial<PanchangDayContractV1["sun"]>;
  moon?: Partial<PanchangDayContractV1["moon"]>;
  sourceId: string;
  /** Values reported by the archive do not themselves establish accuracy. */
  reportedSource?: string | null;
  reportedVerifiedAt?: string | null;
  confidence: PanchangConfidence;
};
export function mergeVerifiedArchive(calculated: PanchangDayContractV1, archive: VerifiedArchiveOverlay): PanchangDayContractV1 {
  if (calculated.version !== PANCHANG_CONTRACT_VERSION || calculated.dateAd !== archive.dateAd || calculated.timezone !== archive.timezone) {
    throw new Error("panchang_contract_date_or_timezone_mismatch");
  }
  if (!archive.sourceId.trim()) throw new Error("archive_source_missing");
  const discrepancies = [...calculated.discrepancies];
  const elements = { ...calculated.elements };
  if (archive.elements) for (const key of Object.keys(archive.elements) as Array<keyof typeof elements>) {
    const overlay = archive.elements[key];
    if (!overlay) continue;
    const previous = elements[key];
    if (overlay.index !== undefined && previous.index !== null && overlay.index !== previous.index) discrepancies.push({
      field: key, archive: String(overlay.index), calculated: String(previous.index), note: archive.sourceId
    });
    (elements as Record<string, unknown>)[key] = {
      ...previous, ...overlay, source: "archive",
      starts: overlay.starts === undefined ? previous.starts : overlay.starts,
      ends: overlay.ends === undefined ? previous.ends : overlay.ends
    };
  }
  return {
    ...calculated,
    calendars: {
      bs: archive.bs ?? calculated.calendars.bs,
      nepalSambat: archive.nepalSambat ?? calculated.calendars.nepalSambat,
      nepalSambatEn: archive.nepalSambatEn ?? calculated.calendars.nepalSambatEn ?? null
    },
    elements,
    archiveProvenance: {
      sourceId: archive.sourceId,
      reportedSource: archive.reportedSource ?? null,
      reportedVerifiedAt: archive.reportedVerifiedAt ?? null,
      confidence: archive.confidence
    },
    sun: { ...calculated.sun, ...archive.sun },
    moon: { ...calculated.moon, ...archive.moon },
    discrepancies
  };
}
