import { describe, expect, it } from "vitest";
import { palelintanganMatrix, pawukon } from "../worker/worldcal/engines/pawukon";
import { isoToJdn } from "../worker/worldcal/dates";
import { LINTANG_STORIES, lintangSlug } from "../worker/worldcal/data/bali-lintang-stories";
import { baliRoute, baliUrls } from "../worker/worldcal/pages/bali-weton";
import { sitemapChild } from "../worker/worldcal/sitemap";
import { ROADMAP_FLAGS } from "../worker/roadmap/flags";

const flags = { ...ROADMAP_FLAGS, baliPwa: true };
const ctx = (path: string) => ({
  site: "https://aafnaipatro.com", path,
  url: new URL("https://aafnaipatro.com" + path),
  now: new Date("2026-10-30T03:00:00Z"), flags,
}) as any;

describe("35 evergreen Balinese Lintang editorial profiles", () => {
  const matrix = palelintanganMatrix();
  it("has one distinct editorial record for each canonical matrix cell", () => {
    expect(matrix).toHaveLength(35);
    expect(Object.keys(LINTANG_STORIES)).toHaveLength(35);
    expect(new Set(matrix.map((m) => lintangSlug(m.lintang))).size).toBe(35);
    expect(new Set(Object.values(LINTANG_STORIES).map((s) => s.meaning))).toHaveLength(35);
    expect(new Set(Object.values(LINTANG_STORIES).map((s) => s.heritage))).toHaveLength(35);
    expect(new Set(Object.values(LINTANG_STORIES).map((s) => s.question))).toHaveLength(35);
    for (const m of matrix) {
      const story = LINTANG_STORIES[lintangSlug(m.lintang)];
      expect(story?.name).toBe(m.lintang);
      expect(story?.meaning.length).toBeGreaterThan(70);
      expect(story?.heritage.length).toBeGreaterThan(70);
      expect(story?.variants.length).toBeGreaterThan(0);
    }
  });

  it("renders exactly 35 indexable permanent URLs, unique canonicals, unique semantic content", () => {
    const urls = baliUrls(ctx("/bali-calendar").now, flags);
    const profiles = urls.filter((p) => p.startsWith("/bali-calendar/palelintangan/"));
    expect(profiles).toHaveLength(35);
    expect(new Set(profiles).size).toBe(35);
    for (const cell of matrix) {
      const path = "/bali-calendar/palelintangan/" + lintangSlug(cell.lintang);
      expect(profiles).toContain(path);
      const r: any = baliRoute(ctx(path), ["palelintangan", lintangSlug(cell.lintang)]);
      expect(r?.status).toBe(200);
      expect(r.indexable).toBe(true);
      expect(r.html).toContain('<link rel="canonical" href="https://aafnaipatro.com' + path + '">');
      expect(r.html).toContain('<meta name="robots" content="index, follow');
      expect(r.html).toContain('<h1>Lintang ' + cell.lintang + " dalam Palelintangan Bali</h1>");
      expect(r.html).toContain(cell.lintangAksara);
      expect(r.html).toContain(LINTANG_STORIES[lintangSlug(cell.lintang)].meaning);
      expect(r.html).toContain(LINTANG_STORIES[lintangSlug(cell.lintang)].heritage);
      expect(r.html).toContain("bukan ramalan");
      expect(r.html).toContain('rel="manifest"');
      expect(r.html).toContain('"@type":"Article"');
    }
  });

  it("links all 35 from the existing chart and exposes its selected Lintang", () => {
    const hub: any = baliRoute(ctx("/bali-calendar/palelintangan"), ["palelintangan"]);
    expect((hub.html.match(/<article class="pal-cell(?: is-current)?"/g) || [])).toHaveLength(35);
    for (const cell of matrix) {
      expect(hub.html).toContain('/bali-calendar/palelintangan/' + lintangSlug(cell.lintang));
    }
    expect(hub.html).toContain("Cara membaca Palelintangan Bali");
    expect(hub.html).toContain("Jelajahi kisah Lintang");
  });

  it("keeps real saptawara-pancawara recurrence every 35 days and 210-day Pawukon distinction", () => {
    const start = isoToJdn("2026-10-30");
    for (const m of matrix) {
      const j = Array.from({ length: 35 }, (_, i) => start + i).find((n) => {
        const p = pawukon(n);
        return p.saptawara === m.saptawara && p.pancawara === m.pancawara;
      });
      expect(j).toBeDefined();
      expect(pawukon(j! + 35).saptawara).toBe(m.saptawara);
      expect(pawukon(j! + 35).pancawara).toBe(m.pancawara);
      expect(pawukon(j! + 210).wuku.name).toBe(pawukon(j!).wuku.name);
    }
  });

  it("includes all profiles in Bali XML sitemap and rejects unknown slugs", () => {
    const xml = sitemapChild("bali", "https://aafnaipatro.com", new Date("2026-10-30T03:00:00Z"), flags);
    expect(xml).not.toBeNull();
    for (const m of matrix) expect(xml).toContain("/bali-calendar/palelintangan/" + lintangSlug(m.lintang));
    expect(baliRoute(ctx("/bali-calendar/palelintangan/invented"), ["palelintangan", "invented"])).toBeNull();
    expect(baliRoute(ctx("/bali-calendar/palelintangan/kala-sungsang/nonsense"), ["palelintangan", "kala-sungsang", "nonsense"])).toBeNull();
  });
});