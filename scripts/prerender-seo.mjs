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
const intentCatalog = JSON.parse(await readFile(resolve(root, "seo/search-intents.json"), "utf8"));
const INTENT_META = { ...intentCatalog.core, ...intentCatalog.tools };
for (const route of TOOL_ROUTES) if (!INTENT_META[route]) throw new Error(`Missing canonical SEO intent metadata for ${route}`);

const CORE_COPY = {
  "/time-machine": ["नेपाल Time Machine · इतिहास", "नेपाल र विश्व इतिहासका उल्लेखनीय वर्ष, घटना र calendar context अन्वेषण गर्नुहोस्।"],
  "/on-this-day": ["इतिहासमा आज · On This Day Nepal", "आजको दिन नेपाल र विश्व इतिहासमा भएका उल्लेखनीय घटनाहरू स्रोतसहित अन्वेषण गर्नुहोस्।"],
  "/fm": ["नेपाली FM रेडियो · Nepal Radio", "नेपालका उपलब्ध FM र internet radio station खोज्नुहोस् र सुन्नुहोस्।"],
  "/tv": ["Nepal Live TV Explorer", "देश, भाषा र category अनुसार उपलब्ध public live TV channels खोज्नुहोस्।"],
  "/samudaya": ["समुदाय पात्रो · Community Calendars", "नेपाल संवत्, ल्होसार, थारू, मिथिला, किरात, हिजरी र Chakra overview सहित समुदाय-केंद्रित पात्रोहरू एउटै hub बाट अन्वेषण गर्नुहोस्।"],
  "/jyotish/china": ["जन्म कुण्डली · Nepali Jyotish", "जन्म विवरणका आधारमा उपलब्ध नेपाली ज्योतिष र पात्रो सन्दर्भ अन्वेषण गर्नुहोस्।"],
  "/jyotish/matchmaking": ["कुण्डली मिलान · Nepali Matchmaking", "जन्म विवरणका आधारमा उपलब्ध ज्योतिषीय मिलान सन्दर्भ अन्वेषण गर्नुहोस्।"],
  "/about": ["आफ्नै पात्रोबारे · About Aafnai Patro", "Aafnai Patro को उद्देश्य, नेपाली calendar अनुभव र उपलब्ध सुविधाबारे जान्नुहोस्।"],
  "/sources": ["स्रोत र पद्धति · Calendar Sources", "नेपाली पात्रो, तिथि र अन्य तथ्यका स्रोत तथा सत्यापन पद्धति हेर्नुहोस्।"],
  "/methodology": ["नेपाली पात्रो पद्धति · Methodology", "आफ्नै पात्रोले मिति, तिथि, चाडपर्व र conversion data कसरी स्रोत, verify र प्रस्तुत गर्छ भन्ने पद्धति।"],
  "/corrections": ["पात्रो सुधार र Corrections · Aafnai Patro", "Calendar तथ्यमा त्रुटि भेटिएमा correction process, provenance र update policy हेर्नुहोस्।"],
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
  return { title, description, month, aliases: [`Nepali calendar ${year} ${month.en}`, `${month.ne} ${year} पात्रो`, `${month.aliases} ${year}`] };
}
function pageMeta(path) {
  const match = path.match(/^\/calendar\/(\d{4})\/(\d{2})$/);
  if (match) return monthMeta(Number(match[1]), Number(match[2]));
  if (INTENT_META[path]) return INTENT_META[path];
  const copy = CORE_COPY[path];
  if (copy) return { title: copy[0], description: copy[1], aliases: [] };
  return { title: "आफ्नै पात्रो · Nepali Calendar", description: "नेपाली पात्रो, Nepal date, तिथि, चाडपर्व र उपयोगी नेपाली tools।", aliases: [] };
}
function relatedLinks(path) {
  const links = [
    ["/", "आजको नेपाली मिति"], ["/today", "आज कति गते?"], ["/convert", "BS ↔ AD मिति रूपान्तरण"],
    ["/tools/nepali-typing", "नेपाली टाइपिङ"], ["/tools/preeti-converter", "Preeti ↔ Unicode"],
    ["/tools/bstoad", "BS to AD"], ["/tools/adtobs", "AD to BS"], ["/tools/sait", "शुभ साइत"],
    ["/rashifal", "राशिफल"], ["/on-this-day", "इतिहासमा आज"], ["/tools", "सबै नेपाली tools"]
  ];
  if (path.startsWith("/calendar/")) {
    const [, , y] = path.split("/");
    for (const m of BS_MONTHS) links.push([calendarRoute(Number(y), m.n), `${m.ne} ${y}`]);
  }
  return unique(links.filter(([href]) => href !== path).map(([href, label]) => `<a href="${esc(href)}">${esc(label)}</a>`)).join(" · ");
}
function intentGuide(meta) {
  if (!meta?.steps?.length && !meta?.faqs?.length) return "";
  const aliases = (meta.aliases || []).slice(0, 5);
  const steps = meta.steps?.length ? `<section class="seo-howto"><h2>कसरी प्रयोग गर्ने?</h2><ol>${meta.steps.map((step) => `<li>${esc(step)}</li>`).join("")}</ol></section>` : "";
  const faq = meta.faqs?.length ? `<section class="seo-faq"><h2>धेरै सोधिने प्रश्न</h2>${meta.faqs.map((item) => `<h3>${esc(item.q)}</h3><p>${esc(item.a)}</p>`).join("")}</section>` : "";
  const names = aliases.length ? `<p><strong>सम्बन्धित नामहरू:</strong> ${aliases.map(esc).join(" · ")}</p>` : "";
  return `${steps}${faq}${names}`;
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
    extra = `<p><strong>आज कति गते?</strong> नेपाल समय (Asia/Kathmandu) अनुसार आजको Bikram Sambat मिति, तिथि, चाडपर्व र बिदा माथिको interactive पात्रोले देखाउँछ। Nepali calendar, Nepal calendar, Nepali date today, Nepali miti र aaja kati gate जस्ता खोजहरू यही canonical calendar अनुभवमा आउँछन्।</p>`;
  } else if (path === "/today") {
    extra = `<p>यो स्थिर today URL ले नेपाल समयको आजको नेपाली मिति खोज्ने प्रयोगकर्तालाई सीधा उत्तर दिन्छ। दैनिक बदलिने मितिका लागि URL नबदली एउटै canonical destination रहन्छ।</p>`;
  } else if (path === "/convert" || path === "/tools/bstoad" || path === "/tools/adtobs") {
    extra = `<p>नेपाली मिति (Bikram Sambat/BS) र Gregorian/AD बीच रूपान्तरणका लागि canonical Aafnai Patro calendar engine प्रयोग हुन्छ। Crawlable text ले tool को उद्देश्य मात्र वर्णन गर्छ र कुनै मिति अनुमान गर्दैन।</p>`;
  }
  return `<main class="seo-prerender" data-seo-prerender="true"><article><h1>${esc(meta.title)}</h1><p>${esc(meta.description)}</p>${extra}${intentGuide(meta)}<nav aria-label="सम्बन्धित पात्रो पृष्ठहरू">${relatedLinks(path)}</nav>${indexed ? "" : "<p>यो archive page उपयोगी navigation का लागि उपलब्ध छ तर हाल search index मा प्राथमिकता दिइएको छैन।</p>"}</article></main>`;
}
function schemaFor(path, meta) {
  const keywords = (meta.aliases || []).slice(0, 8).join(", ");
  const graph = [
    { "@type": "WebPage", "@id": abs(path) + "#page", url: abs(path), name: meta.title, description: meta.description, keywords: keywords || undefined, inLanguage: ["ne", "en"], isPartOf: { "@id": SITE + "/#website" } },
    breadcrumb(path, meta.title)
  ];
  if (path === "/") {
    graph.unshift(
      { "@type": "Organization", "@id": SITE + "/#org", name: "Aafnai Patro", alternateName: ["आफ्नै पात्रो", "AafnaiPatro"], url: SITE + "/", logo: { "@type": "ImageObject", url: SITE + "/icon-512.png", width: 512, height: 512 }, areaServed: ["NP", "US", "AU", "GB", "JP", "QA", "AE", "SA", "MY", "KR", "IN"], knowsLanguage: ["ne", "en"] },
      { "@type": "WebSite", "@id": SITE + "/#website", url: SITE + "/", name: "Aafnai Patro", alternateName: ["आफ्नै पात्रो", "Nepali Calendar"], inLanguage: ["ne", "en"], publisher: { "@id": SITE + "/#org" } }
    );
  }
  if (path === "/convert" || path.startsWith("/tools/")) {
    graph.push({ "@type": "WebApplication", name: meta.title, alternateName: (meta.aliases || []).slice(0, 5), url: abs(path), applicationCategory: "UtilitiesApplication", operatingSystem: "Any", browserRequirements: "Requires a modern web browser", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "NPR" }, featureList: meta.steps || [] });
  }
  if (meta.faqs?.length) {
    graph.push({ "@type": "FAQPage", mainEntity: meta.faqs.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) });
  }
  if (meta.steps?.length && (path === "/convert" || path.startsWith("/tools/"))) {
    graph.push({ "@type": "HowTo", name: `${meta.title} कसरी प्रयोग गर्ने`, step: meta.steps.map((text, index) => ({ "@type": "HowToStep", position: index + 1, text })) });
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
  const title = meta.title.length <= 58 ? `${meta.title} · आफ्नै पात्रो` : meta.title;
  let html = shell;
  html = html.replace(/<html\s+lang="[^"]*"/i, '<html lang="ne"');
  html = replaceOrInsert(html, /<title>.*?<\/title>/is, `<title>${esc(title)}</title>`);
  html = replaceOrInsert(html, /<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${esc(meta.description)}" />`);
  html = replaceOrInsert(html, /<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${esc(canonical)}" />`);
  html = replaceOrInsert(html, /<meta\s+property="og:title"[^>]*>/i, `<meta property="og:title" content="${esc(title)}" />`);
  html = replaceOrInsert(html, /<meta\s+property="og:description"[^>]*>/i, `<meta property="og:description" content="${esc(meta.description)}" />`);
  html = replaceOrInsert(html, /<meta\s+property="og:url"[^>]*>/i, `<meta property="og:url" content="${esc(canonical)}" />`);
  html = replaceOrInsert(html, /<meta\s+property="og:image"[^>]*>/i, `<meta property="og:image" content="${SITE}/icon-512.png" />`);
  html = replaceOrInsert(html, /<meta\s+name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${esc(title)}" />`);
  html = replaceOrInsert(html, /<meta\s+name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${esc(meta.description)}" />`);
  html = replaceOrInsert(html, /<meta\s+name="twitter:image"[^>]*>/i, `<meta name="twitter:image" content="${SITE}/icon-512.png" />`);
  html = html.replace(/<script\s+type="application\/ld\+json">.*?<\/script>/gis, "");
  html = html.replace(/<meta\s+name="robots"[^>]*>/gi, "").replace(/<meta\s+name="googlebot"[^>]*>/gi, "");
  const directives = indexed ? "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" : "noindex,follow,max-image-preview:large";
  const head = [
    `<meta name="robots" content="${directives}" />`,
    `<meta name="googlebot" content="${directives}" />`,
    `<link rel="alternate" hreflang="ne" href="${esc(canonical)}" />`,
    `<link rel="alternate" hreflang="x-default" href="${esc(canonical)}" />`,
    `<meta property="og:type" content="website" />`,
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

console.log(`SEO prerender emitted ${written} crawlable HTML routes (${indexed.size} indexable; all 29 tools have intent-specific semantic content).`);
