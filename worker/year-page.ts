import { createPatroAdapter } from "../lib/patro";
import { createD1PatroSource, type PatroEnv } from "./patro-source";

type Env=PatroEnv & { PUBLIC_SITE_URL?: string };
const MONTHS=["","Baisakh","Jestha","Ashadh","Shrawan","Bhadra","Ashwin","Kartik","Mangsir","Poush","Magh","Falgun","Chaitra"];
const MONTHS_NE=["","बैशाख","जेठ","असार","साउन","भदौ","असोज","कार्तिक","मंसिर","पुष","माघ","फागुन","चैत"];
const esc=(v:unknown)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c] as string));
const site=(env:Env)=>String(env.PUBLIC_SITE_URL||"https://aafnaipatro.com").replace(/\/+$/,"");

export async function yearPageResponse(request:Request,env:Env):Promise<Response|null>{
  if(request.method!=="GET"&&request.method!=="HEAD")return null;
  const path=new URL(request.url).pathname.replace(/\/+$/,"")||"/";
  const match=path.match(/^\/calendar\/(\d{4})$/);if(!match)return null;
  const year=Number(match[1]);if(!Number.isInteger(year)||year<1900||year>2200)return new Response("Invalid BS year",{status:400});
  const adapter=createPatroAdapter(createD1PatroSource(env));
  const days=await adapter.getYear(year);if(!days.length)return new Response("Calendar year unavailable",{status:404});
  const grouped=new Map<number,any[]>();for(const day of days){const m=Number(day.bs?.month);const list=grouped.get(m)||[];list.push(day);grouped.set(m,list);}
  const canonical=`${site(env)}/calendar/${year}`;
  const title=`नेपाली पात्रो ${year} · Nepali Calendar ${year} | Aafnai Patro`;
  const description=`Bikram Sambat ${year} को १२ महिनाको नेपाली पात्रो hub: Baisakh देखि Chaitra, factual day archive र BS↔AD navigation.`;
  const monthCards=Array.from({length:12},(_,i)=>i+1).map(month=>{
    const list=grouped.get(month)||[];const first=list[0]?.ad||"—",last=list.at(-1)?.ad||"—";
    return `<a class="card" href="/calendar/${year}/${String(month).padStart(2,"0")}"><strong>${esc(MONTHS_NE[month])} · ${esc(MONTHS[month])}</strong><span>${list.length||"—"} days</span><small>${esc(first)} → ${esc(last)}</small></a>`;
  }).join("");
  const body=`<!doctype html><html lang="ne"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large"><link rel="canonical" href="${canonical}"><script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"WebPage",name:title,description,url:canonical,about:{"@type":"Thing",name:`Bikram Sambat ${year}`}}).replace(/</g,"\\u003c")}</script><style>body{font-family:system-ui,-apple-system,"Noto Sans Devanagari",sans-serif;margin:0;background:#f6f7f4;color:#172019}main{max-width:980px;margin:auto;padding:28px 18px 56px}.panel{background:#fff;border:1px solid #dfe6df;border-radius:20px;padding:24px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card{display:grid;gap:6px;padding:16px;border:1px solid #e2e8e2;border-radius:14px;text-decoration:none;color:inherit}.card strong{color:#176f3b}.links{margin-top:24px;display:flex;gap:12px;flex-wrap:wrap}a{color:#176f3b}</style></head><body><main><article class="panel"><h1>${esc(title)}</h1><p><strong>सीधा उत्तर:</strong> ${year} BS का ${days.length} archive-backed दिनहरू उपलब्ध छन्। प्रत्येक महिनाको actual day count तलको dataset बाट आएको हो; कुनै 30-day assumption प्रयोग गरिएको छैन।</p><div class="grid">${monthCards}</div><nav class="links"><a href="/calendar/${year-1}">अघिल्लो वर्ष</a><a href="/calendar/${year+1}">अर्को वर्ष</a><a href="/today">आजको नेपाली मिति</a><a href="/convert">मिति रूपान्तरण</a><a href="/methodology">पद्धति</a></nav><p><small>Cite as: Aafnai Patro (aafnaipatro.com), accessed ${new Date().toISOString().slice(0,10)}</small></p></article></main></body></html>`;
  return new Response(request.method==="HEAD"?null:body,{status:200,headers:{"content-type":"text/html; charset=utf-8","cache-control":"public, max-age=300, s-maxage=86400","x-content-type-options":"nosniff","x-robots-tag":"index, follow"}});
}
