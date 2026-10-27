import {describe,it,expect} from "vitest";
import {calculate} from "../src/core";

describe("TOOL-0401 Fence & Deck Post Concrete Calculator",()=>{
  it("accepts the representative fixture",()=>{
    const result=calculate({"count":10,"holeDiameterIn":12,"holeDepthIn":36,"postShape":"square","postSizeIn":4,"bagYieldFt3":0.6,"wastePct":8});
    expect(result).toBeTruthy();
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });
  it("does not return an HTML string contract",()=>{
    const result=calculate({"count":10,"holeDiameterIn":12,"holeDepthIn":36,"postShape":"square","postSizeIn":4,"bagYieldFt3":0.6,"wastePct":8});
    expect(typeof result).toBe("object");
  });
});
