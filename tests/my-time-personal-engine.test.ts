import { describe, expect, it } from "vitest";
import { JANMAPATRO_CONTEXT_STORAGE_KEY, createJanmaPatroContext, findJanmaPatroBirthPlace, readJanmaPatroBirthInput, saveJanmaPatroContext } from "../src/jyotish/my-time-bridge";
import type { ChartResult } from "../src/jyotish/jyotishEngine";
import { calculatePersonalLuckyNumber, evaluatePersonalTime, normalizeJanmaPatroContext } from "../src/features/my-time/personal-time-engine";

const base = {
  startUtc: "2026-10-20T08:00:00Z",
  endUtc: "2026-10-20T09:00:00Z",
  panchangScore: 70,
  activity: "work" as const,
  hasNatalChart: true
};

describe("personal-time recommendation engine", () => {
  it("uses real matching Rashifal domain scores and exposes why", () => {
    const result = evaluatePersonalTime({
      ...base, rashifal: { overall: 60, domains: { work: 92, learning: 40 } },
      horaLord: "Mercury", dashaLord: "Mercury", tatwa: "Vayu"
    });
    expect(result.components.map(item => item.key)).toEqual(["panchang", "rashifal", "dasha-hora", "activity-hora", "activity-tatwa"]);
    expect(result.components.find(item => item.key === "rashifal")?.score).toBe(92);
    expect(result.components.find(item => item.key === "dasha-hora")?.score).toBe(100);
    expect(result.score).toBeGreaterThan(70);
    expect(result.confidence).toBe("personalized");
    expect(result.reasons.some(reason => reason.includes("published work domain score"))).toBe(true);
  });

  it("changes the recommendation when the matching Rashifal domain changes", () => {
    const high = evaluatePersonalTime({ ...base, rashifal: { domains: { work: 95 } }, horaLord: "Mercury", tatwa: "Vayu" });
    const low = evaluatePersonalTime({ ...base, rashifal: { domains: { work: 20 } }, horaLord: "Mercury", tatwa: "Vayu" });
    expect(high.score).toBeGreaterThan(low.score);
    expect(high.components.find(item => item.key === "rashifal")?.score).toBe(95);
    expect(low.components.find(item => item.key === "rashifal")?.score).toBe(20);
  });
  it("supports Rashifal section scores when domain map is absent", () => {
    const result = evaluatePersonalTime({ ...base, rashifal: { sections: [{ domain: "work", score: 81 }] } });
    expect(result.components.find(item => item.key === "rashifal")?.score).toBe(81);
  });
  it("does not invent a Rashifal domain for activities without a matching domain", () => {
    const result = evaluatePersonalTime({ ...base, activity: "travel", rashifal: { overall: 99, domains: { work: 99 } } });
    expect(result.components.some(item => item.key === "rashifal")).toBe(false);
  });
  it("normalizes weights over available inputs and labels missing context honestly", () => {
    const result = evaluatePersonalTime({ ...base, hasNatalChart: false, rashifal: null, dashaLord: null, horaLord: null, tatwa: null });
    expect(result.score).toBe(70);
    expect(result.confidence).toBe("general");
    expect(result.missing).toContain("birth-chart");
    expect(result.missing).toContain("matching-rashifal-domain");
  });
  it("does not treat an unrelated Hora as negative", () => {
    const result = evaluatePersonalTime({ ...base, horaLord: "Venus" });
    expect(result.components.find(item => item.key === "activity-hora")?.score).toBe(50);
    expect(result.components.find(item => item.key === "activity-hora")?.explanation).toContain("treated as neutral");
  });


  it("does not call sign-only Rashifal guidance fully birth-personalized", () => {
    const result = evaluatePersonalTime({
      ...base, hasNatalChart: false, rashifal: { domains: { work: 80 } },
      horaLord: "Mercury", tatwa: "Vayu"
    });
    expect(result.confidence).toBe("partially-personalized");
  });
  it("normalizes the real JanmaPatroSuite saved context and rejects invalid periods", () => {
    const context = normalizeJanmaPatroContext({
      time_known: true,
      rashi: { name: "वृष" }, lagna: { name: "कन्या" }, nakshatra: { name: "रोहिणी", pada: 2 },
      birth: { name: "Suraj", date: "1995-04-10", time: "08:30", location: "Kathmandu", lat: 27.7172, lng: 85.324 },
      planets: [
        { planet_en: "Moon", rashi: { name: "वृष" }, house: 9, degree: 42.5 },
        { planet_en: "Mars", rashi: { name: "मिथुन" }, house: 13, degree: 80 }
      ],
      dasha: { periods: [
        { lord: "Venus", start: "2020-01-01T00:00:00.000Z", end: "2030-01-01T00:00:00.000Z" },
        { lord: "Mars", start: "bad", end: "also bad" },
        { lord: "Sun", start: "2030-01-01T00:00:00.000Z", end: "2029-01-01T00:00:00.000Z" }
      ] }
    });
    expect(context).toMatchObject({
      rashi: "वृष", lagna: "कन्या", nakshatra: "रोहिणी", pada: 2,
      birth: { name: "Suraj", date: "1995-04-10", time: "08:30", location: "Kathmandu", lat: 27.7172, lng: 85.324 },
      planets: [{ key: "Moon", name: "Moon", sign: "वृष", house: 9 }, { key: "Mars", house: null }],
      dashas: [{ lord: "Venus", start: "2020-01-01T00:00:00.000Z", end: "2030-01-01T00:00:00.000Z" }]
    });
    expect(normalizeJanmaPatroContext(null)).toBeNull();
    expect(normalizeJanmaPatroContext({ birth: {} })).toBeNull();
  });
  it("preserves name and coordinates when normalizing Janmapatro context", () => {
    const context = normalizeJanmaPatroContext({
      rashi: { name: "वृष" }, nakshatra: { name: "रोहिणी", pada: 2 },
      birth: { name: "Suraj", date: "1995-04-10", time: "08:30", location: "Kathmandu", lat: 27.7172, lng: 85.324 }
    });
    expect(context?.birth).toEqual({ name: "Suraj", date: "1995-04-10", time: "08:30", location: "Kathmandu", lat: 27.7172, lng: 85.324 });
  });

  it("derives a daily number from birth-date root and Tithi, and incorporates natal Nakshatra/Pada when available", () => {
    expect(calculatePersonalLuckyNumber("1995-04-10", 11)).toBe(4);
    expect(calculatePersonalLuckyNumber("1995-04-10", 11, 4, 2)).toBe(9);
    expect(calculatePersonalLuckyNumber("1995-04-10", 11, 5, 2)).not.toBe(calculatePersonalLuckyNumber("1995-04-10", 11, 4, 2));
    expect(calculatePersonalLuckyNumber("1995-04-10", 0)).toBeNull();
    expect(calculatePersonalLuckyNumber("not-a-date", 11)).toBeNull();
    expect(calculatePersonalLuckyNumber("1995-04-10", 11, 28, 2)).toBeNull();
    expect(calculatePersonalLuckyNumber("1995-04-10", 11, 4, 5)).toBeNull();
  });

  it("selects a dedicated lucky time from the highest-ranked future personal window only", async () => {
    const { selectPersonalLuckyTime } = await import("../src/features/my-time/personal-time-engine");
    const make = (start_utc: string, combinedScore: number, personalizationLevel: "personalized" | "partial" | "general" = "personalized") => ({
      start_utc, end_utc: new Date(Date.parse(start_utc) + 30 * 60_000).toISOString(), combinedScore, personalizationLevel,
      personalEvaluation: { score: combinedScore, label: "supportive" as const, confidence: "personalized" as const, components: [], reasons: [], cautions: [], missing: [] }
    });
    const now = new Date("2026-10-20T08:00:00Z");
    const windows = [make("2026-10-20T10:00:00Z", 82), make("2026-10-20T09:00:00Z", 94), make("2026-10-20T11:00:00Z", 99, "general")];
    expect(selectPersonalLuckyTime(windows, true, now, true)?.combinedScore).toBe(94);
    expect(selectPersonalLuckyTime(windows, false, now, true)).toBeNull();
    expect(selectPersonalLuckyTime([make("2026-10-20T07:00:00Z", 99)], true, now, true)).toBeNull();
  });

  it("rejects invalid coordinates instead of exposing them as reusable birth data", () => {
    const context = normalizeJanmaPatroContext({ rashi: { name: "वृष" }, birth: { date: "1995-04-10", lat: 91, lng: 181 } });
    expect(context?.birth).toMatchObject({ lat: null, lng: null });
  });

  it("rejects invalid windows and scores", () => {
    expect(() => evaluatePersonalTime({ ...base, startUtc: "bad" })).toThrow("invalid_window");
    expect(() => evaluatePersonalTime({ ...base, panchangScore: 101 })).toThrow("invalid_panchang_score");
  });
});


