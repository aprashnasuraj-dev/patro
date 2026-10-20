import { describe, expect, it } from "vitest";
import { abhijitMuhurta, nepalStandardTime, scorePersonalizedMuhurta, timeScaleCounters } from "../src/patro-tools/core/my-time-extended";

describe("My Time extended instruments", () => {
  it("converts a fixed UTC instant into JD, MJD and Unix counters", () => {
    const counters = timeScaleCounters(new Date("2000-01-01T12:00:00.000Z"));
    expect(counters.julian_day).toBe(2451545);
    expect(counters.modified_julian_day).toBe(51544.5);
    expect(counters.unix_seconds).toBe(946728000);
    expect(counters.utc_iso).toBe("2000-01-01T12:00:00.000Z");
  });

  it("returns Nepal Standard Time without depending on the device timezone", () => {
    expect(nepalStandardTime(new Date("2026-01-01T00:00:00.000Z"))).toMatchObject({
      date: "2026-01-01", time: "05:45:00", offset: "+05:45"
    });
    expect(nepalStandardTime(new Date("2025-12-31T18:30:00.000Z")).date).toBe("2026-01-01");
  });

  it("centers the traditional Abhijit window on local solar noon", () => {
    const result = abhijitMuhurta("2026-10-20T00:00:00.000Z", "2026-10-20T12:00:00.000Z");
    expect(result).not.toBeNull();
    expect(Date.parse(result!.start_utc)).toBe(1792474560000);
    expect(Date.parse(result!.end_utc)).toBe(1792477440000);
    expect(abhijitMuhurta(null, null)).toBeNull();
    expect(abhijitMuhurta("bad", "also bad")).toBeNull();
  });

  it("provides explainable personalized timing scores and validates factors", () => {
    const supportive = scorePersonalizedMuhurta({
      startUtc: "2026-10-20T08:00:00Z", endUtc: "2026-10-20T09:00:00Z",
      favorableChoghadiya: true, taraIndex: 8, chandraHouse: 11
    });
    expect(supportive.score).toBe(97);
    expect(supportive.label).toBe("supportive");
    expect(supportive.reasons).toContain("supportive_chandrabalam");
    const caution = scorePersonalizedMuhurta({
      startUtc: "2026-10-20T08:00:00Z", endUtc: "2026-10-20T09:00:00Z",
      rahuKaal: true, taraIndex: 6, chandraHouse: 8
    });
    expect(caution.label).toBe("caution");
    expect(caution.cautions).toContain("rahu_kaal");
    expect(() => scorePersonalizedMuhurta({startUtc:"bad",endUtc:"bad"})).toThrow("invalid_window");
    expect(() => scorePersonalizedMuhurta({startUtc:"2026-10-20T08:00:00Z",endUtc:"2026-10-20T09:00:00Z",taraIndex:9})).toThrow("invalid_tara_index");
  });
});
