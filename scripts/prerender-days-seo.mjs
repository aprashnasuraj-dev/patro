import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { SITE, BS_MONTHS, INDEXED_CALENDAR_YEARS, calendarRoute, calendarYearRoute } from "./seo-config.mjs";
import { loadCalendarSnapshot, loadHolidayMap, nsText, tithiText } from "./calendar-snapshot.mjs";

const root = process.cwd();
const shellPath = resolve(root, "dist/index.html");
const shell = await readFile(shellPath, "utf8");
if (!shell.includes('id="root"')) throw new Error("Day SEO prerender requires the Vite root shell");

const indexedYears = new Set(INDEXED_CALENDAR_YEARS);
const rows = (await loadCalendarSnapshot()).filter((row) => indexedYears.has(Number(row.bs?.year)));
const holidays = await loadHolidayMap();
if (rows.length < 1700) throw new Error(`Day SEO coverage unexpectedly small: ${rows.length}`);

const DEV = ["०","१","२","३","४","५","६","७","८","९"];
const toDev = (value) => String(value).replace(/\d/g, (d) => DEV[Number(d)]);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const json = (value) => JSON.stringify(value).replace(/</g, "\\u003c");
const canonical = (ad) => `${SITE}/date/${ad}`;
const dayFile = (ad) => resolve(root, "dist/date", ad, "index.html");

