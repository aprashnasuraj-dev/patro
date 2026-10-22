import { describe, expect, it } from "vitest";
import { calculateMyTimeSnapshot, localDateTimeToUtc, normalizeLongitude } from "../src/patro-tools/core/my-time-snapshot";
import { myTimeResponse } from "../worker/my-time";
import { civilBounds } from "../src/place/civil";
import { panchangAt } from "../src/patro-tools/core/astro";

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

  it("uses 23/25-hour civil bounds rather than assuming 1440 minutes on DST dates", () => {
    const spring = civilBounds("2026-03-29", "Europe/London");
    const fall = civilBounds("2026-10-25", "Europe/London");
    expect((spring.end.getTime()-spring.start.getTime())/3600000).toBe(23);
    expect((fall.end.getTime()-fall.start.getTime())/3600000).toBe(25);
  });

  it("returns a typed, versioned bilingual Tithi snapshot for a local date", () => {
    const snapshot = calculateMyTimeSnapshot({ date: "2026-10-20", timezone: "Asia/Kathmandu", lat: 27.7172, lng: 85.324 });
    expect(snapshot).toMatchObject({
      schema_version: 1,
      date: "2026-10-20",
      timezone: "Asia/Kathmandu",
      methodology: { engine: "AafnaiPatro shared Panchang provider + astronomy-engine", sidereal_positions: true }
    });
    expect(snapshot.methodology.source_status).toBe("shared-provider");
    expect(snapshot.methodology.fallback_used).toBe(false);
    expect(snapshot.panchang.tithi_index).toBeGreaterThanOrEqual(1);
    expect(snapshot.panchang.tithi_index).toBeLessThanOrEqual(30);
    expect(snapshot.panchang.tithi_name_ne).toBeTruthy();
    expect(snapshot.panchang.nakshatra_index).toBeGreaterThanOrEqual(1);
    expect(snapshot.panchang.nakshatra_index).toBeLessThanOrEqual(27);
    expect(snapshot.panchang.nakshatra_pada).toBeGreaterThanOrEqual(1);
    expect(snapshot.panchang.nakshatra_pada).toBeLessThanOrEqual(4);
    expect(snapshot.panchang.yoga_name_ne).toBeTruthy();
    expect(snapshot.panchang.karana_name_ne).toBeTruthy();
    expect(snapshot.panchang.previous_sunrise_utc).toBeTruthy();
    expect(snapshot.panchang.previous_sunset_utc).toBeTruthy();
    expect(Date.parse(snapshot.panchang.previous_sunset_utc!)).toBeLessThan(Date.parse(snapshot.panchang.sunrise_utc!));
    expect(snapshot.panchang.sunrise_utc).toBeTruthy();
    expect(snapshot.panchang.sunset_utc).toBeTruthy();
    expect(snapshot.twilight.civil_dawn_utc).toBeTruthy();
    expect(snapshot.twilight.civil_dusk_utc).toBeTruthy();
    expect(Date.parse(snapshot.twilight.civil_dawn_utc!)).toBeLessThan(Date.parse(snapshot.panchang.sunrise_utc!));
    expect(Date.parse(snapshot.twilight.civil_dusk_utc!)).toBeGreaterThan(Date.parse(snapshot.panchang.sunset_utc!));
    expect(Date.parse(snapshot.twilight.nautical_dawn_utc!)).toBeLessThan(Date.parse(snapshot.twilight.civil_dawn_utc!));
    expect(Date.parse(snapshot.twilight.astronomical_dusk_utc!)).toBeGreaterThan(Date.parse(snapshot.twilight.nautical_dusk_utc!));
    expect(Number.isFinite(snapshot.sky.solar_altitude_deg_at_evaluation)).toBe(true);
    expect(snapshot.sky.moon_illumination_percent).toBeGreaterThanOrEqual(0);
    expect(snapshot.sky.moon_illumination_percent).toBeLessThanOrEqual(100);
  });

  it("serves only through the feature flag and validates API inputs", async () => {
    const request = new Request("https://aafnaipatro.com/api/v1/mytime/today?date=2026-10-20&timezone=Asia%2FKathmandu");
    const disabled = await myTimeResponse(request, {});
    expect(disabled?.status).toBe(404);
    expect(disabled?.headers.get("cache-control")).toBe("no-store");
    const enabled = await myTimeResponse(request, { MY_TIME_ENABLED: "true" });
    expect(enabled?.status).toBe(200);
    expect(enabled?.headers.get("cache-control")).toContain("s-maxage=300");
    const payload = await enabled!.json();
    expect(payload).toMatchObject({ ok: true, data: { date: "2026-10-20", timezone: "Asia/Kathmandu" } });
    expect(payload.data.tantraVidya).toMatchObject({
      nityaDevi: { id: expect.any(Number), name: expect.any(String) },
      activeTatwa: { durationMin: 24, color: expect.any(String) },
      yogini: { name: expect.any(String), direction: expect.any(String), blockedDirection: expect.any(String) },
      mahanishaKaal: { start: expect.any(String), end: expect.any(String), isActive: expect.any(Boolean) }
    });
    const evaluatedTithi = panchangAt(new Date(payload.data.evaluated_at_utc)).tithi;
    expect(payload.data.tantraVidya.nityaDevi.id).toBe(evaluatedTithi <= 15 ? evaluatedTithi : 31 - evaluatedTithi);
    const invalid = await myTimeResponse(new Request("https://aafnaipatro.com/api/v1/mytime/today?lat=91"), { MY_TIME_ENABLED: true });
    expect(invalid?.status).toBe(400);
    expect(invalid?.headers.get("cache-control")).toBe("no-store");
    const disallowed = await myTimeResponse(new Request(request.url, { method: "POST" }), { MY_TIME_ENABLED: true });
    expect(disallowed?.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects invalid dates, timezones, and coordinates", () => {
    expect(() => calculateMyTimeSnapshot({ date: "2026-02-30" })).toThrow("invalid_date");
    expect(() => calculateMyTimeSnapshot({ date: "2026-10-20", timezone: "Mars/Olympus" })).toThrow("invalid_timezone");
    expect(() => calculateMyTimeSnapshot({ lat: 91 })).toThrow("invalid_latitude");
    expect(() => calculateMyTimeSnapshot({ lng: 181 })).toThrow("invalid_longitude");
  });
});
