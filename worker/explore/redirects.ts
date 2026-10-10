/**
 * Permanent (301) redirects owned by the explore engine. Pure function of the path: no storage reads.
 *
 *   /dolakha, /rammechap, /bhajang          → /nepal/dolakha, /nepal/ramechhap, /nepal/bajhang   (district at the site root)
 *   /nepal/bhajhang/...                      → /nepal/bajhang/...      (misspelt or old district / province names)
 *   /nepal/bajhang/jayaprithvi-municipality  → /nepal/bajhang/jayaprithvi  (type suffix; old /place URL style)
 *   /nepal/bajhang/jayaprithvi/ward-08       → /nepal/bajhang/jayaprithvi/ward-8
 *   /place/{province}/{district}/{palika}    → /nepal/{district}/{palika}   (the first explore release, Oct 2026)
 *
 * Root aliases are district names only; tests/explore-engine.test.ts proves none of them is a published URL,
 * a file in dist/ or a route the app knows, so nothing that worked before changes.
 */
import geo from "./nepal-geo.json";

type GeoRow = { slug: string; aliases: string[] };
const PROVINCES = (geo as { provinces: GeoRow[] }).provinces;
const DISTRICTS = (geo as { districts: GeoRow[] }).districts;

/** Every accepted spelling (canonical included) → canonical slug, for the first segment below /nepal. */
const NEPAL_SEGMENT = new Map<string, string>();
for (const row of [...PROVINCES, ...DISTRICTS]) for (const s of [row.slug, ...row.aliases]) NEPAL_SEGMENT.set(s, row.slug);
/** District spellings that redirect from the site root. */
const ROOT_ALIAS = new Map<string, string>();
for (const row of DISTRICTS) for (const s of [row.slug, ...row.aliases]) ROOT_ALIAS.set(s, row.slug);

export const ROOT_DISTRICT_ALIASES: readonly string[] = [...ROOT_ALIAS.keys()];

const TYPE_SUFFIX = /-(?:sub-metropolitan-city|metropolitan-city|rural-municipality|municipality|gaunpalika|gaupalika|nagarpalika|upamahanagarpalika|mahanagarpalika)$/;
const WARD_VARIANT = /^(?:ward|wada|woda)-?(?:no-?)?0*([1-9]\d?)$/;

function fixTail(rest: string[]): string[] {
  const out = [...rest];
  if (out[0] && TYPE_SUFFIX.test(out[0]) && out[0].replace(TYPE_SUFFIX, "")) out[0] = out[0].replace(TYPE_SUFFIX, "");
  if (out[1]) {
    const ward = out[1].match(WARD_VARIANT);
    if (ward) out[1] = `ward-${Number(ward[1])}`;
  }
  return out;
}

/** Target path for a lower-case, trailing-slash-free path, or null when this module does not redirect it. */
export function exploreRedirect(path: string): string | null {
  const parts = path.split("/").slice(1);
  if (!parts[0] || parts.some((p) => !/^[a-z0-9-]+$/.test(p))) return null;

  if (parts.length === 1 && ROOT_ALIAS.has(parts[0])) return `/nepal/${ROOT_ALIAS.get(parts[0])}`;

  if (parts[0] === "place") {
    if (parts.length === 1) return "/nepal";
    if (parts.length === 2) return NEPAL_SEGMENT.has(parts[1]) ? `/nepal/${NEPAL_SEGMENT.get(parts[1])}` : "/nepal";
    const district = NEPAL_SEGMENT.get(parts[2]);
    return district ? ["/nepal", district, ...fixTail(parts.slice(3))].join("/") : "/nepal";
  }

  if (parts[0] === "nepal" && parts.length >= 2) {
    const canonical = NEPAL_SEGMENT.get(parts[1]);
    if (!canonical) return null;
    const target = ["/nepal", canonical, ...fixTail(parts.slice(2))].join("/");
    return target === path ? null : target;
  }
  return null;
}
