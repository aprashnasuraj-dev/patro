import {describe,it,expect} from "vitest";
import {calculate} from "../src/core";

describe("TOOL-0417 VAT/GST Registration Threshold Tracker",()=>{
  it("accepts the representative fixture",()=>{
    const result=calculate({"jurisdiction":"UK","turnover":80000,"customThreshold":100000,"currency":"USD"});
    expect(result).toBeTruthy();
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });
  it("does not return an HTML string contract",()=>{
    const result=calculate({"jurisdiction":"UK","turnover":80000,"customThreshold":100000,"currency":"USD"});
    expect(typeof result).toBe("object");
  });
});
