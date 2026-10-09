/**
 * Explore page families: data-driven page sets that live entirely under their own URL prefixes and their
 * own sitemap index (/sitemap-explore.xml). Nothing here claims a path that existed before this module:
 * tests/explore-engine.test.ts checks every prefix against seo/published-url-baseline.json, the growth
 * prefixes, the legacy redirects and the run_worker_first exclusions.
 *
 * Adding a family = one entry here + rows imported through scripts/explore (NDJSON contract). Rendering,
 * caching, breadcrumbs, child listings, quality gating and sitemaps are generic.
 */
export type ExploreFamily = {
  /** Stable id stored in D1 (explore_pages.family) and used in sitemap file names. [a-z0-9]+ only. */
  id: string;
  /** URL prefix owned by this family. Must not overlap any existing route. */
  prefix: string;
  /** schema.org type for the page entity. */
  schemaType: string;
  /** Breadcrumb label of the prefix root. */
  rootLabel: string;
  rootLabelNe: string;
  /** Minimum sourced facts before a page may be indexed (enforced at import, re-checked at render). */
  minFacts: number;
  /** Families can be switched off without deleting data: pages then 404 and drop out of sitemaps. */
  enabled: boolean;
};

export const EXPLORE_FAMILIES: readonly ExploreFamily[] = [
  {
    id: "places",
    prefix: "/place",
    schemaType: "AdministrativeArea",
    rootLabel: "Places in Nepal",
    rootLabelNe: "नेपालका स्थानहरू",
    minFacts: 4,
    enabled: true,
  },
];

/** Max URLs per sitemap shard. Small shards keep each sitemap response cheap in Worker CPU (Free plan: 10 ms). */
export const SITEMAP_SHARD_SIZE = 10_000;

export const SITEMAP_INDEX_PATH = "/sitemap-explore.xml";
/** /sitemap-x-{family}-{shard}.xml — deliberately not matching any existing sitemap writer's patterns. */
export const SITEMAP_SHARD_RE = /^\/sitemap-x-([a-z0-9]+)-(\d{1,5})\.xml$/;

export function familyForPath(pathname: string): ExploreFamily | null {
  for (const family of EXPLORE_FAMILIES) {
    if (!family.enabled) continue;
    if (pathname === family.prefix || pathname.startsWith(family.prefix + "/")) return family;
  }
  return null;
}

export function familyById(id: string): ExploreFamily | null {
  return EXPLORE_FAMILIES.find((family) => family.id === id && family.enabled) || null;
}

/** True for every path this module answers. Everything else is untouched and falls through. */
export function isExplorePath(pathname: string): boolean {
  if (pathname === SITEMAP_INDEX_PATH || SITEMAP_SHARD_RE.test(pathname)) return true;
  const lower = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  return familyForPath(lower) !== null;
}
