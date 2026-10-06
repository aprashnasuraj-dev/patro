import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { SITE } from "./seo-config.mjs";

const root = process.cwd();
const shell = await readFile(resolve(root, "dist/index.html"), "utf8");
const graph = JSON.parse(await readFile(resolve(root, "public/publication-graph.json"), "utf8"));
if (!shell.includes('id="root"')) throw new Error("History-day prerender requires the Vite root shell");

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const json = (value) => JSON.stringify(value).replace(/</g, "\\u003c");
const safeHttp = (value) => typeof value === "string" && /^https?:\/\//i.test(value) ? value : "";
const month2 = (value) => String(Number(value)).padStart(2, "0");
const day2 = (value) => String(Number(value)).padStart(2, "0");

function validMonthDay(value) {
  if (!/^\d{2}-\d{2}$/.test(String(value))) return false;
  const [month, day] = String(value).split("-").map(Number);
  if (month < 1 || month > 12) return false;
  const maxDay = new Date(Date.UTC(2000, month, 0)).getUTCDate();
  return day >= 1 && day <= maxDay;
}

function titleOf(row) {
  return String(row?.title_ne || row?.title_en || row?.event_ne || row?.event_en || row?.title || row?.name || "").trim();
}

function yearOf(row) {
  const year = Number(row?.ad_year ?? row?.year);
  return Number.isInteger(year) ? year : null;
}

function verificationOf(row) {
  return String(row?.verification_status || "").trim().toLowerCase() || "unverified";
}

function sourceNameOf(row, url) {
  const explicit = String(row?.source_name || row?.source_title || "").trim();
  if (explicit) return explicit;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "Source"; }
}

function archiveRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const url = safeHttp(row?.source_url);
      const verificationStatus = verificationOf(row);
      return {
        row,
        url,
        title: titleOf(row) || "Historical archive record",
        year: yearOf(row),
        verificationStatus,
        needsFurtherVerification: verificationStatus === "unverified" || !url,
      };
    })
    .sort((a, b) => (a.year ?? 999999) - (b.year ?? 999999) || a.title.localeCompare(b.title));
}

function adjacentMonthDay(mmdd, delta) {
  const [month, day] = mmdd.split("-").map(Number);
  const date = new Date(Date.UTC(2000, month - 1, day + delta));
  return `${month2(date.getUTCMonth() + 1)}-${day2(date.getUTCDate())}`;
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
  html = html.replace("</head>", `  <meta name="robots" content="noindex,follow,max-image-preview:large" />\n  <script type="application/ld+json">${json(schema)}</script>\n</head>`);
  html = html.replace(/<div\s+id="root"\s*><\/div>/i, `<div id="root"><main class="seo-prerender" data-seo-prerender="true">${body}</main></div>`);
  return html;
}

const historyDays = (graph.entities || [])
  .filter((entity) => entity?.type === "history-day")
  .sort((a, b) => String(a.id).localeCompare(String(b.id)));
if (historyDays.length !== 366) throw new Error(`Expected 366 history-day identities; got ${historyDays.length}`);
if (!historyDays.some((entity) => entity?.facts?.monthDay === "02-29")) throw new Error("History-day graph lost Feb 29");

const monthCache = new Map();
async function monthShard(month) {
  if (!monthCache.has(month)) {
    const file = resolve(root, "public/data/on-this-day", `month-${month2(month)}.json`);
    const shard = JSON.parse(await readFile(file, "utf8"));
    if (Number(shard?.month) !== month || !shard?.days) throw new Error(`Invalid On This Day static shard for month ${month}`);
    monthCache.set(month, shard);
  }
  return monthCache.get(month);
}

