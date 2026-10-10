/**
 * World-calendar families. Every family owns one URL prefix that did not exist before this module;
 * tests/worldcal.test.ts checks them against the published URL baseline, sitemaps, growth/explore prefixes
 * and legacy redirects. Disable a family by flipping `enabled` — its pages then 404 and leave the sitemaps.
 */
export type FamilyId = "nameday" | "ethiopian" | "bali" | "weton" | "moon-de" | "moon-es" | "moon-it";

export const FAMILIES: Record<FamilyId, { prefix: string; enabled: boolean; tz: string; lang: string }> = {
  nameday: { prefix: "/nameday", enabled: true, tz: "Europe/Prague", lang: "en" },
  ethiopian: { prefix: "/ethiopian-calendar", enabled: true, tz: "Africa/Addis_Ababa", lang: "en" },
  bali: { prefix: "/bali-calendar", enabled: true, tz: "Asia/Makassar", lang: "id" },
  weton: { prefix: "/weton", enabled: true, tz: "Asia/Jakarta", lang: "id" },
  "moon-de": { prefix: "/mondkalender", enabled: true, tz: "Europe/Berlin", lang: "de" },
  "moon-es": { prefix: "/calendario-lunar", enabled: true, tz: "Europe/Madrid", lang: "es" },
  "moon-it": { prefix: "/calendario-lunare", enabled: true, tz: "Europe/Rome", lang: "it" },
};

export const SITEMAP_INDEX = "/sitemap-worldcal.xml";
export const SITEMAP_CHILD_RE = /^\/sitemap-wc-([a-z-]+)\.xml$/;

/** Date pages are indexable only inside this window around today (days); outside they are served as noindex. */
export const INDEX_WINDOW = { pastDays: 400, futureDays: 800 };

export function familyForPath(path: string): FamilyId | null {
  for (const [id, f] of Object.entries(FAMILIES) as [FamilyId, (typeof FAMILIES)[FamilyId]][]) {
    if (f.enabled && (path === f.prefix || path.startsWith(f.prefix + "/"))) return id;
  }
  return null;
}

export const isWorldcalPath = (pathname: string) => {
  if (pathname === SITEMAP_INDEX || SITEMAP_CHILD_RE.test(pathname)) return true;
  const clean = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  return familyForPath(clean) !== null;
};
