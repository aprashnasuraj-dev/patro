import { describe, expect, it, vi } from "vitest";
import { KATHMANDU } from "../src/patro-tools/core/types";
import { defaultPanchang } from "../src/patro-tools/core/provider";
import { fromCalculatedDay } from "../src/panchang-jyotish/contract";
import { overlayFromStaticArchive, resolveNepalPanchangDay } from "../src/panchang-jyotish/archive-adapter";

vi.mock("../src/patro-tools-integration/staticCalendar", () => ({
  archiveDay: vi.fn(async (date: string) => ({
    ad: date,
    bs: { year: 2083, month: 7, day: 5 },
    ns: { formatted: "NS 1147 Kachhalā", formatted_ne: "ने.सं. ११४७ कछला" },
    panchang: {
      tithi: { number: 11, paksha: "shukla", ne: "एकादशी", en: "Ekadashi" },
      nakshatra: { ne: "शतभिषा", en: "Shatabhisha" }
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
    expect(result.value.calendars.nepalSambat).toBe("ने.सं. ११४७ कछला");
    expect(result.value.calendars.nepalSambatEn).toBe("NS 1147 Kachhalā");
    expect(result.value.elements.tithi.nameNe).toBe("एकादशी");
    expect(result.value.elements.tithi.source).toBe("archive");
    expect(result.value.elements.nakshatra.nameEn).toBe("Shatabhisha");
    expect(result.value.officialObservances).toEqual([]);
  });
  it("does not invent a transition from an unqualified archive clock", () => {
    const date = "2026-10-22";
    const fallback = fromCalculatedDay(defaultPanchang.day(date, KATHMANDU), KATHMANDU);
    const overlay = overlayFromStaticArchive(date, {
      ad: date, bs: { year: 2083, month: 7, day: 5 },
      panchang: { tithi: { number: 11, paksha: "shukla", end_npt: "14:45" } }
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
    for (const end_npt of ["14:45", "2026-02-30 10:00:00", "2026-10-22T25:00:00Z"]) {
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
  it("rejects a row for the wrong civil date before merge", () => {
    const date = "2026-10-22";
    const fallback = fromCalculatedDay(defaultPanchang.day(date, KATHMANDU), KATHMANDU);
    expect(() => overlayFromStaticArchive(date, {
      ad: "2026-10-23", bs: { year: 2083, month: 7, day: 6 }, panchang: { tithi: { number: 11, paksha: "shukla" } }
    }, fallback)).toThrow("archive_row_incomplete");
  });
});
