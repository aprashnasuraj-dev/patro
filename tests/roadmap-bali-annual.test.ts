import { describe, expect, it } from "vitest";
import {
  BALI_ANNUAL_SASIH_SOURCES, annualSasihReadiness, canonicalSasih,
  sasihGregorianDate, validateAnnualSasihSources,
} from "../worker/worldcal/data/bali-annual-sources";
import { BALI_PIODALAN, validatePiodalanRegistry } from "../worker/worldcal/data/bali-piodalan";

describe("Bali annual Sasih source layer",()=>{
  it("validates the versioned annual source records",()=>{
    const result=validateAnnualSasihSources();
    expect(result.ok,result.errors.join("\n")).toBe(true);
    expect(BALI_ANNUAL_SASIH_SOURCES.some((x)=>x.year===2025&&x.mapping_complete)).toBe(true);
  });

  it("uses the complete 2025 Bimas Hindu mapping including spelling aliases",()=>{
    expect(canonicalSasih("Kaulu")).toBe("Kewulu");
    expect(canonicalSasih("Kalima")).toBe("Kelima");
    expect(canonicalSasih("Kasanga")).toBe("Kesanga");
    expect(sasihGregorianDate({type:"sasih",lunar_day:"Purnama",sasih:"Karo"},2025)).toBe("2025-08-08");
    expect(sasihGregorianDate({type:"sasih",lunar_day:"Purnama",sasih:"Kaulu"},2025)).toBe("2025-02-12");
    expect(sasihGregorianDate({type:"sasih",lunar_day:"Tilem",sasih:"Kalima"},2025)).toBe("2025-11-20");
  });

  it("fails closed for 2026 despite isolated official anchors",()=>{
    const readiness=annualSasihReadiness(2026);
    expect(readiness.ready).toBe(false);
    expect(readiness.source?.anchors.length).toBeGreaterThanOrEqual(2);
    expect(sasihGregorianDate({type:"sasih",lunar_day:"Purnama",sasih:"Kedasa"},2026)).toBeNull();
    expect(sasihGregorianDate({type:"sasih",lunar_day:"Tilem",sasih:"Karo"},2026)).toBeNull();
  });

  it("keeps the expanded official Piodalan corpus valid",()=>{
    const result=validatePiodalanRegistry();
    expect(result.ok,result.errors.join("\n")).toBe(true);
    expect(result.count).toBeGreaterThanOrEqual(50);
    expect(BALI_PIODALAN.some((x)=>x.slug==="pura-ulun-subak-kelepekan-danginsema-tumbakbayuh"&&x.rule.type==="sasih")).toBe(true);
    expect(BALI_PIODALAN.some((x)=>x.slug==="pura-batur-beten-buni-tiying-tutul-tumbakbayuh"&&x.rule.type==="pawukon")).toBe(true);
  });

  it("does not encode the unresolved Tumbakbayuh Sapu Jagat Sasih ambiguity",()=>{
    expect(BALI_PIODALAN.some((x)=>x.slug.includes("sapu-jagat")&&x.locality.includes("Tumbakbayuh"))).toBe(false);
  });
});
