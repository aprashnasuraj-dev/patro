/**
 * Places-calendar route contract (worker/places-calendar.ts):
 *  1. Isolation: claims none of the published URLs, existing sitemaps, app routes or other handlers' prefixes.
 *  2. Behaviour: directory pages from R2 (pc/v1/<path>index.html), 301 to the trailing slash, assets with the
 *     right content type, 404 for missing keys, 503 when storage is not bound, ETag/304, HEAD, 405.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isPlacesCalendarPath, PC_STORAGE_PREFIX, placesCalendarResponse } from "../worker/places-calendar";
import { isExplorePath } from "../worker/explore";

const SITE = "https://aafnaipatro.com";
const req = (path: string, init?: RequestInit) => new Request(SITE + path, init);
const objects = new Map<string, string>([
  [`${PC_STORAGE_PREFIX}/kati/1-tola-kati-gram/index.html`, "<!doctype html><title>1 tola kati gram</title>"],
  [`${PC_STORAGE_PREFIX}/ne/kati/1-tola-kati-gram/index.html`, "<!doctype html><title>१ तोला कति ग्राम</title>"],
  [`${PC_STORAGE_PREFIX}/static/places/places.css`, "body{}"],
  [`${PC_STORAGE_PREFIX}/sitemap-places.xml`, "<sitemapindex/>"],
  [`${PC_STORAGE_PREFIX}/sitemaps/kati-1.xml`, "<urlset/>"],
]);
const bucket = {
  async get(key: string) {
    const text = objects.get(key);
    return text == null ? null : { body: new Response(text).body!, httpEtag: '"e1"' };
  },
};
const env = { ARCHIVE: bucket };

describe("isolation from existing routes", () => {
  it("claims none of the published baseline URLs or existing sitemap files", () => {
    const baseline = JSON.parse(readFileSync("seo/published-url-baseline.json", "utf8")) as { paths: string[] };
    expect(baseline.paths.filter((p) => isPlacesCalendarPath(p))).toEqual([]);
    const sitemaps = readdirSync("public").filter((f) => /^sitemap.*\.xml$/.test(f)).map((f) => "/" + f);
    for (const f of [...sitemaps, "/sitemap.xml", "/robots.txt"]) expect(isPlacesCalendarPath(f), f).toBe(false);
  });

  it("claims none of the app's routes, other handlers' prefixes or files in dist", async () => {
    const existing = ["/", "/today", "/date/2026-10-09", "/festivals", "/festivals/dashain/2083", "/places", "/place", "/nepal", "/nepal/time", "/janmapatro",
      "/tools/age", "/rashifal", "/moon", "/assets/app.js", "/data/calendar/x.json", "/static", "/kat", "/katiharu", "/mountain", "/trek", "/neo", "/ne", "/sitemap-explore.xml"];
    for (const path of existing) {
      expect(isPlacesCalendarPath(path), path).toBe(false);
      expect(await placesCalendarResponse(req(path), env), path).toBeNull();
    }
    for (const path of ["/kati/x/", "/ne/janma/2060/", "/shraddha/x/", "/mountains/everest/", "/treks/x/"]) expect(isExplorePath(path), path).toBe(false);
    if (existsSync("dist")) for (const name of ["kati", "janma", "shraddha", "mountains", "treks", "og", "places-data", "sitemaps", "sitemap-places.xml"]) expect(existsSync(`dist/${name}`), name).toBe(false);
    expect(existsSync("dist/static/places")).toBe(false);
  });

  it("is wired through a null-returning hook", () => {
    const entry = readFileSync("worker/optimized-entry.ts", "utf8");
    expect(entry).toMatch(/const placesCalendar = await placesCalendarResponse\(request, env as any, ctx\);\s*if \(placesCalendar\) return placesCalendar;/);
  });
});

describe("serving from R2", () => {
  it("serves a page, its Nepali twin, assets and sitemaps with the right types", async () => {
    const page = (await placesCalendarResponse(req("/kati/1-tola-kati-gram/"), env))!;
    expect(page.status).toBe(200);
    expect(page.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await page.text()).toContain("1 tola kati gram");
    expect((await placesCalendarResponse(req("/ne/kati/1-tola-kati-gram/"), env))!.status).toBe(200);
    expect((await placesCalendarResponse(req("/static/places/places.css"), env))!.headers.get("content-type")).toContain("text/css");
    expect((await placesCalendarResponse(req("/sitemap-places.xml"), env))!.headers.get("content-type")).toContain("application/xml");
    expect((await placesCalendarResponse(req("/sitemaps/kati-1.xml"), env))!.status).toBe(200);
  });

  it("adds the trailing slash with a 301 and 404s missing pages", async () => {
    const r = (await placesCalendarResponse(req("/kati/1-tola-kati-gram?x=1"), env))!;
    expect(r.status).toBe(301);
    expect(r.headers.get("location")).toBe(SITE + "/kati/1-tola-kati-gram/");
    const missing = (await placesCalendarResponse(req("/kati/nope/"), env))!;
    expect(missing.status).toBe(404);
    expect(missing.headers.get("x-robots-tag")).toBe("noindex");
    expect(await placesCalendarResponse(req("/kati/../etc/"), env)).toBeNull(); // URL parser resolves to /etc/, not ours
  });

  it("answers HEAD, 304, 405 and 503 without storage", async () => {
    const head = (await placesCalendarResponse(req("/kati/1-tola-kati-gram/", { method: "HEAD" }), env))!;
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect((await placesCalendarResponse(req("/kati/1-tola-kati-gram/", { headers: { "if-none-match": '"e1"' } }), env))!.status).toBe(304);
    expect((await placesCalendarResponse(req("/kati/1-tola-kati-gram/", { method: "POST" }), env))!.status).toBe(405);
    expect((await placesCalendarResponse(req("/kati/1-tola-kati-gram/"), {}))!.status).toBe(503);
  });
});
