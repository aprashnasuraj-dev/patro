import { describe, expect, it } from "vitest";
import { classifyNakshatraCandidate, kathmanduCivilWeekday, SOURCE_REVIEWED_NAKSHATRA_RULES } from "../src/panchang-jyotish/reviewed-candidate-rules";

describe("source-audited candidate membership, not a definitive observance", () => {
  it("uses one-based Nakshatra positions for Panchak", () => {
    expect(SOURCE_REVIEWED_NAKSHATRA_RULES.panchak).toEqual([23,24,25,26,27]);
    for(let n=1;n<=27;n++) expect(classifyNakshatraCandidate("panchak",n,0)).toBe(n>=23);
  });
  it("keeps broad Ganda Moola distinct from an inferred Gandanta judgment", () => {
    const six=[1,9,10,18,19,27];
    expect(SOURCE_REVIEWED_NAKSHATRA_RULES.gandaMoola).toEqual(six);
    for(let n=1;n<=27;n++) expect(classifyNakshatraCandidate("gandaMoola",n,1)).toBe(six.includes(n));
  });
  it("requires both Pushya and correct weekday for Ravi/Guru candidate", () => {
    for(let n=1;n<=27;n++) for(let day=0;day<7;day++){
      expect(classifyNakshatraCandidate("raviPushya",n,day)).toBe(n===8&&day===0);
      expect(classifyNakshatraCandidate("guruPushya",n,day)).toBe(n===8&&day===4);
    }
  });
  it("rejects invalid inputs rather than producing a false traditional verdict", () => {
    for(const n of [0,28,NaN,1.5]) expect(classifyNakshatraCandidate("panchak",n,0)).toBe(false);
    for(const day of [-1,7,NaN,2.5]) expect(classifyNakshatraCandidate("raviPushya",8,day)).toBe(false);
  });
  it("uses Nepal timezone when translating a civil instant; not confused with sunrise Vara", () => {
    expect(kathmanduCivilWeekday(new Date("2026-11-01T00:00:00Z"))).toBe(0);
    expect(kathmanduCivilWeekday(new Date("2026-10-31T19:00:00Z"))).toBe(0);
    expect(kathmanduCivilWeekday(new Date("2026-10-31T17:00:00Z"))).toBe(6);
  });
});
