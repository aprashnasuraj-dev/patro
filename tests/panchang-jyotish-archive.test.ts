import { describe, expect, it, vi } from "vitest";
import { KATHMANDU } from "../src/patro-tools/core/types";
import { defaultPanchang } from "../src/patro-tools/core/provider";
import { fromCalculatedDay } from "../src/panchang-jyotish/contract";
import { overlayFromStaticArchive, resolveNepalPanchangDay } from "../src/panchang-jyotish/archive-adapter";

vi.mock("../src/patro-tools-integration/staticCalendar", () => ({
  archiveDay: vi.fn(async (date: string) => ({
    ad: date,
    bs: { year: 2083, month: 7, day: 5 },
    ns: { formatted_ne: "नेपाल संवत् ११४७" },
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
  it("rejects a row for the wrong civil date before merge", () => {
    const date = "2026-10-22";
    const fallback = fromCalculatedDay(defaultPanchang.day(date, KATHMANDU), KATHMANDU);
    expect(() => overlayFromStaticArchive(date, {
      ad: "2026-10-23", bs: { year: 2083, month: 7, day: 6 }, panchang: { tithi: { number: 11, paksha: "shukla" } }
    }, fallback)).toThrow("archive_row_incomplete");
  });
});
