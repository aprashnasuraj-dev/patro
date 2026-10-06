import { beforeEach, describe, expect, it } from "vitest";
import {
  CALENDAR_PREFIX,
  calendarArchiveKey,
  clearCalendarArchiveCache,
  isCalendarShard,
  loadCalendarShard,
} from "../worker/calendar-archive";
import { publicArchivePageResponse } from "../worker/public-archive-pages";

const row = {
  ad: "2026-10-06",
  bs: { year: 2083, month: 6, day: 20, formatted: "2083-06-20" },
  ns: { formatted: "1146" },
  panchang: { tithi: "Dashami" },
};
const shard = { schema: 1, calendar: "ad", year: 2026, source_version: "test-v1", rows: [row] } as const;

function assetsFor(doc: unknown) {
  return {
    async fetch(request: Request) {
      expect(new URL(request.url).pathname).toBe("/data/calendar/ad/2026.json");
      return new Response(JSON.stringify(doc), { status: 200, headers: { "content-type": "application/json" } });
    },
  };
}

describe("calendar archive contract", () => {
  beforeEach(() => clearCalendarArchiveCache());

  it("keeps writer and reader on the exact v1 key contract", () => {
    expect(CALENDAR_PREFIX).toBe("datasets/calendar/v1");
    expect(calendarArchiveKey("ad", 2026)).toBe("datasets/calendar/v1/ad/2026.json");
    expect(isCalendarShard(shard, "ad", 2026)).toBe(true);
    expect(isCalendarShard({ ...shard, schema: 2 }, "ad", 2026)).toBe(false);
    expect(isCalendarShard({ ...shard, calendar: "bs" }, "ad", 2026)).toBe(false);
    expect(isCalendarShard({ ...shard, year: 2025 }, "ad", 2026)).toBe(false);
    expect(isCalendarShard({ ...shard, rows: null }, "ad", 2026)).toBe(false);
  });

  it("falls back to packaged static shards when R2 misses", async () => {
    const request = new Request("https://aafnaipatro.com/date/2026-10-06");
    const loaded = await loadCalendarShard(request, {
      ARCHIVE: { async get() { return null; } },
      ASSETS: assetsFor(shard),
    }, "ad", 2026);
    expect(loaded?.backend).toBe("static-fallback");
    expect(loaded?.doc.rows).toHaveLength(1);
  });

  it("serves an indexable day page from static fallback instead of 503", async () => {
    const request = new Request("https://aafnaipatro.com/date/2026-10-06");
    const response = await publicArchivePageResponse(request, {
      PUBLIC_SITE_URL: "https://aafnaipatro.com",
      ARCHIVE: { async get() { return null; } },
      ASSETS: assetsFor(shard),
    });
    expect(response?.status).toBe(200);
    expect(response?.headers.get("x-patro-backend")).toBe("static-fallback");
    const html = await response!.text();
    expect(html).toContain('<html lang="ne">');
    expect(html).toContain('<link rel="canonical" href="https://aafnaipatro.com/date/2026-10-06">');
    expect(html).toMatch(/<meta name="robots" content="index,follow/);
    expect(html).toContain("Dashami");
    expect(html).toContain("1146");
    expect(html.toLowerCase()).not.toContain("meropatro");
  });
});
