import { describe, expect, it } from "vitest";
import { classifySunriseTithi } from "../src/panchang-jyotish/workspaces/shared";

describe("sunrise Tithi pattern classification", () => {
  it("distinguishes ordinary, repeated and skipped sunrise Tithis", () => {
    expect(classifySunriseTithi(9, 10)).toEqual({ advance: 1, repeated: false, skipped: 0, status: "ordinary" });
    expect(classifySunriseTithi(9, 9)).toEqual({ advance: 0, repeated: true, skipped: 0, status: "vriddhi" });
    expect(classifySunriseTithi(9, 11)).toEqual({ advance: 2, repeated: false, skipped: 1, status: "kshaya" });
  });
  it("handles the new-moon 30 to 1 wrap without inventing a missing day", () => {
    expect(classifySunriseTithi(30, 1).status).toBe("ordinary");
    expect(classifySunriseTithi(30, 2).status).toBe("kshaya");
    expect(classifySunriseTithi(30, 30).status).toBe("vriddhi");
  });
  it("rejects invalid numbers and impossible daily jumps", () => {
    expect(() => classifySunriseTithi(0, 1)).toThrow();
    expect(() => classifySunriseTithi(10, 14)).toThrow();
    expect(() => classifySunriseTithi(30, 31)).toThrow();
  });
});
