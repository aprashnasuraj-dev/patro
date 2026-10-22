import { describe, expect, it } from "vitest";
import { FEATURE_GROUPS, PATRO_FEATURES, validateFeatureCatalog, getFeatureAvailability } from "../src/panchang-jyotish/catalog";
import { fromCalculatedDay, mergeVerifiedArchive, PANCHANG_CONTRACT_VERSION } from "../src/panchang-jyotish/contract";
import { KATHMANDU, type DayPanchang } from "../src/patro-tools/core/types";

describe("five-group Panchang feature catalog", () => {
  it("contains 91 distinct bilingual entries in exactly five groups", () => {
    const result = validateFeatureCatalog();
    expect(result.valid).toBe(true);
    expect(result.countByGroup).toEqual({
      panchang: 26, muhurat: 14, jyotish: 19, planets: 20, "nepal-calendar": 12
    });
    expect(FEATURE_GROUPS).toHaveLength(5);
    for (const feature of PATRO_FEATURES) {
      expect(feature.titleNe.trim().length).toBeGreaterThan(1);
      expect(feature.titleEn.trim().length).toBeGreaterThan(1);
      expect(feature.descriptionNe.trim().length).toBeGreaterThan(1);
      expect(feature.descriptionEn.trim().length).toBeGreaterThan(1);
      expect(feature.href.startsWith("/")).toBe(true);
      expect(feature.href.includes("?")).toBe(false);
    }
  });
  it("does not silently classify unreviewed cards as completed calculators", () => {
    const count = (state: ReturnType<typeof getFeatureAvailability>) => PATRO_FEATURES.filter(item => getFeatureAvailability(item) === state).length;
    expect(count("existing")).toBe(17);
    expect(count("browser-preview")).toBe(48);
    expect(count("reference")).toBe(26);
    expect(count("existing") + count("browser-preview") + count("reference")).toBe(91);
    expect(getFeatureAvailability(PATRO_FEATURES.find(item => item.id === "F058")!)).toBe("reference");
    expect(getFeatureAvailability(PATRO_FEATURES.find(item => item.id === "F067")!)).toBe("existing");
  });
  it("uses an explicit source-review disposition without promoting gated items to tools", () => {
    const gated = PATRO_FEATURES.filter(feature => feature.disposition === "source-review");
    expect(gated).toHaveLength(26);
    expect(gated.every(feature => getFeatureAvailability(feature) === "reference" || ["F021", "F022"].includes(feature.id))).toBe(true);
    expect(getFeatureAvailability(PATRO_FEATURES.find(feature => feature.id === "F021")!)).toBe("browser-preview");
    expect(getFeatureAvailability(PATRO_FEATURES.find(feature => feature.id === "F064")!)).toBe("reference");
    expect(getFeatureAvailability(PATRO_FEATURES.find(feature => feature.id === "F022")!)).toBe("browser-preview");
  });
  it("does not create a second My Time tool route or duplicate canonical chart route", () => {
    expect(PATRO_FEATURES.filter((feature) => feature.href === "/mytime").length).toBeGreaterThan(0);
    expect(PATRO_FEATURES.filter((feature) => feature.href === "/janmapatro").length).toBeGreaterThan(0);
    expect(PATRO_FEATURES.every((feature) => !feature.href.startsWith("/mytime/"))).toBe(true);
  });
});

const day = {
  date: "2026-10-22", weekday: 4,
  sunrise: new Date("2026-10-22T00:32:00.000Z"),
  sunset: new Date("2026-10-22T12:05:00.000Z"),
  tithiEnds: new Date("2026-10-22T09:18:00.000Z"),
  tithi: 10, paksha: "shukla", tithiInPaksha: 10,
  nakshatra: 6, nakshatraPada: 2, yoga: 3, karana: 4,
  moonRashi: 3, sunRashi: 6, moonPhaseAngle: 108, moonSidereal: 95, sunSidereal: 191,
  instant: new Date("2026-10-22T00:32:00.000Z"),
  lunarMonth: { amantaIndex: 6, adhik: false, kshaya: false, start: new Date("2026-10-10T00:00:00Z"), end: new Date("2026-11-09T00:00:00Z") },
  monthIndex: 6
} satisfies DayPanchang;

describe("versioned Panchang contract", () => {
  it("keeps fallback provenance explicit and no official observance invented", () => {
    const result = fromCalculatedDay(day, KATHMANDU);
    expect(result.version).toBe(PANCHANG_CONTRACT_VERSION);
    expect(result.elements.tithi.source).toBe("calculated");
    expect(result.elements.tithi.ends?.instantUtc).toBe("2026-10-22T09:18:00.000Z");
    expect(result.officialObservances).toEqual([]);
    expect(result.calendars.bs).toBeNull();
  });
  it("prefers verified archive entries while preserving discrepancy evidence", () => {
    const fallback = fromCalculatedDay(day, KATHMANDU);
    const result = mergeVerifiedArchive(fallback, {
      dateAd: day.date, timezone: "Asia/Kathmandu", sourceId: "verified-archive-fixture-v1",
      confidence: "high", bs: { year: 2083, month: 7, day: 5 },
      elements: { tithi: { index: 11, ends: { instantUtc: "2026-10-22T09:19:00.000Z", source: "archive", confidence: "high" } } }
    });
    expect(result.elements.tithi.index).toBe(11);
    expect(result.elements.tithi.source).toBe("archive");
    expect(result.discrepancies).toContainEqual({
      field: "tithi", archive: "11", calculated: "10", note: "verified-archive-fixture-v1"
    });
    expect(result.calendars.bs).toEqual({ year: 2083, month: 7, day: 5 });
    expect(fallback.elements.tithi.index).toBe(10);
  });
  it("rejects silent merging of different dates, timezones and unknown sources", () => {
    const fallback = fromCalculatedDay(day, KATHMANDU);
    expect(() => mergeVerifiedArchive(fallback, { dateAd: "2026-10-23", timezone: "Asia/Kathmandu", sourceId: "a", confidence: "high" })).toThrow();
    expect(() => mergeVerifiedArchive(fallback, { dateAd: day.date, timezone: "Asia/Kolkata", sourceId: "a", confidence: "high" })).toThrow();
    expect(() => mergeVerifiedArchive(fallback, { dateAd: day.date, timezone: "Asia/Kathmandu", sourceId: "", confidence: "high" })).toThrow();
  });
});
