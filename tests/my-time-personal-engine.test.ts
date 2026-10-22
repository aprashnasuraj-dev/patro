import { describe, expect, it } from "vitest";
import { JANMAPATRO_CONTEXT_STORAGE_KEY, createJanmaPatroContext, findJanmaPatroBirthPlace, readJanmaPatroBirthInput, saveJanmaPatroContext } from "../src/jyotish/my-time-bridge";
import { birthInstant, calculateChart, normalizeBirthDate, type ChartResult } from "../src/jyotish/jyotishEngine";
import { panchangAt } from "../src/patro-tools/core/astro";
import { calculatePersonalLuckyNumber, evaluatePersonalTime, normalizeJanmaPatroContext } from "../src/features/my-time/personal-time-engine";

const base = {
  startUtc: "2026-10-20T08:00:00Z",
  endUtc: "2026-10-20T09:00:00Z",
  panchangScore: 70,
  activity: "work" as const,
  hasNatalChart: true,
  natalFactorsApplied: true
};

const natalChart = {
  rashi: "वृष", lagna: "कन्या", nakshatra: "रोहिणी", pada: 2,
  birth: null,
  planets: [
    {key:"Sun",name:"Sun",sign:"मेष",house:8},
    {key:"Moon",name:"Moon",sign:"वृष",house:9},
    {key:"Mars",name:"Mars",sign:"मिथुन",house:10},
    {key:"Mercury",name:"Mercury",sign:"कन्या",house:1},
    {key:"Jupiter",name:"Jupiter",sign:"कर्कट",house:11},
    {key:"Venus",name:"Venus",sign:"तुला",house:2},
    {key:"Saturn",name:"Saturn",sign:"मकर",house:5},
    {key:"Rahu",name:"Rahu",sign:"वृश्चिक",house:3},
    {key:"Ketu",name:"Ketu",sign:"वृष",house:9}
  ],
  dashas: [{lord:"Mercury",start:"2020-01-01T00:00:00.000Z",end:"2030-01-01T00:00:00.000Z"}]
};
const muhurtaChart = {
  lagnaSign: "कन्या",
  planets: [
    {key:"Sun",name:"Sun",sign:"सिंह",house:12},
    {key:"Moon",name:"Moon",sign:"मिथुन",house:10},
    {key:"Mars",name:"Mars",sign:"मेष",house:8},
    {key:"Mercury",name:"Mercury",sign:"मिथुन",house:10},
    {key:"Jupiter",name:"Jupiter",sign:"कर्कट",house:11},
    {key:"Venus",name:"Venus",sign:"तुला",house:2},
    {key:"Saturn",name:"Saturn",sign:"मीन",house:7},
    {key:"Rahu",name:"Rahu",sign:"कुम्भ",house:6},
    {key:"Ketu",name:"Ketu",sign:"सिंह",house:12}
  ]
};