describe("Janmapatro and My Time shared birth profile", () => {
  it("resolves known cities and leaves unknown places unresolved", () => {
    expect(findJanmaPatroBirthPlace("Kathmandu")).toEqual({ name: "Kathmandu", lat: 27.7172, lng: 85.324 });
    expect(findJanmaPatroBirthPlace("Tokyo, Japan")).toEqual({ name: "Tokyo, Japan", lat: 35.6762, lng: 139.6503 });
    expect(findJanmaPatroBirthPlace("unknown village")).toBeNull();
  });

  it("saves the canonical profile produced by the existing Janmapatro engine", () => {
    const data = new Map<string, string>();
    const storage = { setItem: (key: string, value: string) => { data.set(key, value); } };
    const chart = {
      ascSignIndex: 3, ascendant: 15.25,
      input: { name: "Test User", date: "1995-04-10", time: "08:30", location: "Kathmandu", lat: 27.7172, lng: 85.324 },
      planets: [{ key: "moon", name: "Moon", signIndex: 1, house: 9, longitude: 42.5 }],
      moonNakshatraIndex: 3, moonPada: 2,
      dashas: [{ lord: "Venus", start: new Date("2020-01-01T00:00:00.000Z"), end: new Date("2030-01-01T00:00:00.000Z"), years: 20 }],
      manglik: { fromLagna: 1, fromMoon: 2, affectedHouses: [], severity: "None", explanation: "test" },
      methodology: ["test methodology"]
    } as unknown as ChartResult;
    const context = createJanmaPatroContext(chart);
    expect(context.birth).toMatchObject({ name: "Test User", date: "1995-04-10", time: "08:30", location: "Kathmandu" });
    expect(saveJanmaPatroContext(context, storage)).toBe(true);
    expect(JSON.parse(data.get(JANMAPATRO_CONTEXT_STORAGE_KEY) || "null")).toMatchObject({
      birth: { name: "Test User", date: "1995-04-10", time: "08:30", location: "Kathmandu" },
      data_quality: { source: "janmapatro-engine" }
    });
  });

  it("restores a valid saved birth profile into Janmapatro's editable form", () => {
    const saved = new Map<string, string>([[JANMAPATRO_CONTEXT_STORAGE_KEY, JSON.stringify({ birth: { name: "Test User", date: "1995-04-10", time: "08:30", location: "Kathmandu", lat: 27.7172, lng: 85.324 } })]]);
    expect(readJanmaPatroBirthInput({ getItem: key => saved.get(key) ?? null })).toEqual({
      name: "Test User", date: "1995-04-10", time: "08:30", location: "Kathmandu", lat: 27.7172, lng: 85.324
    });
  });

  it("does not restore malformed or incomplete birth details", () => {
    const saved = new Map<string, string>([[JANMAPATRO_CONTEXT_STORAGE_KEY, JSON.stringify({ birth: { date: "not-a-date", time: "99:99", location: "unknown" } })]]);
    expect(readJanmaPatroBirthInput({ getItem: key => saved.get(key) ?? null })).toBeNull();
  });

  it("reports storage failure instead of claiming the profile was saved", () => {
    expect(saveJanmaPatroContext({ birth: {} }, { setItem: () => { throw new Error("blocked"); } })).toBe(false);
  });
});
