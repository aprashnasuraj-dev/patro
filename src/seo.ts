import intents from "../seo/search-intents.json";
import guides from "../seo/guides.json";
import { connectedRouteMeta } from "../worker/connected-seo";
import { historicalCalendarNoindex } from "../worker/seo-window";

const BASE=(((import.meta as ImportMeta & {env?:Record<string,string|undefined>}).env?.VITE_PUBLIC_BASE_URL)||"https://aafnaipatro.com").replace(/\/+$/,"");
const NOINDEX=new Set(["/samachar","/developers","/tools/api","/offline","/mcp","/widget/today"]);
const catalog:Record<string,{title:string;description:string}>={...intents.core,...intents.tools};
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
  if(clean==="/guides")row={title:"नेपाली उपकरण प्रयोग निर्देशिका · Practical Guides",description:"मिति रूपान्तरण, Preeti, नेपाली टाइपिङ, आवाज र उमेर गणनाका व्यावहारिक निर्देशिका।"};
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
