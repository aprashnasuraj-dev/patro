#!/usr/bin/env node
// Builds the Nepal map (/nepalmap): data files, the app page, one landing page per kind of place, and a sitemap.
//
//   node scripts/explore/nepal/build-map.mjs [--out public]
//
// Writes (under --out, default public/, which Vite copies to dist/):
//   nepalmap.html, nepalmap/{temples,gumbas,...}.html   static pages (served as assets: wrangler run_worker_first excludes /nepalmap)
//   nepalmap/app.js, nepalmap/style.css                 the map app (scripts/explore/nepal/map/)
//   data/nepalmap/v1/admin.json, data/nepalmap/v1/{layer}.json   compact rows, loaded per layer on demand
//   sitemap-nepalmap.xml                                 the map URLs (not linked from the existing sitemaps; submit it)
//
// Same data and the same page paths as the /nepal explore pages (scripts/explore/families/nepal.mjs → nepalData()).
// Places: © OpenStreetMap contributors (ODbL). Base map tiles: OpenFreeMap (no key).
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { nepalData } from "../families/nepal.mjs";
import { classifyBoundaryConfidence } from "./boundary-confidence.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");
const args = process.argv.slice(2);
const OUT = resolve(ROOT, args.includes("--out") ? args[args.indexOf("--out") + 1] : "public");
const SITE = (process.env.PUBLIC_SITE_URL || "https://aafnaipatro.com").replace(/\/+$/, "");
const SELF_HOST_MAPLIBRE = process.env.NEPALMAP_SELF_HOST_MAPLIBRE === "1";
const MAPLIBRE_JS = SELF_HOST_MAPLIBRE ? "/vendor/nepalmap/maplibre-4.7.1/maplibre-gl-csp.js" : "https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const MAPLIBRE_CSS = SELF_HOST_MAPLIBRE ? "/vendor/nepalmap/maplibre-4.7.1/maplibre-gl.css" : "https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css";
const MAPLIBRE_WORKER = SELF_HOST_MAPLIBRE ? "/vendor/nepalmap/maplibre-4.7.1/maplibre-gl-csp-worker.js" : null;
const LEGACY_LASTMOD = "2026-10-11";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fmt = (n) => Number(n).toLocaleString("en-IN");
const jsonLd = (v) => JSON.stringify(v).replace(/</g, "\\u003c");

const RELIGION_SUBS = { hindu: "Hindu temple", buddhist: "Buddhist gumba / monastery", muslim: "Mosque", christian: "Church", sikh: "Gurdwara", jain: "Jain temple", kirat: "Kirat shrine", bon: "Bon monastery", other: "Place of worship" };
/** Map layers. `from` = OSM POI categories (or "settlement"). */
const CATEGORIES = [
  { id: "worship", label: "Temples & gumbas", one: "Place of worship", color: "#c2410c", from: ["worship"], default: true, religionFilter: true, subs: RELIGION_SUBS },
  { id: "peak", label: "Peaks & hills", one: "Peak", color: "#6d28d9", from: ["peak"], default: true, eleFilter: true },
  { id: "lake", label: "Lakes", one: "Lake", color: "#0284c7", from: ["lake"], default: true },
  { id: "sight", label: "Sights & heritage", one: "Sight", color: "#b45309", from: ["sight"], default: true, subs: { viewpoint: "Viewpoint", museum: "Museum", attraction: "Attraction", fort: "Fort", castle: "Fort", palace: "Palace", archaeological_site: "Archaeological site", ruins: "Ruins", cave_entrance: "Cave", hot_spring: "Hot spring", monument: "Monument", zoo: "Zoo" } },
  { id: "waterfall", label: "Waterfalls", one: "Waterfall", color: "#0891b2", from: ["waterfall"], default: true },
  { id: "park", label: "Parks & reserves", one: "Park or reserve", color: "#15803d", from: ["park"], subs: { national_park: "National park", protected_area: "Protected area", nature_reserve: "Nature reserve", park: "Park" } },
  { id: "airport", label: "Airports", one: "Airport", color: "#334155", from: ["airport"] },
  { id: "village", label: "Villages & towns", one: "Settlement", color: "#a16207", from: ["settlement"], subs: { city: "City", town: "Town", village: "Village", suburb: "Suburb", hamlet: "Hamlet", neighbourhood: "Neighbourhood", locality: "Locality", quarter: "Quarter", isolated_dwelling: "Settlement" } },
  { id: "school", label: "Schools & colleges", one: "School", color: "#2563eb", from: ["school"], subs: { school: "School", college: "College", university: "University", kindergarten: "Kindergarten" } },
  { id: "health", label: "Hospitals & health posts", one: "Health facility", color: "#dc2626", from: ["health"], subs: { hospital: "Hospital", clinic: "Clinic", doctors: "Doctor", health_post: "Health post", centre: "Health centre", birthing_centre: "Birthing centre" } },
  { id: "bank", label: "Banks", one: "Bank", color: "#0f766e", from: ["bank"] },
  { id: "stay", label: "Hotels & guest houses", one: "Hotel", color: "#9333ea", from: ["stay"], subs: { hotel: "Hotel", guest_house: "Guest house", hostel: "Hostel", motel: "Motel" } },
  { id: "services", label: "Offices, police & post", one: "Office", color: "#475569", from: ["office", "police", "post", "market", "bus"], subs: { office: "Government office", police: "Police", post: "Post office", market: "Market", bus: "Bus park" } },
];

