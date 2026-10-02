import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  SITE, BS_MONTHS, CORE_INDEX_ROUTES, TOOL_ROUTES, INDEXED_CALENDAR_YEARS,
  PRERENDER_CALENDAR_YEARS, calendarRoute, calendarRoutes, unique
} from "./seo-config.mjs";

const root = process.cwd();
const shellPath = resolve(root, "dist/index.html");
const shell = await readFile(shellPath, "utf8");
if (!shell.includes('id="root"')) throw new Error("SEO prerender requires the Vite root shell");

const TOOL_COPY = {
  "/tools/astro": ["खगोलीय पात्रो · Astronomical Calendar", "तिथि, चन्द्र अवस्था र खगोलीय सन्दर्भसँग नेपाली पात्रो हेर्नुहोस्।"],
  "/tools/nepali-typing": ["नेपाली टाइपिङ · Nepali Typing", "Roman Nepali र देवनागरीमा नेपाली टाइपिङ, सुझाव र Unicode text tools प्रयोग गर्नुहोस्।"],
  "/tools/preeti-converter": ["Preeti ↔ Unicode Converter", "Preeti र Unicode नेपाली पाठ दुवैतर्फ रूपान्तरण गर्नुहोस्।"],
  "/tools/bstoad": ["BS to AD · नेपाली मिति रूपान्तरण", "Bikram Sambat (BS) नेपाली मितिलाई Gregorian (AD) मितिमा रूपान्तरण गर्नुहोस्।"],
  "/tools/adtobs": ["AD to BS · Nepal Date Converter", "Gregorian AD मितिलाई Bikram Sambat नेपाली मिति (BS) मा रूपान्तरण गर्नुहोस्।"],
  "/tools/sait": ["शुभ साइत · Nepali Sait", "नेपाली पात्रोको साइत, शुभ समय र उपलब्ध स्रोत सन्दर्भ हेर्नुहोस्।"],
  "/tools/tithi-reminder": ["तिथि रिमाइन्डर · Nepali Tithi", "नेपाली तिथि र lunar-date reminders व्यवस्थापन गर्नुहोस्।"],
  "/tools/patro-bot": ["पात्रो बोट · Nepali Calendar Assistant", "नेपाली मिति, तिथि, पात्रो र reminder सम्बन्धी छोटा प्रश्नका लागि पात्रो सहायक।"]
};