describe("personal-time recommendation engine", () => {
  it("uses real matching Rashifal domain scores and exposes why", () => {
    const result = evaluatePersonalTime({
      ...base, rashifal: { overall: 60, domains: { work: 92, learning: 40 } },
      horaLord: "Mercury", dashaLord: "Mercury", tatwa: "Vayu"
    });
    expect(result.components.map(item => item.key)).toEqual(["panchang", "rashifal", "dasha-hora", "activity-hora", "activity-tatwa"]);
    expect(result.components.find(item => item.key === "rashifal")?.score).toBe(92);
    expect(result.components.find(item => item.key === "dasha-hora")?.score).toBe(98);
    expect(result.score).toBeGreaterThan(70);
    expect(result.confidence).toBe("personalized");
    expect(result.reasons.some(reason => reason.includes("published work domain score"))).toBe(true);
  });

  it("does not downgrade a connected birth chart to limited signals when optional chart components are absent", () => {
    const connectedButSparseChart = { ...natalChart, lagna: "", planets: [], dashas: [] };
    const result = evaluatePersonalTime({
      ...base, hasNatalChart: true, natalFactorsApplied: false, natalChart: connectedButSparseChart,
      dashaLord: null, horaLord: null, tatwa: null, rashifal: null
    });
    expect(result.score).toBe(70);
    expect(result.confidence).toBe("personalized");
    expect(result.missing).toContain("chart-lords");
    expect(result.missing).toContain("gochara");
    expect(result.components.map(item => item.key)).toEqual(["panchang"]);
  });

  it("uses graded Dasha–Hora relationships instead of a binary match score", () => {
    const friend = evaluatePersonalTime({ ...base, dashaLord: "Mercury", horaLord: "Venus", natalChart, tatwa: null });
    const enemy = evaluatePersonalTime({ ...base, dashaLord: "Mercury", horaLord: "Moon", natalChart, tatwa: null });
    expect(friend.components.find(item => item.key === "dasha-hora")?.score).toBe(85);
    expect(enemy.components.find(item => item.key === "dasha-hora")?.score).toBe(35);
  });

  it("reduces Dasha–Hora compatibility when the natal Dasha lord is debilitated and afflicted", () => {
    const afflictedChart = {
      ...natalChart,
      planets: natalChart.planets.map(planet =>
        planet.key === "Mercury" ? {...planet, sign:"मीन", house:7}
          : planet.key === "Mars" ? {...planet, sign:"मीन", house:7}
          : planet
      )
    };
    const result = evaluatePersonalTime({ ...base, natalChart: afflictedChart, dashaLord: "Mercury", horaLord: "Venus", tatwa: null });
    expect(result.components.find(item => item.key === "dasha-hora")?.score).toBe(75);
  });

  it("includes natal/event chart lords and Jupiter/Saturn gochara in the explainable score", () => {
    const result = evaluatePersonalTime({
      ...base, natalChart, muhurtaChart, dashaLord: "Mercury", horaLord: "Mercury", tatwa: "Vayu",
      rashifal: { domains: { work: 80 } }, choghadiyaType: "Labh"
    });
    const keys = result.components.map(item => item.key);
    expect(keys).toContain("chart-lords");
    expect(keys).toContain("gochara");
    expect(result.components.find(item => item.key === "chart-lords")?.score).toBeGreaterThan(0);
    expect(result.components.find(item => item.key === "gochara")?.score).toBeGreaterThan(0);
    expect(result.components.find(item => item.key === "chart-lords")?.explanationNe).toContain("जन्मपत्रो");
    expect(result.components.reduce((sum, item) => sum + item.weight, 0)).toBeCloseTo(100, 0);
  });

  it("changes functional house-lord evaluation with the chart's Lagna", () => {
    const ariesLagnaChart = { ...natalChart, lagna: "मेष" };
    const fromVirgo = evaluatePersonalTime({
      ...base, natalChart, dashaLord: null, horaLord: null, tatwa: null
    }).components.find(item => item.key === "chart-lords")?.score;
    const fromAries = evaluatePersonalTime({
      ...base, natalChart: ariesLagnaChart, dashaLord: null, horaLord: null, tatwa: null
    }).components.find(item => item.key === "chart-lords")?.score;
    expect(fromVirgo).toBeDefined();
    expect(fromAries).toBeDefined();
    expect(fromVirgo).not.toBe(fromAries);
  });

  it("adjusts Choghadiya fit for the selected activity and varies activity weights", () => {
    const labh = evaluatePersonalTime({ ...base, hasNatalChart: false, activity: "work", choghadiyaType: "Labh" });
    const rog = evaluatePersonalTime({ ...base, hasNatalChart: false, activity: "work", choghadiyaType: "Rog" });
    expect(labh.score).toBeGreaterThan(rog.score);
    expect(labh.components.find(item => item.key === "panchang")?.score).toBe(78);
    const work = evaluatePersonalTime({ ...base, activity: "work", natalChart, muhurtaChart, dashaLord:"Mercury", horaLord:"Mercury", tatwa:"Vayu" });
    const meditation = evaluatePersonalTime({ ...base, activity: "meditation", natalChart, muhurtaChart, dashaLord:"Mercury", horaLord:"Moon", tatwa:"Akash" });
    expect(work.components.find(item => item.key === "chart-lords")?.weight).toBeGreaterThan(meditation.components.find(item => item.key === "chart-lords")?.weight || 0);
  });

  it("keeps a strong Rahu Kaal caution from being overridden by high supplementary signals", () => {
    const result = evaluatePersonalTime({ ...base, panchangScore: 40, panchangCautions: ["rahu_kaal"],
      rashifal: { domains: { work: 100 } }, horaLord: "Mercury", dashaLord: "Mercury", tatwa: "Vayu" });
    expect(result.score).toBeLessThanOrEqual(44);
    expect(result.label).toBe("caution");
    expect(result.cautions).toContain("traditional_caution_caps_overall_rank");
  });
  it("does not apply a caution cap when no caution is supplied", () => {
    const result = evaluatePersonalTime({ ...base, rashifal: { domains: { work: 100 } },
      horaLord: "Mercury", dashaLord: "Mercury", tatwa: "Vayu" });
    expect(result.score).toBeGreaterThan(70);
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


  it("keeps a connected JanmaPatro chart personalized when one Moon-comparison signal is unavailable", () => {
    const result = evaluatePersonalTime({
      ...base, natalFactorsApplied: false, natalChart, muhurtaChart,
      horaLord: "Mercury", dashaLord: "Mercury", tatwa: "Vayu"
    });
    expect(result.confidence).toBe("personalized");
    expect(result.components.map(item => item.key)).toContain("chart-lords");
    expect(result.components.map(item => item.key)).toContain("gochara");
    expect(result.missing).toContain("natal-compatibility");
    expect(result.components.reduce((sum, item) => sum + item.weight, 0)).toBeCloseTo(100, 0);
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


describe("birthplace historical timezone integrity", () => {
  it("preserves the Nepal Standard Time behavior of existing records", () => {
    expect(birthInstant({date:"1995-04-10",time:"08:30"}).toISOString()).toBe("1995-04-10T02:45:00.000Z");
    expect(birthInstant({date:"1995-04-10",time:"08:30",timezone:"Asia/Kathmandu"}).toISOString()).toBe("1995-04-10T02:45:00.000Z");
  });
  it("converts Tokyo and winter/summer London correctly", () => {
    expect(birthInstant({date:"2026-01-10",time:"09:00",timezone:"Asia/Tokyo"}).toISOString()).toBe("2026-01-10T00:00:00.000Z");
    expect(birthInstant({date:"2026-01-10",time:"09:00",timezone:"Europe/London"}).toISOString()).toBe("2026-01-10T09:00:00.000Z");
    expect(birthInstant({date:"2026-07-10",time:"09:00",timezone:"Europe/London"}).toISOString()).toBe("2026-07-10T08:00:00.000Z");
  });
  it("rejects DST gaps and duplicated birth times rather than guessing", () => {
    expect(()=>birthInstant({date:"2026-03-29",time:"01:30",timezone:"Europe/London"})).toThrow("nonexistent_birth_wall_time");
    expect(()=>birthInstant({date:"2026-10-25",time:"01:30",timezone:"Europe/London"})).toThrow("ambiguous_birth_wall_time");
    expect(()=>birthInstant({date:"2026-01-10",time:"09:00",timezone:"Mars/Olympus"})).toThrow("invalid_birth_timezone");
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


describe("birth date normalization and Jyotish engine consistency", () => {
  it("accepts single-digit month/day, canonicalizes them, and rejects impossible dates", () => {
    expect(normalizeBirthDate("1992-1-31")).toBe("1992-01-31");
    expect(normalizeBirthDate("1992-02-29")).toBe("1992-02-29");
    expect(() => normalizeBirthDate("1992-02-30")).toThrow();
    expect(() => normalizeBirthDate("1992-02-31")).toThrow();
    expect(() => normalizeBirthDate("2023-02-29")).toThrow();
    expect(() => normalizeBirthDate("1992/01/31")).toThrow();
  });

  it("recalculates the full chart for both reported 1992 dates and stays aligned with My Time's Moon engine", () => {
    const common = { name: "Regression fixture", time: "00:48", location: "Kathmandu", lat: 27.7172, lng: 85.324 };
    const jan = calculateChart({ ...common, date: "1992-1-31" });
    const feb = calculateChart({ ...common, date: "1992-02-29" });
    const janMoon = jan.planets.find(planet => planet.key === "moon");
    const febMoon = feb.planets.find(planet => planet.key === "moon");
    expect(jan.input.date).toBe("1992-01-31");
    expect(feb.input.date).toBe("1992-02-29");
    expect(jan.instant.toISOString()).toBe("1992-01-30T19:03:00.000Z");
    expect(feb.instant.toISOString()).toBe("1992-02-28T19:03:00.000Z");
    expect(janMoon).toBeDefined();
    expect(febMoon).toBeDefined();
    // Both dates can correctly have Dhanu Moon-sign; the rest of the chart must change.
    expect(janMoon?.signIndex).toBe(8);
    expect(febMoon?.signIndex).toBe(8);
    expect(Math.abs((janMoon?.longitude ?? 0) - (febMoon?.longitude ?? 0))).toBeGreaterThan(15);
    expect(jan.moonNakshatraIndex).not.toBe(feb.moonNakshatraIndex);
    expect(jan.moonPada).not.toBe(feb.moonPada);
    expect(jan.dashas[0].lord).not.toBe(feb.dashas[0].lord);
    expect(jan.ascSignIndex).not.toBe(feb.ascSignIndex);
    const janPanchang = panchangAt(jan.instant);
    const febPanchang = panchangAt(feb.instant);
    expect(janMoon?.signIndex).toBe(janPanchang.moonRashi);
    expect(febMoon?.signIndex).toBe(febPanchang.moonRashi);
    expect(jan.moonNakshatraIndex).toBe(janPanchang.nakshatra);
    expect(feb.moonNakshatraIndex).toBe(febPanchang.nakshatra);
  });

  it("rejects invalid 24-hour birth times instead of calculating a rollover instant", () => {
    expect(() => calculateChart({ name: "", date: "1992-01-31", time: "99:99", location: "Kathmandu", lat: 27.7172, lng: 85.324 })).toThrow("Birth time must be HH:MM");
  });
});
