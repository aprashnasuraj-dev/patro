// Nepal family: /nepal/{province}-province, /nepal/{district}, /nepal/{district}/{palika}, /nepal/{district}/{palika}/ward-{n},
// /nepal/{district}/{palika}/{village}, /nepal/{district}/vdc and /nepal/{district}/vdc/{old-vdc}.
//
// Sources (every fact on a page comes from one of these; nothing is invented):
//   data/explore/places/source       local-states-nepal (MIT): provinces, districts, palikas, ward counts, areas, websites
//   data/explore/nepal/vdc-wards.json World Bank 2011→2018 old-ward → new-ward mapping, via nepal-address-data (CC0)
//   data/explore/nepal/osm-*.json     OpenStreetMap (ODbL): ward boundaries (area, centre, neighbours), villages, landmarks
//   worker/explore/nepal-geo.json     canonical slugs, official English spellings and the misspellings that redirect
// Sunrise and sunset come from the site's own astronomy code (src/patro-tools/core/astro.ts) and the BS calendar
// from packages/core/src/bsDate.ts, bundled on the fly with esbuild so the numbers match the rest of Aafnai Patro.
//
// /nepal itself stays the existing growth page (families.json: serve_root false); this adapter still yields a root
// record because the build needs a parent for the province and district pages.
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const id = "nepal";

const LASTMOD = "2026-10-11";
const BS_YEAR = 2083;
const SRC_DIR = "data/explore/places/source";
const DATA_DIR = "data/explore/nepal";

const SOURCES = {
  states: { name: "local-states-nepal (MIT licence)", url: "https://github.com/sagautam5/local-states-nepal" },
  vdc: { name: "World Bank Nepal ward mapping 2011→2018, via nepal-address-data (CC0)", url: "https://github.com/en-shushant/nepal-address-data" },
  osm: { name: "© OpenStreetMap contributors (ODbL)", url: "https://www.openstreetmap.org/copyright" },
};

export const slugify = (value) => String(value).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const fixNe = (value) => String(value || "").replace(/ाे/g, "ो").trim();
const num = (value) => Number(String(value).replace(/,/g, ""));
const fmt = (value, digits = 2) => num(value).toLocaleString("en-IN", { maximumFractionDigits: digits });
const NE_DIGITS = "०१२३४५६७८९";
const neNum = (value) => String(value).replace(/[0-9]/g, (d) => NE_DIGITS[Number(d)]);
const plural = (n, one, many = one + "s") => `${fmt(n, 0)} ${n === 1 ? one : many}`;

// Nepali district names where the source's spelling is non-standard.
const DISTRICT_NE = { 5: "खोटाङ", 6: "मोरङ", 8: "पाँचथर", 10: "सोलुखुम्बु", 12: "ताप्लेजुङ", 25: "धादिङ", 28: "काभ्रेपलाञ्चोक", 35: "सिन्धुपाल्चोक", 45: "स्याङ्जा", 56: "रुकुम पूर्व", 59: "रुकुम पश्चिम" };
const PROVINCE_NE = { 7: "सुदूरपश्चिम प्रदेश" };
const CATEGORY_EN = { 1: "Metropolitan City", 2: "Sub-Metropolitan City", 3: "Municipality", 4: "Rural Municipality" };
const CATEGORY_NE = { 1: "महानगरपालिका", 2: "उपमहानगरपालिका", 3: "नगरपालिका", 4: "गाउँपालिका" };
const OLD_TYPE = {
  vdc: ["VDC", "गाविस", "Village Development Committee"],
  municipality: ["Municipality", "नगरपालिका", "Municipality"],
  "sub-metropolitan": ["Sub-Metropolitan City", "उपमहानगरपालिका", "Sub-Metropolitan City"],
  metropolitan: ["Metropolitan City", "महानगरपालिका", "Metropolitan City"],
  "protected-area": ["", "", "Protected area"],
};
const BS_MONTHS = [["Baisakh", "बैशाख"], ["Jestha", "जेठ"], ["Asar", "असार"], ["Shrawan", "साउन"], ["Bhadra", "भदौ"], ["Ashwin", "असोज"], ["Kartik", "कात्तिक"], ["Mangsir", "मंसिर"], ["Poush", "पुस"], ["Magh", "माघ"], ["Falgun", "फागुन"], ["Chaitra", "चैत"]];
const POI = {
  worship: ["Temples, gumbas, mosques and churches", "मन्दिर, गुम्बा, मस्जिद र चर्च"],
  school: ["Schools and colleges", "विद्यालय तथा कलेज"],
  health: ["Hospitals and health posts", "अस्पताल तथा स्वास्थ्य संस्था"],
  office: ["Government offices", "सरकारी कार्यालय"],
  police: ["Police", "प्रहरी"],
  post: ["Post offices", "हुलाक"],
  bank: ["Banks", "बैंक"],
  market: ["Markets", "हाटबजार"],
  bus: ["Bus parks", "बसपार्क"],
  airport: ["Airports", "विमानस्थल"],
  peak: ["Peaks and hills", "हिमाल तथा डाँडा"],
  lake: ["Lakes and ponds", "ताल तथा पोखरी"],
  waterfall: ["Waterfalls", "झरना"],
  sight: ["Sights and heritage", "घुम्ने ठाउँ तथा सम्पदा"],
  park: ["Parks and reserves", "निकुञ्ज तथा पार्क"],
  stay: ["Hotels and guest houses", "होटल तथा गेस्ट हाउस"],
};
const RELIGION = { hindu: "Hindu", buddhist: "Buddhist", muslim: "Muslim", christian: "Christian", sikh: "Sikh", jain: "Jain", kirat: "Kirat", bon: "Bon" };
/** Settlement types that get their own page (hamlets and localities are listed on ward pages). */
const PAGE_PLACES = new Set(["city", "town", "village", "suburb"]);
const PLACE_LABEL = { city: "city", town: "town", village: "village", suburb: "suburb", hamlet: "hamlet", neighbourhood: "neighbourhood", locality: "locality", quarter: "quarter", isolated_dwelling: "settlement" };

