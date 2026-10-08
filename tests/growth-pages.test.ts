import {festivalTiming} from "../src/home-festival-label";
/**
 * Growth pages: correctness against independent references (see seo-growth/research/validation-log.md).
 * References: almanac.com (full moons, ET), timeanddate.com (NYC moonrise), Drik Panchang New York 2026
 * (Diwali week, Karwa Chauth, Raksha Bandhan, Ekadashi dates + parana).
 */
import { describe, expect, it } from "vitest";
import { CITY_BY_SLUG } from "../worker/growth/cities";
import { fullMoonsOfYear, moonRiseSet } from "../worker/growth/moon";
import { moonPageResponse, moonRoutes } from "../worker/growth/moon-pages";
import { ekadashisOfYear, FESTIVAL_BY_SLUG, festivalTimings } from "../worker/growth/us-festivals";
import { usFestivalPageResponse, usFestivalRoutes } from "../worker/growth/us-festival-pages";
import { zonedMidnight } from "../src/patro-tools/core/astro";

const NY = CITY_BY_SLUG.get("new-york")!;
const et = (d: Date) => new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
const minutesApart = (a: Date, isoLocal: string) => Math.abs(a.getTime() - new Date(isoLocal).getTime()) / 60_000;

describe("moon", () => {
  it("2026 full moons match almanac.com (Eastern time) within 2 minutes", () => {
    const ref = ["2026-01-03T05:03-05:00", "2026-02-01T17:09-05:00", "2026-03-03T06:38-05:00", "2026-04-01T22:12-04:00", "2026-05-01T13:23-04:00", "2026-05-31T04:45-04:00", "2026-06-29T19:56-04:00", "2026-07-29T10:35-04:00", "2026-08-28T00:18-04:00", "2026-09-26T12:49-04:00", "2026-10-26T00:11-04:00", "2026-11-24T09:53-05:00", "2026-12-23T20:28-05:00"];
    const fm = fullMoonsOfYear(2026);
    expect(fm).toHaveLength(13);
    fm.forEach((f, i) => expect(minutesApart(f.instant, ref[i])).toBeLessThan(2));
    expect(fm[5].usName).toBe("Blue Moon");
    expect(fm[8].eclipse?.kind).toBe("partial");
    expect(fm[2].eclipse?.kind).toBe("total");
    expect(fm.find((f) => f.usName === "Hunter's Moon")?.hinduMonth.roman).toBe("Ashwin");
  });
  it("NYC moonrise/moonset matches timeanddate.com", () => {
    const rs = moonRiseSet("2026-10-08", NY, zonedMidnight);
    expect(et(rs.rise!)).toContain("04:45");
    expect(et(rs.set!)).toContain("17:21");
  });
  it("every sitemap route renders 200", async () => {
    const now = new Date("2026-10-08T14:00:00Z");
    for (const r of moonRoutes(now)) {
      const res = await moonPageResponse(new Request("https://aafnaipatro.com" + r), {}, now);
      expect(res?.status, r).toBe(200);
    }
  }, 120_000);
});

describe("US festivals (Drik Panchang New York 2026)", () => {
  const date = (slug: string) => festivalTimings(FESTIVAL_BY_SLUG.get(slug)!, 2026, NY)[0];
  it("Diwali week", () => {
    expect(date("dhanteras").date).toBe("2026-11-06");
    expect(date("narak-chaturdashi").date).toBe("2026-11-07");
    expect(date("diwali").date).toBe("2026-11-08");
    expect(date("govardhan-puja").date).toBe("2026-11-09");
    expect(date("bhai-dooj").date).toBe("2026-11-10");
  });
  it("Karwa Chauth is a day earlier in the US than in India", () => {
    expect(date("karwa-chauth").date).toBe("2026-10-28");
    expect(festivalTimings(FESTIVAL_BY_SLUG.get("karwa-chauth")!, 2026, CITY_BY_SLUG.get("delhi")!)[0].date).toBe("2026-10-29");
  });
  it("Raksha Bandhan aparahna + Bhadra", () => {
    const x = date("raksha-bandhan");
    expect(x.date).toBe("2026-08-27");
    expect(minutesApart(x.window!.start, "2026-08-27T14:17-04:00")).toBeLessThan(3);
    expect(minutesApart(x.bhadraEnd!, "2026-08-27T11:58-04:00")).toBeLessThan(3);
  });
  it("all 24 Ekadashi dates and parana windows", () => {
    const ek = ekadashisOfYear(2026, NY);
    expect(ek.map((e) => e.date.slice(5))).toEqual(["01-14", "01-28", "02-12", "02-27", "03-14", "03-28", "04-13", "04-27", "05-12", "05-26", "06-11", "06-25", "07-10", "07-24", "08-08", "08-23", "09-06", "09-22", "10-06", "10-21", "11-04", "11-20", "12-04", "12-19"]);
    const pap = ek.find((e) => e.date === "2026-10-21")!;
    expect(minutesApart(pap.parana.start, "2026-10-22T13:45-04:00")).toBeLessThan(3);
    expect(minutesApart(pap.parana.end, "2026-10-22T15:55-04:00")).toBeLessThan(3);
    expect(ek.find((e) => e.date === "2026-09-06")!.vaishnavaDate).toBe("2026-09-07");
  });
  it("every sitemap route renders 200 and unverified festivals are noindex", async () => {
    const now = new Date("2026-10-08T14:00:00Z");
    for (const r of usFestivalRoutes(now)) {
      const res = await usFestivalPageResponse(new Request("https://aafnaipatro.com" + r), {}, now);
      expect(res?.status, r).toBe(200);
      expect(res?.headers.get("x-robots-tag"), r).toBe("index, follow");
    }
    const prov = await usFestivalPageResponse(new Request("https://aafnaipatro.com/us/holika-dahan-2027"), {}, now);
    expect(prov?.headers.get("x-robots-tag")).toBe("noindex, follow");
  }, 120_000);
});

