import { describe, expect, it } from "vitest";
import { createUlid, deterministicPlaceId, emptyPlaceIdMap, reconcilePlaceIds, validatePlaceIdMap } from "../scripts/explore/nepal/place-id-core.mjs";
import { detectPlaceAnomalies } from "../scripts/explore/nepal/place-anomalies.mjs";
import { newCorrection, transitionCorrection } from "../worker/roadmap/nepal-corrections";

describe("Nepal durable place identity", () => {
  it("derives deterministic internal IDs from typed OSM identity and preserves mapped IDs", () => {
    const n1 = deterministicPlaceId("n1");
    expect(n1).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(deterministicPlaceId("n1")).toBe(n1);
    expect(deterministicPlaceId("w1")).not.toBe(n1);
    const first = reconcilePlaceIds(emptyPlaceIdMap(), ["n1"], { now: new Date("2026-10-01T00:00:00Z") });
    const id = first.entries.n1.place_id;
    expect(id).toBe(n1);
    const second = reconcilePlaceIds(first, ["n1", "w2"], { now: new Date("2026-10-15T00:00:00Z") });
    expect(second.entries.n1.place_id).toBe(id);
    expect(second.entries.w2.place_id).toBe(deterministicPlaceId("w2"));
    expect(validatePlaceIdMap(second)).toEqual([]);
    expect(createUlid(0, new Uint8Array(10))).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it("detects high-risk source changes by source identity", () => {
    const before = [{ source_id:"n1", name:"Temple", lat:27.7, lng:85.3, category:"worship" }];
    const after = [{ source_id:"n1", name:"", lat:28.7, lng:86.3, category:"school" }];
    const codes = detectPlaceAnomalies(before, after, { moveKm: 5 }).map((a) => a.code);
    expect(codes).toContain("large_move");
    expect(codes).toContain("category_change");
    expect(codes).toContain("name_disappeared");
  });

  it("enforces correction workflow transitions", () => {
    let c = newCorrection("C-1", "n1", "2026-10-29T00:00:00Z");
    c = transitionCorrection(c, "upstream_corrected", "2026-10-29T01:00:00Z");
    c = transitionCorrection(c, "verified", "2026-10-29T02:00:00Z");
    c = transitionCorrection(c, "queued_for_build", "2026-10-29T03:00:00Z");
    c = transitionCorrection(c, "published", "2026-10-29T04:00:00Z");
    expect(c.state).toBe("published");
    expect(c.audit).toHaveLength(5);
  });
});
