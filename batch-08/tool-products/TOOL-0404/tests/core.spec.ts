import {describe,it,expect} from "vitest";
import {calculate} from "../src/core";

describe("TOOL-0404 Rebar & Welded Mesh Slab Takeoff",()=>{
  it("accepts the representative fixture",()=>{
    const result=calculate({"lengthFt":20,"widthFt":12,"spacingIn":12,"coverIn":3,"stockBarFt":20,"meshLengthFt":10,"meshWidthFt":5,"wastePct":8});
    expect(result).toBeTruthy();
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });
  it("does not return an HTML string contract",()=>{
    const result=calculate({"lengthFt":20,"widthFt":12,"spacingIn":12,"coverIn":3,"stockBarFt":20,"meshLengthFt":10,"meshWidthFt":5,"wastePct":8});
    expect(typeof result).toBe("object");
  });
});
