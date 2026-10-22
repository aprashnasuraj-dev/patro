import { describe, expect, it } from "vitest";
import { splitTimingWindowAtBoundaries } from "../src/features/my-time/timing-window-segments";
const window={start_utc:"2026-10-22T00:00:00Z",end_utc:"2026-10-22T02:00:00Z"};
describe("My Time exact UTC interval segmentation",()=>{
  it("splits at both boundaries of an overlapping caution",()=>{
    const parts=splitTimingWindowAtBoundaries(window,[{start_utc:"2026-10-22T00:20:00Z",end_utc:"2026-10-22T00:40:00Z"}]);
    expect(parts.map(p=>[p.start_utc,p.end_utc])).toEqual([
      ["2026-10-22T00:00:00.000Z","2026-10-22T00:20:00.000Z"],
      ["2026-10-22T00:20:00.000Z","2026-10-22T00:40:00.000Z"],
      ["2026-10-22T00:40:00.000Z","2026-10-22T02:00:00.000Z"]
    ]);
  });
  it("clips transitions outside a window and de-duplicates identical instants",()=>{
    const parts=splitTimingWindowAtBoundaries(window,[{start_utc:"2026-10-21T23:00:00Z",end_utc:"2026-10-22T01:00:00Z"},{start_utc:"2026-10-22T01:00:00Z",end_utc:"2026-10-22T03:00:00Z"}]);
    expect(parts).toHaveLength(2);
    expect(parts[0].end_utc).toBe(parts[1].start_utc);
  });
  it("rejects invalid candidates and ignores malformed changes",()=>{
    expect(splitTimingWindowAtBoundaries({...window,end_utc:window.start_utc},[])).toEqual([]);
    expect(splitTimingWindowAtBoundaries(window,[{start_utc:"invalid",end_utc:"invalid"}])).toHaveLength(1);
  });
});
