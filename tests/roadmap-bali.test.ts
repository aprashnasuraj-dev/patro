import { describe, expect, it } from "vitest";
import { baliMonthModel, otonanPossibilities, rerainanSearch } from "../worker/worldcal/pages/bali-weton";
import { ROADMAP_FLAGS } from "../worker/roadmap/flags";

describe("Bali roadmap product model", () => {
  it("builds June 2026 month cells from the existing deterministic/source layers", () => {
    const cells = baliMonthModel(2026, 6);
    expect(cells).toHaveLength(30);
    const galungan = cells.find((c) => c.gregorian_date === "2026-06-17");
    expect(galungan?.signals.some((s) => s.ref === "Hari Raya Galungan" && s.source_status === "calculated")).toBe(true);
  });

  it("keeps published lunar facts distinct from calculated Pawukon", () => {
    const cells = baliMonthModel(2026, 6);
    const purnama = cells.flatMap((c) => c.signals).find((s) => s.ref === "Purnama");
    expect(purnama?.source_status).toBe("published");
  });

  it("finds rerainan by normalized name without inventing aliases", () => {
    const results = rerainanSearch("Galungan", "2026-01-01");
    expect(results.some((r) => r.date === "2026-06-17" && r.name === "Hari Raya Galungan")).toBe(true);
  });

  it("keeps user-visible Phase 6 surfaces off until verification is green", () => {
    expect(ROADMAP_FLAGS.baliMonthGrid).toBe(false);
    expect(ROADMAP_FLAGS.baliRerainanSearch).toBe(false);
  });

  it("returns both valid Pawukon possibilities when birth time relative to sunrise is unknown", () => {
    const models = otonanPossibilities("2000-01-15", "2026-10-29");
    expect(models).toHaveLength(2);
    expect(models.map((m) => m.assumption)).toEqual(["before", "after"]);
    expect(models[1].birth_jdn - models[0].birth_jdn).toBe(1);
    expect(models[0].next_dates).toHaveLength(6);
    expect(models[1].next_dates).toHaveLength(6);
    expect(models[0].next_dates).not.toEqual(models[1].next_dates);
  });

  it("keeps dual Otonan and subscription UI off until verification is green", () => {
    expect(ROADMAP_FLAGS.baliOtonanDualResult).toBe(false);
    expect(ROADMAP_FLAGS.baliSubscriptionUi).toBe(false);
  });
});
