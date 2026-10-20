import { describe, expect, it } from "vitest";
import { evaluatePersonalTime, normalizeJanmaPatroContext } from "../src/features/my-time/personal-time-engine";

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

  it("normalizes the real JanmaPatroSuite saved context and rejects invalid periods", () => {
    const context = normalizeJanmaPatroContext({
      time_known: true,
      rashi: { name: "वृष" }, lagna: { name: "कन्या" }, nakshatra: { name: "रोहिणी", pada: 2 },
      birth: { date: "1995-04-10", time: "08:30", location: "Kathmandu" },
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
      birth: { date: "1995-04-10", time: "08:30", location: "Kathmandu" },
      planets: [{ key: "Moon", name: "Moon", sign: "वृष", house: 9 }, { key: "Mars", house: null }],
      dashas: [{ lord: "Venus", start: "2020-01-01T00:00:00.000Z", end: "2030-01-01T00:00:00.000Z" }]
    });
    expect(normalizeJanmaPatroContext(null)).toBeNull();
    expect(normalizeJanmaPatroContext({ birth: {} })).toBeNull();
  });
  it("rejects invalid windows and scores", () => {
    expect(() => evaluatePersonalTime({ ...base, startUtc: "bad" })).toThrow("invalid_window");
    expect(() => evaluatePersonalTime({ ...base, panchangScore: 101 })).toThrow("invalid_panchang_score");
  });
});
