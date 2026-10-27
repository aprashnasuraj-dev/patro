import {describe,it,expect} from "vitest";
import {calculate} from "../src/core";

describe("TOOL-0416 US Economic Nexus Tracker",()=>{
  it("accepts the representative fixture",()=>{
    const result=calculate({"state":"CA","sales":120000,"transactions":150,"customSalesThreshold":100000,"customTransactionThreshold":0,"customLogic":"or"});
    expect(result).toBeTruthy();
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });
  it("does not return an HTML string contract",()=>{
    const result=calculate({"state":"CA","sales":120000,"transactions":150,"customSalesThreshold":100000,"customTransactionThreshold":0,"customLogic":"or"});
    expect(typeof result).toBe("object");
  });
});
