import { describe, expect, it } from "vitest";
import { calculateMyTimeSnapshot, localDateTimeToUtc, normalizeLongitude } from "../src/patro-tools/core/my-time-snapshot";
import { myTimeResponse } from "../worker/my-time";

describe("My Time astronomical core", () => {
  it("normalizes negative and over-revolution longitudes", () => {
    expect(normalizeLongitude(-1)).toBe(359);
    expect(normalizeLongitude(721)).toBe(1);
    expect(normalizeLongitude(360)).toBe(0);
  });

  it("converts local noon using the selected IANA timezone, not a fixed Nepal offset", () => {
    expect(localDateTimeToUtc("2026-01-15", "Asia/Kathmandu").toISOString()).toBe("2026-01-15T06:15:00.000Z");
    expect(localDateTimeToUtc("2026-07-15", "America/New_York").toISOString()).toBe("2026-07-15T16:00:00.000Z");
  });

  it("returns a typed, versioned bilingual Tithi snapshot for a local date", () => {
    const snapshot = calculateMyTimeSnapshot({ date: "2026-10-20", timezone: "Asia/Kathmandu", lat: 27.7172, lng: 85.324 });
    expect(snapshot).toMatchObject({
      schema_version: 1,
      date: "2026-10-20",
      timezone: "Asia/Kathmandu",
      methodology: { engine: "AafnaiPatro shared Panchang provider + astronomy-engine", sidereal_positions: true }
    });
    expect(snapshot.panchang.tithi_index).toBeGreaterThanOrEqual(1);
    expect(snapshot.panchang.tithi_index).toBeLessThanOrEqual(30);
    expect(snapshot.panchang.tithi_name_ne).toBeTruthy();
    expect(snapshot.panchang.nakshatra_index).toBeGreaterThanOrEqual(1);
    expect(snapshot.panchang.nakshatra_index).toBeLessThanOrEqual(27);
    expect(snapshot.panchang.nakshatra_pada).toBeGreaterThanOrEqual(1);
    expect(snapshot.panchang.nakshatra_pada).toBeLessThanOrEqual(4);
    expect(snapshot.panchang.yoga_name_ne).toBeTruthy();
    expect(snapshot.panchang.karana_name_ne).toBeTruthy();
    expect(snapshot.panchang.sunrise_utc).toBeTruthy();
    expect(snapshot.panchang.sunset_utc).toBeTruthy();
    expect(snapshot.sky.moon_illumination_percent).toBeGreaterThanOrEqual(0);
    expect(snapshot.sky.moon_illumination_percent).toBeLessThanOrEqual(100);
  });

  it("serves only through the feature flag and validates API inputs", async () => {
    const request = new Request("https://aafnaipatro.com/api/v1/mytime/today?date=2026-10-20&timezone=Asia%2FKathmandu");
    const disabled = await myTimeResponse(request, {});
    expect(disabled?.status).toBe(404);
    const enabled = await myTimeResponse(request, { MY_TIME_ENABLED: "true" });
    expect(enabled?.status).toBe(200);
    const payload = await enabled!.json();
    expect(payload).toMatchObject({ ok: true, data: { date: "2026-10-20", timezone: "Asia/Kathmandu" } });
    const invalid = await myTimeResponse(new Request("https://aafnaipatro.com/api/v1/mytime/today?lat=91"), { MY_TIME_ENABLED: true });
    expect(invalid?.status).toBe(400);
  });

  it("rejects invalid dates, timezones, and coordinates", () => {
    expect(() => calculateMyTimeSnapshot({ date: "2026-02-30" })).toThrow("invalid_date");
    expect(() => calculateMyTimeSnapshot({ date: "2026-10-20", timezone: "Mars/Olympus" })).toThrow("invalid_timezone");
    expect(() => calculateMyTimeSnapshot({ lat: 91 })).toThrow("invalid_latitude");
    expect(() => calculateMyTimeSnapshot({ lng: 181 })).toThrow("invalid_longitude");
  });
});