/** Landing pages: one URL per thing people search for ("temples in nepal map"). */
const LANDINGS = [
  { slug: "temples", cat: "worship", religion: ["hindu"], noun: "Hindu temples", ne: "मन्दिर", h1: "Hindu temples in Nepal: map" },
  { slug: "gumbas", cat: "worship", religion: ["buddhist"], noun: "Buddhist gumbas and monasteries", ne: "गुम्बा", h1: "Gumbas and Buddhist monasteries in Nepal: map" },
  { slug: "mosques", cat: "worship", religion: ["muslim"], noun: "mosques", ne: "मस्जिद", h1: "Mosques in Nepal: map" },
  { slug: "churches", cat: "worship", religion: ["christian"], noun: "churches", ne: "चर्च", h1: "Churches in Nepal: map" },
  { slug: "religious-places", cat: "worship", noun: "temples, gumbas, mosques, churches and shrines", ne: "धार्मिक स्थल", h1: "Religious places in Nepal: map" },
  { slug: "mountains", cat: "peak", noun: "peaks and hills", ne: "हिमाल तथा डाँडा", h1: "Mountains and peaks of Nepal: map with heights" },
  { slug: "lakes", cat: "lake", noun: "lakes and ponds", ne: "ताल", h1: "Lakes of Nepal: map" },
  { slug: "waterfalls", cat: "waterfall", noun: "waterfalls", ne: "झरना", h1: "Waterfalls in Nepal: map" },
  { slug: "heritage-sites", cat: "sight", noun: "sights, viewpoints, museums, forts and heritage sites", ne: "घुम्ने ठाउँ", h1: "Sights and heritage sites in Nepal: map" },
  { slug: "national-parks", cat: "park", noun: "national parks, reserves and parks", ne: "निकुञ्ज", h1: "National parks and reserves in Nepal: map" },
  { slug: "airports", cat: "airport", noun: "airports and airstrips", ne: "विमानस्थल", h1: "Airports in Nepal: map" },
  { slug: "villages", cat: "village", noun: "villages, towns and settlements", ne: "गाउँ तथा बस्ती", h1: "Villages and towns of Nepal: map" },
  { slug: "schools", cat: "school", noun: "schools and colleges", ne: "विद्यालय", h1: "Schools and colleges in Nepal: map" },
  { slug: "hospitals", cat: "health", noun: "hospitals, clinics and health posts", ne: "अस्पताल", h1: "Hospitals and health posts in Nepal: map" },
  { slug: "banks", cat: "bank", noun: "banks and cooperatives", ne: "बैंक", h1: "Banks in Nepal: map" },
  { slug: "hotels", cat: "stay", noun: "hotels and guest houses", ne: "होटल", h1: "Hotels and guest houses in Nepal: map" },
];

const D = await nepalData(ROOT);
const { province, district, palika, settlements, pois, sourceMeta } = D;
const LASTMOD = sourceMeta?.generated || LEGACY_LASTMOD;
const OSM_SNAPSHOT = sourceMeta?.osm_timestamp || null;
const ROADMAP_FLAGS = {
  provenanceUi: process.env.ROADMAP_PROVENANCE_UI === "1",
  nepalSearchWorker: process.env.NEPALMAP_SEARCH_WORKER === "1",
  nepalRoutingProviderV2: process.env.NEPALMAP_ROUTING_V2 === "1",
  nepalStablePlaceIds: process.env.NEPALMAP_STABLE_IDS === "1",
  nepalVisitorMode: process.env.NEPALMAP_VISITOR_MODE === "1",
  nepalBoundaryConfidence: process.env.NEPALMAP_BOUNDARY_CONFIDENCE === "1",
  nepalDetourRouting: process.env.NEPALMAP_DETOUR_ROUTING === "1",
  nepalRoadSafety: process.env.NEPALMAP_ROAD_SAFETY === "1",
  nepalTerrain: process.env.NEPALMAP_TERRAIN === "1",
  nepalOfflinePacks: process.env.NEPALMAP_OFFLINE_PACKS === "1",
  nepalExports: process.env.NEPALMAP_EXPORTS === "1",
  nepalPoiPages: process.env.NEPALMAP_POI_PAGES === "1",
  nepalMobileSheetV2: process.env.NEPALMAP_MOBILE_SHEET_V2 === "1",
  nepalEmergency: process.env.NEPALMAP_EMERGENCY === "1",
  nepalItinerary: process.env.NEPALMAP_ITINERARY === "1",
  nepalCorrectionsUi: process.env.NEPALMAP_CORRECTIONS_UI === "1",
  nepalPmtiles: process.env.NEPALMAP_PMTILES === "1",
};

