import {describe,it,expect} from "vitest";
import {calculate} from "../src/core";

describe("TOOL-0409 Stud Wall Layout & Cut List Generator",()=>{
  it("accepts the representative fixture",()=>{
    const result=calculate({"wallLengthFt":20,"wallHeightFt":92.625,"spacingIn":16,"openings":"36x82\n60x48"});
    expect(result).toBeTruthy();
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });
  it("does not return an HTML string contract",()=>{
    const result=calculate({"wallLengthFt":20,"wallHeightFt":92.625,"spacingIn":16,"openings":"36x82\n60x48"});
    expect(typeof result).toBe("object");
  });
});
