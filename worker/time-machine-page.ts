type AssetBinding = { fetch(request: Request): Promise<Response> };
type Env = Record<string, unknown> & { ASSETS?: AssetBinding; PUBLIC_SITE_URL?: string };
type TimeMachineMoment = {
  slug:string;
  id:string;
  title:string;
  title_en?:string|null;
  title_ne?:string|null;
  summary?:string|null;
  summary_en?:string|null;
  summary_ne?:string|null;
  year?:number|null;
  ad_date?:string|null;
  category?:string|null;
  place?:string|null;
  source_url?:string|null;
  source_name?:string|null;
  previous_slug?:string|null;
  next_slug?:string|null;
};
type TimeMachineIndex = { schema:number; count:number; source_date?:string; moments:Record<string,TimeMachineMoment> };

let cache: TimeMachineIndex | null = null;
const esc = (value:unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c] as string));
const site = (env:Env) => String(env.PUBLIC_SITE_URL || "https://aafnaipatro.com").replace(/\/+$/, "");

async function loadIndex(request:Request, env:Env):Promise<TimeMachineIndex|null>{
  if (cache) return cache;
  if (!env.ASSETS) return null;
  try {
    const url = new URL(request.url);
    url.pathname = "/data/time-machine-index.json";
    url.search = "";
    url.hash = "";
    const response = await env.ASSETS.fetch(new Request(url.toString(), { method:"GET", headers:{ accept:"application/json" } }));
    if (!response.ok) return null;
    const doc = await response.json() as TimeMachineIndex;
    if (Number(doc?.schema)!==1 || Number(doc?.count)<700 || !doc?.moments || typeof doc.moments!=="object") return null;
    cache = doc;
    return doc;
  } catch { return null; }
}

function sourceLabel(moment:TimeMachineMoment){
  if (moment.source_name) return moment.source_name;
  if (moment.source_url) {
    try { return new URL(moment.source_url).hostname.replace(/^www\./, ""); } catch {}
  }
  return "Aafnai Patro historical archive";
}
function clipped(value:string, max=220){
  const text=String(value||"").replace(/\s+/g," ").trim();
  return text.length<=max?text:`${text.slice(0,max-1).trimEnd()}…`;
}

function responseHtml(request:Request, env:Env, slug:string, moment:TimeMachineMoment){
  const canonical = `${site(env)}/time-machine/${slug}`;
  const year = moment.year ? String(moment.year) : "";
  const title = `${moment.title}${year?` · ${year}`:""} | नेपाल इतिहास`;
  const factual = moment.summary || moment.summary_ne || moment.summary_en || `${moment.title}${year?` (${year})`:""} सम्बन्धी Time Machine अभिलेख।`;
  const description = clipped(factual, 190);
  const source = sourceLabel(moment);
  const meta = [year, moment.category, moment.place].filter(Boolean).join(" · ");
  const schema = {
    "@context":"https://schema.org",
    "@graph":[
      {"@type":"WebPage",name:title,description,url:canonical,inLanguage:["ne","en"],isPartOf:{"@type":"WebSite",name:"Aafnai Patro",url:site(env)+"/"},about:{"@type":"Thing",name:moment.title}},
      {"@type":"BreadcrumbList",itemListElement:[
        {"@type":"ListItem",position:1,name:"आफ्नै पात्रो",item:site(env)+"/"},
        {"@type":"ListItem",position:2,name:"Time Machine",item:site(env)+"/time-machine"},
        {"@type":"ListItem",position:3,name:moment.title,item:canonical}
      ]}
    ]
  };
  const sourceHtml = moment.source_url
    ? `<a href="${esc(moment.source_url)}" rel="nofollow noopener">${esc(source)}</a>`
    : esc(source);
  const prev = moment.previous_slug ? `<a href="/time-machine/${esc(moment.previous_slug)}">← अघिल्लो अभिलेख</a>` : "";
  const next = moment.next_slug ? `<a href="/time-machine/${esc(moment.next_slug)}">अर्को अभिलेख →</a>` : "";
  const dateLink = moment.ad_date ? `<a href="/date/${esc(moment.ad_date)}">${esc(moment.ad_date)} को पात्रो</a>` : "";
  const html = `<!doctype html><html lang="ne"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · आफ्नै पात्रो</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large"><link rel="canonical" href="${esc(canonical)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,"\\u003c")}</script><style>body{font-family:system-ui,-apple-system,"Noto Sans Devanagari",sans-serif;margin:0;background:#f6f7f4;color:#172019}main{max-width:880px;margin:auto;padding:28px 18px 56px}article{background:#fff;border:1px solid #dfe6df;border-radius:20px;padding:24px}a{color:#176f3b}.meta{color:#667268}nav{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}p{line-height:1.7}h1{line-height:1.25}</style></head><body><main><article><p><a href="/">Home</a> › <a href="/time-machine">Time Machine</a> › ${esc(moment.title)}</p>${meta?`<p class="meta">${esc(meta)}</p>`:""}<h1>${esc(moment.title)}</h1>${moment.title_ne&&moment.title_en&&moment.title_ne!==moment.title_en?`<p><strong>${esc(moment.title_ne)}</strong> · ${esc(moment.title_en)}</p>`:""}<p>${esc(factual)}</p><p><strong>Source:</strong> ${sourceHtml}</p><nav>${[prev,dateLink,`<a href="/time-machine">Time Machine</a>`,`<a href="/on-this-day">इतिहासमा आज</a>`,next].filter(Boolean).join("")}</nav></article></main></body></html>`;
  const headers = new Headers({"content-type":"text/html; charset=utf-8","cache-control":"public, max-age=300, s-maxage=86400, stale-while-revalidate=604800","x-content-type-options":"nosniff","x-patro-backend":"dynamic-time-machine-index","x-robots-tag":"index, follow"});
  return new Response(request.method==="HEAD"?null:html,{status:200,headers});
}

export async function timeMachinePageResponse(request:Request, env:Env):Promise<Response|null>{
  if(request.method!=="GET"&&request.method!=="HEAD") return null;
  const path = new URL(request.url).pathname.replace(/\/+$/,"") || "/";
  const match = path.match(/^\/time-machine\/([a-z0-9\p{L}-]{3,120})$/u);
  if(!match) return null;
  const index = await loadIndex(request,env);
  if(!index) return new Response("Time Machine index unavailable",{status:503,headers:{"cache-control":"no-store","retry-after":"300","x-robots-tag":"noindex, nofollow"}});
  const moment = index.moments[match[1]];
  if(!moment) return new Response("Time Machine moment not found",{status:404,headers:{"x-robots-tag":"noindex, nofollow","cache-control":"public, max-age=300"}});
  return responseHtml(request,env,match[1],moment);
}
