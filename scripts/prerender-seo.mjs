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
const featureEditorial = JSON.parse(await readFile(resolve(root, "seo/panchang-feature-editorial.json"), "utf8")).features;
if (featureEditorial.length !== 64 || new Set(featureEditorial.map(item => item.id)).size !== 64) throw new Error("64 public feature editorial entries required");
const FEATURE_HUB_ROUTES = new Set(["/panchang", "/muhurat", "/jyotish", "/planets", "/nepal-calendar"]);
for (const item of featureEditorial) if (!FEATURE_HUB_ROUTES.has("/" + item.group) || !item.href.startsWith("/")) throw new Error("Invalid feature editorial route: " + item.id);
for (const route of TOOL_ROUTES) if (!INTENT_META[route]) throw new Error(`Missing canonical SEO intent metadata for ${route}`);

const CORE_COPY = {
  "/time-machine": ["Nepal Time Machine | History Timeline", "Explore notable events from Nepal and world history with dates, historical context, and source references."],
  "/on-this-day": ["On This Day in Nepal and World History", "Explore notable events that happened on this date in Nepal and around the world, with source context."],
  "/fm": ["Nepali FM Radio Online | Aafnai Patro", "Find and listen to available FM and internet radio stations from Nepal and beyond. Stream availability depends on each broadcaster."],
  "/tv": ["Nepal Live TV Explorer | Aafnai Patro", "Discover supported public live television channels by country, language, or category."],
  "/samudaya": ["Community Calendars of Nepal | Aafnai Patro", "Explore Nepal Sambat, Lhosar, Tharu, Mithila, Kirat, Hijri, and community-cycle calendars in one place."],
  "/panchang": ["Daily Panchang Nepal | Tithi, Nakshatra & Sunrise", "Explore tithi, nakshatra, yoga, karana, sunrise, sunset, and daily Panchang details for Nepal’s local date and time."],
  "/muhurat": ["Muhurat & Auspicious Timing | Aafnai Patro", "Review local time windows and traditional auspicious-timing references, while distinguishing calculated times from source-confirmed dates."],
  "/jyotish": ["Nepali Jyotish Calculators | Birth Chart & Kundali", "Explore birth charts, rashi, nakshatra, lagna, planetary positions, traditional matchmaking, and related Jyotish calculators."],
  "/jyotish/china": ["Vedic Birth Chart & Nepali Jyotish | Aafnai Patro", "Explore a birth chart using date, time, and place of birth, with traditional lagna, planetary positions, nakshatra, dasha, and chart interpretations."],
  "/planets": ["Planetary Positions & Astronomical Events", "Explore sidereal planetary positions, sign ingresses, retrograde stations, angular relationships, and astronomical events."],
  "/nepal-calendar": ["Nepal Calendars & Cultural Traditions", "Explore Bikram Sambat, Nepal Sambat, regional calendars, and cultural traditions with relevant source context."],
  "/janmapatro": ["Nepali Birth Chart | Lagna, Nakshatra & Dasha", "Calculate a traditional birth chart from birth date, exact time, and location, including lagna, planetary positions, nakshatra, and dasha."],
  "/janmapatro/milan.html": ["Nepali Matchmaking | Traditional 36-Guna Milan", "Explore traditional Ashtakoota 36-guna compatibility using birth details or name-based nakshatra initials."],
  "/about": ["About Aafnai Patro | Product & Principles", "Learn about Aafnai Patro’s purpose, calendar and astronomy features, product principles, and approach to transparent information."],
  "/sources": ["Sources & Methodology | Aafnai Patro", "Understand the sources and limitations behind Nepal calendar dates, tithi, astronomical calculations, cultural calendars, and external content."],
  "/methodology": ["Nepali Calendar Methodology | Aafnai Patro", "Learn how calendar dates, tithi, festivals, and date-conversion information are prepared and reviewed."],
  "/corrections": ["Calendar Corrections | Aafnai Patro", "Report a possible calendar or content error with the relevant date, location, observed result, and supporting source."],
  "/privacy": ["Privacy Policy | Aafnai Patro", "Review Aafnai Patro’s privacy information covering browser storage, optional synchronization, third-party services, and advertising."],
  "/terms": ["Terms of Use | Aafnai Patro", "Review the terms governing Aafnai Patro’s informational content, calculations, external links, service availability, and acceptable use."],
  "/contact": ["Contact & Support | Aafnai Patro", "Contact Aafnai Patro for technical help, product feedback, accessibility suggestions, or evidence-based calendar corrections."]
};;

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
  if(path==="/janmadin")return {title:"मेरो असली जन्मदिन · AD, BS and Tithi Birthday",description:"Private device-local birthday calculations, cultural calendars and reflection with Aafnai Patro.",aliases:[]};
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
    ["/rashifal", "राशिफल"], ["/janmapatro", "जन्मपत्रो"], ["/janmapatro/milan.html", "३६ गुण मिलान"], ["/on-this-day", "इतिहासमा आज"], ["/moon", "चन्द्र पात्रो"], ["/fm", "नेपाली FM रेडियो"], ["/festivals", "नेपाली चाडपर्व"], ["/tools", "सबै नेपाली tools"], ["/guides", "उपकरण प्रयोग निर्देशिका"]
  ];
  if (path.startsWith("/calendar/")) {
    const [, , y] = path.split("/");
    for (const m of BS_MONTHS) links.push([calendarRoute(Number(y), m.n), `${m.ne} ${y}`]);
  }
  return unique(links.filter(([href]) => href !== path).map(([href, label]) => `<a href="${esc(href)}">${esc(label)}</a>`)).join(" · ");
}
function intentGuide(meta) {
  if (!meta?.steps?.length && !meta?.faqs?.length) return "";
  const steps = meta.steps?.length ? `<section class="seo-howto"><h2>कसरी प्रयोग गर्ने?</h2><ol>${meta.steps.map((step) => `<li>${esc(step)}</li>`).join("")}</ol></section>` : "";
  const faq = meta.faqs?.length ? `<section class="seo-faq"><h2>धेरै सोधिने प्रश्न</h2>${meta.faqs.map((item) => `<h3>${esc(item.q)}</h3><p>${esc(item.a)}</p>`).join("")}</section>` : "";
  return `${steps}${faq}`;
}
function featureDirectory(path) {
  if (!FEATURE_HUB_ROUTES.has(path)) return "";
  const features = featureEditorial.filter(item => "/" + item.group === path);
  return `<section class="seo-feature-directory" aria-label="Feature guide"><h2>यस समूहका विषय र उपकरण · Explore these tools</h2><p>प्रत्येक विषयको उद्देश्य र उपलब्धता बुझेर सम्बन्धित सुविधा खोल्नुहोस्। · Choose a topic and read what it offers before opening its tool.</p>${features.map(item => `<article><h3><a href="${esc(item.href)}">${esc(item.titleNe)} · ${esc(item.titleEn)}</a></h3><p lang="ne">${esc(item.descriptionNe)}</p><p lang="en">${esc(item.descriptionEn)}</p></article>`).join("")}</section>`;
}
function bodyFor(path, meta, indexed) {
  const match = path.match(/^\/calendar\/(\d{4})\/(\d{2})$/);
  let extra = "";
  if (match) {
    const year = Number(match[1]), number = Number(match[2]), month = BS_MONTHS[number - 1];
    const prevN = number === 1 ? 12 : number - 1, prevY = number === 1 ? year - 1 : year;
    const nextN = number === 12 ? 1 : number + 1, nextY = number === 12 ? year + 1 : year;
    extra = `<p><strong>${esc(month.ne)} ${year}</strong> को पात्रोमा दैनिक Gregorian मिति, तिथि, चाडपर्व र बिदा हेर्नुहोस्।</p><p><a href="${calendarRoute(prevY, prevN)}">अघिल्लो महिना</a> · <a href="${calendarRoute(nextY, nextN)}">अर्को महिना</a></p>`;
  } else if (path === "/") {
    extra = `<p><strong>आज कति गते?</strong> नेपाल समय (Asia/Kathmandu) अनुसार आजको Bikram Sambat मिति, तिथि, चाडपर्व र बिदा हेर्नुहोस्।</p>`;
  } else if (path === "/today") {
    extra = `<p>नेपाल समयअनुसार आजको नेपाली मिति, बार, तिथि र सम्बन्धित पात्रो जानकारी एउटै पृष्ठमा हेर्नुहोस्। विदेशमा हुँदा पनि नेपालको “आज” यही पृष्ठबाट जाँच गर्न सकिन्छ।</p>`;
  } else if (path === "/fm") {
    extra = `<h2>नेपाली FM रेडियो अनलाइन</h2><p>स्टेशन खोजेर उपलब्ध लाइभ स्ट्रिम सुन्नुहोस्। प्रसारणको उपलब्धता रेडियो स्टेशन र इन्टरनेट जडानमा निर्भर हुन्छ। <a href="/tv">अन्य लाइभ मिडिया</a> पनि हेर्नुहोस्।</p>`;
  } else if (path === "/tools/nepali-typing") {
    extra = `<h2>Roman बाट नेपाली Unicode टाइपिङ</h2><p>Roman Nepali टाइप गरेर देवनागरी सुझाव छान्नुहोस्। उदाहरण: namaste → नमस्ते। <a href="/tools/preeti-converter">Preeti to Unicode</a> र <a href="/tools/voice-typing">voice typing</a> पनि उपलब्ध छन्।</p>`;
  } else if (path === "/convert" || path === "/tools/bstoad" || path === "/tools/adtobs") {
    extra = `<p>नेपाली मिति (Bikram Sambat/BS) र Gregorian/AD बीच दुवैतर्फ मिति रूपान्तरण गर्नुहोस्। परिणाम आफ्नै पात्रोको पात्रो अभिलेखअनुसार देखाइन्छ।</p>`;
  }
  return `<main class="seo-prerender" data-seo-prerender="true"><article><h1>${esc(meta.title)}</h1><p>${esc(meta.description)}</p>${extra}${intentGuide(meta)}${featureDirectory(path)}<nav aria-label="सम्बन्धित पात्रो पृष्ठहरू">${relatedLinks(path)}</nav>${indexed ? "" : "<p>यो पुरानो पात्रो पृष्ठ सन्दर्भ र navigation का लागि उपलब्ध छ।</p>"}</article></main>`;
}
function schemaFor(path, meta) {
  const graph = [
    { "@type": "WebPage", "@id": abs(path) + "#page", url: abs(path), name: meta.title, description: meta.description, inLanguage: ["ne", "en"], isPartOf: { "@id": SITE + "/#website" } },
    breadcrumb(path, meta.title)
  ];
  if (path === "/") {
    graph.unshift(
      { "@type": "Organization", "@id": SITE + "/#org", name: "Aafnai Patro", alternateName: ["आफ्नै पात्रो", "AafnaiPatro"], url: SITE + "/", logo: { "@type": "ImageObject", url: SITE + "/icon-512.png", width: 512, height: 512 }, areaServed: ["NP", "US", "AU", "GB", "JP", "QA", "AE", "SA", "MY", "KR", "IN"], knowsLanguage: ["ne", "en"] },
      { "@type": "WebSite", "@id": SITE + "/#website", url: SITE + "/", name: "Aafnai Patro", alternateName: ["आफ्नै पात्रो", "Nepali Calendar"], inLanguage: ["ne", "en"], publisher: { "@id": SITE + "/#org" } }
    );
  }
  if (path === "/convert" || path.startsWith("/tools/")) {
    graph.push({ "@type": "WebApplication", name: meta.title, url: abs(path), applicationCategory: "UtilitiesApplication", operatingSystem: "Any", browserRequirements: "Requires a modern web browser", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "NPR" }, featureList: meta.steps || [] });
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
  html = replaceOrInsert(html, /<meta\s+property="og:image"[^>]*>/i, `<meta property="og:image" content="${SITE}/og-default.png" />`);
  html = replaceOrInsert(html, /<meta\s+name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${esc(title)}" />`);
  html = replaceOrInsert(html, /<meta\s+name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${esc(meta.description)}" />`);
  html = replaceOrInsert(html, /<meta\s+name="twitter:image"[^>]*>/i, `<meta name="twitter:image" content="${SITE}/og-default.png" />`);
  html = html.replace(/<script\s+type="application\/ld\+json">.*?<\/script>/gis, "");
  html = html.replace(/<meta\s+name="robots"[^>]*>/gi, "").replace(/<meta\s+name="googlebot"[^>]*>/gi, "");
  const directives = indexed ? "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" : "noindex,follow,max-image-preview:large";
  const head = [
    `<meta name="robots" content="${directives}" />`,
    `<meta name="googlebot" content="${directives}" />`,
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

console.log(`SEO prerender emitted ${written} crawlable HTML routes (${indexed.size} indexable; all 29 tools have user-facing semantic fallback content).`);
