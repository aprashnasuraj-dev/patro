import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { INDEXED_CALENDAR_YEARS, SITE, calendarYearRoute } from "./seo-config.mjs";

const root = process.cwd();
const catalog = JSON.parse(await readFile(resolve(root, "seo/search-intents.json"), "utf8"));
const pages = { ...catalog.core, ...catalog.tools };
const devanagari = /[\u0900-\u097F]/;
const normalize = (value) => String(value).trim().replace(/\s+/g, " ");
const rows = new Map();

function add(query, route, alias, family = "canonical") {
  const q = normalize(query);
  if (!q || q.length < 3) return;
  const key = q.toLocaleLowerCase("en-US");
  if (!rows.has(key)) rows.set(key, { query: q, route, alias, family });
}

function expand(alias, route) {
  if (devanagari.test(alias)) {
    for (const query of [
      alias,
      `${alias} अनलाइन`,
      `अनलाइन ${alias}`,
      `निःशुल्क ${alias}`,
      `${alias} नेपाल`,
      `${alias} tool`,
      `${alias} कसरी प्रयोग गर्ने`,
      `${alias} online Nepal`,
      `${alias} free tool`,
      `${alias} आफ्नै पात्रो`
    ]) add(query, route, alias);
  } else {
    for (const query of [
      alias,
      `${alias} online`,
      `free ${alias}`,
      `${alias} Nepal`,
      `${alias} Nepali`,
      `${alias} tool`,
      `best ${alias} online`,
      `how to use ${alias}`,
      `${alias} free tool`,
      `online ${alias} Nepal`
    ]) add(query, route, alias);
  }
}

for (const [route, meta] of Object.entries(pages)) {
  if (!Array.isArray(meta.aliases) || meta.aliases.length < 5) throw new Error(`SEO aliases too weak for ${route}`);
  for (const alias of meta.aliases) expand(alias, route);
}

for (const year of INDEXED_CALENDAR_YEARS) {
  const route = calendarYearRoute(year);
  for (const q of [
    `Nepali calendar ${year}`,
    `Nepal calendar ${year}`,
    `Nepali patro ${year}`,
    `Bikram Sambat calendar ${year}`,
    `नेपाली पात्रो ${year}`,
    `${year} नेपाली पात्रो`,
    `calendar ${year} Nepal`,
    `BS calendar ${year}`,
    `Nepali calendar ${year} festivals`,
    `Nepali calendar ${year} holidays`
  ]) add(q, route, `calendar ${year}`, "calendar-year");
}

const intents = [...rows.values()].sort((a, b) => a.route.localeCompare(b.route) || a.query.localeCompare(b.query));
if (intents.length < 1000) throw new Error(`Search-intent coverage must stay >=1000 unique queries; generated ${intents.length}`);

const routeCounts = Object.fromEntries(Object.keys(pages).map((route) => [route, intents.filter((item) => item.route === route).length]));
for (const [route, count] of Object.entries(routeCounts)) {
  if (count < 40) throw new Error(`Search-intent coverage too shallow for ${route}: ${count}`);
}

const payload = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  canonical_site: SITE,
  strategy: "Intent-to-canonical-route mapping for QA, site discovery and AI/search retrieval. This is not a set of doorway pages and is never injected as hidden keyword text.",
  query_count: intents.length,
  canonical_page_count: Object.keys(pages).length + INDEXED_CALENDAR_YEARS.length,
  route_counts: routeCounts,
  intents
};

await writeFile(resolve(root, "public/search-intents.json"), JSON.stringify(payload, null, 2) + "\n", "utf8");
console.log(`Generated ${intents.length} unique search intents mapped to canonical Aafnai Patro routes.`);
