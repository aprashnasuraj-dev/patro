import {describe,it,expect} from "vitest";
import {calculate} from "../src/core";

describe("TOOL-0407 Pattern Repeat & Drop Match Calculator",()=>{
  it("accepts the representative fixture",()=>{
    const result=calculate({"wallWidthFt":15,"wallHeightFt":8,"rollWidthIn":20.5,"rollLengthFt":33,"repeatIn":21,"dropOffsetIn":0,"trimIn":4});
    expect(result).toBeTruthy();
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });
  it("does not return an HTML string contract",()=>{
    const result=calculate({"wallWidthFt":15,"wallHeightFt":8,"rollWidthIn":20.5,"rollLengthFt":33,"repeatIn":21,"dropOffsetIn":0,"trimIn":4});
    expect(typeof result).toBe("object");
  });
});