let stablePlaceIds = null;
if (ROADMAP_FLAGS.nepalStablePlaceIds) {
  const mappingPath = join(ROOT, "data/explore/nepal/place-id-map.json");
  try {
    const parsed = JSON.parse(await readFile(mappingPath, "utf8"));
    if (parsed?.version !== 1 || !parsed.entries || typeof parsed.entries !== "object") throw new Error("invalid mapping envelope");
    stablePlaceIds = parsed.entries;
  } catch (error) {
    throw new Error(`NEPALMAP_STABLE_IDS=1 requires a valid ${mappingPath}. Run scripts/explore/nepal/update-place-ids.mjs against the current ingest first. Cause: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ---------- layer rows ----------
// Row: [name, name_ne, lat, lng, sub, ele, palika_id, ward, district_id, village_slug, wikipedia]
const rowsByCat = new Map(CATEGORIES.map((c) => [c.id, []]));
const sourceAdminConfidence = new Map();
for (const p of pois.concat(settlements)) if (p.osm_id || p.id) {
  sourceAdminConfidence.set(p.osm_id || p.id, {
    confidence: p.admin_confidence || null,
    boundary_distance_m: p.boundary_distance_m ?? null,
    reason: p.admin_confidence_reason || null,
  });
}
const catOfPoi = new Map(CATEGORIES.flatMap((c) => c.from.map((f) => [f, c.id])));
for (const p of pois) {
  const cat = catOfPoi.get(p.category);
  if (!cat || !p.did) continue;
  rowsByCat.get(cat).push([p.name || "", p.name_ne || "", p.lat, p.lng, cat === "services" ? p.category : p.sub || "", p.ele || 0, p.palika_id || 0, p.ward || 0, p.did, "", p.wikipedia || "", p.osm_id || p.id || ""]);
}
for (const s of settlements) {
  if (!s.did || !(s.name || s.name_ne)) continue;
  rowsByCat.get("village").push([s.name || "", s.name_ne || "", s.lat, s.lng, s.place, s.ele || 0, s.palika_id || 0, s.ward || 0, s.did, s.slug || "", "", s.osm_id || s.id || ""]);
}
for (const rows of rowsByCat.values()) rows.sort((a, b) => a[8] - b[8] || (a[0] || a[1]).localeCompare(b[0] || b[1]));
if (ROADMAP_FLAGS.nepalStablePlaceIds) {
  for (const rows of rowsByCat.values()) for (const row of rows) {
    const sourceId = row[11];
    const mapped = stablePlaceIds?.[sourceId]?.place_id;
    if (!mapped) throw new Error(`Stable place-ID mapping missing source ${sourceId}; refresh data/explore/nepal/place-id-map.json before enabling the flag.`);
    row.push(mapped);
  }
}

let boundaryAudit = null;
if (ROADMAP_FLAGS.nepalBoundaryConfidence) {
  const thresholds = {
    ambiguousKm: Number(process.env.NEPAL_BOUNDARY_AMBIGUOUS_KM || 0.25),
    mediumKm: Number(process.env.NEPAL_BOUNDARY_MEDIUM_KM || 1),
  };
  const summary = { high: 0, medium: 0, low: 0, unverified: 0, mismatches: 0, near_boundary: 0 };
  const sourcePath = process.env.NEPAL_BOUNDARY_GEOJSON ? resolve(ROOT, process.env.NEPAL_BOUNDARY_GEOJSON) : null;
  let fc = null;
  if (sourcePath) {
    fc = JSON.parse(await readFile(sourcePath, "utf8"));
    if (fc?.type !== "FeatureCollection" || !Array.isArray(fc.features) || !fc.features.length) throw new Error("Boundary source must be a non-empty GeoJSON FeatureCollection.");
  }
  for (const rows of rowsByCat.values()) for (const row of rows) {
    const native = sourceAdminConfidence.get(row[11]);
    let result;
    if (native?.confidence) {
      result = { confidence: native.confidence, boundary_distance_m: native.boundary_distance_m, reason: native.reason };
    } else if (fc) {
      result = classifyBoundaryConfidence([row[3], row[2]], fc.features, { palika_id: row[6], ward: row[7] }, thresholds);
    } else {
      throw new Error(`Boundary confidence missing for source ${row[11]}. Refresh osm_wards.py output or provide NEPAL_BOUNDARY_GEOJSON for independent QA.`);
    }
    row.push(result.confidence, result.boundary_distance_m, result.reason);
    summary[result.confidence] = (summary[result.confidence] || 0) + 1;
    if (/mismatch/.test(result.reason || "")) summary.mismatches++;
    if (/near_/.test(result.reason || "")) summary.near_boundary++;
  }
  boundaryAudit = {
    primary_source: "OpenStreetMap ward/palika polygons used by osm_wards.py",
    independent_qa_source: process.env.NEPAL_BOUNDARY_GEOJSON || null,
    source_revision: OSM_SNAPSHOT || "UNVERIFIED",
    source_license: "ODbL 1.0",
    thresholds,
    summary,
  };
}

// ---------- admin ----------
const bbox = new Map();
for (const rows of rowsByCat.values()) for (const r of rows) {
  const b = bbox.get(r[8]) || [180, 90, -180, -90];
  bbox.set(r[8], [Math.min(b[0], r[3]), Math.min(b[1], r[2]), Math.max(b[2], r[3]), Math.max(b[3], r[2])]);
}
const admin = {
  generated: LASTMOD,
  osm_snapshot: OSM_SNAPSHOT,
  source: sourceMeta?.source || "OpenStreetMap",
  licence: sourceMeta?.licence || "Places © OpenStreetMap contributors (ODbL); local levels: local-states-nepal (MIT)",
  provinces: [...province.values()].map((p) => ({ id: p.id, slug: p.slug, name: p.en, ne: p.neName, path: p.path })),
  districts: [...district.values()].map((d) => ({ id: d.id, slug: d.slug, name: d.en, ne: d.neName, province: d.province_id, path: d.path, bbox: (bbox.get(d.id) || []).map((x) => Math.round(x * 1e4) / 1e4) })),
  palikas: Object.fromEntries([...palika.values()].map((m) => [m.id, [m.slug, m.en, m.neName, m.district_id, m.wardCount, m.geo?.c || null, m.name]])),
  wards: Object.fromEntries(Object.entries(D.admin.wards).map(([k, w]) => [k, w.c])),
};

// ---------- write data ----------
const dataDir = join(OUT, "data/nepalmap/v1");
await rm(dataDir, { recursive: true, force: true });
await mkdir(dataDir, { recursive: true });
await mkdir(join(OUT, "nepalmap"), { recursive: true });
const fields = ["name", "name_ne", "lat", "lng", "sub", "ele", "palika_id", "ward", "district_id", "village_slug", "wikipedia", "source_id", ...(ROADMAP_FLAGS.nepalStablePlaceIds ? ["place_id"] : []), ...(ROADMAP_FLAGS.nepalBoundaryConfidence ? ["admin_confidence", "boundary_distance_m", "admin_confidence_reason"] : [])];
const ROW_INDEX = {
  name: 0, name_ne: 1, lat: 2, lng: 3, sub: 4, ele: 5, palika_id: 6, ward: 7, district_id: 8,
  village_slug: 9, wikipedia: 10, source_id: 11,
  place_id: ROADMAP_FLAGS.nepalStablePlaceIds ? 12 : -1,
  admin_confidence: ROADMAP_FLAGS.nepalBoundaryConfidence ? (ROADMAP_FLAGS.nepalStablePlaceIds ? 13 : 12) : -1,
  boundary_distance_m: ROADMAP_FLAGS.nepalBoundaryConfidence ? (ROADMAP_FLAGS.nepalStablePlaceIds ? 14 : 13) : -1,
  admin_confidence_reason: ROADMAP_FLAGS.nepalBoundaryConfidence ? (ROADMAP_FLAGS.nepalStablePlaceIds ? 15 : 14) : -1,
};
const sizes = {};
for (const c of CATEGORIES) {
  const text = JSON.stringify({ fields, rows: rowsByCat.get(c.id) });
  await writeFile(join(dataDir, `${c.id}.json`), text);
  sizes[c.id] = text.length;
}
await writeFile(join(dataDir, "admin.json"), JSON.stringify(admin));
if (boundaryAudit) await writeFile(join(dataDir, "boundary-confidence.json"), JSON.stringify(boundaryAudit, null, 2));
await writeFile(join(dataDir, "manifest.json"), JSON.stringify({
  dataset_id: "nepalmap-osm-places-v1",
  product: "nepalmap",
  source: {
    name: "OpenStreetMap contributors",
    url: "https://www.openstreetmap.org/copyright",
    id_namespace: "osm",
    license: "ODbL 1.0",
    license_url: "https://opendatacommons.org/licenses/odbl/1-0/",
    attribution: "© OpenStreetMap contributors",
  },
  snapshot_date: OSM_SNAPSHOT ? String(OSM_SNAPSHOT).slice(0, 10) : LASTMOD,
  build_date: LASTMOD,
  transformation_version: "nepalmap-v1",
  status: "published",
  confidence: OSM_SNAPSHOT ? 1 : 0,
  correction_route: { url: "/corrections", email: null },
  boundaries_version: admin.generated,
  notes: OSM_SNAPSHOT ? "Snapshot date is derived from the PBF osmosis replication timestamp captured by osm_wards.py." : "OSM extract timestamp unavailable; using legacy generated date and confidence 0.",
}, null, 2));

if (ROADMAP_FLAGS.nepalOfflinePacks) {
  const offlineDir = join(OUT, "nepalmap/offline");
  await mkdir(offlineDir, { recursive: true });
  const offlineIndex = [];
  for (const d of admin.districts) {
    const categories = {};
    let places = 0;
    for (const cat of CATEGORIES) {
      const rows = rowsByCat.get(cat.id).filter((row) => row[8] === d.id);
      categories[cat.id] = { fields, rows };
      places += rows.length;
    }
    const districtPalikas = Object.fromEntries(Object.entries(admin.palikas).filter(([, p]) => p[3] === d.id));
    const districtPalikaIds = new Set(Object.keys(districtPalikas));
    const districtWards = Object.fromEntries(Object.entries(admin.wards).filter(([key]) => districtPalikaIds.has(key.split("-")[0])));
    const payload = {
      version: 1,
      district: { id: d.id, slug: d.slug, name: d.name, ne: d.ne, province: d.province },
      admin: {
        generated: admin.generated,
        osm_snapshot: admin.osm_snapshot,
        source: admin.source,
        licence: admin.licence,
        provinces: admin.provinces,
        districts: [d],
        palikas: districtPalikas,
        wards: districtWards,
      },
      generated: LASTMOD,
      snapshot_date: OSM_SNAPSHOT ? String(OSM_SNAPSHOT).slice(0, 10) : LASTMOD,
      attribution: "© OpenStreetMap contributors, ODbL 1.0",
      basemap_included: false,
      categories,
    };
    const text = JSON.stringify(payload);
    await writeFile(join(offlineDir, d.slug + ".json"), text);
    offlineIndex.push({ slug: d.slug, name: d.name, ne: d.ne, places, bytes: Buffer.byteLength(text), url: "/nepalmap/offline/" + d.slug + ".json" });
  }
  await writeFile(join(offlineDir, "index.json"), JSON.stringify({ version: 1, generated: LASTMOD, basemap_included: false, districts: offlineIndex }, null, 2));
}

const appJs = await readFile(join(HERE, "map/app.js"), "utf8");
const routingV2Js = await readFile(join(HERE, "map/routing-v2.js"), "utf8");
const roadSafetyJs = await readFile(join(HERE, "map/road-safety.js"), "utf8");
const pmtilesPocJs = await readFile(join(HERE, "map/pmtiles-poc.js"), "utf8");
const terrainJs = await readFile(join(HERE, "map/terrain.js"), "utf8");
const offlineJs = await readFile(join(HERE, "map/offline.js"), "utf8");
const offlineSwJs = await readFile(join(HERE, "map/offline-sw.js"), "utf8");
const exportCoreJs = await readFile(join(HERE, "map/export-core.mjs"), "utf8");
const exportsJs = await readFile(join(HERE, "map/exports.mjs"), "utf8");
const searchWorkerJs = await readFile(join(HERE, "map/search-worker.js"), "utf8");
const searchCoreJs = await readFile(join(HERE, "map/search-core.mjs"), "utf8");
const css = await readFile(join(HERE, "map/style.css"), "utf8");
await writeFile(join(OUT, "nepalmap/app.js"), appJs);
await writeFile(join(OUT, "nepalmap/routing-v2.js"), routingV2Js);
await writeFile(join(OUT, "nepalmap/road-safety.js"), roadSafetyJs);
await writeFile(join(OUT, "nepalmap/pmtiles-poc.js"), pmtilesPocJs);
await writeFile(join(OUT, "nepalmap/terrain.js"), terrainJs);
await writeFile(join(OUT, "nepalmap/offline.js"), offlineJs);
await writeFile(join(OUT, "nepalmap/offline-sw.js"), offlineSwJs);
await writeFile(join(OUT, "nepalmap/export-core.mjs"), exportCoreJs);
await writeFile(join(OUT, "nepalmap/exports.mjs"), exportsJs);
await writeFile(join(OUT, "nepalmap/search-worker.js"), searchWorkerJs);
await writeFile(join(OUT, "nepalmap/search-core.mjs"), searchCoreJs);
await writeFile(join(OUT, "nepalmap/style.css"), css);
const version = createHash("sha256").update(appJs + routingV2Js + roadSafetyJs + pmtilesPocJs + terrainJs + offlineJs + offlineSwJs + exportCoreJs + exportsJs + searchWorkerJs + searchCoreJs + css + JSON.stringify(admin) + Object.values(sizes).join(",")).digest("hex").slice(0, 10);

// ---------- pages ----------
const clientCats = CATEGORIES.map(({ from, ...c }) => ({ ...c, file: `${c.id}.json`, total: rowsByCat.get(c.id).length }));
const countOf = (cat, religion) => rowsByCat.get(cat).filter((r) => !religion || religion.includes(r[4] || "other")).length;
const districtName = (did) => district.get(did);
const wardLink = (r) => {
  const m = palika.get(r[6]);
  if (m && r[7]) return { href: `${m.path}/ward-${r[7]}`, text: `${m.name}-${r[7]}, ${district.get(m.district_id).en}` };
  if (m) return { href: m.path, text: `${m.name}, ${district.get(m.district_id).en}` };
  const d = districtName(r[8]);
  return d ? { href: d.path, text: `${d.en} District` } : null;
};

function shell({ path, title, description, h1, intro, preset, content, schema }) {
  const canonical = SITE + path;
  const terrain = ROADMAP_FLAGS.nepalTerrain ? {
    tilejson: process.env.NEPALMAP_DEM_TILEJSON || "",
    attribution: process.env.NEPALMAP_DEM_ATTRIBUTION || "Elevation source must be configured",
  } : null;
  if (ROADMAP_FLAGS.nepalTerrain && !terrain.tilejson) throw new Error("NEPALMAP_TERRAIN=1 requires NEPALMAP_DEM_TILEJSON.");
  if (terrain && !terrain.tilejson.startsWith("/")) throw new Error("NEPALMAP_DEM_TILEJSON must be a same-origin path so the scoped CSP remains strict.");
  const pmtiles = ROADMAP_FLAGS.nepalPmtiles ? { places: "/data/nepalmap/v2/places.pmtiles", roads: process.env.NEPALMAP_PMTILES_ROADS === "1" ? "/data/nepalmap/v2/roads.pmtiles" : null } : null;
  const config = { data: "/data/nepalmap/v1/", version, categories: clientCats, flags: ROADMAP_FLAGS, ...(MAPLIBRE_WORKER ? { maplibreWorker: MAPLIBRE_WORKER } : {}), ...(terrain ? { terrain } : {}), ...(pmtiles ? { pmtiles } : {}), ...(preset ? { preset } : {}) };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:type" content="website"><meta property="og:image" content="${SITE}/og-default.png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://tiles.openfreemap.org" crossorigin>
<link rel="stylesheet" href="${MAPLIBRE_CSS}">
<link rel="stylesheet" href="/nepalmap/style.css?v=${version}">
<script type="application/ld+json">${jsonLd(schema)}</script>
</head><body>
<header class="np-top"><a class="home" href="/">आफ्नै पात्रो</a><nav><a href="/nepalmap">Nepal map</a><a href="/nepal">Nepal</a><a href="/nepalmap/temples">Temples</a><a href="/nepalmap/gumbas">Gumbas</a><a href="/nepalmap/mountains">Mountains</a><a href="/nepalmap/lakes">Lakes</a></nav></header>
<div class="np-head"><h1>${esc(h1)}</h1><p>${esc(intro)}</p></div>
<div class="np-app">
<aside class="np-panel" aria-label="Search and filters">
<button id="np-toggle" type="button" aria-label="Show or hide the panel"></button>
<div class="np-tabs" role="tablist"><button type="button" role="tab" data-tab="explore" aria-selected="true" class="on">Explore · खोज्नुहोस्</button><button type="button" role="tab" data-tab="route" aria-selected="false">🧭 From → To · बाटो</button></div>
<div id="np-route" class="np-route" hidden>
<div class="np-scroll">
<div class="np-field"><span class="np-dot a">A</span><input id="np-from" type="search" placeholder="From: place, village, palika + ward…" autocomplete="off" aria-label="From"><button type="button" class="np-mini" data-pick="from" title="Pick on the map">📌</button><ul class="np-sugg" id="np-from-sugg" hidden></ul></div>
<div class="np-swaprow"><button type="button" id="np-me-from" class="np-mini wide">📍 From my location</button><button type="button" id="np-swap" class="np-mini" title="Swap From and To" aria-label="Swap">⇅</button></div>
<div class="np-field"><span class="np-dot b">B</span><input id="np-to" type="search" placeholder="To: temple, peak, lake, town…" autocomplete="off" aria-label="To"><button type="button" class="np-mini" data-pick="to" title="Pick on the map">📌</button><ul class="np-sugg" id="np-to-sugg" hidden></ul></div>
<div class="np-modes" role="radiogroup" aria-label="Travel by"><button type="button" data-mode="car" class="on">🚗 Car / bus</button><button type="button" data-mode="bike">🏍️ Bike</button><button type="button" data-mode="foot">🚶 Walk / trek</button></div>
<p id="np-route-msg" class="np-note">Choose where you start and where you want to go, or tap any place on the map and pick <b>From here</b> / <b>To here</b>.</p>
<p class="np-note np-privacy"><strong>Privacy:</strong> If you calculate a route, the A/B coordinates are sent to the external FOSSGIS routing service. AafnaiPatro does not put precise coordinates in analytics.</p>
<div id="np-route-sum" hidden></div>
<div id="np-along-wrap" hidden><h3>Along the way · बाटोमा पर्ने ठाउँ</h3><p class="np-note" id="np-along-head"></p><ol id="np-along"></ol></div>
<details id="np-steps-wrap" hidden><summary>Turn-by-turn directions</summary><ol id="np-steps"></ol></details>
</div>
</div>
<div class="np-explore">
<div class="np-search"><input id="np-q" type="search" placeholder="Search a temple, peak, village, palika or ward…" autocomplete="off" aria-label="Search the map"><ul id="np-results" hidden></ul></div>
<div class="np-scroll">
<div class="np-row"><select id="np-district" aria-label="District"><option value="">All of Nepal</option></select><button id="np-near" type="button" aria-describedby="np-location-privacy">📍 Near me</button>${ROADMAP_FLAGS.nepalOfflinePacks ? `<button id="np-offline-save" type="button" disabled>Save district offline</button>` : ""}<button id="np-reset" type="button">Reset</button></div>
<p id="np-location-privacy" class="np-note np-privacy">Privacy: “Near me” asks your browser for precise location only after a disclosure. It stays in this tab and is not sent to AafnaiPatro analytics.</p>
<a id="np-district-link" hidden></a>
<div id="np-cats" role="group" aria-label="What to show"></div>
<fieldset id="np-religion" hidden><legend>Religion</legend>${Object.entries(RELIGION_SUBS).filter(([k]) => k !== "bon").map(([k, v]) => `<label><input type="checkbox" value="${k}"> ${esc(k === "other" ? "Other / unknown" : v.split(" /")[0])}</label>`).join("")}</fieldset>
<fieldset id="np-ele-wrap" hidden><legend>Peak height</legend><input id="np-ele" type="range" min="0" max="8000" step="250" value="0" aria-label="Minimum height in metres"> <span id="np-ele-out">any height</span></fieldset>
<p id="np-list-head">Loading the map…</p>
<ol id="np-list"></ol>
</div>
</div>
</aside>
<div id="np-map" role="region" aria-label="Map of Nepal"></div>
</div>
<main class="np-content">${content}</main>
<footer>Places © <a href="https://www.openstreetmap.org/copyright" rel="nofollow noopener">OpenStreetMap contributors</a> (ODbL), matched to wards by Aafnai Patro. Base map © <a href="https://openfreemap.org" rel="nofollow noopener">OpenFreeMap</a>. Routes © <a href="https://www.openstreetmap.org/copyright" rel="nofollow noopener">OpenStreetMap contributors</a>, computed by <a href="https://project-osrm.org/" rel="nofollow noopener">OSRM</a> on <a href="https://routing.openstreetmap.de/about.html" rel="nofollow noopener">FOSSGIS</a> servers. Last updated ${LASTMOD}. Spotted a missing temple or a wrong place? Add or fix it on OpenStreetMap and it appears here after the next monthly refresh, or <a href="/corrections">tell us</a>.</footer>
<script>window.NEPALMAP=${JSON.stringify(config).replace(/</g, "\\u003c")};</script>
<script src="${MAPLIBRE_JS}" defer></script>
${ROADMAP_FLAGS.nepalPmtiles ? `<script src="/vendor/nepalmap/pmtiles-4.5.0/pmtiles.js" defer></script><script src="/nepalmap/pmtiles-poc.js?v=${version}" defer></script>` : ""}
${ROADMAP_FLAGS.nepalRoadSafety ? `<script src="/nepalmap/road-safety.js?v=${version}" defer></script>` : ""}
${ROADMAP_FLAGS.nepalTerrain ? `<script src="/nepalmap/terrain.js?v=${version}" defer></script>` : ""}
${ROADMAP_FLAGS.nepalOfflinePacks ? `<script src="/nepalmap/offline.js?v=${version}" defer></script>` : ""}
${ROADMAP_FLAGS.nepalExports ? `<script type="module" src="/nepalmap/exports.mjs?v=${version}"></script>` : ""}
${ROADMAP_FLAGS.nepalRoutingProviderV2 ? `<script src="/nepalmap/routing-v2.js?v=${version}" defer></script>` : ""}
<script src="/nepalmap/app.js?v=${version}" defer></script>
</body></html>`;
}

const breadcrumb = (items) => ({ "@type": "BreadcrumbList", itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + path })) });

