import { describe, expect, it } from "vitest";
import { createUlid, emptyPlaceIdMap, reconcilePlaceIds, validatePlaceIdMap } from "../scripts/explore/nepal/place-id-core.mjs";
import { detectPlaceAnomalies } from "../scripts/explore/nepal/place-anomalies.mjs";
import { newCorrection, transitionCorrection } from "../worker/roadmap/nepal-corrections";

describe("Nepal durable place identity", () => {
  it("preserves an assigned ULID across refreshes and adds only new source IDs", () => {
    const bytes = () => new Uint8Array(10).fill(7);
    const first = reconcilePlaceIds(emptyPlaceIdMap(), ["n1"], { now: new Date("2026-10-01T00:00:00Z"), randomBytes: bytes });
    const id = first.entries.n1.place_id;
    const second = reconcilePlaceIds(first, ["n1", "w2"], { now: new Date("2026-10-15T00:00:00Z"), randomBytes: () => new Uint8Array(10).fill(8) });
    expect(second.entries.n1.place_id).toBe(id);
    expect(second.entries.w2.place_id).not.toBe(id);
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
