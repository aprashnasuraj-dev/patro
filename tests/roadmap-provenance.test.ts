import { describe, expect, it } from "vitest";
import mapManifest from "../data/provenance/nepalmap-osm.json";
import baliManifest from "../data/provenance/bali-nyepi-2027.json";
import { sourceBadge, validateManifest, type DatasetManifest } from "../worker/roadmap/provenance";

describe("roadmap provenance contract", () => {
  it("validates committed manifests", () => {
    expect(validateManifest(mapManifest as DatasetManifest)).toEqual([]);
    expect(validateManifest(baliManifest as DatasetManifest)).toEqual([]);
  });
  it("renders source status and escapes source text", () => {
    const badge = sourceBadge("official", "<script>alert(1)</script>");
    expect(badge).toContain("Official");
    expect(badge).not.toContain("<script>");
  });
});
