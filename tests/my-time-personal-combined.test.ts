import { describe,expect,it } from "vitest";
import { intersectWindows } from "../src/features/my-time/temporal-overlap";
const w=(start:string,end:string)=>({start,end});
describe("My Time half-open interval intersections",()=>{
 it("returns actual intersection",()=>expect(intersectWindows(w("2026-10-21T08:00:00Z","2026-10-21T10:00:00Z"),w("2026-10-21T09:00:00Z","2026-10-21T11:00:00Z"))).toEqual(w("2026-10-21T09:00:00.000Z","2026-10-21T10:00:00.000Z")));
 it("excludes adjacent boundaries",()=>expect(intersectWindows(w("2026-10-21T08:00:00Z","2026-10-21T09:00:00Z"),w("2026-10-21T09:00:00Z","2026-10-21T10:00:00Z"))).toBeNull());
 it("rejects reversed intervals",()=>expect(intersectWindows(w("2026-10-21T10:00:00Z","2026-10-21T09:00:00Z"),w("2026-10-21T08:00:00Z","2026-10-21T11:00:00Z"))).toBeNull());
 it("rejects invalid dates",()=>expect(intersectWindows(w("bad","2026-10-21T09:00:00Z"),w("2026-10-21T08:00:00Z","2026-10-21T11:00:00Z"))).toBeNull());
});
