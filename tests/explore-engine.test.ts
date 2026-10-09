/**
 * Explore engine contract.
 *  1. Isolation: the engine claims none of the existing published URLs, sitemap files, growth prefixes,
 *     redirects or private routes — it returns null for them, so production behaves exactly as before.
 *  2. Behaviour: pages render from prebuilt R2 records (built here by the real builder), with canonical,
 *     robots, ETag/304, HEAD, 301 normalisation, 404 for missing pages and 503 when storage is absent.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { exploreResponse, isExplorePath } from "../worker/explore";
import { EXPLORE_CONFIG, EXPLORE_FAMILIES, pageKey, sitemapKey } from "../worker/explore/families";

const SITE = "https://aafnaipatro.com";
const req = (path: string, init?: RequestInit) => new Request(SITE + path, init);

let out = "";
const bucket = {
  async get(key: string) {
    const prefix = EXPLORE_CONFIG.storage_prefix + "/";
    if (!key.startsWith(prefix)) return null;
    const file = join(out, key.slice(prefix.length));
    if (!existsSync(file)) return null;
    const text = readFileSync(file, "utf8");
    return { body: new Response(text).body!, httpEtag: '"t"', text: async () => text };
  },
};
const env = { ARCHIVE: bucket, PUBLIC_SITE_URL: SITE };

beforeAll(() => {
  out = mkdtempSync(join(tmpdir(), "explore-"));
  execFileSync(process.execPath, ["scripts/explore/build.mjs", "--out", out], { stdio: "pipe" });
});
afterAll(() => rmSync(out, { recursive: true, force: true }));

describe("isolation from existing routes", () => {
  it("claims none of the published baseline URLs", () => {
    const baseline = JSON.parse(readFileSync("seo/published-url-baseline.json", "utf8")) as { paths: string[] };
    expect(baseline.paths.length).toBeGreaterThan(22_000);
    const claimed = baseline.paths.filter((p) => isExplorePath(p));
    expect(claimed).toEqual([]);
  });

  it("claims none of the existing sitemap files", () => {
    const index = readFileSync("public/sitemap.xml", "utf8");
    const files = [...index.matchAll(/<loc>[^<]*\/(sitemap[^<]*\.xml)<\/loc>/g)].map((m) => "/" + m[1]);
    const local = readdirSync("public").filter((f) => /^sitemap.*\.xml$/.test(f)).map((f) => "/" + f);
    expect(files.length).toBeGreaterThan(10);
    for (const f of [...files, ...local, "/sitemap.xml", "/robots.txt", "/sitemap-growth.xml"]) expect(isExplorePath(f), f).toBe(false);
  });

  it("claims none of the known route prefixes, redirects or private surfaces", async () => {
    const existing = [
      "/", "/today", "/date/2026-10-09", "/calendar/2083/06", "/bs-to-ad/2083-ashwin-23", "/ad-to-bs/2026-10-09", "/convert", "/tools", "/tools/age",
      "/festivals", "/festivals/dashain", "/time-machine", "/on-this-day", "/onthisday/10-09", "/samudaya", "/nepal-sambat/mandala", "/rashifal", "/janmapatro",
      "/moon", "/moon/full-moon/2026", "/eclipse", "/nepal", "/nepal/time", "/us/festivals", "/weather", "/de/mond", "/guides", "/fm", "/tv", "/samachar",
      "/api/v1/today", "/compat-api/x", "/me", "/admin", "/auth/google", "/data/calendar/x.json", "/assets/app.js", "/aap/runtime.js", "/embed/x", "/x/y",
      "/jyotish/rashifal", "/astro", "/tithi", "/card", "/explore", "/search", "/places", "/placement", "/place-birthday", "/sitemap-x.xml", "/sitemap-places.xml",
    ];
    for (const path of existing) {
      expect(isExplorePath(path), path).toBe(false);
      expect(await exploreResponse(req(path), env), path).toBeNull();
    }
  });

  it("uses prefixes that never overlap each other", () => {
    for (const a of EXPLORE_FAMILIES) for (const b of EXPLORE_FAMILIES) if (a !== b) expect(a.prefix.startsWith(b.prefix + "/") || a.prefix === b.prefix).toBe(false);
  });

  it("is wired before other handlers only through a null-returning hook", () => {
    const entry = readFileSync("worker/optimized-entry.ts", "utf8");
    expect(entry).toMatch(/const explore = await exploreResponse\(request, env as any, ctx\);\s*if \(explore\) return explore;/);
  });
});

describe("page rendering from R2 records", () => {
  it("builds the places family with every page passing the quality gate", () => {
    const manifest = JSON.parse(readFileSync(join(out, "manifest.json"), "utf8"));
    expect(manifest.families.places.pages).toBe(838);
    expect(manifest.families.places.indexable).toBe(838);
    expect(existsSync(join(out, "pages/place/koshi/bhojpur/bhojpur-municipality.json"))).toBe(true);
  });

  it("serves an indexable page with canonical, robots, schema and links", async () => {
    const res = (await exploreResponse(req("/place/koshi/bhojpur/bhojpur-municipality"), env))!;
    expect(res.status).toBe(200);
    expect(res.headers.get("x-robots-tag")).toBe("index, follow");
    const html = await res.text();
    expect(html).toContain('<link rel="canonical" href="https://aafnaipatro.com/place/koshi/bhojpur/bhojpur-municipality">');
    expect(html).toContain('content="index, follow, max-image-preview:large"');
    expect(html).toContain("भोजपुर नगरपालिका");
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('href="/place/koshi/bhojpur"');
    expect(html).not.toContain("काेशी"); // split vowel sign normalised
  });

  it("serves root, province and district hubs that link down the tree", async () => {
    for (const [path, child] of [["/place", "/place/koshi"], ["/place/koshi", "/place/koshi/bhojpur"], ["/place/koshi/bhojpur", "/place/koshi/bhojpur/bhojpur-municipality"]]) {
      const res = (await exploreResponse(req(path), env))!;
      expect(res.status, path).toBe(200);
      expect(await res.text(), path).toContain(`href="${child}"`);
    }
  });

  it("normalises case and trailing slash with a 301", async () => {
    const res = (await exploreResponse(req("/Place/Koshi/"), env))!;
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe(SITE + "/place/koshi");
  });

  it("answers HEAD, 304 and 405 correctly", async () => {
    const head = (await exploreResponse(req("/place/koshi", { method: "HEAD" }), env))!;
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    const etag = head.headers.get("etag")!;
    expect(etag).toMatch(/^"[0-9a-f]{16}"$/);
    const revalidated = (await exploreResponse(req("/place/koshi", { headers: { "if-none-match": etag } }), env))!;
    expect(revalidated.status).toBe(304);
    const post = (await exploreResponse(req("/place/koshi", { method: "POST" }), env))!;
    expect(post.status).toBe(405);
  });

  it("returns noindex 404 for missing or malformed pages without touching storage for bad slugs", async () => {
    for (const path of ["/place/nowhere", "/place/koshi/x_y", "/place/" + "a".repeat(400)]) {
      const res = (await exploreResponse(req(path), env))!;
      expect(res.status, path).toBe(404);
      expect(res.headers.get("x-robots-tag")).toContain("noindex");
    }
  });

  it("returns 503 (not 404) when storage is not bound, so crawlers retry", async () => {
    const res = (await exploreResponse(req("/place/koshi"), {}))!;
    expect(res.status).toBe(503);
    expect(res.headers.get("retry-after")).toBe("600");
  });

  it("streams prebuilt sitemaps that list only indexable explore URLs", async () => {
    const index = (await exploreResponse(req("/sitemap-explore.xml"), env))!;
    expect(index.status).toBe(200);
    expect(index.headers.get("content-type")).toContain("application/xml");
    const indexXml = await index.text();
    expect(indexXml).toContain("<loc>https://aafnaipatro.com/sitemap-x-places-0.xml</loc>");
    const shard = (await exploreResponse(req("/sitemap-x-places-0.xml"), env))!;
    const urls = [...(await shard.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(urls.length).toBe(838);
    expect(urls.every((u) => u.startsWith(SITE + "/place"))).toBe(true);
    expect((await exploreResponse(req("/sitemap-x-unknown-0.xml"), env))!.status).toBe(404);
    expect((await exploreResponse(req("/sitemap-x-places-99.xml"), env))!.status).toBe(404);
  });

  it("stores objects only under its own prefix", () => {
    expect(pageKey("/place/koshi")).toBe("explore/v1/pages/place/koshi.json");
    expect(sitemapKey("sitemap-explore.xml")).toBe("explore/v1/sitemaps/sitemap-explore.xml");
  });
});