const CORE_COPY = {
  "/": ["आजको नेपाली पात्रो · Nepal Date Today", "नेपाल समयअनुसार आजको नेपाली मिति, तिथि, चाडपर्व, बिदा, नेपाल संवत् र मासिक Bikram Sambat पात्रो एउटै ठाउँमा।"],
  "/tools": ["नेपाली टुल्स · Nepali Tools", "नेपाली पात्रो, मिति रूपान्तरण, नेपाली टाइपिङ, तिथि, साइत, वित्त, नापतौल र दैनिक utilities।"],
  "/convert": ["नेपाली मिति रूपान्तरण · BS ↔ AD Date Converter", "BS to AD र AD to BS दुवैतर्फ नेपाली मिति रूपान्तरण गर्नुहोस्। Nepal date र Gregorian date बीच छिटो conversion।"],
  "/rashifal": ["आजको राशिफल · Nepali Rashifal", "दैनिक, साप्ताहिक र मासिक राशिफल नेपाली पात्रो सन्दर्भसँग हेर्नुहोस्।"],
  "/time-machine": ["नेपाल Time Machine · इतिहास", "नेपाल र विश्व इतिहासका उल्लेखनीय वर्ष, घटना र calendar context अन्वेषण गर्नुहोस्।"],
  "/on-this-day": ["इतिहासमा आज · On This Day Nepal", "आजको दिन नेपाल र विश्व इतिहासमा भएका उल्लेखनीय घटनाहरू स्रोतसहित अन्वेषण गर्नुहोस्।"],
  "/fm": ["नेपाली FM रेडियो · Nepal Radio", "नेपालका उपलब्ध FM र internet radio station खोज्नुहोस् र सुन्नुहोस्।"],
  "/tv": ["Nepal Live TV Explorer", "देश, भाषा र category अनुसार उपलब्ध public live TV channels खोज्नुहोस्।"],
  "/samudaya": ["समुदाय पात्रो · Community Calendars", "नेपाल संवत्, ल्होसार, थारू, मिथिला, किरात, हिजरी र Chakra overview सहित समुदाय-केंद्रित पात्रोहरू एउटै hub बाट अन्वेषण गर्नुहोस्।"],
  "/jyotish/china": ["जन्म कुण्डली · Nepali Jyotish", "जन्म विवरणका आधारमा उपलब्ध नेपाली ज्योतिष र पात्रो सन्दर्भ अन्वेषण गर्नुहोस्।"],
  "/jyotish/matchmaking": ["कुण्डली मिलान · Nepali Matchmaking", "जन्म विवरणका आधारमा उपलब्ध ज्योतिषीय मिलान सन्दर्भ अन्वेषण गर्नुहोस्।"],
  "/about": ["आफ्नै पात्रोबारे · About Aafnai Patro", "Aafnai Patro को उद्देश्य, नेपाली calendar अनुभव र उपलब्ध सुविधाबारे जान्नुहोस्।"],
  "/sources": ["स्रोत र पद्धति · Calendar Sources", "नेपाली पात्रो, तिथि र अन्य तथ्यका स्रोत तथा सत्यापन पद्धति हेर्नुहोस्।"],
  "/privacy": ["गोपनीयता · Privacy", "Aafnai Patro को privacy र data-handling जानकारी।"],
  "/terms": ["सर्तहरू · Terms", "Aafnai Patro प्रयोगका सर्तहरू।"],
  "/contact": ["सम्पर्क · Contact Aafnai Patro", "Aafnai Patro सँग सम्पर्क र correction feedback पठाउने जानकारी।"]
};

