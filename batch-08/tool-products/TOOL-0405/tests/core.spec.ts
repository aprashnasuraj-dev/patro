import {describe,it,expect} from "vitest";
import {calculate} from "../src/core";

describe("TOOL-0405 Crown Molding Angle Finder",()=>{
  it("accepts the representative fixture",()=>{
    const result=calculate({"springDeg":38,"cornerDeg":90});
    expect(result).toBeTruthy();
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });
  it("does not return an HTML string contract",()=>{
    const result=calculate({"springDeg":38,"cornerDeg":90});
    expect(typeof result).toBe("object");
  });
});
