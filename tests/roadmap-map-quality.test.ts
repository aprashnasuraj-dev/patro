import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read=(p:string)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

describe("Nepal OSM change intelligence and transparent map-quality contract",()=>{
  it("creates a severity-ranked human review queue without treating every addition as an alert",()=>{
    const audit=read("scripts/explore/nepal/audit-rebuild.mjs");
    expect(audit).toContain('bulk_disappearance:"high"');
    expect(audit).toContain('large_move:"high"');
    expect(audit).toContain('place_id_changed:"critical"');
    expect(audit).toContain('filter((x)=>x.code!=="added")');
    expect(audit).toContain("review_summary");
  });

  it("publishes score weights and explicitly excludes completeness/density claims",()=>{
    const q=read("scripts/explore/nepal/map-quality-report.mjs");
    expect(q).toContain("stable_place_id:0.30");
    expect(q).toContain("bilingual_name:0.20");
    expect(q).toContain("reliable_admin_assignment:0.35");
    expect(q).toContain("source_identity:0.15");
    expect(q).toContain("Does not estimate how many real-world places/roads are missing.");
    expect(q).toContain("insufficient_sample");
  });

  it("generates quality only after stable IDs and boundary confidence are enabled",()=>{
    const gen=read("scripts/explore/nepal/generate-roadmap-data.sh");
    expect(gen.indexOf("NEPALMAP_STABLE_IDS=1")).toBeLessThan(gen.indexOf("map-quality-report.mjs"));
    expect(gen.indexOf("NEPALMAP_BOUNDARY_CONFIDENCE=1")).toBeLessThan(gen.indexOf("map-quality-report.mjs"));
    expect(gen).toContain('--quality "$WORK/map-quality.json"');
  });
});
