import { describe, expect, it } from "vitest";
import { compactNepalSambat } from "../src/nepalSambatCompact";
describe("Nepal Sambat compact date labels", () => {
  it("removes the numeral year and prefix but keeps day names", () => {
    expect(compactNepalSambat("ने.सं. 1146 यंला गाः झिंप्यमिला")).toBe("यंला गाः झिंप्यमिला");
    expect(compactNepalSambat("ने.सं. ११४६ यंला गाः झिंप्यमिला")).toBe("यंला गाः झिंप्यमिला");
    expect(compactNepalSambat("नेपाल संवत् ११४६ यंला गाः झिंप्यमिला")).toBe("यंला गाः झिंप्यमिला");
    expect(compactNepalSambat("NS 1146 Yanla Ga Tritiya", "en")).toBe("Yanla Ga Tritiya");
    expect(compactNepalSambat("११४६ यंला गाः झिंप्यमिला")).toBe("यंला गाः झिंप्यमिला");
  });
  it("preserves day numbers without a year and no-value placeholders", () => {
    expect(compactNepalSambat("यंला गाः १४")).toBe("यंला गाः १४");
    expect(compactNepalSambat("यंला गाः झिंप्यमिला")).toBe("यंला गाः झिंप्यमिला");
    expect(compactNepalSambat(null)).toBe("");
  });
  it("does not mutate the archival object and prefers detailed labels over day numbers", () => {
    const record = { year: 1146, formatted_ne: "ने.सं. ११४६ यंला गाः झिंप्यमिला", formatted: "NS 1146 Yanla Ga Tritiya", month: { dev: "यंला", roman: "Yanla" }, paksha_dev: "गाः", tithi_number: 14 };
    expect(compactNepalSambat(record)).toBe("यंला गाः झिंप्यमिला");
    expect(compactNepalSambat(record, "en")).toBe("Yanla Ga Tritiya");
    expect(record.formatted_ne).toBe("ने.सं. ११४६ यंला गाः झिंप्यमिला");
    expect(compactNepalSambat({ year: 1146, month: { dev: "यंला" }, paksha_dev: "गाः", tithi_name_ne: "झिंप्यमिला" })).toBe("यंला गाः झिंप्यमिला");
  });
});
