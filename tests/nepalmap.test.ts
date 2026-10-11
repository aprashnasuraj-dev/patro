/**
 * Nepal map (/nepalmap) contract: static pages + data built by scripts/explore/nepal/build-map.mjs.
 *  - new URLs only (nothing in the published baseline), each page unique and indexable with a canonical;
 *  - every place links to a ward/palika/district page that the /nepal explore family really builds;
 *  - the relaxed CSP (OpenFreeMap tiles, MapLibre CSS) applies to /nepalmap only; the site-wide CSP is untouched.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let out = "";
beforeAll(() => {
  out = mkdtempSync(join(tmpdir(), "nepalmap-"));
  execFileSync(process.execPath, ["scripts/explore/nepal/build-map.mjs", "--out", out], { stdio: "pipe" });
}, 120_000);
afterAll(() => rmSync(out, { recursive: true, force: true }));

const LANDINGS = ["temples", "gumbas", "mosques", "churches", "religious-places", "mountains", "lakes", "waterfalls", "heritage-sites", "national-parks", "airports", "villages", "schools", "hospitals", "banks", "hotels"];

describe("Nepal map pages", () => {
  it("builds the map page and one landing page per kind of place, all new URLs", () => {
    const baseline = new Set((JSON.parse(readFileSync("seo/published-url-baseline.json", "utf8")) as { paths: string[] }).paths);
    const titles = new Set<string>();
    for (const path of ["/nepalmap", ...LANDINGS.map((s) => `/nepalmap/${s}`)]) {
      expect(baseline.has(path), path).toBe(false);
      const file = path === "/nepalmap" ? join(out, "nepalmap.html") : join(out, `${path.slice(1)}.html`);
      const html = readFileSync(file, "utf8");
      expect(html).toContain(`<link rel="canonical" href="https://aafnaipatro.com${path}">`);
      expect(html).toContain('content="index, follow');
      const title = html.match(/<title>([^<]+)<\/title>/)![1];
      expect(titles.has(title), title).toBe(false);
      titles.add(title);
      expect(html).toContain("maplibre-gl@4.7.1");
      expect(html).toContain("OpenStreetMap contributors");
    }
    const sitemap = readFileSync(join(out, "sitemap-nepalmap.xml"), "utf8");
    expect([...sitemap.matchAll(/<loc>/g)].length).toBe(LANDINGS.length + 1);
  });

  it("ships compact layer files with thousands of places, each tied to a district", () => {
    const worship = JSON.parse(readFileSync(join(out, "data/nepalmap/v1/worship.json"), "utf8"));
    expect(worship.fields.slice(0, 4)).toEqual(["name", "name_ne", "lat", "lng"]);
    expect(worship.rows.length).toBeGreaterThan(5_000);
    expect(worship.rows.filter((r: unknown[]) => r[4] === "hindu").length).toBeGreaterThan(1_000);
    expect(worship.rows.filter((r: unknown[]) => r[4] === "buddhist").length).toBeGreaterThan(300);
    for (const r of worship.rows) {
      expect(r[2]).toBeGreaterThan(26);
      expect(r[2]).toBeLessThan(31);
      expect(r[8]).toBeGreaterThan(0);
    }
    const admin = JSON.parse(readFileSync(join(out, "data/nepalmap/v1/admin.json"), "utf8"));
    expect(admin.districts.length).toBe(77);
    expect(Object.keys(admin.palikas).length).toBe(753);
    expect(Object.keys(admin.wards).length).toBeGreaterThan(6_500);
  });

  it("links places only to ward pages that exist in the /nepal family", () => {
    const html = readFileSync(join(out, "nepalmap/gumbas.html"), "utf8");
    const links = [...html.matchAll(/href="(\/nepal\/[a-z0-9-]+\/[a-z0-9-]+\/ward-\d+)"/g)].map((m) => m[1]);
    expect(links.length).toBeGreaterThan(100);
    const admin = JSON.parse(readFileSync(join(out, "data/nepalmap/v1/admin.json"), "utf8"));
    const valid = new Set<string>();
    const districtPath = new Map(admin.districts.map((d: { id: number; path: string }) => [d.id, d.path]));
    for (const p of Object.values(admin.palikas) as [string, string, string, number, number][]) for (let n = 1; n <= p[4]; n++) valid.add(`${districtPath.get(p[3])}/${p[0]}/ward-${n}`);
    for (const l of links) expect(valid.has(l), l).toBe(true);
  });

  it("relaxes the CSP for /nepalmap only and serves it as static assets", () => {
    const headers = readFileSync("public/_headers", "utf8");
    const global = headers.split(/\n\n/)[0];
    expect(global).not.toContain("openfreemap");
    const block = headers.slice(headers.indexOf("\n/nepalmap\n"));
    expect(block).toContain("! Content-Security-Policy");
    expect(block).toContain("connect-src 'self' https://tiles.openfreemap.org");
    const wrangler = readFileSync("wrangler.jsonc", "utf8");
    for (const rule of ['"!/nepalmap"', '"!/nepalmap/*"', '"!/sitemap-nepalmap.xml"']) expect(wrangler).toContain(rule);
    expect(existsSync("scripts/explore/nepal/map/app.js")).toBe(true);
  });

  it("offers From → To routes with places along the way", () => {
    const html = readFileSync(join(out, "nepalmap.html"), "utf8");
    for (const id of ['data-tab="route"', 'id="np-from"', 'id="np-to"', 'data-mode="car"', 'data-mode="foot"', 'id="np-along"', 'id="np-steps"', "routing.openstreetmap.de"]) expect(html, id).toContain(id);
    const app = readFileSync("scripts/explore/nepal/map/app.js", "utf8");
    // Router: OSRM on the FOSSGIS servers (CORS, no key); the CSP must allow exactly that origin.
    expect(app).toContain("https://routing.openstreetmap.de/");
    expect(app).toContain('data-route="from"');
    const headers = readFileSync("public/_headers", "utf8");
    const block = headers.slice(headers.indexOf("\n/nepalmap\n"));
    expect(block).toContain("https://routing.openstreetmap.de");
    expect(headers.split(/\n\n/)[0]).not.toContain("routing.openstreetmap.de");
  });
});
