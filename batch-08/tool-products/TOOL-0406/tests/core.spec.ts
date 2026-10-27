import {describe,it,expect} from "vitest";
import {calculate} from "../src/core";

describe("TOOL-0406 Herringbone/Diagonal Tile & Plank Waste Calculator",()=>{
  it("accepts the representative fixture",()=>{
    const result=calculate({"areaSqFt":200,"pieceLengthIn":24,"pieceWidthIn":6,"pattern":"herringbone","useSuggested":true,"wastePct":15});
    expect(result).toBeTruthy();
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });
  it("does not return an HTML string contract",()=>{
    const result=calculate({"areaSqFt":200,"pieceLengthIn":24,"pieceWidthIn":6,"pattern":"herringbone","useSuggested":true,"wastePct":15});
    expect(typeof result).toBe("object");
  });
});
