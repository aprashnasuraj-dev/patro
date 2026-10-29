import { describe, expect, it } from "vitest";
import { isoToJdn } from "../worker/worldcal/dates";
import { BALI_PIODALAN, matchesPiodalanRule, nextPawukonPiodalan } from "../worker/worldcal/data/bali-piodalan";
import { astaDauh, merthaYoga, pancaDauh, pitraImmediateRestrictions, sasihReference } from "../worker/worldcal/engines/wariga";
import { padewasanReferenceModel, solarDauhWindows } from "../worker/worldcal/pages/bali-weton";
import { ROADMAP_FLAGS } from "../worker/roadmap/flags";

describe("Bali Wariga source-backed roadmap surfaces", () => {
  it("transcribes Panca Dauh and reverses the slots on Pangelong", () => {
    expect(pancaDauh(7, "penanggal").map((x) => x.code)).toEqual(["Kr","Pa","Su","Ke","Pe"]);
    expect(pancaDauh(7, "pangelong").map((x) => x.code)).toEqual(["Pe","Ke","Su","Pa","Kr"]);
  });

  it("returns all eight Asta Dauh classifications for a Saptawara", () => {
    const rows = astaDauh("Buda");
    expect(rows).toHaveLength(8);
    expect(rows.map((x) => x.quality)).toEqual(["ayu","ayu","ala","ala","ayu","ala","ayu","ala"]);
  });

  it("keeps Sasih activity references explicit rather than inferring a score", () => {
    expect(sasihReference(4)).toMatchObject({ name: "Kapat", dewa_yajna: true, bhuta_yajna: false });
    expect(sasihReference(9)).toMatchObject({ name: "Kasanga", bhuta_yajna: true, dewa_yajna: false });
    expect(sasihReference(10)).toMatchObject({ name: "Kadasa", dewa_yajna: true, memukur: true });
  });

  it("evaluates the explicitly published Pitra prohibitions", () => {
    const r = pitraImmediateRestrictions({
      triwara: "Pasah",
      saptawara: "Buda",
      pancawara: "Wage",
      events: ["Tumpek Wayang"],
      is_tilem: true,
      is_purwani_purnama: false,
    });
    expect(r.restricted).toBe(true);
    expect(r.reasons).toEqual(expect.arrayContaining(["Pasah","Buda Wage","Tumpek","Tilem"]));
  });

  it("recognizes the exact Mertha Yoga combinations from the source", () => {
    expect(merthaYoga({ saptawara: "Soma", pancawara: "Kliwon", wuku: "Landep" })).toBe(true);
    expect(merthaYoga({ saptawara: "Soma", pancawara: "Umanis", wuku: "Tolu" })).toBe(true);
    expect(merthaYoga({ saptawara: "Buda", pancawara: "Kliwon", wuku: "Landep" })).toBe(false);
  });

  it("validates source-backed Pawukon Piodalan rules against known official occurrences", () => {
    const swagina = BALI_PIODALAN.find((x) => x.slug === "pura-swagina-bapenda-bali");
    expect(swagina?.rule.type).toBe("pawukon");
    if (!swagina || swagina.rule.type !== "pawukon") throw new Error("fixture");
    expect(matchesPiodalanRule(isoToJdn("2024-06-26"), swagina.rule)).toBe(true);
    expect(nextPawukonPiodalan(swagina.rule, isoToJdn("2024-06-26"), 2).map((j) => j - isoToJdn("2024-06-26"))).toEqual([0, 210]);
  });

  it("does not calculate Sasih Piodalan dates from an unsourced annual mapping", () => {
    const sasih = BALI_PIODALAN.find((x) => x.slug === "pura-jagatnatha-jembrana");
    expect(sasih?.rule.type).toBe("sasih");
    expect(sasih?.known_occurrences).toContain("2019-08-15");
  });

  it("returns an auditable Padewasan model with lunar evaluation status", () => {
    const m = padewasanReferenceModel("2026-06-17", 4, "penanggal");
    expect(m?.sasih?.name).toBe("Kapat");
    expect(m?.asta_dauh).toHaveLength(8);
    expect(m?.panca_dauh).toHaveLength(5);
    expect(typeof m?.lunar.evaluated).toBe("boolean");
  });

  it("splits real Bali sunrise/sunset spans into exact 5/8 Dauh windows", () => {
    const w = solarDauhWindows("2026-10-29", -8.65, 115.2167);
    expect(w.sunrise.getTime()).toBeLessThan(w.sunset.getTime());
    expect(w.sunset.getTime()).toBeLessThan(w.next_sunrise.getTime());
    expect(w.panca.day).toHaveLength(5);
    expect(w.panca.night).toHaveLength(5);
    expect(w.asta.day).toHaveLength(8);
    expect(w.asta.night).toHaveLength(8);
    expect(w.panca.day[0].start.getTime()).toBe(w.sunrise.getTime());
    expect(w.panca.day[4].end.getTime()).toBe(w.sunset.getTime());
    expect(w.asta.night[0].start.getTime()).toBe(w.sunset.getTime());
    expect(w.asta.night[7].end.getTime()).toBe(w.next_sunrise.getTime());
    const daySizes = w.asta.day.map((x) => x.end.getTime() - x.start.getTime());
    expect(Math.max(...daySizes) - Math.min(...daySizes)).toBeLessThanOrEqual(1);
  });

  it("keeps new cultural surfaces off pending verification", () => {
    expect(ROADMAP_FLAGS.baliPiodalan).toBe(false);
    expect(ROADMAP_FLAGS.baliDauhAyu).toBe(false);
    expect(ROADMAP_FLAGS.baliPadewasan).toBe(false);
    expect(ROADMAP_FLAGS.baliEnglishGuide).toBe(false);
  });
});
