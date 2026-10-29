import { describe, expect, it } from "vitest";
import { classifyBoundaryConfidence } from "../scripts/explore/nepal/boundary-confidence.mjs";

const square = (minLng:number,minLat:number,maxLng:number,maxLat:number, props:any) => ({
  type:"Feature",
  properties:props,
  geometry:{ type:"Polygon", coordinates:[[
    [minLng,minLat],[maxLng,minLat],[maxLng,maxLat],[minLng,maxLat],[minLng,minLat],
  ]]},
});

describe("Nepal boundary confidence", () => {
  const features = [
    square(85,27,85.1,27.1,{palika_id:"100",ward:1}),
    square(85.1,27,85.2,27.1,{palika_id:"100",ward:2}),
  ];

  it("marks a well-inside matching point high confidence", () => {
    const r=classifyBoundaryConfidence([85.05,27.05],features,{palika_id:"100",ward:1},{ambiguousKm:.25,mediumKm:1});
    expect(r.confidence).toBe("high");
    expect(r.palika_match).toBe(true);
    expect(r.ward_match).toBe(true);
    expect(r.boundary_distance_m).toBeGreaterThan(1000);
  });

  it("marks a point near a ward edge low confidence", () => {
    const r=classifyBoundaryConfidence([85.099,27.05],features,{palika_id:"100",ward:1},{ambiguousKm:.25,mediumKm:1});
    expect(r.confidence).toBe("low");
    expect(r.reason).toBe("near_boundary");
  });

  it("marks assignment mismatches low confidence", () => {
    const r=classifyBoundaryConfidence([85.15,27.05],features,{palika_id:"100",ward:1});
    expect(r.confidence).toBe("low");
    expect(r.reason).toBe("assignment_mismatch");
  });

  it("marks outside points low and reports the nearest candidate", () => {
    const r=classifyBoundaryConfidence([84.99,27.05],features,{palika_id:"100",ward:1});
    expect(r.confidence).toBe("low");
    expect(r.inside).toBe(false);
    expect(r.candidate?.palika_id).toBe("100");
  });
});
