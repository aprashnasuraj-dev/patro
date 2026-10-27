import {describe,it,expect} from "vitest";
import {calculate} from "../src/core";

describe("TOOL-0402 Deck Joist & Beam Span Checker",()=>{
  it("accepts the representative fixture",()=>{
    const result=calculate({"species":"southern-pine","joistSize":"2x8","spacing":"16","joistSpanFt":10,"beamSize":"2-2x10","beamSpanFt":8});
    expect(result).toBeTruthy();
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });
  it("does not return an HTML string contract",()=>{
    const result=calculate({"species":"southern-pine","joistSize":"2x8","spacing":"16","joistSpanFt":10,"beamSize":"2-2x10","beamSpanFt":8});
    expect(typeof result).toBe("object");
  });
});
