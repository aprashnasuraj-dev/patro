import { describe, expect, it } from "vitest";
import { GOCHAR, periodForRashi, RASHIS, readingForRashi } from "../src/rashifal/localRashifal";

describe("local deterministic rashifal",()=>{
  it("keeps the canonical twelve signs and twelve fixed gochar readings",()=>{
    expect(RASHIS).toHaveLength(12);
    expect(GOCHAR).toHaveLength(12);
    expect(new Set(RASHIS.map(item=>item.slug)).size).toBe(12);
    expect(new Set(GOCHAR.map(item=>item.ne)).size).toBe(12);
  });

  it("returns the same reading for the same date and rashi",()=>{
    const first=readingForRashi(0,"2026-10-04");
    const second=readingForRashi(0,"2026-10-04");
    expect(second).toEqual(first);
    expect(first.house).toBeGreaterThanOrEqual(1);
    expect(first.house).toBeLessThanOrEqual(12);
    expect(GOCHAR.some(item=>item.ne===first.ne&&item.en===first.en&&item.tone===first.tone)).toBe(true);
  });

  it("builds bounded weekly and monthly summaries only from canonical readings",()=>{
    for(const length of [7,30]){
      const summary=periodForRashi(7,"2026-10-04",length);
      expect(summary.days).toHaveLength(length);
      expect(summary.counts.good+summary.counts.mid+summary.counts.bad).toBe(length);
      expect(summary.days.every(day=>GOCHAR.some(item=>item.ne===day.ne&&item.en===day.en&&item.tone===day.tone))).toBe(true);
    }
  });

  it("rejects invalid signs and unbounded periods",()=>{
    expect(()=>readingForRashi(-1,"2026-10-04")).toThrow();
    expect(()=>readingForRashi(12,"2026-10-04")).toThrow();
    expect(()=>periodForRashi(0,"2026-10-04",0)).toThrow();
    expect(()=>periodForRashi(0,"2026-10-04",365)).toThrow();
  });
});
