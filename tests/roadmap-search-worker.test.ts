import { describe, expect, it } from "vitest";
import { normalizeSearch, queryPlaceLayers, searchSkeleton } from "../scripts/explore/nepal/map/search-core.mjs";

describe("Nepal search worker core", () => {
  const layers = {
    worship: [
      ["Pashupatinath Temple", "पशुपतिनाथ मन्दिर", 27.71, 85.35, "hindu", 0, 1, 8, 1, "", "en:Pashupatinath_Temple", "n1"],
      ["Pathibhara", "पाथीभरा", 27.43, 87.77, "hindu", 0, 1, 1, 2, "", "", "n2"],
    ],
    village: [["Chainpur", "चैनपुर", 27.3, 87.3, "town", 0, 1, 1, 2, "", "", "n3"]],
  };
  it("normalizes Latin diacritics and preserves Devanagari", () => {
    expect(normalizeSearch("Pāthībharā")).toBe("pathibhara");
    expect(normalizeSearch("पाथीभरा")).toBe("पाथीभरा");
    expect(searchSkeleton("Chhainpur")).toContain("c");
  });
  it("ranks exact and prefix matches deterministically", () => {
    const r = queryPlaceLayers("पशुपतिनाथ", layers, ["worship","village"]);
    expect(r[0]).toMatchObject({ id: "worship", i: 0 });
  });
});
