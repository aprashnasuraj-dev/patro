/**
 * World-calendar families: isolation from every existing route + correctness against published references.
 * References and test vectors: docs/worldcal/RESEARCH.md (research notes, Oct 2026).
 */
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isWorldcalPath, render, worldcalResponse } from "../worker/worldcal";
import { FAMILIES } from "../worker/worldcal/config";
import { gregorianToJdn, jdnToIso, isoToJdn, zonedTimeToUtc } from "../worker/worldcal/dates";
import { orthodoxEaster } from "../worker/worldcal/engines/easter";
import { bahireHasab, ethiopianClock, ethiopianHolidays, ethToJdn, fasikaJdnForGregorianYear, formatEthAm, geezNumeral, gregorianToEth, jdnToEth } from "../worker/worldcal/engines/ethiopic";
import { pawukon, pawukonEvents, pawukonHolidaysInYear, weton, wetonJodoh } from "../worker/worldcal/engines/pawukon";
import { moonDay, tropicalSign } from "../worker/worldcal/engines/moon";
import { countryBySlug, NAMEDAY_COUNTRIES, namesOn } from "../worker/worldcal/namedays";
import { isExplorePath } from "../worker/explore";
import { isGrowthPath } from "../worker/growth";

const SITE = "https://aafnaipatro.com";
const NOW = new Date("2026-10-10T06:00:00Z");
const get = (p: string) => { const u = new URL(SITE + p); return render(u.pathname, u, SITE, NOW); };

describe("isolation from existing routes", () => {
  it("claims none of the published baseline URLs", () => {
    const baseline = JSON.parse(readFileSync("seo/published-url-baseline.json", "utf8")) as { paths: string[] };
    expect(baseline.paths.length).toBeGreaterThan(22_000);
    expect(baseline.paths.filter((p) => isWorldcalPath(p))).toEqual([]);
  });

  it("claims none of the existing sitemap files or robots", () => {
    const index = readFileSync("public/sitemap.xml", "utf8");
    const files = [...index.matchAll(/<loc>[^<]*\/(sitemap[^<]*\.xml)<\/loc>/g)].map((m) => "/" + m[1]);
    const local = readdirSync("public").filter((f) => /^sitemap.*\.xml$/.test(f)).map((f) => "/" + f);
    for (const f of [...files, ...local, "/sitemap.xml", "/robots.txt", "/sitemap-explore.xml", "/sitemap-x-places-0.xml", "/sitemap-growth.xml", "/sitemap-atlas.xml"]) expect(isWorldcalPath(f), f).toBe(false);
  });

  it("does not overlap explore, growth or known prefixes", async () => {
    for (const f of Object.values(FAMILIES)) {
      expect(isExplorePath(f.prefix), f.prefix).toBe(false);
      expect(isGrowthPath(f.prefix), f.prefix).toBe(false);
    }
    const existing = ["/", "/today", "/date/2026-10-10", "/calendar/2083/06", "/festivals", "/festivals/dashain", "/tools/age", "/moon", "/de/mond", "/es/luna", "/it/luna", "/eclipse",
      "/nepal", "/weather", "/us/festivals", "/samudaya/hijri", "/rashifal", "/janmapatro", "/place", "/atlas", "/atlas/kathmandu/2026-10-10", "/api/v1/today", "/me", "/admin", "/name", "/names", "/calendar-lunar", "/mondphase"];
    for (const p of existing) {
      expect(isWorldcalPath(p), p).toBe(false);
      expect(await worldcalResponse(new Request(SITE + p), {}), p).toBeNull();
    }
  });

  it("is wired into the production entry through a null-returning hook", () => {
    const entry = readFileSync("worker/optimized-entry.ts", "utf8");
    expect(entry).toMatch(/const worldcal = await worldcalResponse\(request, env as any, ctx\);\s*if \(worldcal\) return worldcal;/);
  });
});