// ---------- small helpers ----------
/** "Dhamilekh Village" → "Dhamilekh", "chaudaye" → "Chaudaye" (OSM names are typed by many hands). */
function cleanPlaceName(name) {
  let n = String(name || "").replace(/\s+village$/i, "").trim();
  if (/^[a-z]/.test(n)) n = n[0].toUpperCase() + n.slice(1);
  return n;
}
/** "भातेखोला गा.वि.स." → "भातेखोला" (the type is added back in the title). */
const cleanVdcNe = (name) => fixNe(name).replace(/\s*(गा\.?\s?[वब]ि\.?\s?स\.?|गाविस|न\.?\s?पा\.?)\s*$/, "").trim();
function runs(numbers) {
  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    out.push(j > i + 1 ? `${sorted[i]}–${sorted[j]}` : j === i + 1 ? `${sorted[i]}, ${sorted[j]}` : `${sorted[i]}`);
    i = j;
  }
  return out.join(", ");
}
const wardWord = (list) => (list.length === 1 ? "ward" : "wards");
function km(lat1, lon1, lat2, lon2) {
  const p = Math.PI / 180;
  const a = 0.5 - Math.cos((lat2 - lat1) * p) / 2 + (Math.cos(lat1 * p) * Math.cos(lat2 * p) * (1 - Math.cos((lon2 - lon1) * p))) / 2;
  return 12742 * Math.asin(Math.sqrt(a));
}
function bearing(lat1, lon1, lat2, lon2) {
  const p = Math.PI / 180;
  const y = Math.sin((lon2 - lon1) * p) * Math.cos(lat2 * p);
  const x = Math.cos(lat1 * p) * Math.sin(lat2 * p) - Math.sin(lat1 * p) * Math.cos(lat2 * p) * Math.cos((lon2 - lon1) * p);
  return ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"][Math.round(((Math.atan2(y, x) / p + 360) % 360) / 45) % 8];
}
const coordText = ([lat, lng]) => `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
const osmMap = ([lat, lng], zoom = 14) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
const dist = (d) => (d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`);

// ---------- data (loaded once per process; the build calls records() twice) ----------
let cache = null;
async function data(root) {
  if (cache) return cache;
  const readJson = async (rel, fallback) => {
    const file = resolve(root, rel);
    if (!existsSync(file)) return fallback;
    return JSON.parse(await readFile(file, "utf8"));
  };
  const loadSource = async (name) => {
    const [en, ne] = await Promise.all([readJson(`${SRC_DIR}/${name}/en.json`), readJson(`${SRC_DIR}/${name}/np.json`)]);
    const neById = new Map(ne.map((r) => [r.id, r]));
    return en.map((r) => ({ ...r, ne: neById.get(r.id) || {} }));
  };
  const [provinces, districts, palikas, geo, vdcFile, admin, settleFile, poiFile] = await Promise.all([
    loadSource("provinces"), loadSource("districts"), loadSource("municipalities"),
    readJson("worker/explore/nepal-geo.json"), readJson(`${DATA_DIR}/vdc-wards.json`, { vdcs: [] }),
    readJson(`${DATA_DIR}/osm-admin.json`, { palikas: {}, wards: {}, district_hq: {} }),
    readJson(`${DATA_DIR}/osm-settlements.json`, { fields: [], rows: [] }), readJson(`${DATA_DIR}/osm-pois.json`, { fields: [], rows: [] }),
  ]);
  const rows = (file) => file.rows.map((r) => Object.fromEntries(file.fields.map((f, i) => [f, r[i]])));
  const settlements = rows(settleFile).map((r) => ({ ...r, name: cleanPlaceName(r.name) }));
  const pois = rows(poiFile);
  const sun = await sunTools(root);

  const geoProvince = new Map(geo.provinces.map((p) => [p.id, p]));
  const geoDistrict = new Map(geo.districts.map((d) => [d.id, d]));
  const province = new Map(provinces.map((p) => [p.id, {
    ...p, slug: geoProvince.get(p.id).slug, en: geoProvince.get(p.id).name, neName: PROVINCE_NE[p.id] || fixNe(p.ne.name),
    path: `/nepal/${geoProvince.get(p.id).slug}`,
  }]));
  const district = new Map(districts.map((d) => [d.id, {
    ...d, slug: geoDistrict.get(d.id).slug, en: geoDistrict.get(d.id).name, neName: DISTRICT_NE[d.id] || fixNe(d.ne.name),
    path: `/nepal/${geoDistrict.get(d.id).slug}`,
  }]));
  const palika = new Map();
  const slugsByDistrict = new Map();
  for (const m of palikas) {
    const d = district.get(m.district_id);
    const slug = slugify(m.name);
    const taken = slugsByDistrict.get(d.id) || new Set();
    if (taken.has(slug) || slug === "vdc") throw new Error(`palika slug clash in ${d.en}: ${slug}`);
    taken.add(slug);
    slugsByDistrict.set(d.id, taken);
    palika.set(m.id, {
      ...m, slug, path: `${d.path}/${slug}`, wardCount: num(m.wards),
      en: `${m.name} ${CATEGORY_EN[m.category_id]}`, neName: `${fixNe(m.ne.name)} ${CATEGORY_NE[m.category_id]}`, shortNe: fixNe(m.ne.name),
      geo: admin.palikas[String(m.id)] || null,
    });
  }

  // Old VDCs / municipalities and what each new ward used to be.
  const formerByWard = new Map(); // "pid-n" -> [{vdc, wards:[old]}]
  const vdcs = [];
  const vdcSlugs = new Map();
  for (const v of vdcFile.vdcs) {
    if (!slugify(v.n) || (!Object.keys(v.w).length && v.t === "protected-area")) continue;
    const d = district.get(v.d);
    if (!d) continue;
    const base = slugify(v.n) + (v.t === "vdc" || v.t === "protected-area" ? "" : `-${v.t}`);
    vdcs.push({ ...v, base, district: d });
  }
  const baseCount = new Map();
  for (const v of vdcs) baseCount.set(`${v.d}/${v.base}`, (baseCount.get(`${v.d}/${v.base}`) || 0) + 1);
  for (const v of vdcs) {
    let slug = v.base;
    if (baseCount.get(`${v.d}/${v.base}`) > 1) {
      const firstPid = Object.values(v.w)[0]?.[0]?.[0];
      slug = `${v.base}-${slugify(v.od)}${firstPid ? `-${palika.get(firstPid).slug}` : ""}`;
    }
    let s = slug;
    for (let i = 2; vdcSlugs.has(`${v.d}/${s}`); i++) s = `${slug}-${i}`;
    vdcSlugs.set(`${v.d}/${s}`, v);
    v.slug = s;
    v.path = `${v.district.path}/vdc/${s}`;
    const [typeEn, typeNe] = OLD_TYPE[v.t] || OLD_TYPE.vdc;
    v.title = typeEn ? `${v.n} ${typeEn}` : v.n;
    v.ne = cleanVdcNe(v.ne);
    v.titleNe = v.ne ? `${v.ne}${typeNe ? " " + typeNe : ""}` : "";
    v.newWards = new Map(); // pid -> Set(new ward)
    for (const [old, targets] of Object.entries(v.w)) {
      for (const [pid, nw] of targets) {
        if (!palika.has(pid)) continue;
        if (!v.newWards.has(pid)) v.newWards.set(pid, new Set());
        v.newWards.get(pid).add(nw);
        const key = `${pid}-${nw}`;
        if (!formerByWard.has(key)) formerByWard.set(key, new Map());
        const m = formerByWard.get(key);
        if (!m.has(v)) m.set(v, []);
        m.get(v).push(Number(old));
      }
    }
  }

  // OSM points by ward / palika / district.
  const palikaDistrict = (pid) => palika.get(pid)?.district_id;
  const group = (list) => {
    const byWard = new Map();
    const byPalika = new Map();
    const byDistrict = new Map();
    for (const r of list) {
      const did = r.district_id || palikaDistrict(r.palika_id);
      if (!did) continue;
      r.did = did;
      if (r.palika_id && r.ward) push(byWard, `${r.palika_id}-${r.ward}`, r);
      if (r.palika_id) push(byPalika, r.palika_id, r);
      push(byDistrict, did, r);
    }
    return { byWard, byPalika, byDistrict };
  };
  const S = group(settlements);
  const P = group(pois);

  // Village pages: named cities/towns/villages/suburbs inside a known palika. Slug unique inside the palika.
  const villages = [];
  for (const [pid, list] of S.byPalika) {
    const p = palika.get(pid);
    const used = new Set();
    const candidates = list.filter((s) => PAGE_PLACES.has(s.place) && s.name && /[a-z]/i.test(s.name) && !/^ward\b/i.test(s.name));
    const baseCounts = new Map();
    for (const s of candidates) baseCounts.set(slugify(s.name), (baseCounts.get(slugify(s.name)) || 0) + 1);
    for (const s of candidates.sort((a, b) => (a.ward || 99) - (b.ward || 99) || a.name.localeCompare(b.name))) {
      let slug = slugify(s.name);
      if (!slug || /^ward-?\d/.test(slug)) continue;
      if (baseCounts.get(slug) > 1 && s.ward) slug = `${slug}-ward-${s.ward}`;
      let unique = slug;
      for (let i = 2; used.has(unique); i++) unique = `${slug}-${i}`;
      used.add(unique);
      s.slug = unique;
      s.path = `${p.path}/${unique}`;
      villages.push(s);
    }
  }

  cache = { province, district, palika, vdcs, formerByWard, admin, S, P, villages, sun, settlements, pois };
  return cache;
}
function push(map, key, value) {
  let list = map.get(key);
  if (!list) map.set(key, (list = []));
  list.push(value);
}

