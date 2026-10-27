import {describe,it,expect} from "vitest";
import {calculate} from "../src/core";

describe("TOOL-0403 Stair Rise/Run & Code Compliance Checker",()=>{
  it("accepts the representative fixture",()=>{
    const result=calculate({"totalRiseIn":108,"treadDepthIn":10,"headroomIn":80,"maxRiserIn":7.75,"minTreadIn":10,"minHeadroomIn":80});
    expect(result).toBeTruthy();
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });
  it("does not return an HTML string contract",()=>{
    const result=calculate({"totalRiseIn":108,"treadDepthIn":10,"headroomIn":80,"maxRiserIn":7.75,"minTreadIn":10,"minHeadroomIn":80});
    expect(typeof result).toBe("object");
  });
});