// Main page
const cards = LANDINGS.map((l) => `<a href="/nepalmap/${l.slug}"><b>${esc(l.noun[0].toUpperCase() + l.noun.slice(1))}</b><span>${fmt(countOf(l.cat, l.religion))} on the map · ${esc(l.ne)}</span></a>`).join("");
const provinceRows = [...province.values()].map((p) => {
  const dids = new Set([...district.values()].filter((d) => d.province_id === p.id).map((d) => d.id));
  const n = (cat, rel) => rowsByCat.get(cat).filter((r) => dids.has(r[8]) && (!rel || rel.includes(r[4]))).length;
  return `<tr><td><a href="${p.path}">${esc(p.en)}</a></td><td>${fmt(n("worship", ["hindu"]))}</td><td>${fmt(n("worship", ["buddhist"]))}</td><td>${fmt(n("peak"))}</td><td>${fmt(n("lake"))}</td><td>${fmt(n("school"))}</td></tr>`;
}).join("");
const districtLinks = [...district.values()].sort((a, b) => a.en.localeCompare(b.en)).map((d) => `<li><a href="${d.path}">${esc(d.en)}</a> <span lang="ne">${esc(d.neName)}</span> · <a href="/nepalmap?d=${d.slug}">map</a></li>`).join("");
const totalPlaces = [...rowsByCat.values()].reduce((s, r) => s + r.length, 0);
const pages = [];
pages.push({
  path: "/nepalmap",
  html: shell({
    path: "/nepalmap",
    title: "Nepal Map: Temples, Gumbas, Mountains, Lakes, Villages & Wards | आफ्नै पात्रो",
    description: `Interactive map of Nepal with ${fmt(countOf("worship"))} temples, gumbas, mosques and churches, ${fmt(countOf("peak"))} peaks, ${fmt(countOf("lake"))} lakes, ${fmt(countOf("village"))} villages and every ward. Search, filter by district and get directions.`,
    h1: "Nepal map: temples, gumbas, mountains, villages and wards",
    intro: `${fmt(totalPlaces)} named places from OpenStreetMap, each placed in its palika and ward. Search by name in English or Nepali, pick a district, turn kinds of places on and off, or tap “Near me”. Plan a trip with “From → To” to see the road or trail and every temple, peak and lake along the way.`,
    content: `<section><h2>What's on the map</h2><div class="np-cards">${cards}</div></section>
<section><h2>By province</h2><div class="tw"><table><thead><tr><th>Province</th><th>Hindu temples</th><th>Gumbas</th><th>Peaks</th><th>Lakes</th><th>Schools</th></tr></thead><tbody>${provinceRows}</tbody></table></div></section>
<section><h2>Districts of Nepal</h2><p>Every district page lists its palikas, all wards, the former VDCs and what each old ward is now.</p><ul class="cols">${districtLinks}</ul></section>
<section><h2>How to use the map</h2><ul><li>Type a place in English or Nepali (“Pashupatinath”, “पाथीभरा”), a palika (“Jayaprithvi”) or a palika and ward number (“Jayaprithvi 11”).</li><li>Choose a district to see only its places; the link under it opens the district's wards and former VDCs.</li><li>Tap a place for directions in Google Maps, the OpenStreetMap entry, its ward page and Wikipedia when there is one.</li><li>Share exactly what you see: the address bar keeps the filters and the map position.</li></ul></section>${ROADMAP_FLAGS.nepalVisitorMode ? `<section id="visitor-guide"><h2>Nepal map terms for international visitors</h2><dl><dt>Province</dt><dd>Nepal's top-level federal administrative division.</dd><dt>District</dt><dd>An administrative area within a province.</dd><dt>Municipality / Rural Municipality</dt><dd>Local government level; rural municipalities are commonly called gaunpalika.</dd><dt>Ward</dt><dd>The smallest elected local-government division used on these pages.</dd><dt>Temple / Gumba</dt><dd>Temple is used for Hindu shrines; “gumba” is retained for Buddhist monasteries rather than replaced with an English-only label.</dd></dl><p>Distances are metric. Elevation is shown in metres. Road and trail conditions can change by season, so a calculated route is not a safety guarantee.</p></section>` : ""}${ROADMAP_FLAGS.provenanceUi ? `<section id="about-data"><h2>About this data</h2><p>Places come from <a href="https://www.openstreetmap.org/copyright" rel="nofollow noopener">OpenStreetMap contributors</a> under ODbL 1.0. ${OSM_SNAPSHOT ? `The source extract reports OSM replication timestamp <code>${esc(OSM_SNAPSHOT)}</code>.` : "The exact upstream extract timestamp is currently unverified."} Administrative matching uses the Nepal local-level datasets documented in the repository.</p><p><a href="/data/nepalmap/v1/manifest.json">Machine-readable source and freshness manifest</a> · <a href="/corrections">Report a correction</a></p></section>` : ""}`,
    schema: { "@context": "https://schema.org", "@graph": [
      { "@type": "WebPage", "@id": SITE + "/nepalmap", url: SITE + "/nepalmap", name: "Nepal map", inLanguage: ["en", "ne"], dateModified: LASTMOD, about: { "@type": "Country", name: "Nepal" } },
      { "@type": "Map", name: "Nepal map: temples, gumbas, mountains, villages and wards", url: SITE + "/nepalmap", mapType: "https://schema.org/VenueMap" },
      breadcrumb([["आफ्नै पात्रो", "/"], ["Nepal", "/nepal"], ["Nepal map", "/nepalmap"]]),
    ] },
  }),
});

