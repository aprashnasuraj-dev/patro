import { describe, expect, it, vi } from "vitest";
import { KATHMANDU } from "../src/patro-tools/core/types";
import { defaultPanchang } from "../src/patro-tools/core/provider";
import { fromCalculatedDay } from "../src/panchang-jyotish/contract";
import { overlayFromStaticArchive, resolveNepalPanchangDay } from "../src/panchang-jyotish/archive-adapter";

vi.mock("../src/patro-tools-integration/staticCalendar", () => ({
  archiveDay: vi.fn(async (date: string) => ({
    ad: date,
    bs: { year: 2083, month: 7, day: 5 },
    ns: { formatted: "NS 1146 Kaulā thwa Jhinchamilā", formatted_ne: "ने.सं. 1146 कौला थ्वः झिंचमिला" },
    panchang: {
      tithi: { number: 11, paksha: "Shukla Paksha", ne: "एकादशी", en: "Ekadashi" },
      source: "existing Patro astronomical archive",
      sunrise: "06:08",
      sunset: "17:27",
      location: "Kathmandu, Nepal",
      tithi_transition: { time: "15:04", minutes: 904, next_en: "Dwadashi", next_ne: "द्वादशी" }
    }
  }))
}));

describe("existing static archive adapter", () => {
  it("keeps archived named facts above calculated facts and retains their provenance", async () => {
    const date = "2026-10-22";
    const result = await resolveNepalPanchangDay(date);
    expect(result.archive).toBe("loaded");
    expect(result.value.version).toBe("1.0.0");
    expect(result.value.calendars.bs).toEqual({ year: 2083, month: 7, day: 5 });
    expect(result.value.calendars.nepalSambat).toBe("ने.सं. 1146 कौला थ्वः झिंचमिला");
    expect(result.value.calendars.nepalSambatEn).toBe("NS 1146 Kaulā thwa Jhinchamilā");
    expect(result.value.elements.tithi.nameNe).toBe("एकादशी");
    expect(result.value.elements.tithi.source).toBe("archive");
    expect(result.value.elements.tithi.ends).toMatchObject({
      instantUtc: "2026-10-22T09:19:00.000Z", source: "archive", confidence: "unverified"
    });
    expect(result.value.sun.sunrise).toMatchObject({
      instantUtc: "2026-10-22T00:23:00.000Z", source: "archive", confidence: "unverified"
    });
    expect(result.value.sun.sunset).toMatchObject({
      instantUtc: "2026-10-22T11:42:00.000Z", source: "archive", confidence: "unverified"
    });
    expect(result.value.archiveProvenance).toEqual({
      sourceId: "static-calendar-archive:existing Patro astronomical archive",
      reportedSource: "existing Patro astronomical archive",
      reportedVerifiedAt: null,
      confidence: "unverified"
    });
    expect(result.value.elements.nakshatra.source).toBe("calculated");
    expect(result.value.elements.nakshatra.nameEn).toBeNull();
    expect(result.value.officialObservances).toEqual([]);
  });
  it("does not invent a transition from an unqualified archive clock", () => {
    const date = "2026-10-22";
    const fallback = fromCalculatedDay(defaultPanchang.day(date, KATHMANDU), KATHMANDU);
    const overlay = overlayFromStaticArchive(date, {
      ad: date, bs: { year: 2083, month: 7, day: 5 },
      panchang: { tithi: { number: 11, paksha: "shukla" }, tithi_transition: { time: "14:45", minutes: 885 } }
    }, fallback);
    expect(overlay.elements?.tithi?.ends).toBeUndefined();
  });
  it("converts explicitly NPT-qualified archive transition wall clocks to UTC", () => {
    const date = "2026-10-22";
    const fallback = fromCalculatedDay(defaultPanchang.day(date, KATHMANDU), KATHMANDU);
    const overlay = overlayFromStaticArchive(date, {
      ad: date, bs: { year: 2083, month: 7, day: 5 },
      panchang: {
        tithi: { number: 11, paksha: "shukla", start_npt: "2026-10-21 14:27:24", end_npt: "2026-10-22 15:03:36" },
        nakshatra: { index: 21, end_npt: "2026-10-22T21:04:15+05:45" }
      }
    }, fallback);
    expect(overlay.elements?.tithi?.starts?.instantUtc).toBe("2026-10-21T08:42:24.000Z");
    expect(overlay.elements?.tithi?.ends?.instantUtc).toBe("2026-10-22T09:18:36.000Z");
    expect(overlay.elements?.nakshatra?.ends?.instantUtc).toBe("2026-10-22T15:19:15.000Z");
  });
  it("rejects ambiguous clocks and impossible civil dates without inventing timestamps", () => {
    const date = "2026-10-22";
    const fallback = fromCalculatedDay(defaultPanchang.day(date, KATHMANDU), KATHMANDU);
    for (const end_npt of ["25:45", "2026-02-30 10:00:00", "2026-10-22T25:00:00Z"]) {
      const overlay = overlayFromStaticArchive(date, {
        ad: date, bs: { year: 2083, month: 7, day: 5 },
        panchang: { tithi: { number: 11, paksha: "shukla", end_npt } }
      }, fallback);
      expect(overlay.elements?.tithi?.ends).toBeUndefined();
    }
  });
  it("normalizes the established static archive transition/daylight shape using Nepal time", () => {
    const date = "2037-02-03";
    const fallback = fromCalculatedDay(defaultPanchang.day(date, KATHMANDU), KATHMANDU);
    const overlay = overlayFromStaticArchive(date, {
      ad: date,
      bs: { year: 2093, month: 10, day: 21 },
      ns: { formatted_ne: "ने.सं. 1157" },
      panchang: {
        tithi: { number: 18, ne: "तृतीया", en: "Tritiya", paksha: "Krishna Paksha" },
        tithi_transition: { time: "09:05", minutes: 545, next_en: "Chaturthi", next_ne: "चतुर्थी" },
        sunrise: "06:49",
        sunset: "17:45",
        location: "Kathmandu, Nepal",
        source: "existing Patro astronomical archive"
      }
    }, fallback);
    expect(overlay.elements?.tithi?.ends?.instantUtc).toBe("2037-02-03T03:20:00.000Z");
    expect(overlay.sun?.sunrise?.instantUtc).toBe("2037-02-03T01:04:00.000Z");
    expect(overlay.sun?.sunset?.instantUtc).toBe("2037-02-03T12:00:00.000Z");
    expect(overlay.elements?.tithi?.ends?.confidence).toBe("unverified");
  });
  it("withholds Tithi boundary when archived clock and minute count disagree", () => {
    const date = "2037-02-03";
    const fallback = fromCalculatedDay(defaultPanchang.day(date, KATHMANDU), KATHMANDU);
    const overlay = overlayFromStaticArchive(date, {
      ad: date, bs: { year: 2093, month: 10, day: 21 },
      panchang: {
        tithi: { number: 18, ne: "तृतीया", en: "Tritiya", paksha: "Krishna Paksha" },
        tithi_transition: { time: "09:05", minutes: 600 },
        sunrise: "06:49", sunset: "17:45", location: "Kathmandu, Nepal"
      }
    }, fallback);
    expect(overlay.elements?.tithi?.ends).toBeUndefined();
  });
  it("interprets a clock-only *_npt boundary as NPT on the archive civil date", () => {
    const date = "2026-10-22";
    const fallback = fromCalculatedDay(defaultPanchang.day(date, KATHMANDU), KATHMANDU);
    const overlay = overlayFromStaticArchive(date, {
      ad: date, bs: { year: 2083, month: 7, day: 5 },
      panchang: { tithi: { number: 11, paksha: "Shukla Paksha", end_npt: "14:45" } }
    }, fallback);
    expect(overlay.elements?.tithi?.ends?.instantUtc).toBe("2026-10-22T09:00:00.000Z");
  });
  it("normalizes the archive's one-based Nakshatra.number and pada without guessing other number conventions", () => {
    const date = "2037-02-03";
    const fallback = fromCalculatedDay(defaultPanchang.day(date, KATHMANDU), KATHMANDU);
    const overlay = overlayFromStaticArchive(date, {
      ad: date, bs: { year: 2093, month: 10, day: 21 },
      panchang: {
        tithi: { number: 18, paksha: "Krishna Paksha" },
        nakshatra: { number: 22, pada: 3, ne: "धनिष्ठा", en: "Dhanishtha" }
      }
    }, fallback);
    expect(overlay.elements?.nakshatra?.index).toBe(21);
    expect(overlay.elements?.nakshatra?.pada).toBe(3);
    expect(overlay.elements?.nakshatra?.nameEn).toBe("Dhanishtha");
  });
  it("accepts explicit-offset legacy transition instants when timezone metadata is absent", () => {
    const date = "2037-02-03";
    const fallback = fromCalculatedDay(defaultPanchang.day(date), KATHMANDU);
    const overlay = overlayFromStaticArchive(date, {
      ad: date, bs: { year: 2093, month: 10, day: 21 },
      panchang: {
        tithi: { number: 18, paksha: "Krishna Paksha" },
        tithiTransition: { at: "2037-02-03T09:05:00+05:45", time: "09:05", minutes: 545 }
      }
    }, fallback);
    expect(overlay.elements?.tithi?.ends?.instantUtc).toBe("2037-02-03T03:20:00.000Z");
  });
  it("does not interpret local wall clocks under a conflicting timezone", () => {
    const date = "2037-02-03";
    const fallback = fromCalculatedDay(defaultPanchang.day(date), KATHMANDU);
    const overlay = overlayFromStaticArchive(date, {
      ad: date, bs: { year: 2093, month: 10, day: 21 },
      panchang: {
        timezone: "Europe/London", location: "Kathmandu, Nepal",
        tithi: { number: 18, paksha: "Krishna Paksha" },
        tithi_transition: { time: "09:05", minutes: 545 },
        sunrise: "06:49", sunset: "17:45"
      }
    }, fallback);
    expect(overlay.elements?.tithi?.ends).toBeUndefined();
    expect(overlay.sun).toBeUndefined();
  });
  it("rejects a row for the wrong civil date before merge", () => {
    const date = "2026-10-22";
    const fallback = fromCalculatedDay(defaultPanchang.day(date, KATHMANDU), KATHMANDU);
    expect(() => overlayFromStaticArchive(date, {
      ad: "2026-10-23", bs: { year: 2083, month: 7, day: 6 }, panchang: { tithi: { number: 11, paksha: "shukla" } }
    }, fallback)).toThrow("archive_row_incomplete");
  });
});
