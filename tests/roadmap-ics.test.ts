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
