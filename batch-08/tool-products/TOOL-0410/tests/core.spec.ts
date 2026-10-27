import {describe,it,expect} from "vitest";
import {calculate} from "../src/core";

describe("TOOL-0410 Paver, Base & Polymeric Sand Calculator",()=>{
  it("accepts the representative fixture",()=>{
    const result=calculate({"areaSqFt":300,"paverLengthIn":8,"paverWidthIn":4,"baseDepthIn":6,"beddingDepthIn":1,"jointSandLbPer100SqFt":30,"wastePct":7});
    expect(result).toBeTruthy();
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });
  it("does not return an HTML string contract",()=>{
    const result=calculate({"areaSqFt":300,"paverLengthIn":8,"paverWidthIn":4,"baseDepthIn":6,"beddingDepthIn":1,"jointSandLbPer100SqFt":30,"wastePct":7});
    expect(typeof result).toBe("object");
  });
});
