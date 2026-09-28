import { describe, expect, it } from "vitest";
import {
  SCALE,
  bighaToSqFt,
  calculatePersonalTax,
  formatScaled,
  preetiToUnicode,
  ropaniToSqFt,
  sqFtToBigha,
  sqFtToRopani,
  unicodeToPreeti,
} from "./index";

describe("Preeti conversion engine", () => {
  it("converts common legacy text deterministically", () => {
    expect(preetiToUnicode("g]kfn")).toBe("नेपाल");
    expect(preetiToUnicode('sf7df08"')).toBe("काठमाण्डू");
  });

  it("handles conjunct alias, short-i relocation and reph shift", () => {
    expect(preetiToUnicode("kshe")).toBe("क्ष");
    expect(preetiToUnicode("ls")).toBe("कि");
    expect(preetiToUnicode("s{")).toBe("र्क");
  });

  it("keeps strict Preeti capital-I behavior unless compatibility is requested", () => {
    expect(preetiToUnicode("I")).toBe("क्ष्");
    expect(preetiToUnicode("Is", { capitalIAsShortI: true })).toBe("कि");
  });

  it("round-trips the canonical Nepal sample", () => {
    expect(unicodeToPreeti("नेपाल")).toBe("g]kfn");
  });
});

describe("land engine", () => {
  it("uses exact scaled integers for hill units", () => {
    expect(ropaniToSqFt({ ropani: 1 })).toBe(5_476n * SCALE);
    expect(ropaniToSqFt({ aana: 1 })).toBe(342_250_000n);
    expect(ropaniToSqFt({ dam: "0.5" })).toBe(10_695_312n);
  });

  it("cascades square feet to Ropani/Aana/Paisa/Dam", () => {
    const result = sqFtToRopani("5476");
    expect(result.ropani).toBe(1n);
    expect(result.aana).toBe(0n);
    expect(result.paisa).toBe(0n);
    expect(result.damScaled).toBe(0n);
  });

  it("cascades Terai units exactly", () => {
    expect(bighaToSqFt({ bigha: 1 })).toBe(72_900n * SCALE);
    const result = sqFtToBigha("3645");
    expect(result.bigha).toBe(0n);
    expect(result.kattha).toBe(1n);
    expect(formatScaled(result.dhurScaled)).toBe("0");
  });
});

describe("policy-driven tax engine", () => {
  const policy = {
    contributionDeductionCap: 300_000n * SCALE,
    contributionSalaryFractionNumerator: 1n,
    contributionSalaryFractionDenominator: 3n,
    slabs: [
      { upto: 500_000n * SCALE, rateBps: 100 },
      { upto: 700_000n * SCALE, rateBps: 1_000 },
      { upto: null, rateBps: 2_000 },
    ],
  } as const;

  it("caps SSF/EPF/CIT at min(actual, one-third salary, policy cap)", () => {
    const result = calculatePersonalTax({
      annualSalary: "900000",
      ssf: "200000",
      epf: "150000",
      cit: "100000",
      insuranceExemption: "0",
    }, policy);

    expect(result.contributionDeductionScaled).toBe(300_000n * SCALE);
    expect(result.taxableIncomeScaled).toBe(600_000n * SCALE);
    expect(result.taxScaled).toBe(15_000n * SCALE);
  });
});
