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
    const s = R.summarizeForRoute(features, { legs:[{ steps:[{ name:"Unknown road", ref:"" }] }] });
    expect(s.match_mode).toBe("viewport-near-route");
    expect(s.warnings.unpaved_surface).toBe(1);
    expect(s.disclaimer).toContain("not a claim about the exact route");
  });

  it("uses name/ref matching when loaded road metadata can be tied to route steps", async () => {
    const R = await api();
    const features = [
      { properties:{ osm_id:"w1", name:"Prithvi Highway", highway:"primary", surface:"asphalt", metadata_confidence:"high", warnings:"" } },
      { properties:{ osm_id:"w2", name:"Other Road", highway:"track", metadata_confidence:"low", warnings:"seasonal" } },
    ];
    const s = R.summarizeForRoute(features, { legs:[{ steps:[{ name:"Prithvi Highway", ref:"" }] }] });
    expect(s.match_mode).toBe("route-step-name-ref");
    expect(s.segment_count).toBe(1);
    expect(s.confidence.high).toBe(1);
    expect(s.warnings.seasonal).toBeUndefined();
  });
});
