import { describe, expect, it } from "vitest";
import { renderIcsCalendar } from "../worker/worldcal/ics";
import { baliFeedRoute, majorHolidayEvents, moonEvents } from "../worker/worldcal/pages/bali-feeds";
import { ROADMAP_FLAGS } from "../worker/roadmap/flags";

describe("Bali ICS feeds", () => {
  it("renders RFC-style CRLF calendar records with stable all-day fields", () => {
    const out = renderIcsCalendar("Kalender Bali", [{
      uid: "event-2027-03-08@aafnaipatro.com",
      date: "2027-03-08",
      summary: "Hari Raya Nyepi",
      description: "Official, source; checked",
      sequence: 0,
    }], new Date("2026-10-29T00:00:00Z"));
    expect(out).toContain("BEGIN:VCALENDAR\r\n");
    expect(out).toContain("UID:event-2027-03-08@aafnaipatro.com\r\n");
    expect(out).toContain("DTSTART;VALUE=DATE:20270308\r\n");
    expect(out).toContain("SUMMARY:Hari Raya Nyepi\r\n");
    expect(out).toContain("DESCRIPTION:Official\\, source\\; checked\r\n");
    expect(out.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("keeps official Nyepi separate from calculated Pawukon in 2027", () => {
    const events = majorHolidayEvents(2027);
    const nyepi = events.find((e) => e.date === "2027-03-08" && e.summary.includes("Nyepi"));
    expect(nyepi?.description).toContain("Status sumber: official");
    expect(events.some((e) => e.description?.includes("Status sumber: calculated"))).toBe(true);
  });

  it("builds the published Purnama/Tilem set for 2027", () => {
    const events = moonEvents(2027);
    expect(events).toHaveLength(25);
    expect(events.every((e) => e.description?.includes("Status sumber: published"))).toBe(true);
  });

  it("builds source-backed recurring Piodalan feeds and keeps unsupported Sasih rules fail-closed", () => {
    const pawukonCtx = {
      site: "https://aafnaipatro.com",
      url: new URL("https://aafnaipatro.com/bali-calendar/feed/piodalan/pura-luhur-batukaru.ics"),
      path: "/bali-calendar/feed/piodalan/pura-luhur-batukaru.ics",
      now: new Date("2026-10-29T00:00:00Z"),
    };
    const feed:any = baliFeedRoute(pawukonCtx, ["feed","piodalan","pura-luhur-batukaru.ics"]);
    expect(feed?.contentType).toContain("text/calendar");
    expect(feed?.html).toContain("Piodalan — Pura Luhur Batukaru");
    expect(String(feed?.html||"").replace(/\r\n /g,"")).toContain("recurrence 210 hari");
    const sasih:any = baliFeedRoute(pawukonCtx, ["feed","piodalan","pura-jagatnatha-jembrana.ics"]);
    expect(sasih).toBeNull();
  });

  it("accepts the supported 1929–2129 Bali feed window", () => {
    for (const year of [1929,2129]) {
      const ctx = {site:"https://aafnaipatro.com",url:new URL(`https://aafnaipatro.com/bali-calendar/feed/hari-raya/${year}.ics`),path:`/bali-calendar/feed/hari-raya/${year}.ics`,now:new Date("2026-10-29T00:00:00Z")};
      expect((baliFeedRoute(ctx,["feed","hari-raya",`${year}.ics`]) as any)?.contentType).toContain("text/calendar");
    }
    const ctx = {site:"https://aafnaipatro.com",url:new URL("https://aafnaipatro.com/bali-calendar/feed/hari-raya/2130.ics"),path:"/bali-calendar/feed/hari-raya/2130.ics",now:new Date("2026-10-29T00:00:00Z")};
    expect(baliFeedRoute(ctx,["feed","hari-raya","2130.ics"])).toBeNull();
  });

  it("builds a private noindex Otonan feed without enabling the public flag", () => {
    const ctx = {
      site: "https://aafnaipatro.com",
      url: new URL("https://aafnaipatro.com/bali-calendar/feed/otonan.ics?lahir=2000-01-01&sebelum_subuh=1"),
      path: "/bali-calendar/feed/otonan.ics",
      now: new Date("2026-10-29T00:00:00Z"),
    };
    const rendered = baliFeedRoute(ctx, ["feed","otonan.ics"]);
    expect(rendered && "html" in rendered ? rendered.contentType : "").toContain("text/calendar");
    expect(rendered && "html" in rendered ? rendered.indexable : true).toBe(false);
    expect(ROADMAP_FLAGS.baliIcsFeeds).toBe(false);
  });
});
