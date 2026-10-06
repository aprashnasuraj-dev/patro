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
const label = (value) => String(value || "").replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function flatten(value, prefix, out, depth = 0) {
  if (value == null || depth > 6) return;
  if (["string","number","boolean"].includes(typeof value)) {
    const text = String(value).trim();
    if (text) out.push([prefix || "Value", text]);
    return;
  }
  if (Array.isArray(value)) {
    const primitives = value.every((item) => item == null || ["string","number","boolean"].includes(typeof item));
    if (primitives) {
      const text = value.filter((item) => item != null && String(item).trim()).map(String).join(", ");
      if (text) out.push([prefix || "Value", text]);
      return;
    }
    value.forEach((item, index) => flatten(item, `${prefix} ${index + 1}`.trim(), out, depth + 1));
    return;
  }
  for (const [key,item] of Object.entries(value)) flatten(item, prefix ? `${prefix} · ${label(key)}` : label(key), out, depth + 1);
}
function tableFor(value) {
  const facts = [];
  flatten(value, "", facts);
  return facts.length ? `<table><tbody>${facts.map(([key,val]) => `<tr><th>${esc(key)}</th><td>${esc(val)}</td></tr>`).join("")}</tbody></table>` : `<p>—</p>`;
}
function bsText(row) {
  const bs = row?.bs || {};
  return String(bs?.formatted || bs?.formatted_ne || [bs?.year,bs?.month,bs?.day].filter(Boolean).join("-") || "");
}
function nsValue(row) { return row?.ns || row?.nepal_sambat || {}; }
function extraDayFacts(row) {
  const skip = new Set(["ad","ad_date","bs","ns","nepal_sambat","panchang","archive_panchang","festivals","holidays","holiday","festival"]);
  const out = {};
  for (const [key,value] of Object.entries(row || {})) if (!skip.has(key) && value != null) out[key] = value;
  return out;
}

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
    const occurrence = festival.occurrences.get(bsYear) || { year:bsYear, dates:[], sources:new Set(), sourceUrls:new Set(), effects:new Set() };
    if (!occurrence.dates.includes(ad)) occurrence.dates.push(ad);
    if (item.source) occurrence.sources.add(String(item.source));
    if (item.sourceUrl) occurrence.sourceUrls.add(String(item.sourceUrl));
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
  html = html.replace("</head>", `  <meta name="robots" content="index,follow,max-image-preview:large" />\n  <script type="application/ld+json">${json(schema)}</script>\n  <style>.seo-prerender{max-width:1040px;margin:auto;padding:24px 16px}.seo-prerender article,.seo-day{background:#fff;border:1px solid #dfe6df;border-radius:18px;padding:20px;margin:0 0 18px}.seo-prerender table{width:100%;border-collapse:collapse}.seo-prerender th,.seo-prerender td{padding:8px;border-bottom:1px solid #e7ece7;text-align:left;vertical-align:top}.seo-prerender th{width:34%}.seo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.seo-card{border:1px solid #e2e8e2;border-radius:14px;padding:12px}details{margin-top:12px}</style>\n</head>`);
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
  const identityDescription = `${name} का source-backed Bikram Sambat वर्षगत मिति; प्रत्येक वर्षको पृष्ठमा त्यो दिनको BS/AD, Nepal Sambat र उपलब्ध पूर्ण Panchang विवरण।`;
  const identityBody = `<article><p><a href="/festivals">चाडपर्व</a> › ${esc(name)}</p><h1>${esc(name)}</h1><p>${esc(identityDescription)}</p><h2>वर्षगत अभिलेख</h2><ul>${occurrences.map((o) => `<li><a href="/festivals/${esc(festival.slug)}/${o.year}">${esc(`${name} ${o.year}`)}</a> — ${o.dates.map((d) => esc(prettyAd(d))).join(", ")}</li>`).join("")}</ul><p><a href="/festivals">सबै चाडपर्व</a> · <a href="/">पात्रोमा फर्कनुहोस्</a></p></article>`;
  const identitySchema = { "@context":"https://schema.org", "@type":"CollectionPage", name, description:identityDescription, url:identityCanonical, about:{ "@type":"Thing", name, description:"Festival and community observance" } };
  const identityFile = resolve(root, "dist/festivals", festival.slug, "index.html");
  await mkdir(dirname(identityFile), { recursive:true });
  await writeFile(identityFile, render({ title:name, description:identityDescription, canonical:identityCanonical, body:identityBody, schema:identitySchema }), "utf8");
  identityCount++;

  for (const occurrence of occurrences) {
    occurrence.dates.sort();
    const canonical = `${SITE}/festivals/${festival.slug}/${occurrence.year}`;
    const title = `${name} ${occurrence.year} · मिति, तिथि र पूर्ण Panchang`;
    const dateSummary = occurrence.dates.map((d) => prettyAd(d)).join(", ");
    const description = `${name} ${occurrence.year}: ${dateSummary}. प्रत्येक occurrence दिनको BS/AD, Nepal Sambat र archive मा उपलब्ध पूर्ण Panchang विवरण।`;
    const sourceText = [...occurrence.sources].join("; ") || "Aafnai Patro validated calendar archive";
    const daySections = occurrence.dates.map((ad) => {
      const row = byAd.get(ad);
      if (!row) return `<section class="seo-day"><h2>${esc(prettyAd(ad))}</h2><p>Calendar row unavailable.</p><p><a href="/date/${esc(ad)}">दिनको पात्रो</a></p></section>`;
      const bs = row?.bs || {};
      const ns = nsValue(row);
      const panchang = row?.panchang || row?.archive_panchang || {};
      return `<section class="seo-day"><p>${esc(ad)} · ${esc(prettyAd(ad))}</p><h2>${esc(bsText(row) || ad)}</h2><div class="seo-grid"><div class="seo-card"><b>वि.सं.</b><div>${esc(bsText(row) || "—")}</div></div><div class="seo-card"><b>AD</b><div>${esc(prettyAd(ad))}</div></div><div class="seo-card"><b>Nepal Sambat</b><div>${esc(typeof ns === "string" ? ns : ns?.formatted_ne || ns?.formatted || "—")}</div></div></div><h3>पूर्ण Panchang विवरण</h3>${tableFor(panchang)}<details open><summary>Nepal Sambat / NS record</summary>${tableFor(ns)}</details><details><summary>अन्य उपलब्ध day/archive fields</summary>${tableFor(extraDayFacts(row))}</details><p><a href="/date/${esc(ad)}">यो दिनको पूर्ण पात्रो</a> · <a href="/calendar/${esc(bs?.year || occurrence.year)}/${String(bs?.month || 1).padStart(2,"0")}">यो महिनाको पात्रो</a></p></section>`;
    }).join("");
    const sourceLinks = [...occurrence.sourceUrls].map((url) => `<a href="${esc(url)}" rel="nofollow noopener">source</a>`).join(" · ");
    const body = `<article><p><a href="/festivals">चाडपर्व</a> › <a href="/festivals/${esc(festival.slug)}">${esc(name)}</a> › ${occurrence.year}</p><h1>${esc(title)}</h1><p>${esc(description)}</p><p><strong>${esc(dateSummary)}</strong></p><p><small>Source: ${esc(sourceText)}${sourceLinks ? ` · ${sourceLinks}` : ""}</small></p></article>${daySections}`;
    const schema = { "@context":"https://schema.org", "@graph":[{ "@type":"WebPage", name:title, url:canonical, description },{ "@type":"Event", name, startDate:occurrence.dates[0], endDate:occurrence.dates.at(-1), url:canonical }] };
    const file = resolve(root, "dist/festivals", festival.slug, String(occurrence.year), "index.html");
    await mkdir(dirname(file), { recursive:true });
    await writeFile(file, render({ title, description, canonical, body, schema }), "utf8");
    occurrenceCount++;
  }
}

console.log(`Festival prerender emitted ${identityCount} identities and ${occurrenceCount} full-detail occurrence pages from validated holiday records.`);
