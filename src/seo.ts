import intents from "../seo/search-intents.json";
import guides from "../seo/guides.json";
import { connectedRouteMeta } from "../worker/connected-seo";
import { historicalCalendarNoindex } from "../worker/seo-window";

const BASE=(((import.meta as ImportMeta & {env?:Record<string,string|undefined>}).env?.VITE_PUBLIC_BASE_URL)||"https://aafnaipatro.com").replace(/\/+$/,"");
const NOINDEX=new Set(["/samachar","/developers","/tools/api","/offline","/mcp","/widget/today"]);
const catalog:Record<string,{title:string;description:string}>={...intents.core,...intents.tools};

// English-first metadata is the crawlable default for global discovery. The UI
// still follows the saved language or the visitor's preferred browser language.
const ENGLISH_FIRST: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Nepali Calendar Today | Nepal Date, Tithi & Festivals",
    description: "Check today’s date in Nepal, Bikram Sambat (BS) and Gregorian (AD) conversion, tithi, festivals, public holidays and the Nepali calendar. Aafnai Patro is available in English and Nepali."
  },
  "/tools": {
    title: "Free Online Tools for Nepal | Aafnai Patro",
    description: "Explore free tools for Nepali typing, BS–AD date conversion, age, EMI, VAT, land measurement, QR, OCR, tithi, auspicious timing and everyday calculations. Available in English and Nepali."
  },
  "/tools/astro": {
    title: "Nepali Astronomical Calendar | Tithi, Moon Phase & Sky Events",
    description: "Explore the Nepali astronomical calendar with tithi, Moon phase, sunrise and sunset, and astronomical context by date. Compare calendar information in English or Nepali."
  },
  "/time-machine": {
    title: "Nepal Time Machine | History Timeline",
    description: "Explore notable events from Nepal and world history with dates, historical context, and source references."
  },
  "/on-this-day": {
    title: "On This Day in Nepal and World History",
    description: "Explore notable events that happened on this date in Nepal and around the world, with source context."
  },
  "/jyotish": {
    title: "Nepali Jyotish Calculators | Birth Chart & Kundali",
    description: "Explore birth charts, rashi, nakshatra, lagna, planetary positions, traditional matchmaking, and related Jyotish calculators."
  },
  "/jyotish/china": {
    title: "Vedic Birth Chart & Nepali Jyotish | Aafnai Patro",
    description: "Explore a birth chart using date, time, and place of birth, with traditional lagna, planetary positions, nakshatra, dasha, and chart interpretations."
  },
  "/about": {
    title: "About Aafnai Patro | Product & Principles",
    description: "Learn about Aafnai Patro’s purpose, calendar and astronomy features, product principles, and approach to transparent information."
  },
  "/sources": {
    title: "Sources & Methodology | Aafnai Patro",
    description: "Understand the sources and limitations behind Nepal calendar dates, tithi, astronomical calculations, cultural calendars, and external content."
  },
  "/privacy": {
    title: "Privacy Policy | Aafnai Patro",
    description: "Review Aafnai Patro’s privacy information covering browser storage, optional synchronization, third-party services, and advertising."
  },
  "/terms": {
    title: "Terms of Use | Aafnai Patro",
    description: "Review the terms governing Aafnai Patro’s informational content, calculations, external links, service availability, and acceptable use."
  },
  "/contact": {
    title: "Contact & Support | Aafnai Patro",
    description: "Contact Aafnai Patro for technical help, product feedback, accessibility suggestions, or evidence-based calendar corrections."
  }
};
export function isPublicPreviewHost(hostname:string){
  const host=hostname.toLowerCase();
  // Loopback development/audit servers cannot be crawled publicly. Let their
  // metadata match production so browser SEO audits exercise real directives.
  const loopback=host==="localhost"||host==="127.0.0.1"||host==="[::1]"||host==="::1";
  return !loopback&&host!==new URL(BASE).hostname;
}
export function resolveRouteSeo(path:string){
  const clean=path.replace(/\/+$/,"")||"/";
  const edge=connectedRouteMeta(clean);
  const guide=guides.find(row=>clean==="/guides/"+row.slug);
  let row=guide||catalog[edge.canonicalPath||clean]||edge;
  if (ENGLISH_FIRST[clean]) row = { ...row, ...ENGLISH_FIRST[clean] };
  if(clean==="/guides")row={title:"नेपाली उपकरण प्रयोग निर्देशिका · Practical Guides",description:"मिति रूपान्तरण, Preeti, नेपाली टाइपिङ, आवाज र उमेर गणनाका व्यावहारिक निर्देशिका।"};
  if(clean==="/janmadin")row={title:"मेरो असली जन्मदिन · Three Birthdays",description:"AD, BS र तिथि जन्मदिन, निजी स्थानीय जन्म-पञ्चाङ्ग र नेपालका सांस्कृतिक पात्रो।"};
  const date=clean.match(/^\/date\/(\d{4}-\d{2}-\d{2})$/);
  if(date)row={title:`${date[1]} नेपाली मिति · Date Details`,description:`${date[1]} को बिक्रम संवत्, तिथि, नेपाल संवत् र चाडपर्व विवरण।`};
  const privateRoute=/^\/(me|admin|auth|api|compat-api|notes|planner|settings|family|my-data|my-diary)(\/|$)/.test(clean);
  const index=edge.index!==false&&!privateRoute&&!NOINDEX.has(clean)&&!historicalCalendarNoindex(clean)&&!/^\/on-this-day\/\d{2}-\d{2}$/.test(clean);
  return {title:row.title,description:row.description,canonical:BASE+(edge.canonicalPath||clean),index};
}
function meta(name:string,content:string,property=false){
  const attr=property?"property":"name";
  const matches=Array.from(document.head.querySelectorAll<HTMLMetaElement>(`meta[${attr}="${name}"]`));
  let el=matches.shift();for(const duplicate of matches)duplicate.remove();
  if(!el){el=document.createElement("meta");el.setAttribute(attr,name);document.head.appendChild(el)}el.content=content;
}
export function applyRouteSeo(path=location.pathname){
  // The dictionary (src/features/dictionary) sets its own title, canonical, robots and JSON-LD per word.
  if(/^\/tool\/nepalidictionary(\/|$)/.test(path))return;
  const row=resolveRouteSeo(path);
  const preview=isPublicPreviewHost(location.hostname);
  const canonicals=Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'));
  let canonical=canonicals.shift();for(const duplicate of canonicals)duplicate.remove();
  // Preserve the richer server-rendered metadata and factual schema on first render.
  const initialMatch=canonical?.href===row.canonical;
  if(!canonical){canonical=document.createElement("link");canonical.rel="canonical";document.head.appendChild(canonical)}
  if(!initialMatch){
    document.title=row.title.includes("आफ्नै पात्रो")?row.title:`${row.title} · आफ्नै पात्रो`;
    meta("description",row.description);
    for(const [name,value] of [["og:title",document.title],["og:description",row.description],["og:url",row.canonical],["og:image",BASE+"/og-default.png"]])meta(name,value,true);
    for(const [name,value] of [["twitter:card","summary_large_image"],["twitter:title",document.title],["twitter:description",row.description],["twitter:image",BASE+"/og-default.png"]])meta(name,value);
    // A previous route's event/article schema must not describe the next route.
    document.head.querySelectorAll('script[type="application/ld+json"]').forEach(el=>el.remove());
    const schema=document.createElement("script");schema.type="application/ld+json";schema.id="patro-route-schema";
    schema.textContent=JSON.stringify({"@context":"https://schema.org","@type":"WebPage",name:document.title,description:row.description,url:row.canonical,inLanguage:["ne","en"]});document.head.appendChild(schema);
  }
  canonical.href=row.canonical;
  const directive=preview?"noindex,nofollow":row.index?"index,follow,max-image-preview:large":"noindex,follow";
  meta("robots",directive);meta("googlebot",directive);
  // Reuse existing alternate links, avoiding stale canonicals after SPA navigation.
  document.head.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]').forEach(el=>{el.href=row.canonical});
}
