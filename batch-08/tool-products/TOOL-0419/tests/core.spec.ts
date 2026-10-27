import {describe,it,expect} from "vitest";
import {calculate} from "../src/core";

describe("TOOL-0419 Wash Sale & Holding Period Date Calculator",()=>{
  it("accepts the representative fixture",()=>{
    const result=calculate({"originalBuyDate":"2026-01-15","saleDate":"2026-10-01","replacementDate":"2026-10-20","sharesSold":100,"replacementShares":60,"lossAmount":2000});
    expect(result).toBeTruthy();
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });
  it("does not return an HTML string contract",()=>{
    const result=calculate({"originalBuyDate":"2026-01-15","saleDate":"2026-10-01","replacementDate":"2026-10-20","sharesSold":100,"replacementShares":60,"lossAmount":2000});
    expect(typeof result).toBe("object");
  });
});