/** The site's own sunrise/sunset + BS calendar code, bundled with esbuild (dev dependency already in package.json). */
async function sunTools(root) {
  try {
    const { build } = await import("esbuild");
    const out = await build({
      stdin: { contents: 'export { sunriseSunset } from "./src/patro-tools/core/astro.ts"; export { bsToAd } from "./packages/core/src/bsDate.ts";', resolveDir: root, loader: "ts" },
      bundle: true, format: "esm", platform: "node", write: false, logLevel: "error",
    });
    const mod = await import("data:text/javascript;base64," + Buffer.from(out.outputFiles[0].text).toString("base64"));
    const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kathmandu", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const firsts = BS_MONTHS.map((_, i) => mod.bsToAd({ year: BS_YEAR, month: i + 1, day: 1 }));
    const memo = new Map();
    return (lat, lng) => {
      const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
      if (memo.has(key)) return memo.get(key);
      const rows = firsts.map((ad, i) => {
        const { sunrise, sunset } = mod.sunriseSunset(ad, { lat, lon: lng, tz: "Asia/Kathmandu" });
        const mins = Math.round((sunset - sunrise) / 60000);
        return [`1 ${BS_MONTHS[i][0]} ${BS_YEAR}`, { text: ad, href: `/date/${ad}` }, time.format(sunrise), time.format(sunset), `${Math.floor(mins / 60)} h ${mins % 60} min`];
      });
      memo.set(key, rows);
      return rows;
    };
  } catch (error) {
    console.warn("nepal: sunrise tables skipped:", error.message);
    return null;
  }
}

function sunTable(sun, c, where) {
  if (!sun || !c) return [];
  return [{
    heading: `Sunrise and sunset in ${where}, ${BS_YEAR} BS`,
    heading_ne: `${BS_YEAR} सालको सूर्योदय र सूर्यास्त`,
    intro: `Times at ${coordText(c)} in Nepal Standard Time, on the first day of each Nepali month. Open a date for its full panchang.`,
    head: ["Nepali date", "AD date", "Sunrise", "Sunset", "Day length"],
    rows: sun(c[0], c[1]),
  }];
}

function poiLists(list, { limit = 30, near = null, links = null } = {}) {
  const out = [];
  for (const [cat, [heading, headingNe]] of Object.entries(POI)) {
    let items = list.filter((p) => p.category === cat && p.name);
    if (!items.length) continue;
    if (cat === "peak") items.sort((a, b) => (b.ele || 0) - (a.ele || 0));
    else if (near) items.sort((a, b) => km(near[0], near[1], a.lat, a.lng) - km(near[0], near[1], b.lat, b.lng));
    else items.sort((a, b) => a.name.localeCompare(b.name));
    const total = items.length;
    items = items.slice(0, limit);
    out.push({
      heading: total > items.length ? `${heading} (${items.length} of ${total})` : `${heading} (${total})`,
      heading_ne: headingNe,
      items: items.map((p) => {
        const bits = [];
        if (p.category === "worship" && RELIGION[p.sub]) bits.push(RELIGION[p.sub]);
        if (p.ele) bits.push(`${fmt(p.ele, 0)} m`);
        if (near) bits.push(`${dist(km(near[0], near[1], p.lat, p.lng))} ${bearing(near[0], near[1], p.lat, p.lng)}`);
        if (links && p.ward && p.palika_id) bits.push(`ward ${p.ward}`);
        return { title: p.name, ...(p.name_ne ? { title_ne: p.name_ne } : {}), ...(links && p.palika_id && p.ward ? { href: links(p) } : {}), ...(bits.length ? { note: bits.join(" · ") } : {}) };
      }),
    });
  }
  return out;
}

