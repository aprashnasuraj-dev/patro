import {describe,it,expect} from "vitest";
import {calculate} from "../src/core";

describe("TOOL-0414 UK Payments on Account Planner",()=>{
  it("accepts the representative fixture",()=>{
    const result=calculate({"lastYearRelevantTax":3000,"outsideSaTax":0,"projectedCurrentTax":3600,"poaPaid":0});
    expect(result).toBeTruthy();
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });
  it("does not return an HTML string contract",()=>{
    const result=calculate({"lastYearRelevantTax":3000,"outsideSaTax":0,"projectedCurrentTax":3600,"poaPaid":0});
    expect(typeof result).toBe("object");
  });
});