let emitted = 0;
let archiveEvents = 0;
let needsFurtherVerification = 0;
for (const entity of historyDays) {
  const mmdd = String(entity?.facts?.monthDay || "");
  if (!validMonthDay(mmdd)) throw new Error(`Invalid history-day identity: ${entity?.id}`);
  if (entity.id !== `history-day:${mmdd}` || entity.canonical !== `/on-this-day/${mmdd}`) throw new Error(`History-day canonical mismatch: ${entity?.id}`);

  const [month, day] = mmdd.split("-").map(Number);
  const shard = await monthShard(month);
  const allRows = Array.isArray(shard.days?.[day2(day)]) ? shard.days[day2(day)] : [];
  const rows = archiveRows(allRows);
  archiveEvents += rows.length;
  const needsCount = rows.filter((entry) => entry.needsFurtherVerification).length;
  needsFurtherVerification += needsCount;
  const citedCount = rows.filter((entry) => Boolean(entry.url)).length;

  const display = new Intl.DateTimeFormat("en", { timeZone: "UTC", month: "long", day: "numeric" }).format(new Date(Date.UTC(2000, month - 1, day)));
  const canonical = `${SITE}/on-this-day/${mmdd}`;
  const title = `${display} — इतिहास अभिलेख`;
  const description = `${display} का On This Day archive records. सबै अभिलेख सुरक्षित राखिएका छन्; अप्रमाणित अभिलेखमा थप प्रमाणीकरण आवश्यक भनेर स्पष्ट चिन्ह लगाइएको छ।`;
  const items = rows.length
    ? `<ol>${rows.map(({ row, url, title: eventTitle, year, needsFurtherVerification: needsVerification }) => `<li>${year ? `<strong>${esc(year)}</strong> — ` : ""}${esc(eventTitle)} ${url ? `<a href="${esc(url)}" rel="nofollow noopener">${esc(sourceNameOf(row, url))}</a>` : ""}${needsVerification ? ` <strong data-verification="needs-further-verification">Needs further verification · थप प्रमाणीकरण आवश्यक</strong>` : ""}</li>`).join("")}</ol>`
    : `<p>यो मितिका लागि हालको archive snapshot मा अभिलेख छैन।</p>`;
  const prev = adjacentMonthDay(mmdd, -1);
  const next = adjacentMonthDay(mmdd, 1);
  const body = `<article><p class="eyebrow">स्थायी इतिहास अभिलेख</p><h1>${esc(title)}</h1><p>${esc(description)}</p><p><strong>${rows.length}</strong> total archive record${rows.length === 1 ? "" : "s"}; ${citedCount} source-cited; ${needsCount} need further verification.</p>${items}<nav aria-label="History archive navigation"><a href="/on-this-day/${prev}">← ${esc(prev)}</a> · <a href="/on-this-day">आज इतिहासमा</a> · <a href="/on-this-day/${next}">${esc(next)} →</a></nav><p><a href="/convert">मिति रूपान्तरण गर्नुहोस्</a></p></article>`;
  const schema = { "@context":"https://schema.org", "@type":"WebPage", name:title, description, url:canonical, isPartOf:{ "@type":"WebSite", name:"Aafnai Patro", url:SITE } };
  const file = resolve(root, "dist/on-this-day", mmdd, "index.html");
  await mkdir(dirname(file), { recursive:true });
  await writeFile(file, render({ title, description, canonical, body, schema }), "utf8");
  emitted++;
}

if (emitted !== 366) throw new Error(`History-day prerender output mismatch: ${emitted}`);
if (archiveEvents !== Number(graph.counts?.historyEvents || 0)) throw new Error(`History archive visibility mismatch: rendered ${archiveEvents}; graph has ${graph.counts?.historyEvents || 0}`);
if (needsFurtherVerification !== Number(graph.counts?.historyNeedsFurtherVerification || 0)) throw new Error(`History verification-label mismatch: rendered ${needsFurtherVerification}; graph has ${graph.counts?.historyNeedsFurtherVerification || 0}`);
console.log(`History-day prerender emitted ${emitted} permanent month/day pages with all ${archiveEvents} archive records; ${needsFurtherVerification} are labeled needs further verification.`);
