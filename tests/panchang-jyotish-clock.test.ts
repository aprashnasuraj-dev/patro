import { describe, expect, it } from "vitest";
import { formatPanchangClock } from "../src/panchang-jyotish/workspaces/shared";

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
});
