import {describe,it,expect} from "vitest";
import {calculate} from "../src/core";

describe("TOOL-0413 Estimated Tax Safe-Harbor Planner",()=>{
  it("accepts the representative fixture",()=>{
    const result=calculate({"filingStatus":"single","currentTax":20000,"priorTax":18000,"priorAgi":120000,"withholding":8000});
    expect(result).toBeTruthy();
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });
  it("does not return an HTML string contract",()=>{
    const result=calculate({"filingStatus":"single","currentTax":20000,"priorTax":18000,"priorAgi":120000,"withholding":8000});
    expect(typeof result).toBe("object");
  });
});
