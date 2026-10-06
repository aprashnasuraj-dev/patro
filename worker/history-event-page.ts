type AssetBinding = { fetch(request: Request): Promise<Response> };
type Env = Record<string, unknown> & { ASSETS?: AssetBinding; PUBLIC_SITE_URL?: string };
type HistoryEvent = {
  id:string;
  title:string;
  title_en?:string|null;
  title_ne?:string|null;
  year?:number|null;
  month_day:string;
  source_url:string;
  source_name?:string|null;
  event_type?:string|null;
};
type HistoryIndex = { schema:number; count:number; events:Record<string,HistoryEvent> };

let cache: HistoryIndex | null = null;
const esc = (value:unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c] as string));
const site = (env:Env) => String(env.PUBLIC_SITE_URL || "https://aafnaipatro.com").replace(/\/+$/, "");

async function loadIndex(request:Request, env:Env):Promise<HistoryIndex|null>{
  if (cache) return cache;
  if (!env.ASSETS) return null;
  try {
    const url = new URL(request.url);
    url.pathname = "/data/history-events-index.json";
    url.search = "";
    const response = await env.ASSETS.fetch(new Request(url.toString(), { method:"GET" }));
    if (!response.ok) return null;
    const doc = await response.json() as HistoryIndex;
    if (Number(doc?.schema)!==1 || !doc?.events || typeof doc.events!=="object") return null;
    cache = doc;
    return doc;
  } catch { return null; }
}

function responseHtml(request:Request, env:Env, slug:string, event:HistoryEvent){
  const canonical = `${site(env)}/onthisday/${slug}`;
  const [month,day] = String(event.month_day).split("-");
  const displayDate = new Intl.DateTimeFormat("en",{timeZone:"UTC",month:"long",day:"numeric"}).format(new Date(Date.UTC(2000,Number(month)-1,Number(day))));
  const title = event.year ? `${event.title} (${event.year}) | On This Day` : `${event.title} | On This Day`;
  const description = `${displayDate}${event.year?` ${event.year}`:""}: ${event.title}. Source-backed history record on Aafnai Patro.`;
  const sourceLabel = event.source_name || (()=>{try{return new URL(event.source_url).hostname.replace(/^www\./,"")}catch{return "Source"}})();
  const schema = {
    "@context":"https://schema.org",
    "@graph":[
      {"@type":"WebPage",name:title,description,url:canonical,inLanguage:["ne","en"],isPartOf:{"@type":"WebSite",name:"Aafnai Patro",url:site(env)+"/"}},
      {"@type":"BreadcrumbList",itemListElement:[
        {"@type":"ListItem",position:1,name:"आफ्नै पात्रो",item:site(env)+"/"},
        {"@type":"ListItem",position:2,name:"इतिहासमा आज",item:site(env)+"/on-this-day"},
        {"@type":"ListItem",position:3,name:event.title,item:canonical}
      ]}
    ]
  };
  const html = `<!doctype html><html lang="ne"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · आफ्नै पात्रो</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large"><link rel="canonical" href="${esc(canonical)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,"\\u003c")}</script><style>body{font-family:system-ui,-apple-system,"Noto Sans Devanagari",sans-serif;margin:0;background:#f6f7f4;color:#172019}main{max-width:860px;margin:auto;padding:28px 18px 56px}article{background:#fff;border:1px solid #dfe6df;border-radius:20px;padding:24px}a{color:#176f3b}.meta{color:#667268}nav{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}</style></head><body><main><article><p class="meta">${esc(displayDate)}${event.year?` · ${esc(event.year)}`:""}${event.event_type?` · ${esc(event.event_type)}`:""}</p><h1>${esc(event.title)}</h1>${event.title_ne&&event.title_en?`<p>${esc(event.title_ne)} · ${esc(event.title_en)}</p>`:""}<p>${esc(description)}</p><p><strong>Source:</strong> <a href="${esc(event.source_url)}" rel="nofollow noopener">${esc(sourceLabel)}</a></p><nav><a href="/on-this-day/${esc(event.month_day)}">${esc(displayDate)} का सबै अभिलेख</a><a href="/on-this-day">इतिहासमा आज</a><a href="/time-machine">Time Machine</a><a href="/">आफ्नै पात्रो</a></nav></article></main></body></html>`;
  const headers = new Headers({"content-type":"text/html; charset=utf-8","cache-control":"public, max-age=300, s-maxage=86400, stale-while-revalidate=604800","x-content-type-options":"nosniff","x-patro-backend":"dynamic-history-static-index","x-robots-tag":"index, follow"});
  return new Response(request.method==="HEAD"?null:html,{status:200,headers});
}

export async function historyEventPageResponse(request:Request, env:Env):Promise<Response|null>{
  if(request.method!=="GET"&&request.method!=="HEAD") return null;
  const path = new URL(request.url).pathname.replace(/\/+$/,"") || "/";
  const match = path.match(/^\/onthisday\/([a-z0-9\p{L}-]{3,120})$/u);
  if(!match) return null;
  const index = await loadIndex(request,env);
  if(!index) return new Response("History index unavailable",{status:503,headers:{"cache-control":"no-store","retry-after":"300","x-robots-tag":"noindex, nofollow"}});
  const event = index.events[match[1]];
  if(!event) return new Response("History event not found",{status:404,headers:{"x-robots-tag":"noindex, nofollow","cache-control":"public, max-age=300"}});
  return responseHtml(request,env,match[1],event);
}
