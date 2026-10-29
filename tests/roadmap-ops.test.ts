import { describe, expect, it, vi } from "vitest";
import { logDependency, logRoadmapHttp, nepalPathGroup, roadmapPathGroup } from "../worker/roadmap/ops";

describe("roadmap SLO logging", () => {
  it("normalizes high-cardinality Nepal API IDs", () => {
    expect(nepalPathGroup("/api/nepal/v1/place/01ABCDEF")).toBe("/api/nepal/v1/place/:id");
    expect(nepalPathGroup("/api/nepal/v1/corrections/1234")).toBe("/api/nepal/v1/corrections/:id");
    expect(nepalPathGroup("/api/nepal/v1/places")).toBe("/api/nepal/v1/places");
  });

  it("normalizes Bali date/month/year/Wuku/feed URL families", () => {
    expect(roadmapPathGroup("/bali-calendar/2027-03-08")).toBe("/bali-calendar/:date");
    expect(roadmapPathGroup("/bali-calendar/bulan/2027-03")).toBe("/bali-calendar/bulan/:month");
    expect(roadmapPathGroup("/bali-calendar/hari-raya/2027")).toBe("/bali-calendar/hari-raya/:year");
    expect(roadmapPathGroup("/bali-calendar/wuku/watugunung")).toBe("/bali-calendar/wuku/:wuku");
    expect(roadmapPathGroup("/bali-calendar/feed/hari-raya/2027.ics")).toBe("/bali-calendar/feed/hari-raya/:year.ics");
  });

  it("logs bounded HTTP and dependency fields without raw URLs", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    logRoadmapHttp({ product:"nepalmap", surface:"api", pathname:"/api/nepal/v1/place/SECRET", method:"GET", status:200, duration_ms:12.34 });
    logDependency({ product:"nepalmap", dependency:"bipad", operation:"incident", outcome:"ok", status:200, duration_ms:55.1 });
    expect(spy).toHaveBeenCalledTimes(2);
    const http = spy.mock.calls[0][0] as any;
    expect(http.path_group).toBe("/api/nepal/v1/place/:id");
    expect(JSON.stringify(http)).not.toContain("SECRET");
    const dep = spy.mock.calls[1][0] as any;
    expect(dep).toMatchObject({ event:"roadmap_dependency", dependency:"bipad", outcome:"ok" });
    spy.mockRestore();
  });
});
