import { afterEach, describe, expect, it } from "vitest";

afterEach(() => { delete (globalThis as any).AafnaiRoadSafety; });

async function api() {
  await import("../scripts/explore/nepal/map/road-safety.js?test=" + Math.random());
  return (globalThis as any).AafnaiRoadSafety;
}

describe("Nepal OSM road/trail metadata", () => {
  it("marks incomplete nearby metadata as metadata, not a safety guarantee", async () => {
    const R = await api();
    const features = [{ properties:{ osm_id:"w1", highway:"track", surface:"gravel", metadata_confidence:"medium", warnings:"unpaved_surface,trail_or_track" } }];
    const s = R.summarizeForRoute(features, { geometry:{type:"LineString",coordinates:[[85.30,27.70],[85.31,27.71]]}, legs:[{ steps:[{ name:"Unknown road", ref:"" }] }] });
    expect(s.match_mode).toBe("no-route-metadata");
    expect(s.warnings.unpaved_surface).toBe(1);
    expect(s.disclaimer).toContain("not a claim about the exact route");
  });

  it("uses name/ref matching when loaded road metadata can be tied to route steps", async () => {
    const R = await api();
    const features = [
      { geometry:{type:"LineString",coordinates:[[85.30,27.70],[85.31,27.71]]}, properties:{ osm_id:"w1", name:"Prithvi Highway", highway:"primary", surface:"asphalt", metadata_confidence:"high", warnings:"" } },
      { geometry:{type:"LineString",coordinates:[[86.30,28.70],[86.31,28.71]]}, properties:{ osm_id:"w2", name:"Other Road", highway:"track", metadata_confidence:"low", warnings:"seasonal" } },
    ];
    const s = R.summarizeForRoute(features, { geometry:{type:"LineString",coordinates:[[85.30,27.70],[85.32,27.72]]}, legs:[{ steps:[{ name:"Prithvi Highway", ref:"" }] }] });
    expect(s.match_mode).toBe("route-step-name-ref-and-proximity");
    expect(s.segment_count).toBe(1);
    expect(s.confidence.high).toBe(1);
    expect(s.warnings.seasonal).toBeUndefined();
    expect(s.route_step_match).toMatchObject({eligible_steps:1,matched_steps:1,rate:1});
  });

  it("rejects a same-named road that is far from the routed geometry", async () => {
    const R = await api();
    const features = [
      { geometry:{type:"LineString",coordinates:[[86.30,28.70],[86.31,28.71]]}, properties:{osm_id:"w9",name:"Prithvi Highway",metadata_confidence:"high",warnings:"seasonal"} },
      { geometry:{type:"LineString",coordinates:[[85.301,27.701],[85.309,27.709]]}, properties:{osm_id:"w10",name:"Local Road",metadata_confidence:"medium",warnings:"unpaved_surface"} },
    ];
    const route={geometry:{type:"LineString",coordinates:[[85.30,27.70],[85.31,27.71]]},legs:[{steps:[{name:"Prithvi Highway",ref:""}]}]};
    const s=R.summarizeForRoute(features,route);
    expect(s.match_mode).toBe("route-corridor-nearby-metadata");
    expect(s.route_step_match.rate).toBe(0);
    expect(s.warnings.seasonal).toBeUndefined();
    expect(s.warnings.unpaved_surface).toBe(1);
  });
});
