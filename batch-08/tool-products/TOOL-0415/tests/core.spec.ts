import {describe,it,expect} from "vitest";
import {calculate} from "../src/core";
const sample={grossEligibleInclTax:100000,taxRatePct:13,quickRatePct:8.8,itcs:7000,ineligibleTax:0,creditEligibleRevenue:30000};
describe("TOOL-0415 GST/HST Quick Method vs Regular Method",()=>{
  it("accepts the representative numeric fixture",()=>{const result=calculate(sample);expect(result["Regular-method net tax"]).toBeGreaterThanOrEqual(0);expect(result["Quick-method net tax"]).toBeGreaterThanOrEqual(0)});
  it("rejects non-numeric rates instead of coercing policy inputs",()=>{expect(()=>calculate({...sample,taxRatePct:"13"})).toThrow()});
});
