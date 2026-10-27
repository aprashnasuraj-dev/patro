import {describe,it,expect} from "vitest";
import {calculate} from "../src/core";

describe("TOOL-0415 GST/HST Quick Method vs Regular Method",()=>{
  it("accepts the representative fixture",()=>{
    const result=calculate({"grossEligibleInclTax":100000,"taxRatePct":"13","quickRatePct":8.8,"itcs":7000,"ineligibleTax":0,"creditEligibleRevenue":30000});
    expect(result).toBeTruthy();
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });
  it("does not return an HTML string contract",()=>{
    const result=calculate({"grossEligibleInclTax":100000,"taxRatePct":"13","quickRatePct":8.8,"itcs":7000,"ineligibleTax":0,"creditEligibleRevenue":30000});
    expect(typeof result).toBe("object");
  });
});
