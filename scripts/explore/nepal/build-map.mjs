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

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");
const args = process.argv.slice(2);
const OUT = resolve(ROOT, args.includes("--out") ? args[args.indexOf("--out") + 1] : "public");
const SITE = (process.env.PUBLIC_SITE_URL || "https://aafnaipatro.com").replace(/\/+$/, "");
const MAPLIBRE = "https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl";
const LASTMOD = "2026-10-11";

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
const { province, district, palika, settlements, pois } = D;

// ---------- layer rows ----------
// Row: [name, name_ne, lat, lng, sub, ele, palika_id, ward, district_id, village_slug, wikipedia]
const rowsByCat = new Map(CATEGORIES.map((c) => [c.id, []]));
const catOfPoi = new Map(CATEGORIES.flatMap((c) => c.from.map((f) => [f, c.id])));
for (const p of pois) {
  const cat = catOfPoi.get(p.category);
  if (!cat || !p.did) continue;
  rowsByCat.get(cat).push([p.name || "", p.name_ne || "", p.lat, p.lng, cat === "services" ? p.category : p.sub || "", p.ele || 0, p.palika_id || 0, p.ward || 0, p.did, "", p.wikipedia || ""]);
}
for (const s of settlements) {
  if (!s.did || !(s.name || s.name_ne)) continue;
  rowsByCat.get("village").push([s.name || "", s.name_ne || "", s.lat, s.lng, s.place, s.ele || 0, s.palika_id || 0, s.ward || 0, s.did, s.slug || "", ""]);
}
for (const rows of rowsByCat.values()) rows.sort((a, b) => a[8] - b[8] || (a[0] || a[1]).localeCompare(b[0] || b[1]));

