import {describe,it,expect} from "vitest";
import {calculate} from "../src/core";

describe("TOOL-0411 Gutter & Downspout Sizing by City Rainfall",()=>{
  it("accepts the representative fixture",()=>{
    const result=calculate({"city":"Custom NOAA PFDS location","roofAreaSqFt":2000,"rainInPerHr":4,"downspouts":4,"downspoutCapacityGpm":30});
    expect(result).toBeTruthy();
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });
  it("does not return an HTML string contract",()=>{
    const result=calculate({"city":"Custom NOAA PFDS location","roofAreaSqFt":2000,"rainInPerHr":4,"downspouts":4,"downspoutCapacityGpm":30});
    expect(typeof result).toBe("object");
  });
});
