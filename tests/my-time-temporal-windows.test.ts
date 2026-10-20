import { describe, expect, it } from "vitest";
import { choghadiyaWindows, horaWindows, inauspiciousDayWindows } from "../src/patro-tools/core/temporal-windows";

describe("My Time temporal windows", () => {
  const sunrise = "2026-10-20T00:00:00.000Z";
  const sunset = "2026-10-20T12:00:00.000Z";
  const nextSunrise = "2026-10-21T00:00:00.000Z";

  it("splits actual daylight and night into eight contiguous Choghadiya segments", () => {
    const windows = choghadiyaWindows(2, sunrise, sunset, nextSunrise);
    expect(windows.day).toHaveLength(8);
    expect(windows.night).toHaveLength(8);
    expect(windows.day[0].start_utc).toBe(sunrise);
    expect(windows.day.at(-1)?.end_utc).toBe(sunset);
    expect(windows.night[0].start_utc).toBe(sunset);
    expect(windows.night.at(-1)?.end_utc).toBe(nextSunrise);
    expect(windows.day.every((row,i,all)=>i===0||row.start_utc===all[i-1].end_utc)).toBe(true);
  });

  it("uses the source-plan Rahu Kaal mapping and creates three local daylight periods", () => {
    const windows = inauspiciousDayWindows(0, sunrise, sunset);
    expect(windows).toHaveLength(3);
    expect(windows.find(row=>row.key==="rahu")?.eighth).toBe(8);
    expect(windows.find(row=>row.key==="yamaganda")?.eighth).toBe(5);
    expect(windows.find(row=>row.key==="gulika")?.eighth).toBe(7);
  });

  it("splits planetary hours into twelve daylight and twelve night segments", () => {
    const windows = horaWindows(0, sunrise, sunset, nextSunrise);
    expect(windows.day).toHaveLength(12);
    expect(windows.night).toHaveLength(12);
    expect(windows.day[0].name_en).toBe("Sun");
    expect(windows.night[0].name_en).toBe("Jupiter");
    expect(windows.day.at(-1)?.end_utc).toBe(sunset);
  });

  it("fails closed for missing sunrise/sunset rather than inventing 06:00/18:00", () => {
    expect(choghadiyaWindows(0, null, sunset, nextSunrise)).toEqual({day:[],night:[]});
    expect(inauspiciousDayWindows(0, sunrise, null)).toEqual([]);
    expect(horaWindows(0, sunrise, null, nextSunrise)).toEqual({day:[],night:[]});
  });
});