function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function json(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
function abs(path) { return SITE + (path === "/" ? "/" : path); }
function pathToFile(path) {
  return path === "/" ? shellPath : resolve(root, "dist", ...path.split("/").filter(Boolean), "index.html");
}
function breadcrumb(path, title) {
  const pieces = path.split("/").filter(Boolean);
  const items = [{ "@type": "ListItem", position: 1, name: "आफ्नै पात्रो", item: SITE + "/" }];
  if (pieces.length) items.push({ "@type": "ListItem", position: 2, name: title, item: abs(path) });
  return { "@type": "BreadcrumbList", itemListElement: items };
}
function monthMeta(year, monthNumber) {
  const month = BS_MONTHS[monthNumber - 1];
  const title = `${month.ne} ${year} नेपाली पात्रो · Nepali Calendar ${year} ${month.en}`;
  const description = `${month.ne} ${year} (${month.aliases}) को नेपाली पात्रो: Bikram Sambat month calendar, तिथि, चाडपर्व, बिदा र सम्बन्धित Nepal date जानकारी।`;
  return { title, description, month };
}
function pageMeta(path) {
  const match = path.match(/^\/calendar\/(\d{4})\/(\d{2})$/);
  if (match) return monthMeta(Number(match[1]), Number(match[2]));
  const copy = CORE_COPY[path] || TOOL_COPY[path];
  if (copy) return { title: copy[0], description: copy[1] };
  if (path.startsWith("/tools/")) {
    const slug = path.slice(7).replace(/-/g, " ");
    return { title: `${slug} · नेपाली टुल · Aafnai Patro`, description: `${slug} सम्बन्धी Aafnai Patro को browser utility। नेपाली पात्रो र दैनिक Nepal tools सँग जोडिएको उपयोगी tool।` };
  }
  return { title: "आफ्नै पात्रो · Nepali Calendar", description: "नेपाली पात्रो, Nepal date, तिथि, चाडपर्व र उपयोगी नेपाली tools।" };
}
function relatedLinks(path) {
  const links = [
    ["/", "आजको नेपाली मिति"], ["/convert", "BS ↔ AD मिति रूपान्तरण"], ["/tools/bstoad", "BS to AD"],
    ["/tools/adtobs", "AD to BS"], ["/tools/sait", "शुभ साइत"], ["/rashifal", "राशिफल"], ["/on-this-day", "इतिहासमा आज"]
  ];
  if (path.startsWith("/calendar/")) {
    const [, , y] = path.split("/");
    for (const m of BS_MONTHS) links.push([calendarRoute(Number(y), m.n), `${m.ne} ${y}`]);
  }
  return unique(links.filter(([href]) => href !== path).map(([href, label]) => `<a href="${esc(href)}">${esc(label)}</a>`)).join(" · ");
}
function bodyFor(path, meta, indexed) {
  const match = path.match(/^\/calendar\/(\d{4})\/(\d{2})$/);
  let extra = "";
  if (match) {
    const year = Number(match[1]), number = Number(match[2]), month = BS_MONTHS[number - 1];
    const prevN = number === 1 ? 12 : number - 1, prevY = number === 1 ? year - 1 : year;
    const nextN = number === 12 ? 1 : number + 1, nextY = number === 12 ? year + 1 : year;
    extra = `<p><strong>${esc(month.ne)} ${year}</strong> को महिनागत पृष्ठमा तिथि, चाडपर्व, बिदा र दैनिक Gregorian date विवरण app ले उपलब्ध calendar data बाट लोड गर्छ। English/romanized खोजका लागि ${esc(month.aliases)} ${year}, Nepali calendar ${year}, Nepal calendar र Nepali date terminology पनि यस पृष्ठमा स्पष्ट राखिएको छ।</p><p><a href="${calendarRoute(prevY, prevN)}">अघिल्लो महिना</a> · <a href="${calendarRoute(nextY, nextN)}">अर्को महिना</a></p>`;
  } else if (path === "/") {
    extra = `<p><strong>आज कति गते?</strong> नेपाल समय (Asia/Kathmandu) अनुसार आजको Bikram Sambat मिति, तिथि, चाडपर्व र बिदा माथिको interactive पात्रोले देखाउँछ। Search terms such as Nepali calendar, Nepal calendar, Nepal date, Nepali date and aaja kati gate all refer to this same calendar experience.</p>`;
  } else if (path === "/convert" || path === "/tools/bstoad" || path === "/tools/adtobs") {
    extra = `<p>नेपाली मिति (Bikram Sambat/BS) र Gregorian/AD बीच रूपान्तरणका लागि यो canonical Aafnai Patro tool प्रयोग गर्नुहोस्। परिणाम app को calendar data बाट गणना/लोड हुन्छ; crawlable text ले tool को उद्देश्य मात्र वर्णन गर्छ र कुनै मिति अनुमान गर्दैन।</p>`;
  }
  return `<main class="seo-prerender" data-seo-prerender="true"><article><h1>${esc(meta.title)}</h1><p>${esc(meta.description)}</p>${extra}<nav aria-label="सम्बन्धित पात्रो पृष्ठहरू">${relatedLinks(path)}</nav>${indexed ? "" : "<p>यो archive page उपयोगी navigation का लागि उपलब्ध छ तर हाल search index मा प्राथमिकता दिइएको छैन।</p>"}</article></main>`;
}
function schemaFor(path, meta) {
  const graph = [
    { "@type": "WebPage", "@id": abs(path) + "#page", url: abs(path), name: meta.title, description: meta.description, inLanguage: ["ne", "en"], isPartOf: { "@id": SITE + "/#website" } },
    breadcrumb(path, meta.title)
  ];
  if (path === "/") {
    graph.unshift(
      { "@type": "Organization", "@id": SITE + "/#org", name: "Aafnai Patro", alternateName: ["आफ्नै पात्रो", "AafnaiPatro"], url: SITE + "/", logo: { "@type": "ImageObject", url: SITE + "/icon-512.png", width: 512, height: 512 }, areaServed: ["NP", "US", "AU", "GB", "JP", "QA", "AE", "SA", "MY", "KR", "IN"], knowsLanguage: ["ne", "en"] },
      { "@type": "WebSite", "@id": SITE + "/#website", url: SITE + "/", name: "Aafnai Patro", alternateName: "आफ्नै पात्रो", inLanguage: ["ne", "en"], publisher: { "@id": SITE + "/#org" } }
    );
  }
  if (path === "/convert" || path.startsWith("/tools/")) {
    graph.push({ "@type": "WebApplication", name: meta.title, url: abs(path), applicationCategory: "UtilitiesApplication", operatingSystem: "Any", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "NPR" } });
  }
  const m = path.match(/^\/calendar\/(\d{4})\/(\d{2})$/);
  if (m) {
    const year = Number(m[1]);
    graph.push({ "@type": "ItemList", name: `Nepali Calendar ${year}`, itemListElement: BS_MONTHS.map((month, i) => ({ "@type": "ListItem", position: i + 1, name: `${month.ne} ${year} (${month.en})`, url: abs(calendarRoute(year, month.n)) })) });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}
function replaceOrInsert(html, matcher, replacement, before = "</head>") {
  return matcher.test(html) ? html.replace(matcher, replacement) : html.replace(before, replacement + "\n" + before);
}
function render(path, indexed) {
  const meta = pageMeta(path);
  const canonical = abs(path);
  const title = `${meta.title} · आफ्नै पात्रो`;
  let html = shell;
  html = html.replace(/<html\s+lang="[^"]*"/i, '<html lang="ne"');
  html = replaceOrInsert(html, /<title>.*?<\/title>/is, `<title>${esc(title)}</title>`);
  html = replaceOrInsert(html, /<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${esc(meta.description)}" />`);
  html = replaceOrInsert(html, /<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${esc(canonical)}" />`);
  html = replaceOrInsert(html, /<meta\s+property="og:title"[^>]*>/i, `<meta property="og:title" content="${esc(title)}" />`);
  html = replaceOrInsert(html, /<meta\s+property="og:description"[^>]*>/i, `<meta property="og:description" content="${esc(meta.description)}" />`);
  html = replaceOrInsert(html, /<meta\s+property="og:url"[^>]*>/i, `<meta property="og:url" content="${esc(canonical)}" />`);
  html = replaceOrInsert(html, /<meta\s+property="og:image"[^>]*>/i, `<meta property="og:image" content="${SITE}/icon-512.png" />`);
  html = replaceOrInsert(html, /<meta\s+name="twitter:image"[^>]*>/i, `<meta name="twitter:image" content="${SITE}/icon-512.png" />`);
  html = html.replace(/<script\s+type="application\/ld\+json">.*?<\/script>/gis, "");
  const directives = indexed ? "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" : "noindex,follow,max-image-preview:large";
  const head = [
    `<meta name="robots" content="${directives}" />`,
    `<meta name="googlebot" content="${directives}" />`,
    `<link rel="alternate" hreflang="ne" href="${esc(canonical)}" />`,
    `<link rel="alternate" hreflang="x-default" href="${esc(canonical)}" />`,
    `<meta property="og:locale" content="ne_NP" />`,
    `<meta property="og:locale:alternate" content="en_US" />`,
    `<script type="application/ld+json">${json(schemaFor(path, meta))}</script>`
  ].join("\n  ");
  html = html.replace("</head>", `  ${head}\n</head>`);
  html = html.replace(/<div\s+id="root"\s*><\/div>/i, `<div id="root">${bodyFor(path, meta, indexed)}</div>`);
  return html;
}

const indexed = new Set([...CORE_INDEX_ROUTES, ...TOOL_ROUTES, ...calendarRoutes(INDEXED_CALENDAR_YEARS)]);
const routes = unique([...CORE_INDEX_ROUTES, ...TOOL_ROUTES, ...calendarRoutes(PRERENDER_CALENDAR_YEARS)]);
let written = 0;
for (const path of routes) {
  const file = pathToFile(path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, render(path, indexed.has(path)), "utf8");
  written++;
}

console.log(`SEO prerender emitted ${written} crawlable HTML routes (${indexed.size} indexable; archive months are noindex,follow).`);
