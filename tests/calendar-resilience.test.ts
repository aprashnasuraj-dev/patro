import { describe, expect, it, beforeEach } from "vitest";
import { calendarTierResponse } from "../worker/calendar-tier";
import { clearR2CalendarObjectCache, R2_CALENDAR_INDEX_KEY } from "../worker/calendar-backup";

const day = {
  ad: "2026-10-05",
  bs: { year: 2083, month: 6, day: 19, formatted: "2083-06-19" },
  ns: { year: 1146, formatted: "1146", formatted_ne: "११४६", month: { dev: "कौला" }, tithi_number: 4 },
  panchang: { tithi: { ne: "चतुर्थी", en: "Chaturthi", number: 4 }, sunrise: "05:58", sunset: "17:47" },
};

function fakeDb(results: any[]) {
  return {
    prepare() {
      return {
        bind() {
          return { all: async () => ({ results }) };
        },
      };
    },
  };
}

function jsonObject(value: unknown) {
  return { json: async () => value };
}

beforeEach(() => clearR2CalendarObjectCache());

describe("calendar resilience routing", () => {
  it("uses D1 first and never touches R2 when the D1 row exists", async () => {
    let r2Reads = 0;
    const env = {
      DB: fakeDb([{ payload: JSON.stringify(day) }]),
      CALENDAR_BACKUP: { get: async () => { r2Reads += 1; throw new Error("R2 must not be read"); } },
    };
    const response = await calendarTierResponse(new Request("https://aafnaipatro.com/api/v1/sync?date=2026-10-05"), env);
    expect(response?.status).toBe(200);
    expect(response?.headers.get("x-patro-calendar-source")).toBe("d1");
    const body = await response!.json() as any;
    expect(body.calendar_source).toBe("d1");
    expect(body.tithi?.ne).toBe("चतुर्थी");
    expect(r2Reads).toBe(0);
  });

  it("falls back to R2 JSON when D1 is empty", async () => {
    const keys: string[] = [];
    const index = {
      start: "2026-09-18",
      end: "2026-10-17",
      past_months: 12,
      future_months: 12,
      months: [{ year: 2083, month: 6, path: "/data/calendar/offline-24-months/2083-06.json", start: "2026-09-18", end: "2026-10-17", days: 30 }],
    };
    const env = {
      DB: fakeDb([]),
      CALENDAR_BACKUP: {
        get: async (key: string) => {
          keys.push(key);
          if (key === R2_CALENDAR_INDEX_KEY) return jsonObject(index);
          if (key === "calendar/offline-24-months/2083-06.json") return jsonObject({ year: 2083, month: 6, days: [day], events: [] });
          return null;
        },
      },
    };
    const response = await calendarTierResponse(new Request("https://aafnaipatro.com/api/v1/sync?date=2026-10-05"), env);
    expect(response?.status).toBe(200);
    expect(response?.headers.get("x-patro-calendar-source")).toBe("r2");
    const body = await response!.json() as any;
    expect(body.calendar_source).toBe("r2");
    expect(body.calendars?.bikram_sambat_detail?.day).toBe(19);
    expect(keys).toContain("calendar/offline-24-months/index.json");
    expect(keys).toContain("calendar/offline-24-months/2083-06.json");
  });

  it("returns control to the static/PWA layer when both D1 and R2 have no calendar row", async () => {
    const env = { DB: fakeDb([]), CALENDAR_BACKUP: { get: async () => null } };
    const response = await calendarTierResponse(new Request("https://aafnaipatro.com/api/v1/sync?date=2026-10-05"), env);
    expect(response).toBeNull();
  });
});