function formerText(entries) {
  // entries: Map(vdc -> [old wards])
  return [...entries].map(([v, olds]) => `${v.title} ${wardWord(olds)} ${runs(olds)}`).join("; ");
}

const commonLinks = (c) => [
  ...(c ? [{ href: osmMap(c), label: "Open in OpenStreetMap" }] : []),
  { href: "/nepalmap", label: "Nepal map: temples, gumbas, peaks · नेपाल नक्सा" },
  { href: "/nepal/time", label: "Time in Nepal now" },
];

export async function* records({ root = process.cwd() } = {}) {
  const D = await data(root);
  const { province, district, palika, vdcs, formerByWard, admin, S, P, villages, sun } = D;
  const sources = (...keys) => keys.map((k) => SOURCES[k]);
  const palikasOf = (did) => [...palika.values()].filter((p) => p.district_id === did);
  const wardPath = (pid, n) => `${palika.get(pid).path}/ward-${n}`;
  const villagePath = new Map(villages.map((v) => [v, v.path]));
  const totalWards = [...palika.values()].reduce((s, p) => s + p.wardCount, 0);

  // ---------- root (not served: /nepal is the growth page) ----------
  yield {
    path: "/nepal", parent: null, sort: 0, title: "Nepal", title_ne: "नेपाल",
    description: `Nepal's ${province.size} provinces, ${district.size} districts, ${palika.size} local levels and ${fmt(totalWards, 0)} wards.`,
    facts: [], lastmod: LASTMOD,
  };

  // ---------- provinces ----------
  for (const p of province.values()) {
    const ds = [...district.values()].filter((d) => d.province_id === p.id);
    const ms = ds.flatMap((d) => palikasOf(d.id));
    const wards = ms.reduce((s, m) => s + m.wardCount, 0);
    yield {
      path: p.path, parent: "/nepal", sort: p.id, sitemap_group: "districts",
      title: p.en, title_ne: p.neName,
      description: `${p.en}, Nepal: capital ${p.headquarter}, ${fmt(p.area_sq_km)} km², ${ds.length} districts, ${ms.length} local levels and ${fmt(wards, 0)} wards, with links to every district and palika.`,
      summary: `${p.en} is one of Nepal's seven provinces. Its capital is ${p.headquarter}. It covers ${fmt(p.area_sq_km)} km² and has ${ds.length} districts, ${ms.length} local levels (palikas) and ${fmt(wards, 0)} wards.`,
      summary_ne: `${p.neName}को राजधानी ${fixNe(p.ne.headquarter)} हो। यसमा ${neNum(ds.length)} जिल्ला, ${neNum(ms.length)} स्थानीय तह र ${neNum(wards)} वडा छन्।`,
      facts: [
        { label: "Capital", label_ne: "राजधानी", value: p.headquarter, value_ne: fixNe(p.ne.headquarter) },
        { label: "Area", label_ne: "क्षेत्रफल", value: `${fmt(p.area_sq_km)} km²`, value_ne: `${fixNe(p.ne.area_sq_km)} वर्ग किमी` },
        { label: "Districts", label_ne: "जिल्ला", value: String(ds.length), value_ne: neNum(ds.length) },
        { label: "Local levels", label_ne: "स्थानीय तह", value: String(ms.length), value_ne: neNum(ms.length) },
        { label: "Wards", label_ne: "वडा", value: fmt(wards, 0), value_ne: neNum(wards) },
        ...(p.website ? [{ label: "Official website", label_ne: "आधिकारिक वेबसाइट", value: p.website.replace(/^https?:\/\//, "").replace(/\/$/, ""), href: p.website }] : []),
      ],
      tables: [{
        heading: `Districts of ${p.en}`, heading_ne: `${p.neName}का जिल्लाहरू`,
        head: ["District", "Headquarters", "Local levels", "Wards", "Area"],
        rows: ds.map((d) => {
          const dm = palikasOf(d.id);
          return [{ text: d.en, href: d.path }, d.headquarter, String(dm.length), String(dm.reduce((s, m) => s + m.wardCount, 0)), `${fmt(d.area_sq_km)} km²`];
        }),
      }],
      faq: [
        { q: `How many districts are in ${p.en}?`, a: `${p.en} has ${ds.length} districts: ${ds.map((d) => d.en).join(", ")}.` },
        { q: `What is the capital of ${p.en}?`, a: `The capital of ${p.en} is ${p.headquarter}.` },
      ],
      website: p.website, links: commonLinks(null), sources: sources("states"), lastmod: LASTMOD,
    };
  }

  // ---------- districts ----------
  for (const d of district.values()) {
    const p = province.get(d.province_id);
    const ms = palikasOf(d.id).sort((a, b) => a.category_id - b.category_id || a.name.localeCompare(b.name));
    const wards = ms.reduce((s, m) => s + m.wardCount, 0);
    const oldUnits = vdcs.filter((v) => v.d === d.id);
    const hq = admin.district_hq[String(d.id)] || null;
    const dPois = P.byDistrict.get(d.id) || [];
    const towns = (S.byDistrict.get(d.id) || []).filter((s) => ["city", "town"].includes(s.place) && s.path);
    const counts = Object.fromEntries(Object.keys(POI).map((c) => [c, dPois.filter((x) => x.category === c).length]));
    yield {
      path: d.path, parent: "/nepal", sort: 100 + d.id, sitemap_group: "districts",
      title: `${d.en} District`, title_ne: `${d.neName} जिल्ला`, geo: hq ? { lat: hq[0], lng: hq[1] } : undefined,
      description: `${d.en} District, ${p.en}: headquarters ${d.headquarter}, ${ms.length} local levels and ${fmt(wards, 0)} wards, ${oldUnits.length} former VDCs with their new wards, villages, temples and sunrise times.`,
      summary: `${d.en} is a district in ${p.en}, Nepal, with its headquarters in ${d.headquarter}. It covers ${fmt(d.area_sq_km)} km² and has ${ms.length} local levels (palikas) with ${fmt(wards, 0)} wards. Before the 2017 restructuring it had ${oldUnits.length} VDCs and municipalities; see where each old ward went.`,
      summary_ne: `${d.neName} ${p.neName}मा पर्ने जिल्ला हो, जसको सदरमुकाम ${fixNe(d.ne.headquarter)} हो। यसमा ${neNum(ms.length)} स्थानीय तह र ${neNum(wards)} वडा छन्।`,
      facts: [
        { label: "Province", label_ne: "प्रदेश", value: p.en, value_ne: p.neName, href: p.path },
        { label: "Headquarters", label_ne: "सदरमुकाम", value: d.headquarter, value_ne: fixNe(d.ne.headquarter) },
        { label: "Area", label_ne: "क्षेत्रफल", value: `${fmt(d.area_sq_km)} km²`, value_ne: `${fixNe(d.ne.area_sq_km)} वर्ग किमी` },
        { label: "Local levels", label_ne: "स्थानीय तह", value: String(ms.length), value_ne: neNum(ms.length) },
        { label: "Wards", label_ne: "वडा", value: fmt(wards, 0), value_ne: neNum(wards) },
        ...(oldUnits.length ? [{ label: "Former VDCs and municipalities", label_ne: "साबिकका गाविस/नगरपालिका", value: String(oldUnits.length), value_ne: neNum(oldUnits.length), href: `${d.path}/vdc` }] : []),
        ...(counts.worship ? [{ label: "Temples, gumbas and other places of worship mapped", value: String(counts.worship), href: `/nepalmap?d=${d.slug}&c=worship` }] : []),
        ...(counts.school ? [{ label: "Schools and colleges mapped", value: String(counts.school), href: `/nepalmap?d=${d.slug}&c=school` }] : []),
        ...(d.website ? [{ label: "District Coordination Committee", label_ne: "जिल्ला समन्वय समिति", value: d.website.replace(/^https?:\/\//, "").replace(/\/$/, ""), href: d.website }] : []),
      ],
      tables: [
        {
          heading: `Local levels of ${d.en}`, heading_ne: `${d.neName}का स्थानीय तहहरू`,
          head: ["Local level", "Type", "Wards", "Area"],
          rows: ms.map((m) => [{ text: m.name, href: m.path }, CATEGORY_EN[m.category_id], String(m.wardCount), `${fmt(m.area_sq_km)} km²`]),
        },
        ...sunTable(sun, hq || ms.map((m) => m.geo?.c).find(Boolean), d.headquarter),
      ],
      lists: [
        { heading: "Towns and bazaars", heading_ne: "सहर तथा बजार", items: towns.slice(0, 40).map((t) => ({ title: t.name, ...(t.name_ne ? { title_ne: t.name_ne } : {}), href: t.path })) },
        ...poiLists(dPois.filter((x) => ["peak", "lake", "waterfall", "sight", "worship", "airport", "park"].includes(x.category)), { limit: 25, links: (x) => wardPath(x.palika_id, x.ward) }),
      ],
      faq: [
        { q: `How many wards are in ${d.en} district?`, a: `${d.en} has ${fmt(wards, 0)} wards in ${ms.length} local levels: ${ms.map((m) => `${m.name} (${m.wardCount})`).join(", ")}.` },
        { q: `What is the headquarters of ${d.en}?`, a: `The district headquarters of ${d.en} is ${d.headquarter}.` },
        { q: `Which province is ${d.en} in?`, a: `${d.en} is in ${p.en}.` },
      ],
      child_heading: `Local levels and former VDCs of ${d.en}`, child_heading_ne: `${d.neName}का स्थानीय तह`,
      website: d.website, links: commonLinks(hq), sources: sources("states", "vdc", "osm"), lastmod: LASTMOD,
    };

    // ---------- former VDC hub ----------
    if (oldUnits.length) {
      const newList = (v) => [...v.newWards].map(([pid, set]) => `${palika.get(pid).en} ${wardWord([...set])} ${runs([...set])}`).join("; ") || (v.x || []).join("; ") || "not in the mapping";
      yield {
        path: `${d.path}/vdc`, parent: d.path, sort: 900, sitemap_group: "vdc",
        title: `Former VDCs of ${d.en} and their new wards`, title_ne: `${d.neName}का साबिकका गाविस र नयाँ वडा`,
        description: `All ${oldUnits.length} former VDCs and municipalities of ${d.en} District and the palika and ward each old ward became after Nepal's 2017 local-level restructuring.`,
        summary: `In 2017 Nepal replaced its VDCs and old municipalities with ${palika.size} local levels. ${d.en} had ${oldUnits.length} VDCs and municipalities; they now form its ${ms.length} local levels. Open a VDC for a ward-by-ward table.`,
        summary_ne: `२०७३/७४ को स्थानीय तह पुनर्संरचनापछि ${d.neName}का ${neNum(oldUnits.length)} गाविस/नगरपालिका ${neNum(ms.length)} स्थानीय तहमा गाभिए।`,
        facts: [
          { label: "District", label_ne: "जिल्ला", value: `${d.en} District`, value_ne: `${d.neName} जिल्ला`, href: d.path },
          { label: "Province", label_ne: "प्रदेश", value: p.en, value_ne: p.neName, href: p.path },
          { label: "Former VDCs", label_ne: "साबिकका गाविस", value: String(oldUnits.filter((v) => v.t === "vdc").length) },
          { label: "Former municipalities", label_ne: "साबिकका नगरपालिका", value: String(oldUnits.filter((v) => v.t !== "vdc" && v.t !== "protected-area").length) },
          { label: "Local levels now", label_ne: "हालका स्थानीय तह", value: String(ms.length), value_ne: neNum(ms.length) },
        ],
        tables: [{
          heading: "Old VDC → new local level and wards", heading_ne: "साबिकको गाविस → हालको स्थानीय तह र वडा",
          head: ["Former VDC / municipality", "Now part of"],
          rows: [...oldUnits].sort((a, b) => a.n.localeCompare(b.n)).map((v) => [{ text: v.title, href: v.path }, newList(v)]),
        }],
        child_heading: `Former VDCs of ${d.en}`, child_heading_ne: `${d.neName}का साबिकका गाविस`,
        links: commonLinks(null), sources: sources("vdc", "states"), lastmod: LASTMOD,
      };

      for (const v of oldUnits) {
        const targets = [...v.newWards];
        const rows = Object.entries(v.w).sort((a, b) => Number(a[0]) - Number(b[0])).map(([old, list]) => [
          `Ward ${old}`,
          list.filter(([pid]) => palika.has(pid)).map(([pid, nw]) => `${palika.get(pid).en} ward ${nw}`).join(" and ") || (v.x || []).join(", ") || "—",
        ]);
        // Link the first new ward of each row.
        const linkRows = Object.entries(v.w).sort((a, b) => Number(a[0]) - Number(b[0])).map(([old, list], i) => {
          const ok = list.filter(([pid]) => palika.has(pid));
          return ok.length === 1 ? [rows[i][0], { text: rows[i][1], href: wardPath(ok[0][0], ok[0][1]) }] : rows[i];
        });
        const named = (S.byDistrict.get(d.id) || []).find((s) => s.path && s.name && slugify(s.name) === v.base && v.newWards.has(s.palika_id));
        const nowText = targets.map(([pid, set]) => `${palika.get(pid).en} ${wardWord([...set])} ${runs([...set])}`).join(" and ");
        const faq = Object.entries(v.w).slice(0, 40).flatMap(([old, list]) => {
          const ok = list.filter(([pid]) => palika.has(pid));
          if (!ok.length) return [];
          return [{ q: `${v.n} ward ${old}, ${d.en}: which ward is it now?`, a: `${v.title} ward ${old} (${d.en}) is now ${ok.map(([pid, nw]) => `ward ${nw} of ${palika.get(pid).en}`).join(" and ")}.` }];
        });
        yield {
          path: v.path, parent: `${d.path}/vdc`, sort: 0, sitemap_group: "vdc",
          title: `${v.title}, ${d.en}${targets.length ? ` – now ${targets.map(([pid]) => palika.get(pid).name).join(" and ")}` : ""}`,
          ...(v.titleNe ? { title_ne: `${v.titleNe}, ${d.neName}` } : {}),
          geo: named ? { lat: named.lat, lng: named.lng } : undefined,
          description: targets.length
            ? `${v.title} (${d.en}) is now ${nowText}. Ward-by-ward table of every old ward of ${v.n} and its new palika ward after the 2017 restructuring.`
            : `${v.title} (${d.en}): the published 2017 ward mapping gives ${(v.x || []).join(", ") || "no current local level"} for this area.`,
          summary: targets.length
            ? `${v.title} was a local body in ${v.od} district until 2017. Its area is now ${nowText}${targets.length > 1 ? "" : ""}. The table below shows where each old ward went, so an old address like "${v.n}-${Object.keys(v.w).at(-1)}, ${d.en}" can be written with its new palika and ward.`
            : `${v.title} was a local body in ${v.od} district until 2017.`,
          facts: [
            { label: "Former type", label_ne: "साबिकको किसिम", value: (OLD_TYPE[v.t] || OLD_TYPE.vdc)[2] },
            { label: "District", label_ne: "जिल्ला", value: `${d.en} District`, value_ne: `${d.neName} जिल्ला`, href: d.path },
            ...(v.od.toLowerCase() !== d.en.toLowerCase() ? [{ label: "District before 2017", value: v.od }] : []),
            ...targets.map(([pid, set]) => ({ label: "Now part of", label_ne: "हाल", value: `${palika.get(pid).en}, ${wardWord([...set])} ${runs([...set])}`, value_ne: `${palika.get(pid).neName} वडा ${neNum(runs([...set]))}`, href: palika.get(pid).path })),
            { label: "Old wards", label_ne: "साबिकका वडा", value: String(Object.keys(v.w).length || "—") },
            ...(v.code ? [{ label: "HLCIT code", value: v.code }] : []),
            ...(named ? [{ label: `${v.n} village`, value: coordText([named.lat, named.lng]), href: named.path }] : []),
          ],
          tables: rows.length ? [{ heading: `Old ${v.n} wards and their new wards`, heading_ne: "साबिकको वडा → हालको वडा", head: ["Old ward", "Now"], rows: linkRows }] : [],
          faq,
          links: commonLinks(named ? [named.lat, named.lng] : null), sources: sources("vdc", "states"), lastmod: LASTMOD,
          ...(targets.length ? {} : { quality: { allow_index: false, reason: "no-current-palika-in-mapping" } }),
        };
      }
    }
  }

  // ---------- palikas ----------
  for (const m of palika.values()) {
    const d = district.get(m.district_id);
    const p = province.get(d.province_id);
    const c = m.geo?.c || null;
    const merged = vdcs.filter((v) => v.newWards.has(m.id));
    const mPois = P.byPalika.get(m.id) || [];
    const office = mPois.find((x) => x.category === "office" && /(municipal|palika|पालिका|executive|गाउँ कार्यपालिका|नगर कार्यपालिका)/i.test(`${x.name} ${x.name_ne}`));
    const wardRows = [];
    for (let n = 1; n <= m.wardCount; n++) {
      const former = formerByWard.get(`${m.id}-${n}`);
      const vs = (S.byWard.get(`${m.id}-${n}`) || []).filter((s) => s.name).slice(0, 4).map((s) => s.name);
      wardRows.push([{ text: `Ward ${n}`, href: wardPath(m.id, n) }, former ? formerText(former) : "—", vs.join(", ") || "—"]);
    }
    yield {
      path: m.path, parent: d.path, sort: m.category_id, sitemap_group: "palikas",
      title: `${m.en}, ${d.en}`, title_ne: `${m.neName}, ${d.neName}`, geo: c ? { lat: c[0], lng: c[1] } : undefined,
      description: `${m.en} in ${d.en} District, ${p.en}: ${m.wardCount} wards, ${fmt(m.area_sq_km)} km², the former VDCs in each ward, villages, schools, temples and sunrise times.`,
      summary: `${m.en} is a ${CATEGORY_EN[m.category_id].toLowerCase()} (local government) in ${d.en} District of ${p.en}, Nepal. It covers ${fmt(m.area_sq_km)} km² and is divided into ${m.wardCount} wards.${merged.length ? ` It was formed in 2017 from ${merged.map((v) => v.title).join(", ")}.` : ""}`,
      summary_ne: `${m.neName} ${p.neName}को ${d.neName} जिल्लामा पर्छ। यसको क्षेत्रफल ${fixNe(m.ne.area_sq_km)} वर्ग किमी छ र यसमा ${fixNe(m.ne.wards)} वडा छन्।`,
      facts: [
        { label: "Type", label_ne: "किसिम", value: CATEGORY_EN[m.category_id], value_ne: CATEGORY_NE[m.category_id] },
        { label: "District", label_ne: "जिल्ला", value: `${d.en} District`, value_ne: `${d.neName} जिल्ला`, href: d.path },
        { label: "Province", label_ne: "प्रदेश", value: p.en, value_ne: p.neName, href: p.path },
        { label: "Wards", label_ne: "वडा संख्या", value: String(m.wardCount), value_ne: fixNe(m.ne.wards) },
        { label: "Area", label_ne: "क्षेत्रफल", value: `${fmt(m.area_sq_km)} km²`, value_ne: `${fixNe(m.ne.area_sq_km)} वर्ग किमी` },
        ...(merged.length ? [{ label: "Formed from", label_ne: "गाभिएका साबिक इकाइ", value: merged.map((v) => v.n).join(", ") }] : []),
        ...(office ? [{ label: "Office", label_ne: "कार्यालय", value: `${office.name} (${coordText([office.lat, office.lng])})`, href: osmMap([office.lat, office.lng], 17) }] : []),
        ...(c ? [{ label: "Centre", label_ne: "केन्द्रबिन्दु", value: coordText(c), href: osmMap(c, 12) }] : []),
        ...(m.website ? [{ label: "Official website", label_ne: "आधिकारिक वेबसाइट", value: m.website.replace(/^https?:\/\//, "").replace(/\/$/, ""), href: m.website }] : []),
      ],
      tables: [
        { heading: `Wards of ${m.en}`, heading_ne: `${m.neName}का वडाहरू`, head: ["Ward", "Formerly (before 2017)", "Villages and places"], rows: wardRows },
        ...sunTable(sun, c, m.name),
      ],
      lists: poiLists(mPois, { limit: 20, links: (x) => wardPath(x.palika_id, x.ward) }),
      faq: [
        { q: `How many wards does ${m.en} have?`, a: `${m.en} (${d.en}) has ${m.wardCount} wards.` },
        ...(merged.length ? [{ q: `Which VDCs were merged into ${m.en}?`, a: `${m.en} was formed in 2017 from ${merged.map((v) => `${v.title} (now ${wardWord([...v.newWards.get(m.id)])} ${runs([...v.newWards.get(m.id)])})`).join(", ")}.` }] : []),
        { q: `Which district is ${m.name} in?`, a: `${m.en} is in ${d.en} District, ${p.en}.` },
      ],
      child_heading: `Wards and villages of ${m.en}`, child_heading_ne: `${m.neName}का वडा र गाउँहरू`,
      website: m.website, links: commonLinks(c), sources: sources("states", "vdc", "osm"), lastmod: LASTMOD,
    };

    // ---------- wards ----------
    for (let n = 1; n <= m.wardCount; n++) {
      const key = `${m.id}-${n}`;
      const wg = admin.wards[key] || null;
      const former = formerByWard.get(key);
      const wSettle = S.byWard.get(key) || [];
      const wPois = P.byWard.get(key) || [];
      const c2 = wg?.c || c;
      const neighbours = (wg?.nb || []).map((k) => {
        const [pid, wn] = k.split("-").map(Number);
        const other = palika.get(pid);
        return other ? { title: pid === m.id ? `Ward ${wn}` : `${other.en} ward ${wn}`, href: wardPath(pid, wn) } : null;
      }).filter(Boolean);
      const formerStr = former ? formerText(former) : "";
      const wardOffice = wPois.find((x) => x.category === "office" && /(ward|वडा)/i.test(`${x.name} ${x.name_ne}`));
      const hasData = Boolean(former || wg || wSettle.length || wPois.length);
      const title = `${m.en} Ward ${n}, ${d.en}`;
      yield {
        path: wardPath(m.id, n), parent: m.path, sort: n, sitemap_group: "wards",
        title, title_ne: `${m.neName} वडा नं. ${neNum(n)}, ${d.neName}`, geo: c2 ? { lat: c2[0], lng: c2[1] } : undefined,
        description: `Ward ${n} of ${m.en}, ${d.en} District (${p.en})${formerStr ? `: formerly ${formerStr}` : ""}. Villages, schools, temples, neighbouring wards, map and sunrise times.`,
        summary: `Ward ${n} is one of the ${m.wardCount} wards of ${m.en} in ${d.en} District, ${p.en}.${formerStr ? ` Before the 2017 local-level restructuring this area was ${formerStr}.` : ""}${wg ? ` It covers about ${fmt(wg.a, 1)} km².` : ""}${wSettle.length ? ` OpenStreetMap shows ${plural(wSettle.length, "named settlement")} here, including ${wSettle.slice(0, 3).map((s) => s.name || s.name_ne).join(", ")}.` : ""}`,
        summary_ne: `वडा नं. ${neNum(n)} ${d.neName} जिल्लाको ${m.neName}को ${neNum(m.wardCount)} वडामध्ये एक हो।`,
        facts: [
          { label: "Local level", label_ne: "स्थानीय तह", value: m.en, value_ne: m.neName, href: m.path },
          { label: "Ward", label_ne: "वडा", value: `${n} of ${m.wardCount}`, value_ne: `${neNum(n)} (जम्मा ${neNum(m.wardCount)})` },
          { label: "District", label_ne: "जिल्ला", value: `${d.en} District`, value_ne: `${d.neName} जिल्ला`, href: d.path },
          { label: "Province", label_ne: "प्रदेश", value: p.en, value_ne: p.neName, href: p.path },
          ...(former ? [...former].map(([v, olds]) => ({ label: "Formerly", label_ne: "साबिक", value: `${v.title} ${wardWord(olds)} ${runs(olds)}`, ...(v.titleNe ? { value_ne: `${v.titleNe} वडा ${neNum(runs(olds))}` } : {}), href: v.path })) : []),
          ...(wg ? [{ label: "Area", label_ne: "क्षेत्रफल", value: `${fmt(wg.a, 1)} km² (OpenStreetMap boundary)` }] : []),
          ...(wardOffice ? [{ label: "Ward office", label_ne: "वडा कार्यालय", value: `${wardOffice.name} (${coordText([wardOffice.lat, wardOffice.lng])})`, href: osmMap([wardOffice.lat, wardOffice.lng], 17) }] : []),
          ...(c2 ? [{ label: wg ? "Centre" : "Centre of the palika", label_ne: "केन्द्रबिन्दु", value: coordText(c2), href: osmMap(c2, wg ? 14 : 12) }] : []),
        ],
        tables: sunTable(sun, c2, `${m.name} ward ${n}`),
        lists: [
          {
            heading: `Villages and settlements in ward ${n}`, heading_ne: "गाउँ तथा बस्तीहरू",
            items: wSettle.filter((s) => s.name || s.name_ne).slice(0, 80).map((s) => ({ title: s.name || s.name_ne, ...(s.name && s.name_ne ? { title_ne: s.name_ne } : {}), ...(villagePath.has(s) ? { href: s.path } : {}), note: PLACE_LABEL[s.place] || s.place })),
          },
          ...poiLists(wPois, { limit: 40, near: c2 && wg ? c2 : null }),
          { heading: "Neighbouring wards", heading_ne: "छिमेकी वडाहरू", items: neighbours },
        ],
        faq: [
          ...(formerStr ? [{ q: `What was ${m.name} ward ${n} before 2017?`, a: `${m.en} ward ${n} (${d.en}) was formerly ${formerStr}.` }] : []),
          { q: `Which district is ${m.name} ward ${n} in?`, a: `${m.en} ward ${n} is in ${d.en} District, ${p.en}, Nepal.` },
          ...(neighbours.length ? [{ q: `Which wards border ${m.name} ward ${n}?`, a: `${neighbours.map((x) => x.title).join(", ")}.` }] : []),
        ],
        links: commonLinks(c2), sources: sources("states", ...(former ? ["vdc"] : []), ...(wg || wSettle.length || wPois.length ? ["osm"] : [])), lastmod: LASTMOD,
        ...(hasData ? {} : { quality: { allow_index: false, reason: "ward-without-data" } }),
      };
    }

    // ---------- villages ----------
    for (const s of villages.filter((v) => v.palika_id === m.id)) {
      const near = [s.lat, s.lng];
      const nearPois = mPois.map((x) => ({ x, k: km(s.lat, s.lng, x.lat, x.lng) })).filter((o) => o.k <= 3).sort((a, b) => a.k - b.k).slice(0, 25).map((o) => o.x);
      const nearVillages = (S.byPalika.get(m.id) || []).filter((o) => o !== s && o.name).map((o) => ({ o, k: km(s.lat, s.lng, o.lat, o.lng) })).sort((a, b) => a.k - b.k).slice(0, 12);
      const oldUnit = vdcs.find((v) => v.d === d.id && v.base === slugify(s.name) && v.newWards.has(m.id));
      const former = s.ward ? formerByWard.get(`${m.id}-${s.ward}`) : null;
      const label = PLACE_LABEL[s.place];
      const indexable = Boolean(s.ward && (nearPois.length >= 2 || s.ele || s.name_ne || oldUnit));
      yield {
        path: s.path, parent: m.path, sort: 1000, sitemap_group: "villages", schema_type: "Place",
        title: `${s.name}, ${m.name}${s.ward ? `-${s.ward}` : ""}, ${d.en}`,
        ...(s.name_ne ? { title_ne: `${s.name_ne}, ${m.shortNe}${s.ward ? `-${neNum(s.ward)}` : ""}, ${d.neName}` } : {}),
        geo: { lat: s.lat, lng: s.lng },
        description: `${s.name} is a ${label} in ${s.ward ? `ward ${s.ward} of ` : ""}${m.en}, ${d.en} District, ${p.en}${s.ele ? `, at ${fmt(s.ele, 0)} m` : ""}. Map, nearby schools and temples, neighbouring villages and sunrise times.`,
        summary: `${s.name} is a ${label} in ${s.ward ? `ward ${s.ward} of ` : ""}${m.en}, ${d.en} District, ${p.en}, Nepal${s.ele ? `, at about ${fmt(s.ele, 0)} m above sea level` : ""}.${oldUnit ? ` It gave its name to the former ${oldUnit.title}.` : former ? ` Before 2017 this ward was ${formerText(former)}.` : ""}`,
        facts: [
          { label: "Type", label_ne: "किसिम", value: label[0].toUpperCase() + label.slice(1) },
          ...(s.ward ? [{ label: "Ward", label_ne: "वडा", value: `${m.en} ward ${s.ward}`, value_ne: `${m.neName} वडा नं. ${neNum(s.ward)}`, href: wardPath(m.id, s.ward) }] : [{ label: "Local level", label_ne: "स्थानीय तह", value: m.en, value_ne: m.neName, href: m.path }]),
          { label: "District", label_ne: "जिल्ला", value: `${d.en} District`, value_ne: `${d.neName} जिल्ला`, href: d.path },
          { label: "Province", label_ne: "प्रदेश", value: p.en, value_ne: p.neName, href: p.path },
          { label: "Coordinates", label_ne: "निर्देशाङ्क", value: coordText(near), href: osmMap(near, 15) },
          ...(s.ele ? [{ label: "Elevation", label_ne: "उचाइ", value: `${fmt(s.ele, 0)} m` }] : []),
          ...(s.population ? [{ label: "Population (OpenStreetMap)", value: fmt(s.population, 0) }] : []),
          ...(oldUnit ? [{ label: "Former VDC", label_ne: "साबिक गाविस", value: oldUnit.title, href: oldUnit.path }] : former ? [...former].map(([v, olds]) => ({ label: "Ward formerly", value: `${v.title} ${wardWord(olds)} ${runs(olds)}`, href: v.path })) : []),
        ],
        tables: sunTable(sun, near, s.name),
        lists: [
          ...poiLists(nearPois, { limit: 12, near }).map((l) => ({ ...l, heading: `${l.heading.replace(/ \(.*\)$/, "")} within 3 km` })),
          { heading: "Nearby villages and settlements", heading_ne: "नजिकका गाउँ", items: nearVillages.map(({ o, k }) => ({ title: o.name, ...(o.name_ne ? { title_ne: o.name_ne } : {}), ...(villagePath.has(o) ? { href: o.path } : {}), note: `${dist(k)} ${bearing(s.lat, s.lng, o.lat, o.lng)}` })) },
        ],
        links: [{ href: `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`, label: `Directions to ${s.name} (Google Maps)` }, ...commonLinks(near)],
        sources: sources("osm", "states", ...(former || oldUnit ? ["vdc"] : [])), lastmod: LASTMOD,
        ...(indexable ? {} : { quality: { allow_index: false, reason: "village-thin" } }),
      };
    }
  }
}

/** Shared with scripts/explore/nepal/build-map.mjs so the map links to exactly the pages built here. */
export async function nepalData(root = process.cwd()) {
  return data(root);
}
