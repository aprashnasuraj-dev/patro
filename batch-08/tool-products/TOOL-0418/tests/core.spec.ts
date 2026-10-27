import {describe,it,expect} from "vitest";
import {calculate} from "../src/core";

describe("TOOL-0418 MACRS Depreciation Schedule Generator",()=>{
  it("accepts the representative fixture",()=>{
    const result=calculate({"basis":10000,"propertyClass":"7","bonusPct":0});
    expect(result).toBeTruthy();
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });
  it("does not return an HTML string contract",()=>{
    const result=calculate({"basis":10000,"propertyClass":"7","bonusPct":0});
    expect(typeof result).toBe("object");
  });
});
