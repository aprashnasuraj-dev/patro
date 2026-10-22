import { describe, expect, it } from "vitest";
import { addIsoDays, formatPanchangClock, todayInNepal, validIsoDate } from "../src/panchang-jyotish/workspaces/shared";

describe("Nepal Panchang clock modes", () => {
  const date = "2026-10-22";
  it("does not mutate the stored UTC instant when changing display mode", () => {
    const instant = new Date("2026-10-22T19:30:00.000Z"); // 23 Oct, 01:15 NPT
    const original = instant.toISOString();
    expect(formatPanchangClock(instant, date, "24plus", "en")).toBe("25:15");
    expect(formatPanchangClock(instant, date, "24plus", "ne")).toBe("२५:१५");
    expect(formatPanchangClock(instant, date, "24h", "en")).toBe("01:15");
    expect(formatPanchangClock(instant, date, "12h", "en")).toContain("1:15");
    expect(instant.toISOString()).toBe(original);
  });
  it("refuses to construct a 24+ hour result from a malformed anchor date", () => {
    expect(formatPanchangClock(new Date("2026-10-22T19:30:00.000Z"), "2026-13-99", "24plus", "en")).toBe("—");
  });
  it("formats the Nepal civil date explicitly and never accepts impossible ISO dates", () => {
    expect(todayInNepal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(validIsoDate(todayInNepal())).toBe(true);
    expect(validIsoDate("0000-01-01")).toBe(false);
    expect(validIsoDate("2026-02-30")).toBe(false);
    expect(validIsoDate("2026-13-01")).toBe(false);
  });
  it("handles empty date inputs and leap-day rollover without producing NaN URLs", () => {
    expect(addIsoDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addIsoDays("2024-02-29", 1)).toBe("2024-03-01");
    expect(addIsoDays("not-a-date", 1)).toBe(addIsoDays(todayInNepal(), 1));
    expect(addIsoDays("2026-10-22", Number.NaN)).toBe("2026-10-22");
  });
});