function prettyAd(ad, locale="en-GB") {
  return new Intl.DateTimeFormat(locale, { timeZone:"UTC", weekday:"long", year:"numeric", month:"long", day:"numeric" }).format(new Date(ad + "T00:00:00Z"));
}
function weekdayNe(ad){
  const names=["आइतबार","सोमबार","मंगलबार","बुधबार","बिहीबार","शुक्रबार","शनिबार"];
  return names[new Date(ad+"T00:00:00Z").getUTCDay()];
}
function dayTitle(row) {
  const month = BS_MONTHS[Number(row.bs.month) - 1];
  return `${toDev(row.bs.year)} ${month.ne} ${toDev(row.bs.day)} ${weekdayNe(row.ad)} – तिथि, पञ्चाङ्ग र अंग्रेजी मिति`;
}
function dayDescription(row, dayHolidays) {
  const month = BS_MONTHS[Number(row.bs.month) - 1];
  const tithi = tithiText(row.panchang);
  const ns = nsText(row.ns);
  const holiday = dayHolidays.map((h) => h.name).slice(0, 2).join(", ");
  return [
    `${row.bs.day} ${month.en} ${row.bs.year} BS (${toDev(row.bs.day)} ${month.ne} ${toDev(row.bs.year)}) = ${prettyAd(row.ad)}.`,
    tithi ? `तिथि: ${tithi}.` : "",
    ns ? `नेपाल संवत्: ${ns}.` : "",
    holiday ? `चाडपर्व/बिदा: ${holiday}.` : ""
  ].filter(Boolean).join(" ");
}
function schema(row, title, description) {
  const month = BS_MONTHS[Number(row.bs.month) - 1];
  const path = `/date/${row.ad}`;
  return {
    "@context":"https://schema.org",
    "@graph":[
      {
        "@type":"WebPage", "@id":canonical(row.ad)+"#page", url:canonical(row.ad), name:title,
        description, inLanguage:["ne","en"], isPartOf:{"@id":SITE+"/#website"},
        about:[
          {"@type":"Thing", name:"Bikram Sambat", alternateName:"नेपाली मिति"},
          {"@type":"Thing", name:`${month.en} ${row.bs.year}`, alternateName:`${month.ne} ${row.bs.year}`}
        ]
      },
      {
        "@type":"BreadcrumbList",
        itemListElement:[
          {"@type":"ListItem",position:1,name:"आफ्नै पात्रो",item:SITE+"/"},
          {"@type":"ListItem",position:2,name:`नेपाली पात्रो ${row.bs.year}`,item:SITE+calendarYearRoute(Number(row.bs.year))},
          {"@type":"ListItem",position:3,name:`${month.ne} ${row.bs.year}`,item:SITE+calendarRoute(Number(row.bs.year), Number(row.bs.month))},
          {"@type":"ListItem",position:4,name:title,item:SITE+path}
        ]
      }
    ]
  };
}
function body(row, title, description, dayHolidays, index) {
  const month = BS_MONTHS[Number(row.bs.month) - 1];
  const tithi = tithiText(row.panchang) || "—";
  const ns = nsText(row.ns) || "—";
  const previous = index > 0 ? rows[index - 1] : null;
  const next = index + 1 < rows.length ? rows[index + 1] : null;
  const holidayHtml = dayHolidays.length ? `<ul>${dayHolidays.map((h) => `<li>${h.slug ? `<a href="/festivals/${esc(h.slug)}/${row.bs.year}">` : ""}${esc(h.name)}${h.nameEn ? ` (${esc(h.nameEn)})` : ""}${h.slug ? "</a>" : ""}${h.source ? ` <small>· ${esc(h.source)}</small>` : ""}</li>`).join("")}</ul>` : `<p>यस स्थानीय archive record मा छुट्टै राष्ट्रिय बिदा/चाडपर्व label छैन।</p>`;
  const source = row.source ? esc(typeof row.source === "string" ? row.source : JSON.stringify(row.source)) : "Aafnai Patro validated calendar archive";
  const verified = row.verified_at ? ` · verified ${esc(String(row.verified_at).slice(0,10))}` : "";
  return `<main class="seo-prerender" data-seo-prerender="true"><article><h1>${esc(title)}</h1><p><strong>यो मितिको सीधा उत्तर:</strong> ${esc(description)}</p><table><caption>नेपाली मिति विवरण</caption><tbody><tr><th>वि.सं. / BS</th><td>${esc(`${row.bs.day} ${month.en} ${row.bs.year}`)} · ${esc(`${toDev(row.bs.day)} ${month.ne} ${toDev(row.bs.year)}`)}</td></tr><tr><th>AD / English date</th><td>${esc(prettyAd(row.ad))}</td></tr><tr><th>बार</th><td>${esc(weekdayNe(row.ad))}</td></tr><tr><th>तिथि</th><td>${esc(tithi)}</td></tr><tr><th>नेपाल संवत्</th><td>${esc(ns)}</td></tr></tbody></table><section><h2>चाडपर्व वा बिदा</h2>${holidayHtml}</section><p><small>Source: ${source}${verified}</small></p><nav aria-label="सम्बन्धित मितिहरू">${previous ? `<a href="/date/${previous.ad}">अघिल्लो दिन</a> · ` : ""}${next ? `<a href="/date/${next.ad}">अर्को दिन</a> · ` : ""}<a href="${calendarRoute(Number(row.bs.year), Number(row.bs.month))}">${esc(`${month.ne} ${row.bs.year} पात्रो`)}</a> · <a href="${calendarYearRoute(Number(row.bs.year))}">${esc(`${row.bs.year} वार्षिक पात्रो`)}</a> · <a href="/convert">BS ↔ AD मिति रूपान्तरण</a> · <a href="/today">आजको नेपाली मिति</a></nav></article></main>`;
}
function render(row, index) {
  const dayHolidays = holidays.get(row.ad) || [];
  const title = dayTitle(row);
  const description = dayDescription(row, dayHolidays);
  const url = canonical(row.ad);
  let html = shell;
  html = html.replace(/<html\s+lang="[^"]*"/i, '<html lang="ne"');
  html = html.replace(/<title>.*?<\/title>/is, `<title>${esc(title)} · आफ्नै पात्रो</title>`);
  html = html.replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${esc(description)}" />`);
  html = html.replace(/<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${url}" />`);
  html = html.replace(/<meta\s+property="og:title"[^>]*>/i, `<meta property="og:title" content="${esc(title)} · आफ्नै पात्रो" />`);
  html = html.replace(/<meta\s+property="og:description"[^>]*>/i, `<meta property="og:description" content="${esc(description)}" />`);
  html = html.replace(/<meta\s+property="og:url"[^>]*>/i, `<meta property="og:url" content="${url}" />`);
  html = html.replace(/<meta\s+property="og:image"[^>]*>/i, `<meta property="og:image" content="${SITE}/icon-512.png" />`);
  html = html.replace(/<meta\s+name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${esc(title)} · आफ्नै पात्रो" />`);
  html = html.replace(/<meta\s+name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${esc(description)}" />`);
  html = html.replace(/<meta\s+name="twitter:image"[^>]*>/i, `<meta name="twitter:image" content="${SITE}/icon-512.png" />`);
  html = html.replace(/<script\s+type="application\/ld\+json">.*?<\/script>/gis, "");
  html = html.replace(/<link\s+rel="alternate"\s+hreflang="[^"]+"[^>]*>/gi, "");
  html = html.replace(/<meta\s+name="robots"[^>]*>/gi, "");
  html = html.replace(/<meta\s+name="googlebot"[^>]*>/gi, "");
  const extra = `<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />\n  <meta name="googlebot" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />\n  <link rel="alternate" hreflang="ne" href="${url}" />\n  <link rel="alternate" hreflang="x-default" href="${url}" />\n  <script type="application/ld+json">${json(schema(row,title,description))}</script>`;
  html = html.replace("</head>", `  ${extra}\n</head>`);
  html = html.replace(/<div\s+id="root"\s*><\/div>/i, `<div id="root">${body(row,title,description,dayHolidays,index)}</div>`);
  return html;
}

let count = 0;
for (let i = 0; i < rows.length; i++) {
  const file = dayFile(rows[i].ad);
  await mkdir(dirname(file), { recursive:true });
  await writeFile(file, render(rows[i], i), "utf8");
  count++;
}
console.log(`SEO day prerender emitted ${count} factual date pages from the validated local calendar archive.`);
