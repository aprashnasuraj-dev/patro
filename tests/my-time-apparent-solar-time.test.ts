import { describe, expect, it } from "vitest";
import { apparentSolarTime } from "../src/patro-tools/core/apparent-solar-time";

describe("apparent solar time", () => {
  it("returns a normalized local solar clock and exposes the approximation", () => {
    const result = apparentSolarTime(new Date("2026-10-20T06:15:00.000Z"), 85.324);
    expect(result.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(result.minutesSinceMidnight).toBeGreaterThanOrEqual(0);
    expect(result.minutesSinceMidnight).toBeLessThan(1440);
    expect(result.approximation).toBe("NOAA fractional-year equation");
    expect(result.longitudeCorrectionMinutes).toBeCloseTo(341.296, 2);
  });

  it("moves apparent solar time by about one hour for a 15-degree longitude difference", () => {
    const instant = new Date("2026-10-20T06:15:00.000Z");
    const west = apparentSolarTime(instant, 0);
    const east = apparentSolarTime(instant, 15);
    const difference = (east.minutesSinceMidnight - west.minutesSinceMidnight + 1440) % 1440;
    expect(difference).toBeCloseTo(60, 1);
  });

  it("rejects invalid coordinates", () => {
    expect(() => apparentSolarTime(new Date(), 181)).toThrow("invalid_longitude");
  });
});
