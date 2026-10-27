import {describe,it,expect} from "vitest";
import {calculate} from "../src/core";

describe("TOOL-0412 Form 2210 Annualized Income Installment Calculator",()=>{
  it("accepts the representative fixture",()=>{
    const result=calculate({"filingStatus":"single","cumulativeAgi":"15000,30000,60000,100000","cumulativeDeductions":"3000,5000,8000,12000","standardDeduction":0,"annualizedCredits":"0,0,0,0","annualizedOtherTaxes":"0,0,0,0","requiredAnnualPayment":18000});
    expect(result).toBeTruthy();
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });
  it("does not return an HTML string contract",()=>{
    const result=calculate({"filingStatus":"single","cumulativeAgi":"15000,30000,60000,100000","cumulativeDeductions":"3000,5000,8000,12000","standardDeduction":0,"annualizedCredits":"0,0,0,0","annualizedOtherTaxes":"0,0,0,0","requiredAnnualPayment":18000});
    expect(typeof result).toBe("object");
  });
});