describe("Nepal weather pages (Open-Meteo fixture)", () => {
  it("renders today/tomorrow with BS dates, falls back to 503 noindex on upstream failure", async () => {
    const { readFileSync } = await import("node:fs");
    const { weatherPageResponse, weatherRoutes } = await import("../worker/growth/weather-pages");
    const fixture = readFileSync(new URL("./fixtures/open-meteo-kathmandu-2026-10-08.json", import.meta.url), "utf8");
    const realFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async () => new Response(fixture, { status: 200, headers: { "content-type": "application/json" } })) as any;
      const res = await weatherPageResponse(new Request("https://aafnaipatro.com/weather/kathmandu"), {});
      expect(res?.status).toBe(200);
      const html = await res!.text();
      expect(html).toContain("काठमाडौंको मौसम");
      expect(html).toContain("२३ असोज २०८३"); // 2026-10-09 = Asoj 23, 2083 (tomorrow)
      expect(html).toContain("मेघगर्जन"); // thunderstorm code 95 today
      globalThis.fetch = (async () => new Response("down", { status: 500 })) as any;
      const fail = await weatherPageResponse(new Request("https://aafnaipatro.com/weather/pokhara"), {});
      expect(fail?.status).toBe(503);
      expect(fail?.headers.get("x-robots-tag")).toContain("noindex");
      expect(weatherRoutes().length).toBe(38);
    } finally { globalThis.fetch = realFetch; }
  });
});

describe("global pages (eclipse, localized moon, Nepal for the world)", () => {
  it("2 Aug 2027 eclipse local circumstances match timeanddate / published values", async () => {
    const { ECLIPSE_CITIES, localSolar, solarEclipsesBetween } = await import("../worker/growth/eclipse");
    const ec = solarEclipsesBetween(2027, 2027).find((e) => e.date === "2027-08-02")!;
    expect(ec.kind).toBe("total");
    const at = (slug: string) => localSolar(ec.peak, ECLIPSE_CITIES.find((c) => c.slug === slug)!);
    expect(Math.abs(at("cadiz").totalitySeconds - 176)).toBeLessThanOrEqual(5); // timeanddate: 2 min 56 s
    expect(Math.abs(at("luxor").totalitySeconds - 383)).toBeLessThanOrEqual(5); // published ≈ 6 min 23 s
    expect(at("madrid").kind).toBe("partial");
    expect(at("new-york").visible).toBe(false);
  });
  it("every global sitemap route renders 200 + indexable, with hreflang on localized pages", async () => {
    const { readFileSync } = await import("node:fs");
    const { growthPageResponse, growthSitemapRoutes } = await import("../worker/growth/index");
    const fixture = readFileSync(new URL("./fixtures/open-meteo-kathmandu-2026-10-08.json", import.meta.url), "utf8");
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (u: string) => {
      const lats = (new URL(String(u)).searchParams.get("latitude") || "").split(",");
      const many = lats.length > 1;
      const n = lats.length;
      return new Response(many ? JSON.stringify(Array.from({ length: n }, () => JSON.parse(fixture))) : fixture, { status: 200 });
    }) as any;
    try {
      for (const r of growthSitemapRoutes(new Date())) {
        const res = await growthPageResponse(new Request("https://aafnaipatro.com" + r), { GROWTH_DYNAMIC: "1" });
        expect(res?.status, r).toBe(200);
        expect(res?.headers.get("x-robots-tag"), r).toBe("index, follow");
      }
      const de = await (await growthPageResponse(new Request("https://aafnaipatro.com/de/mond"), { GROWTH_DYNAMIC: "1" }))!.text();
      expect(de).toContain('hreflang="fr"');
      expect(de).toContain('<html lang="de"');
      const year = await (await growthPageResponse(new Request("https://aafnaipatro.com/nepal/year"), { GROWTH_DYNAMIC: "1" }))!.text();
      expect(year).toMatch(/It's 20\d\d/);
      const time = await (await growthPageResponse(new Request("https://aafnaipatro.com/nepal/time"), { GROWTH_DYNAMIC: "1" }))!.text();
      expect(time).toContain("UTC+5:45");
    } finally { globalThis.fetch = realFetch; }
  }, 300_000);
});