// ---------- admin ----------
const bbox = new Map();
for (const rows of rowsByCat.values()) for (const r of rows) {
  const b = bbox.get(r[8]) || [180, 90, -180, -90];
  bbox.set(r[8], [Math.min(b[0], r[3]), Math.min(b[1], r[2]), Math.max(b[2], r[3]), Math.max(b[3], r[2])]);
}
const admin = {
  generated: LASTMOD,
  licence: "Places © OpenStreetMap contributors (ODbL); local levels: local-states-nepal (MIT)",
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
const fields = ["name", "name_ne", "lat", "lng", "sub", "ele", "palika_id", "ward", "district_id", "village_slug", "wikipedia"];
const sizes = {};
for (const c of CATEGORIES) {
  const text = JSON.stringify({ fields, rows: rowsByCat.get(c.id) });
  await writeFile(join(dataDir, `${c.id}.json`), text);
  sizes[c.id] = text.length;
}
await writeFile(join(dataDir, "admin.json"), JSON.stringify(admin));

const appJs = await readFile(join(HERE, "map/app.js"), "utf8");
const css = await readFile(join(HERE, "map/style.css"), "utf8");
await writeFile(join(OUT, "nepalmap/app.js"), appJs);
await writeFile(join(OUT, "nepalmap/style.css"), css);
const version = createHash("sha256").update(appJs + css + JSON.stringify(admin) + Object.values(sizes).join(",")).digest("hex").slice(0, 10);

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
  const config = { data: "/data/nepalmap/v1/", version, categories: clientCats, ...(preset ? { preset } : {}) };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:type" content="website"><meta property="og:image" content="${SITE}/og-default.png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://tiles.openfreemap.org" crossorigin>
<link rel="stylesheet" href="${MAPLIBRE}.css">
<link rel="stylesheet" href="/nepalmap/style.css?v=${version}">
<script type="application/ld+json">${jsonLd(schema)}</script>
</head><body>
<header class="np-top"><a class="home" href="/">आफ्नै पात्रो</a><nav><a href="/nepalmap">Nepal map</a><a href="/nepal">Nepal</a><a href="/nepalmap/temples">Temples</a><a href="/nepalmap/gumbas">Gumbas</a><a href="/nepalmap/mountains">Mountains</a><a href="/nepalmap/lakes">Lakes</a></nav></header>
<div class="np-head"><h1>${esc(h1)}</h1><p>${esc(intro)}</p></div>
<div class="np-app">
<aside class="np-panel" aria-label="Search and filters">
<button id="np-toggle" type="button" aria-label="Show or hide the panel"></button>
<div class="np-search"><input id="np-q" type="search" placeholder="Search a temple, peak, village, palika or ward…" autocomplete="off" aria-label="Search the map"><ul id="np-results" hidden></ul></div>
<div class="np-scroll">
<div class="np-row"><select id="np-district" aria-label="District"><option value="">All of Nepal</option></select><button id="np-near" type="button">📍 Near me</button><button id="np-reset" type="button">Reset</button></div>
<a id="np-district-link" hidden></a>
<div id="np-cats" role="group" aria-label="What to show"></div>
<fieldset id="np-religion" hidden><legend>Religion</legend>${Object.entries(RELIGION_SUBS).filter(([k]) => k !== "bon").map(([k, v]) => `<label><input type="checkbox" value="${k}"> ${esc(k === "other" ? "Other / unknown" : v.split(" /")[0])}</label>`).join("")}</fieldset>
<fieldset id="np-ele-wrap" hidden><legend>Peak height</legend><input id="np-ele" type="range" min="0" max="8000" step="250" value="0" aria-label="Minimum height in metres"> <span id="np-ele-out">any height</span></fieldset>
<p id="np-list-head">Loading the map…</p>
<ol id="np-list"></ol>
</div>
</aside>
<div id="np-map" role="region" aria-label="Map of Nepal"></div>
</div>
<main class="np-content">${content}</main>
<footer>Places © <a href="https://www.openstreetmap.org/copyright" rel="nofollow noopener">OpenStreetMap contributors</a> (ODbL), matched to wards by Aafnai Patro. Base map © <a href="https://openfreemap.org" rel="nofollow noopener">OpenFreeMap</a>. Last updated ${LASTMOD}. Spotted a missing temple or a wrong place? Add or fix it on OpenStreetMap and it appears here after the next monthly refresh, or <a href="/corrections">tell us</a>.</footer>
<script>window.NEPALMAP=${JSON.stringify(config).replace(/</g, "\\u003c")};</script>
<script src="${MAPLIBRE}.js" defer></script>
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
    intro: `${fmt(totalPlaces)} named places from OpenStreetMap, each placed in its palika and ward. Search by name in English or Nepali, pick a district, turn kinds of places on and off, or tap “Near me”.`,
    content: `<section><h2>What's on the map</h2><div class="np-cards">${cards}</div></section>
<section><h2>By province</h2><div class="tw"><table><thead><tr><th>Province</th><th>Hindu temples</th><th>Gumbas</th><th>Peaks</th><th>Lakes</th><th>Schools</th></tr></thead><tbody>${provinceRows}</tbody></table></div></section>
<section><h2>Districts of Nepal</h2><p>Every district page lists its palikas, all wards, the former VDCs and what each old ward is now.</p><ul class="cols">${districtLinks}</ul></section>
<section><h2>How to use the map</h2><ul><li>Type a place in English or Nepali (“Pashupatinath”, “पाथीभरा”), a palika (“Jayaprithvi”) or a palika and ward number (“Jayaprithvi 11”).</li><li>Choose a district to see only its places; the link under it opens the district's wards and former VDCs.</li><li>Tap a place for directions in Google Maps, the OpenStreetMap entry, its ward page and Wikipedia when there is one.</li><li>Share exactly what you see: the address bar keeps the filters and the map position.</li></ul></section>`,
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

for (const p of pages) {
  const file = p.path === "/nepalmap" ? join(OUT, "nepalmap.html") : join(OUT, `${p.path.slice(1)}.html`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, p.html);
}
await writeFile(join(OUT, "sitemap-nepalmap.xml"), ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...pages.map((p) => `  <url><loc>${SITE}${p.path}</loc><lastmod>${LASTMOD}</lastmod></url>`), "</urlset>", ""].join("\n"));
console.log(`Nepal map: ${pages.length} pages, ${fmt(totalPlaces)} places in ${CATEGORIES.length} layers (${Object.entries(sizes).map(([k, v]) => `${k} ${Math.round(v / 1024)} KB`).join(", ")}) → ${OUT}`);