for (const l of LANDINGS) {
  const rows = rowsByCat.get(l.cat).filter((r) => !l.religion || l.religion.includes(r[4] || "other"));
  const byDistrict = new Map();
  for (const r of rows) byDistrict.set(r[8], (byDistrict.get(r[8]) || 0) + 1);
  const dRows = [...byDistrict].sort((a, b) => b[1] - a[1]).map(([did, n]) => {
    const d = district.get(did);
    return `<tr><td><a href="${d.path}">${esc(d.en)}</a> <span lang="ne">${esc(d.neName)}</span></td><td>${fmt(n)}</td><td><a href="/nepalmap/${l.slug}?d=${d.slug}">Show on map</a></td></tr>`;
  }).join("");
  const isPeak = l.cat === "peak";
  const ranked = [...rows].filter((r) => r[0] || r[1]).sort((a, b) => (isPeak ? b[5] - a[5] : 0) || (b[10] ? 1 : 0) - (a[10] ? 1 : 0) || (b[1] ? 1 : 0) - (a[1] ? 1 : 0) || (a[0] || a[1]).localeCompare(b[0] || b[1]));
  const shown = ranked.slice(0, 400);
  const items = shown.map((r) => {
    const w = wardLink(r);
    const extra = [isPeak && r[5] ? `${fmt(r[5])} m` : "", l.cat === "worship" && !l.religion && r[4] ? RELIGION_SUBS[r[4]] || "" : ""].filter(Boolean).join(" · ");
    return `<li>${esc(r[0] || r[1])}${r[0] && r[1] ? ` <span lang="ne">${esc(r[1])}</span>` : ""}${extra ? ` · ${esc(extra)}` : ""}${w ? ` — <a href="${w.href}">${esc(w.text)}</a>` : ""}</li>`;
  }).join("");
  const top = [...byDistrict].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([did, n]) => `${district.get(did).en} (${fmt(n)})`).join(", ");
  const nounCap = l.noun[0].toUpperCase() + l.noun.slice(1);
  const path = `/nepalmap/${l.slug}`;
  pages.push({
    path,
    html: shell({
      path,
      title: `${l.h1} (${fmt(rows.length)}) · ${l.ne} | आफ्नै पात्रो`,
      description: `Map of ${fmt(rows.length)} ${l.noun} in Nepal from OpenStreetMap, by district, palika and ward${top ? `; most in ${top}` : ""}. Search, filter and get directions.`,
      h1: l.h1,
      intro: `${fmt(rows.length)} ${l.noun} in all ${byDistrict.size} districts that have them, each placed in its palika and ward.${top ? ` The most are in ${top}.` : ""}`,
      preset: { categories: [l.cat], ...(l.religion ? { religion: l.religion } : {}) },
      content: `<section><h2>${esc(nounCap)} by district</h2><div class="tw"><table><thead><tr><th>District</th><th>${esc(nounCap)}</th><th></th></tr></thead><tbody>${dRows}</tbody></table></div></section>
<section><h2>${shown.length < rows.length ? `${fmt(shown.length)} of the ${fmt(rows.length)} ${esc(l.noun)}` : `All ${fmt(rows.length)} ${esc(l.noun)}`}${isPeak ? ", highest first" : ""}</h2><ul class="cols">${items}</ul>${shown.length < rows.length ? `<p>Use the search box or choose a district to see all ${fmt(rows.length)} on the map.</p>` : ""}</section>
<section><h2>More maps</h2><div class="np-cards">${LANDINGS.filter((x) => x !== l).map((x) => `<a href="/nepalmap/${x.slug}"><b>${esc(x.noun[0].toUpperCase() + x.noun.slice(1))}</b><span>${fmt(countOf(x.cat, x.religion))}</span></a>`).join("")}</div></section>`,
      schema: { "@context": "https://schema.org", "@graph": [
        { "@type": "WebPage", "@id": SITE + path, url: SITE + path, name: l.h1, inLanguage: ["en", "ne"], dateModified: LASTMOD },
        { "@type": "ItemList", name: `${nounCap} in Nepal`, numberOfItems: rows.length, itemListElement: shown.slice(0, 30).map((r, i) => ({ "@type": "ListItem", position: i + 1, item: { "@type": "Place", name: r[0] || r[1], geo: { "@type": "GeoCoordinates", latitude: r[2], longitude: r[3] } } })) },
        breadcrumb([["आफ्नै पात्रो", "/"], ["Nepal map", "/nepalmap"], [l.h1, path]]),
      ] },
    }),
  });
}


