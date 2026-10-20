import { describe, expect, it } from "vitest";
import {
  JANMAPATRO_CONTEXT_STORAGE_KEY, createJanmaPatroContext, findJanmaPatroBirthPlace, saveJanmaPatroContext
} from "../src/jyotish/my-time-bridge";
import type { ChartResult } from "../src/jyotish/jyotishEngine";

describe("Janmapatro and My Time bridge", () => {
  it("resolves known birthplaces to the coordinates used by the shared engine", () => {
    expect(findJanmaPatroBirthPlace("Kathmandu")).toEqual({ name: "Kathmandu", lat: 27.7172, lng: 85.324 });
    expect(findJanmaPatroBirthPlace("Tokyo, Japan")).toEqual({ name: "Tokyo, Japan", lat: 35.6762, lng: 139.6503 });
    expect(findJanmaPatroBirthPlace("unknown village")).toBeNull();
  });

  it("writes the same birth-context shape Janmapatro and My Time consume", () => {
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

  it("returns false instead of claiming connection when local storage fails", () => {
    expect(saveJanmaPatroContext({ birth: {} }, { setItem: () => { throw new Error("blocked"); } })).toBe(false);
  });
});
