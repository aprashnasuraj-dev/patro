/**
 * Explore page families: data-driven page sets that live entirely under their own URL prefixes and their
 * own sitemap index (/sitemap-explore.xml). Nothing here claims a path that existed before this module:
 * tests/explore-engine.test.ts checks every prefix against seo/published-url-baseline.json, the growth
 * prefixes, the legacy redirects and the existing sitemap children.
 *
 * The same families.json drives the build (scripts/explore/build.mjs) and the Worker, so they cannot drift.
 * Adding a family = one entry in families.json + one adapter in scripts/explore/families/<id>.mjs.
 */
import config from "./families.json";
import { exploreRedirect } from "./redirects";

export type ExploreFamily = {
  id: string;
  prefix: string;
  schema_type: string;
  root_label: string;
  root_label_ne: string;
  min_facts: number;
  min_description: number;
  enabled: boolean;
  /** false = the bare prefix belongs to another handler (e.g. the /nepal growth page); only paths below it are claimed. */
  serve_root?: boolean;
  /** When set, only these first segments below the prefix are claimed (/nepal/bajhang yes, /nepal/time no). */
  segments?: string[];
};

export const EXPLORE_CONFIG = config as {
  storage_prefix: string;
  sitemap_shard_size: number;
  max_children: number;
  max_siblings: number;
  families: ExploreFamily[];
};

export const EXPLORE_FAMILIES: readonly ExploreFamily[] = EXPLORE_CONFIG.families;

export const SITEMAP_INDEX_PATH = "/sitemap-explore.xml";
/**
 * /sitemap-x-{family}-{shard}.xml or /sitemap-x-{family}-{group}-{shard}.xml (one file set per page type, so Search
 * Console reports indexing per type) — deliberately not matching any existing sitemap writer's patterns.
 */
export const SITEMAP_SHARD_RE = /^\/sitemap-x-([a-z0-9]+)(?:-([a-z]+))?-(\d{1,5})\.xml$/;

const SEGMENTS = new Map(EXPLORE_FAMILIES.filter((f) => f.segments).map((f) => [f.id, new Set(f.segments)]));

export function familyForPath(pathname: string): ExploreFamily | null {
  for (const family of EXPLORE_FAMILIES) {
    if (!family.enabled) continue;
    if (pathname === family.prefix) {
      if (family.serve_root === false) continue;
      return family;
    }
    if (!pathname.startsWith(family.prefix + "/")) continue;
    const allowed = SEGMENTS.get(family.id);
    if (allowed && !allowed.has(pathname.slice(family.prefix.length + 1).split("/")[0])) continue;
    return family;
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
  return familyForPath(lower) !== null || exploreRedirect(lower) !== null;
}

/** R2 object key of a page record. /place/koshi → explore/v1/pages/place/koshi.json */
export const pageKey = (path: string) => `${EXPLORE_CONFIG.storage_prefix}/pages${path}.json`;
/** R2 object key of a prebuilt sitemap file. */
export const sitemapKey = (file: string) => `${EXPLORE_CONFIG.storage_prefix}/sitemaps/${file}`;