describe("Ethiopian calendar", () => {
  it("matches ICU/CLDR ethiopic for every day 1890–2109", () => {
    const f = new Intl.DateTimeFormat("en-u-ca-ethiopic", { timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric" });
    let bad = 0;
    for (let j = gregorianToJdn(1890, 1, 1), end = gregorianToJdn(2109, 12, 31); j <= end; j += 1) {
      const [y, m, d] = jdnToIso(j).split("-").map(Number);
      const parts = f.formatToParts(new Date(Date.UTC(y, m - 1, d)));
      const n = (t: string) => Number(parts.find((p) => p.type === t)!.value);
      const e = jdnToEth(j);
      if (e.year !== n("year") || e.month !== n("month") || e.day !== n("day")) bad++;
    }
    expect(bad).toBe(0);
  });

  it("reproduces the cited test vectors", () => {
    const v: [string, number, number, number][] = [["2026-10-10", 2019, 1, 30], ["2026-06-06", 2018, 9, 29], ["2022-09-11", 2015, 1, 1], ["2026-01-07", 2018, 4, 29], ["2026-01-19", 2018, 5, 11],
      ["2026-04-12", 2018, 8, 4], ["2026-09-27", 2019, 1, 17], ["2027-09-11", 2019, 13, 6], ["2027-09-12", 2020, 1, 1], ["2027-09-28", 2020, 1, 17], ["2007-09-12", 2000, 1, 1], ["2100-03-01", 2092, 6, 21]];
    for (const [iso, y, m, d] of v) {
      expect(jdnToEth(isoToJdn(iso)), iso).toEqual({ year: y, month: m, day: d });
      expect(jdnToIso(ethToJdn(y, m, d)), iso).toBe(iso);
    }
    expect(formatEthAm(gregorianToEth({ y: 2026, m: 10, d: 10 }), isoToJdn("2026-10-10"))).toBe("ቅዳሜ፣ 30 መስከረም 2019 ዓ.ም.");
  });

  it("Bahire Hasab equals the Julian Easter computus 1600–2399 and gives the cited Fasika dates", () => {
    for (let gy = 1600; gy < 2400; gy++) expect(bahireHasab(gy - 8).feasts.fasika, String(gy)).toBe(fasikaJdnForGregorianYear(gy));
    const fasika = ["2025-04-20", "2026-04-12", "2027-05-02", "2028-04-16", "2029-04-08", "2030-04-28", "2031-04-13", "2032-05-02"];
    fasika.forEach((iso, i) => expect(jdnToIso(bahireHasab(2017 + i).feasts.fasika)).toBe(iso));
    const bh = bahireHasab(2019);
    expect([bh.wenber, bh.abekte, bh.metqe, jdnToIso(bh.nenewe)]).toEqual([13, 23, 7, "2027-02-22"]);
    for (const [y, iso] of [[2025, "2025-04-20"], [2027, "2027-05-02"], [2030, "2030-04-28"]] as const) {
      const e = orthodoxEaster(y);
      expect(`${e.y}-${String(e.m).padStart(2, "0")}-${String(e.d).padStart(2, "0")}`).toBe(iso);
    }
  });

  it("lists 2026 and 2027 public holidays on the cited dates", () => {
    const pub = (gy: number) => Object.fromEntries(ethiopianHolidays(gy).filter((h) => h.kind === "public").map((h) => [h.key, jdnToIso(h.jdn)]));
    expect(pub(2026)).toMatchObject({ genna: "2026-01-07", timkat: "2026-01-19", adwa: "2026-03-02", siklet: "2026-04-10", fasika: "2026-04-12", labour: "2026-05-01", patriots: "2026-05-05", derg: "2026-05-28", enkutatash: "2026-09-11", meskel: "2026-09-27" });
    expect(pub(2027)).toMatchObject({ genna: "2027-01-07", timkat: "2027-01-19", siklet: "2027-04-30", fasika: "2027-05-02", enkutatash: "2027-09-12", meskel: "2027-09-28" });
    const genna2028 = ethiopianHolidays(2028).find((h) => h.key === "genna")!;
    expect(jdnToIso(genna2028.jdn)).toBe("2028-01-08");
    expect(genna2028.note).toMatch(/Tahsas 28/);
  });

  it("formats Ge'ez numerals and Ethiopian clock time", () => {
    expect([geezNumeral(2019), geezNumeral(100), geezNumeral(30), geezNumeral(1), geezNumeral(1100)]).toEqual(["፳፻፲፱", "፻", "፴", "፩", "፲፩፻"]);
    expect(ethiopianClock(8, 0).hour).toBe(2);
    expect(ethiopianClock(18, 0).hour).toBe(12);
    expect(ethiopianClock(12, 15)).toEqual({ hour: 6, minute: 15, daytime: true });
  });
});

describe("Balinese Pawukon and Javanese weton", () => {
  it("matches the Reingold–Dershowitz test vector (2001-09-11)", () => {
    const p = pawukon(isoToJdn("2001-09-11"));
    expect([p.day, p.wuku.name, p.ekawara, p.dwiwara, p.triwara, p.caturwara, p.pancawara, p.sadwara, p.saptawara, p.astawara, p.sangawara, p.dasawara])
      .toEqual([58, "Julungwangi", "Luang", "Pepet", "Beteng", "Jaya", "Kliwon", "Was", "Anggara", "Guru", "Jangur", "Suka"]);
  });

  it("matches published reference days", () => {
    expect(pawukon(isoToJdn("2022-10-23")).day).toBe(0);
    expect(pawukon(isoToJdn("2026-04-05")).day).toBe(0);
    expect(pawukon(isoToJdn("2026-11-01")).day).toBe(0);
    const t = pawukon(isoToJdn("2026-10-10"));
    expect([t.day, t.wuku.name, t.saptawara, t.pancawara, t.triwara, t.sadwara, t.sangawara, t.dasawara]).toEqual([188, "Wayang", "Saniscara", "Kliwon", "Kajeng", "Urukung", "Erangan", "Dewa"]);
    expect(pawukonEvents(isoToJdn("2026-10-10"))).toContain("Tumpek Wayang");
    expect(pawukonEvents(isoToJdn("2026-07-12"))).toContain("Kajeng Kliwon");
    expect(pawukonEvents(isoToJdn("2026-07-07"))).toContain("Anggara Kasih");
    // Caturwara/astawara anomaly: Jaya and Kala three times on days 70–72.
    const d70 = isoToJdn("2022-10-23") + 70;
    expect([0, 1, 2].map((k) => pawukon(d70 + k).astawara)).toEqual(["Kala", "Kala", "Kala"]);
    expect([0, 1, 2].map((k) => pawukon(d70 + k).caturwara)).toEqual(["Jaya", "Jaya", "Jaya"]);
  });

  it("produces the full published 2026 Pawukon holiday list", () => {
    const all = pawukonHolidaysInYear(2026).flatMap((h) => h.names.map((n) => `${jdnToIso(h.jdn)} ${n}`));
    for (const e of ["2026-06-17 Hari Raya Galungan", "2026-06-27 Hari Raya Kuningan", "2026-04-04 Hari Raya Saraswati", "2026-10-31 Hari Raya Saraswati", "2026-04-05 Banyu Pinaruh", "2026-11-01 Banyu Pinaruh",
      "2026-04-08 Pagerwesi", "2026-11-04 Pagerwesi", "2026-01-03 Tumpek Krulut", "2026-08-01 Tumpek Krulut", "2026-02-07 Tumpek Kandang (Uye)", "2026-09-05 Tumpek Kandang (Uye)", "2026-03-14 Tumpek Wayang",
      "2026-10-10 Tumpek Wayang", "2026-04-18 Tumpek Landep", "2026-11-14 Tumpek Landep", "2026-05-23 Tumpek Wariga (Uduh/Bubuh)", "2026-12-19 Tumpek Wariga (Uduh/Bubuh)"]) expect(all, e).toContain(e);
  });

  it("computes weton, neptu and the 8-step weton jodoh", () => {
    expect(weton(isoToJdn("1945-08-17"))).toMatchObject({ hari: "Jumat", pasaran: "Legi", neptu: 11 });
    expect(weton(isoToJdn("2022-10-21"))).toMatchObject({ hari: "Jumat", pasaran: "Kliwon", neptu: 14 });
    expect(weton(isoToJdn("2026-06-17"))).toMatchObject({ hari: "Rabu", pasaran: "Kliwon" });
    expect(weton(isoToJdn("1945-08-16"), true)).toMatchObject({ hari: "Jumat", pasaran: "Legi" });
    expect(wetonJodoh(8, 18)).toMatchObject({ total: 26, name: "Ratu" });
    expect([1, 9, 17, 25, 33].map((n) => wetonJodoh(n, 0).name)).toEqual(["Pegat", "Pegat", "Pegat", "Pegat", "Pegat"]);
  });
});

describe("moon calendar (validated against published October 2026 calendars)", () => {
  const md = (iso: string) => moonDay(iso, "Europe/Berlin");
  const berlin = (d: number, hh: number, mm: number) => zonedTimeToUtc(2026, 10, d, hh, mm, "Europe/Berlin");

  it("finds phases, nodes, apsides and declination turns within tolerance", () => {
    const expected: [number, string, number, number, number][] = [
      [1, "perigee", 22, 52, 15], [7, "descending-node", 3, 20, 30], [10, "new-moon", 17, 50, 15], [16, "turn-ascending", 4, 40, 30],
      [17, "apogee", 0, 54, 15], [21, "ascending-node", 11, 0, 30], [26, "full-moon", 5, 12, 15], [28, "perigee", 19, 4, 15], [29, "turn-descending", 18, 30, 30],
    ];
    for (const [d, kind, hh, mm, tol] of expected) {
      const ev = md(`2026-10-${String(d).padStart(2, "0")}`).events.find((e) => e.kind === kind);
      expect(ev, `${d} ${kind}`).toBeTruthy();
      expect(Math.abs(ev!.at.getTime() - berlin(d, hh, mm).getTime()) / 60000, `${d} ${kind}`).toBeLessThanOrEqual(tol);
    }
  });

  it("marks the same mixed and pure day types as icalendario.net (Ophiuchus as Scorpio)", () => {
    // Published: mixed days list two types; pure days one. Days 16 and 23 differ slightly in published calendars (boundary/Ophiuchus), checked as "contains".
    const published: Record<number, string[]> = {
      1: ["root"], 2: ["root", "flower"], 3: ["flower"], 4: ["flower", "leaf"], 5: ["leaf"], 6: ["leaf", "fruit"], 7: ["fruit"], 8: ["fruit"], 9: ["fruit", "root"], 10: ["root"], 11: ["root"],
      12: ["root", "flower"], 13: ["flower"], 14: ["flower", "leaf"], 15: ["leaf"], 16: ["fruit"], 17: ["fruit"], 18: ["fruit"], 19: ["fruit", "root"], 20: ["root"], 21: ["root", "flower"],
      22: ["flower"], 23: ["flower", "leaf"], 24: ["leaf"], 25: ["leaf"], 26: ["leaf", "fruit"], 27: ["fruit", "root"], 28: ["root"], 29: ["root"], 30: ["root", "flower"], 31: ["flower"],
    };
    for (const [d, types] of Object.entries(published)) {
      const got = md(`2026-10-${d.padStart(2, "0")}`).dayTypes.map((s) => s.value);
      if (d === "16" || d === "23") { for (const t of types) expect(got, `day ${d}`).toContain(t); continue; }
      // Sextans clip on 8 Oct is folded into the ecliptic fallback (Leo).
      expect([...new Set(got)], `day ${d}`).toEqual(types);
    }
  });

  it("puts mondinfo.de's favourable haircut days in fire signs (tropical)", () => {
    for (const d of [5, 6, 14, 15, 16, 24, 25]) {
      const sign = tropicalSign(berlin(d, 12, 0));
      expect(["leo", "sagittarius", "aries"], `Oct ${d}`).toContain(sign);
    }
    expect(md("2026-10-16").ascending).toBe(true);
    expect(md("2026-10-10").ascending).toBe(false);
  });
});

describe("name days", () => {
  it("has a full 366-day dataset per country and fixes known upstream defects", () => {
    for (const c of NAMEDAY_COUNTRIES) {
      expect(Object.keys(c.data.days).length, c.slug).toBe(366);
      for (const names of Object.values(c.data.days)) for (const n of names) { expect(n, c.slug).not.toMatch(/\p{Ll}\p{Lu}/u); expect(n.normalize("NFC"), c.slug).toBe(n); }
    }
    const hu = countryBySlug("hungary")!;
    expect(hu.data.days["05-08"]).toEqual(["Mihály", "Győző"]);
    expect(hu.data.days["05-31"]).toEqual(["Angéla", "Petronella"]);
    expect(countryBySlug("slovakia")!.data.days["01-09"]).toContain("Alexia");
  });

  it("applies leap-year rules", () => {
    const hu = countryBySlug("hungary")!;
    expect(namesOn(hu, "2024-02-24")).toEqual([]);
    expect(namesOn(hu, "2024-02-25")).toContain("Mátyás");
    expect(namesOn(hu, "2023-02-24")).toContain("Mátyás");
    expect(namesOn(countryBySlug("slovakia")!, "2024-02-29")).toEqual(["Radomír"]);
    expect(namesOn(countryBySlug("czech-republic")!, "2024-02-29")).toEqual(["Horymír"]);
  });

  it("keeps Poland disabled until its data is rebuilt from a licensed source", () => {
    expect(countryBySlug("poland")).toBeNull();
    expect(get("/nameday/poland").status).toBe(404);
  });
});

describe("rendering", () => {
  it("serves canonical, indexable pages and noindex form results", async () => {
    const r = get("/nameday/hungary/name/matyas");
    expect(r.status).toBe(200);
    const html = await r.text();
    expect(html).toContain('<link rel="canonical" href="https://aafnaipatro.com/nameday/hungary/name/matyas">');
    expect(r.headers.get("x-robots-tag")).toBe("index, follow");
    expect(get("/weton/jodoh?a=1990-05-20&b=1992-11-03").headers.get("x-robots-tag")).toContain("noindex");
    expect(get("/bali-calendar/otonan?lahir=2026-01-01").headers.get("x-robots-tag")).toContain("noindex");
    expect(get("/ethiopian-calendar/convert?g=2026-01-07").headers.get("location")).toBe("/ethiopian-calendar/date/2026-01-07");
    expect(get("/nameday/nowhere").status).toBe(404);
    expect(get("/weton/2026-02-30").status).toBe(404);
  });

  it("redirects non-canonical paths and rejects non-GET", async () => {
    const r = await worldcalResponse(new Request(SITE + "/Weton/"), {});
    expect(r!.status).toBe(301);
    expect(r!.headers.get("location")).toBe(SITE + "/weton");
    expect((await worldcalResponse(new Request(SITE + "/weton", { method: "POST" }), {}))!.status).toBe(405);
  });

  it("lists only pages that render 200 and indexable in its sitemaps (sampled)", async () => {
    const index = await get("/sitemap-worldcal.xml").text();
    const children = [...index.matchAll(/<loc>https:\/\/aafnaipatro\.com(\/sitemap-wc-[^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(children.length).toBeGreaterThanOrEqual(7);
    for (const child of children) {
      const urls = [...(await get(child).text()).matchAll(/<loc>https:\/\/aafnaipatro\.com([^<]+)<\/loc>/g)].map((m) => m[1]);
      expect(urls.length, child).toBeGreaterThan(0);
      expect(urls.length, child).toBeLessThanOrEqual(45000);
      const step = Math.max(1, Math.floor(urls.length / 12));
      for (let i = 0; i < urls.length; i += step) {
        const r = get(urls[i]);
        expect(r.status, urls[i]).toBe(200);
        expect(r.headers.get("x-robots-tag"), urls[i]).toBe("index, follow");
      }
    }
  });
});
