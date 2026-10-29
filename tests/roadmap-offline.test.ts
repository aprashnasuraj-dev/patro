import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read=(p:string)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

describe("Nepal district offline-pack contract",()=>{
  it("fails a save when any required resource was not cached",()=>{
    const sw=read("scripts/explore/nepal/map/offline-sw.js");
    const ui=read("scripts/explore/nepal/map/offline.js");
    expect(sw).toContain('error:"offline pack incomplete"');
    expect(sw).toContain("failed.push");
    expect(ui).toContain("Array.isArray(e.data.failed)");
  });

  it("can serve cached same-origin vendor and data resources to a controlled offline map",()=>{
    const sw=read("scripts/explore/nepal/map/offline-sw.js");
    expect(sw).not.toContain('url.origin!==self.location.origin||!url.pathname.startsWith("/nepalmap/")');
    expect(sw).toContain('url.pathname.startsWith("/vendor/nepalmap/")');
    expect(sw).toContain('url.pathname.startsWith("/data/nepalmap/")');
  });

  it("boots the explicit no-basemap offline style without trying terrain or PMTiles",()=>{
    const app=read("scripts/explore/nepal/map/app.js");
    expect(app).toContain("navigator.onLine === false");
    expect(app).toContain("Offline district pack · no basemap tiles");
    expect(app).toContain("!offlineStyle && CFG.flags && CFG.flags.nepalTerrain");
    expect(app).toContain("!offlineStyle && CFG.flags && CFG.flags.nepalPmtiles");
  });
});
