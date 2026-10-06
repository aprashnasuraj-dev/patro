import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadCalendarSnapshot, loadHolidayMap } from "./calendar-snapshot.mjs";
import { SITE } from "./seo-config.mjs";

const root = process.cwd();
const shell = await readFile(resolve(root, "dist/index.html"), "utf8");
if (!shell.includes('id="root"')) throw new Error("Festival prerender requires the Vite root shell");

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const json = (value) => JSON.stringify(value).replace(/</g, "\\u003c");
const cleanSlug = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9\p{L}-]+/gu, "-").replace(/^-+|-+$/g, "");
const prettyAd = (ad) => new Intl.DateTimeFormat("en-GB", { timeZone:"UTC", weekday:"long", year:"numeric", month:"long", day:"numeric" }).format(new Date(ad + "T00:00:00Z"));

const rows = await loadCalendarSnapshot();
const holidays = await loadHolidayMap();
const byAd = new Map(rows.map((row) => [String(row.ad).slice(0, 10), row]));
const festivalMap = new Map();

for (const [ad, items] of holidays.entries()) {
  const row = byAd.get(ad);
  const bsYear = Number(row?.bs?.year);
  if (!row || !Number.isInteger(bsYear)) continue;
  for (const item of items) {
    const slug = cleanSlug(item.slug);
    if (!slug) continue;
    const festival = festivalMap.get(slug) || { slug, names:new Set(), namesEn:new Set(), occurrences:new Map() };
    if (item.name) festival.names.add(String(item.name));
    if (item.nameEn) festival.namesEn.add(String(item.nameEn));
    const occurrence = festival.occurrences.get(bsYear) || { year:bsYear, dates:[], sources:new Set(), effects:new Set() };
    if (!occurrence.dates.includes(ad)) occurrence.dates.push(ad);
    if (item.source) occurrence.sources.add(String(item.source));
    if (item.effect) occurrence.effects.add(String(item.effect));
    festival.occurrences.set(bsYear, occurrence);
    festivalMap.set(slug, festival);
  }
}

function render({ title, description, canonical, body, schema }) {
  let html = shell;
  html = html.replace(/<html\s+lang="[^"]*"/i, '<html lang="ne"');
  html = html.replace(/<title>.*?<\/title>/is, `<title>${esc(title)} · आफ्नै पात्रो</title>`);
  html = html.replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${esc(description)}" />`);
  html = html.replace(/<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${esc(canonical)}" />`);
  html = html.replace(/<meta\s+property="og:title"[^>]*>/i, `<meta property="og:title" content="${esc(title)} · आफ्नै पात्रो" />`);
  html = html.replace(/<meta\s+property="og:description"[^>]*>/i, `<meta property="og:description" content="${esc(description)}" />`);
  html = html.replace(/<meta\s+property="og:url"[^>]*>/i, `<meta property="og:url" content="${esc(canonical)}" />`);
  html = html.replace(/<script\s+type="application\/ld\+json">.*?<\/script>/gis, "");
  html = html.replace(/<meta\s+name="robots"[^>]*>/gi, "");
  html = html.replace("</head>", `  <meta name="robots" content="index,follow,max-image-preview:large" />\n  <script type="application/ld+json">${json(schema)}</script>\n</head>`);
  html = html.replace(/<div\s+id="root"\s*><\/div>/i, `<div id="root"><main class="seo-prerender" data-seo-prerender="true">${body}</main></div>`);
  return html;
}

function primaryName(festival) {
  return [...festival.names][0] || [...festival.namesEn][0] || festival.slug.replace(/-/g, " ");
}

let identityCount = 0;
let occurrenceCount = 0;
for (const festival of [...festivalMap.values()].sort((a,b) => a.slug.localeCompare(b.slug))) {
  const name = primaryName(festival);
  const occurrences = [...festival.occurrences.values()].sort((a,b) => a.year - b.year);
  if (!occurrences.length) continue;

  const identityCanonical = `${SITE}/festivals/${festival.slug}`;
  const identityDescription = `${name} का source-backed Bikram Sambat वर्षगत मिति र घर, परिवार तथा समुदायमा मनाइने observance अभिलेखहरू।`;
  const identityBody = `<article><h1>${esc(name)}</h1><p>${esc(identityDescription)}</p><h2>वर्षगत अभिलेख</h2><ul>${occurrences.map((o) => `<li><a href="/festivals/${esc(festival.slug)}/${o.year}">${esc(`${name} ${o.year}`)}</a> — ${o.dates.map((d) => esc(prettyAd(d))).join(", ")}</li>`).join("")}</ul><p><a href="/">पात्रोमा फर्कनुहोस्</a></p></article>`;
  const identitySchema = { "@context":"https://schema.org", "@type":"CollectionPage", name, description:identityDescription, url:identityCanonical, about:{ "@type":"Thing", name, description:"Festival and community observance" } };
  const identityFile = resolve(root, "dist/festivals", festival.slug, "index.html");
  await mkdir(dirname(identityFile), { recursive:true });
  await writeFile(identityFile, render({ title:name, description:identityDescription, canonical:identityCanonical, body:identityBody, schema:identitySchema }), "utf8");
  identityCount++;

  for (const occurrence of occurrences) {
    occurrence.dates.sort();
    const canonical = `${SITE}/festivals/${festival.slug}/${occurrence.year}`;
    const title = `${name} ${occurrence.year} कहिले?`;
    const dateSummary = occurrence.dates.map((d) => prettyAd(d)).join(", ");
    const description = `${name} ${occurrence.year} को घर, परिवार र समुदायमा मनाइने observance का validated archive date${occurrence.dates.length === 1 ? "" : "s"}: ${dateSummary}.`;
    const sourceText = [...occurrence.sources].join("; ") || "Aafnai Patro validated calendar archive";
    const body = `<article><h1>${esc(title)}</h1><p>${esc(description)}</p><p><strong>${esc(dateSummary)}</strong></p><table><thead><tr><th>AD date</th><th>BS date</th></tr></thead><tbody>${occurrence.dates.map((ad) => { const row = byAd.get(ad); return `<tr><td><a href="/date/${esc(ad)}">${esc(prettyAd(ad))}</a></td><td>${esc(`${row?.bs?.year || ""}-${row?.bs?.month || ""}-${row?.bs?.day || ""}`)}</td></tr>`; }).join("")}</tbody></table><p><small>Source: ${esc(sourceText)}</small></p><p><a href="/festivals/${esc(festival.slug)}">${esc(name)} को मुख्य पृष्ठ</a></p></article>`;
    const schema = { "@context":"https://schema.org", "@type":"WebPage", name:title, url:canonical, description, about:{ "@type":"Thing", name, description:"Festival and community observance" }, mainEntity:{ "@type":"DefinedTerm", name, description:`${name} ${occurrence.year} observance dates` } };
    const file = resolve(root, "dist/festivals", festival.slug, String(occurrence.year), "index.html");
    await mkdir(dirname(file), { recursive:true });
    await writeFile(file, render({ title, description, canonical, body, schema }), "utf8");
    occurrenceCount++;
  }
}

console.log(`Festival prerender emitted ${identityCount} identities and ${occurrenceCount} dated community/people observances from validated holiday records.`);
