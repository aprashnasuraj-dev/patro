import { describe, expect, it } from "vitest";
import { calculateTara } from "../src/features/my-time/tarabalam";

describe("inclusive Tarabalam cyclic indexing", () => {
  it.each([
    [1, 1, 1, 1],       // Same star: Janma
    [27, 1, 2, 2],      // Revati -> Ashwini: Sampat, no rollover special case
    [27, 2, 3, 3],      // Revati -> Bharani: Vipat
    [1, 27, 27, 9],     // Maximum inclusive distance: Parama Mitra
    [9, 17, 9, 9],
    [9, 18, 10, 1],
    [27, 27, 1, 1],
  ])("natal %i, transit %i -> distance %i, Tara %i", (birth, transit, distance, taraIndex) => {
    expect(calculateTara(birth, transit)).toEqual({ distance, taraIndex });
  });

  it("stays in the 1–9 cycle across all 729 natal/transit pairs", () => {
    for (let birth = 1; birth <= 27; birth++) {
      for (let transit = 1; transit <= 27; transit++) {
        const result = calculateTara(birth, transit);
        expect(result.distance).toBe(((transit - birth + 27) % 27) + 1);
        expect(result.taraIndex).toBe(((result.distance - 1) % 9) + 1);
        expect(result.taraIndex).toBeGreaterThanOrEqual(1);
        expect(result.taraIndex).toBeLessThanOrEqual(9);
      }
    }
  });

  it.each([0, 28, -1, 1.5, NaN, Infinity])("rejects invalid nakshatra index %s", invalid => {
    expect(() => calculateTara(invalid, 1)).toThrow(RangeError);
    expect(() => calculateTara(1, invalid)).toThrow(RangeError);
  });
});
