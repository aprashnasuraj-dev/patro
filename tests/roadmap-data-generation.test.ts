import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read=(p:string)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

describe("Nepal roadmap data generation contract",()=>{
  it("reuses the exact pinned OSM source for map and routing generation",()=>{
    const script=read("scripts/explore/nepal/generate-roadmap-data.sh");
    expect(script).toContain("infra/nepal-routing/fetch-pinned-osm.sh");
    expect(script).toContain("osm_wards.py --pbf");
    expect(script).toContain("osm_roads.py --pbf");
    expect(script).not.toContain("nepal-latest.osm.pbf");
  });

  it("audits persistent IDs and OSM object changes before reporting",()=>{
    const script=read("scripts/explore/nepal/generate-roadmap-data.sh");
    expect(script).toContain("update-place-ids.mjs");
    expect(script).toContain("audit-rebuild.mjs");
    expect(script.indexOf("audit-rebuild.mjs")).toBeLessThan(script.indexOf("generation-report.mjs"));
  });

  it("generates API indexes, offline packs, same-origin runtime and PMTiles in staging",()=>{
    const script=read("scripts/explore/nepal/generate-roadmap-data.sh");
    for(const token of ["NEPALMAP_API_BUILD=1","NEPALMAP_OFFLINE_PACKS=1","NEPALMAP_SELF_HOST_MAPLIBRE=1","vendor-map-runtime.sh","build-pmtiles.mjs"]){
      expect(script).toContain(token);
    }
    expect(script).toContain(".cache/nepalmap-generation");
  });

  it("does not treat committed orchestration as execution evidence",()=>{
    const reporter=read("scripts/explore/nepal/generation-report.mjs");
    expect(reporter).toContain('execution_status:"completed"');
    expect(reporter).toContain("generated only by an actual data build");
  });
});
