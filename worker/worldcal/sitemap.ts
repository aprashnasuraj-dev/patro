/** Dynamic sitemaps for the world-calendar families: /sitemap-worldcal.xml → /sitemap-wc-{family}[-{n}].xml (≤ 45,000 URLs each). */
import { FAMILIES, type FamilyId } from "./config";
import { esc } from "./html";
import { namedayUrls } from "./pages/nameday";
import { ethiopianUrls } from "./pages/ethiopian";
import { baliUrls, wetonUrls } from "./pages/bali-weton";
import { moonUrls } from "./pages/moon";

const SHARD = 45_000;

const URLS: Record<FamilyId, (now: Date) => string[]> = {
  nameday: () => namedayUrls(),
  ethiopian: ethiopianUrls,
  bali: baliUrls,
  weton: wetonUrls,
  "moon-de": (n) => moonUrls("de", n),
  "moon-es": (n) => moonUrls("es", n),
  "moon-it": (n) => moonUrls("it", n),
};

function shards(now: Date): { name: string; family: FamilyId; part: number }[] {
  const out: { name: string; family: FamilyId; part: number }[] = [];
  for (const id of Object.keys(URLS) as FamilyId[]) {
    if (!FAMILIES[id].enabled) continue;
    const n = Math.max(1, Math.ceil(URLS[id](now).length / SHARD));
    for (let i = 0; i < n; i++) out.push({ name: i === 0 ? id : `${id}-${i + 1}`, family: id, part: i });
  }
  return out;
}

export function sitemapIndex(site: string, now: Date): string {
  const day = now.toISOString().slice(0, 10);
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...shards(now).map((s) => `  <sitemap><loc>${esc(`${site}/sitemap-wc-${s.name}.xml`)}</loc><lastmod>${day}</lastmod></sitemap>`),
    "</sitemapindex>", ""].join("\n");
}

export function sitemapChild(name: string, site: string, now: Date): string | null {
  const s = shards(now).find((x) => x.name === name);
  if (!s) return null;
  const urls = URLS[s.family](now).slice(s.part * SHARD, (s.part + 1) * SHARD);
  const parts = ['<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'];
  for (const u of urls) parts.push(`  <url><loc>${esc(site + u)}</loc></url>\n`);
  parts.push("</urlset>\n");
  return parts.join("");
}