if (ROADMAP_FLAGS.nepalPoiPages) {
  if (!ROADMAP_FLAGS.nepalStablePlaceIds) throw new Error("NEPALMAP_POI_PAGES=1 requires NEPALMAP_STABLE_IDS=1 so detail URLs never depend on mutable names or temporary row indices.");
  const maxPoiPages = Math.max(1, Math.min(2000, Number(process.env.NEPALMAP_MAX_POI_PAGES || 500)));
  const candidates = [];
  for (const cat of CATEGORIES) {
    const rows = rowsByCat.get(cat.id);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!(r[ROW_INDEX.name] || r[ROW_INDEX.name_ne]) || !r[ROW_INDEX.source_id] || !r[ROW_INDEX.place_id]) continue;
      let score = 0;
      if (r[ROW_INDEX.wikipedia]) score += 5;
      if (r[ROW_INDEX.name_ne]) score += 1;
      if (r[ROW_INDEX.palika_id] && r[ROW_INDEX.ward]) score += 1;
      if (ROW_INDEX.admin_confidence >= 0 && /^(high|medium)$/.test(r[ROW_INDEX.admin_confidence] || "")) score += 1;
      if (cat.id === "peak" && Number(r[ROW_INDEX.ele]) >= 5000) score += 4;
      if (["sight","park","lake","waterfall","airport"].includes(cat.id)) score += 1;
      if (score < 6) continue;
      candidates.push({ cat, row: r, score, index: i });
    }
  }
  candidates.sort((a, b) => b.score - a.score || (b.row[ROW_INDEX.wikipedia] ? 1 : 0) - (a.row[ROW_INDEX.wikipedia] ? 1 : 0) || String(a.row[ROW_INDEX.place_id]).localeCompare(String(b.row[ROW_INDEX.place_id])));
  for (const item of candidates.slice(0, maxPoiPages)) {
    const r = item.row, cat = item.cat;
    const placeId = r[ROW_INDEX.place_id], sourceId = r[ROW_INDEX.source_id];
    const name = r[ROW_INDEX.name] || r[ROW_INDEX.name_ne];
    const where = wardLink(r);
    const pinfo = palika.get(r[ROW_INDEX.palika_id]);
    const d = district.get(r[ROW_INDEX.district_id] || pinfo?.district_id);
    const wiki = r[ROW_INDEX.wikipedia] ? "https://" + r[ROW_INDEX.wikipedia].split(":")[0] + ".wikipedia.org/wiki/" + encodeURIComponent(r[ROW_INDEX.wikipedia].slice(3).replace(/ /g, "_")) : "";
    const osmType = sourceId[0] === "n" ? "node" : sourceId[0] === "w" ? "way" : sourceId[0] === "r" ? "relation" : "";
    const osmUrl = osmType ? "https://www.openstreetmap.org/" + osmType + "/" + sourceId.slice(1) : "https://www.openstreetmap.org/";
    const path = "/nepalmap/place/" + placeId;
    const confidence = ROW_INDEX.admin_confidence >= 0 ? r[ROW_INDEX.admin_confidence] : "";
    const boundaryDistance = ROW_INDEX.boundary_distance_m >= 0 ? r[ROW_INDEX.boundary_distance_m] : null;
    const factRows = [
      ["Type", cat.one + (r[ROW_INDEX.sub] ? " · " + (cat.subs?.[r[ROW_INDEX.sub]] || r[ROW_INDEX.sub]) : "")],
      ["Nepali name", r[ROW_INDEX.name_ne] || ""],
      ["Elevation", r[ROW_INDEX.ele] ? fmt(r[ROW_INDEX.ele], 0) + " m" : ""],
      ["Administrative area", where?.text || d?.en || ""],
      ["Coordinates", Number(r[ROW_INDEX.lat]).toFixed(5) + ", " + Number(r[ROW_INDEX.lng]).toFixed(5)],
      ["Admin match confidence", confidence ? confidence + (boundaryDistance != null ? " · " + fmt(boundaryDistance, 0) + " m from mapped boundary" : "") : ""],
      ["OpenStreetMap source", sourceId],
      ["AafnaiPatro place ID", placeId],
    ].filter((x) => x[1]).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("");
    const graph = [
      {
        "@type": "Place",
        "@id": SITE + path + "#place",
        name,
        ...(r[ROW_INDEX.name_ne] && r[ROW_INDEX.name_ne] !== name ? { alternateName: r[ROW_INDEX.name_ne] } : {}),
        identifier: [{ "@type": "PropertyValue", propertyID: "AafnaiPatro place_id", value: placeId }, { "@type": "PropertyValue", propertyID: "OpenStreetMap", value: sourceId }],
        geo: { "@type": "GeoCoordinates", latitude: r[ROW_INDEX.lat], longitude: r[ROW_INDEX.lng] },
        ...(d ? { containedInPlace: { "@type": "AdministrativeArea", name: d.en } } : {}),
        ...(wiki ? { sameAs: [wiki, osmUrl] } : { sameAs: [osmUrl] }),
      },
      { "@type": "WebPage", "@id": SITE + path, url: SITE + path, name: name + " — Nepal map", dateModified: LASTMOD, mainEntity: { "@id": SITE + path + "#place" } },
      breadcrumb([["आफ्नै पात्रो", "/"], ["Nepal map", "/nepalmap"], [name, path]]),
    ];
    pages.push({
      path,
      html: shell({
        path,
        title: `${name} — map, ward, coordinates and source | आफ्नै पात्रो`,
        description: `${name} in Nepal: map location, ${where?.text || d?.en || "administrative area"}, coordinates${r[ROW_INDEX.ele] ? ", elevation " + fmt(r[ROW_INDEX.ele], 0) + " m" : ""}, OpenStreetMap source and correction links.`,
        h1: name,
        intro: `${cat.one} in ${where?.text || d?.en || "Nepal"}, with source-transparent coordinates and administrative matching.`,
        preset: { categories: [cat.id] },
        content: `<section><h2>Place facts</h2><div class="tw"><table><tbody>${factRows}</tbody></table></div></section>
<section><h2>Map and source</h2><p><a href="/nepalmap?c=${cat.id}&ll=${r[ROW_INDEX.lat]},${r[ROW_INDEX.lng]},15">Open this place on Nepal Map</a> · <a href="${esc(osmUrl)}" rel="noopener nofollow">OpenStreetMap object</a>${wiki ? ` · <a href="${esc(wiki)}" rel="noopener nofollow">Wikipedia</a>` : ""}</p><p><a href="/corrections?source_id=${encodeURIComponent(sourceId)}&place_id=${encodeURIComponent(placeId)}">Report a correction</a></p></section>
<section><h2>Data confidence</h2><p>${confidence ? `Administrative match: <strong>${esc(confidence)}</strong>${boundaryDistance != null ? `; mapped point is about ${fmt(boundaryDistance, 0)} m from the assigned boundary` : ""}.` : "Boundary confidence has not yet been generated for this build."} Names and map data can change upstream; use the OpenStreetMap link to inspect the current source.</p></section>`,
        schema: { "@context": "https://schema.org", "@graph": graph },
      }),
    });
  }
}

for (const p of pages) {
  const file = p.path === "/nepalmap" ? join(OUT, "nepalmap.html") : join(OUT, `${p.path.slice(1)}.html`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, p.html);
}
await writeFile(join(OUT, "sitemap-nepalmap.xml"), ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...pages.map((p) => `  <url><loc>${SITE}${p.path}</loc><lastmod>${LASTMOD}</lastmod></url>`), "</urlset>", ""].join("\n"));
console.log(`Nepal map: ${pages.length} pages, ${fmt(totalPlaces)} places in ${CATEGORIES.length} layers (${Object.entries(sizes).map(([k, v]) => `${k} ${Math.round(v / 1024)} KB`).join(", ")}) → ${OUT}`);
