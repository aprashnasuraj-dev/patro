import {describe,it,expect} from "vitest";
import {calculate} from "../src/core";

describe("TOOL-0408 Wall & Roof U-Value / R-Value Builder",()=>{
  it("accepts the representative fixture",()=>{
    const result=calculate({"insideFilmR":0.68,"outsideFilmR":0.17,"continuousR":5,"cavityR":20,"framingR":6,"framingPct":23});
    expect(result).toBeTruthy();
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });
  it("does not return an HTML string contract",()=>{
    const result=calculate({"insideFilmR":0.68,"outsideFilmR":0.17,"continuousR":5,"cavityR":20,"framingR":6,"framingPct":23});
    expect(typeof result).toBe("object");
  });
});