describe("Cloudflare Free plan (static default)", () => {
  it("prerenders every sitemap route to a static file with no D1/KV/R2 and no server fetch", async () => {
    const { growthStaticPages, growthSitemapRoutes } = await import("../worker/growth/index");
    const realFetch = globalThis.fetch;
    let fetched = 0;
    globalThis.fetch = (async () => { fetched++; return new Response("{}", { status: 500 }); }) as any;
    try {
      const now = new Date();
      const pages = await growthStaticPages(now);
      expect(pages.length).toBe(growthSitemapRoutes(now).length);
      expect(pages.length).toBeLessThan(20_000 - 500); // Static Assets file limit per version (Free)
      expect(fetched).toBe(0); // weather is fetched by the browser, not at build/request time
      for (const p of pages) {
        expect(p.file, p.route).toBe(p.route.slice(1) + ".html");
        expect(p.html, p.route).toContain("<!doctype html");
      }
      const moon = pages.find((p) => p.route === "/moon")!.html;
      expect(moon).toContain('id="moon-live"');
      const wx = pages.find((p) => p.route.startsWith("/weather/"))!.html;
      expect(wx).toContain("api.open-meteo.com");
    } finally { globalThis.fetch = realFetch; }
  }, 300_000);

  it("Worker fallback is cheap: proxies the asset, redirects, or 404s without rendering", async () => {
    const { growthPageResponse } = await import("../worker/growth/index");
    const seen: string[] = [];
    const ASSETS = { fetch: async (r: Request) => { seen.push(new URL(r.url).pathname); return new URL(r.url).pathname === "/moon" ? new Response("static", { status: 200 }) : new Response("nf", { status: 404 }); } };
    const env: any = new Proxy({ ASSETS }, { get(t: any, k) { if (k === "DB" || k === "CACHE" || k === "ARCHIVE") throw new Error("binding used: " + String(k)); return t[k]; } });
    const go = (path: string, method = "GET") => growthPageResponse(new Request("https://aafnaipatro.com" + path, { method }), env);
    expect(await (await go("/moon"))!.text()).toBe("static");
    const slash = (await go("/Moon/"))!;
    expect(slash.status).toBe(301);
    expect(slash.headers.get("location")).toBe("https://aafnaipatro.com/moon");
    const hub = (await go("/us"))!;
    expect(hub.status).toBe(302);
    expect(hub.headers.get("location")).toBe("https://aafnaipatro.com/us/festivals");
    const miss = (await go("/moon/full-moon/1999"))!;
    expect(miss.status).toBe(404);
    expect(miss.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(await go("/calendar")).toBeNull();
    expect(await go("/moon", "POST")).toBeNull();
    expect(seen).toEqual(["/moon", "/moon/full-moon/1999"]);
  });

  it("wrangler config keeps growth paths out of run_worker_first", async () => {
    const { readFileSync } = await import("node:fs");
    const cfg = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
    for (const x of ["!/moon/*", "!/eclipse/*", "!/nepal/*", "!/us/*", "!/weather/*", "!/de/*", "!/fr/*", "!/es/*", "!/it/*"]) expect(cfg).toContain(`"${x}"`);
  });
});


it("standalone shell resources bypass the Worker through static assets", async () => {
 const {shell}=await import("../worker/growth/html");
 const html=await shell(new Request("https://aafnaipatro.com/moon"),{}, {title:"Moon",description:"Phase",body:"Moon"}).text();
 expect(html).toContain('href="/assets/growth-favicon-v1.svg"');
 expect(html).toContain('content="https://aafnaipatro.com/assets/growth-og-default-v1.png"');
 expect(html).toContain('url("/assets/growth-nepali-serif-700-v1.woff2")');
 expect(html).not.toContain('href="/favicon.svg"');
});

it('labels festivals by actual BS date and Nepal calendar-day distance',()=>{
 expect(festivalTiming('2026-10-08','2026-10-08','ne')).toMatch(/असोज [०-९]+ · आज$/);
 expect(festivalTiming('2026-10-09','2026-10-08','ne')).toMatch(/असोज [०-९]+ · भोलि$/);
 expect(festivalTiming('2026-10-11','2026-10-08','ne')).toMatch(/असोज [०-९]+ · ३ दिनमा$/);
});
