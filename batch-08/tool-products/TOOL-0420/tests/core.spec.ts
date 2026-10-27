import {describe,it,expect} from "vitest";
import {calculate} from "../src/core";

describe("TOOL-0420 Backdoor Roth Pro-Rata Calculator",()=>{
  it("accepts the representative fixture",()=>{
    const result=calculate({"priorBasis":0,"currentNondeductible":7000,"conversion":7000,"otherDistributions":0,"yearEndTraditionalSepSimple":0});
    expect(result).toBeTruthy();
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });
  it("does not return an HTML string contract",()=>{
    const result=calculate({"priorBasis":0,"currentNondeductible":7000,"conversion":7000,"otherDistributions":0,"yearEndTraditionalSepSimple":0});
    expect(typeof result).toBe("object");
  });
});
