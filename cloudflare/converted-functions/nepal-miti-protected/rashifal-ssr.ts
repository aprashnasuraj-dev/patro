import { envGet } from "../_shared/env";
const BASE="https://patro-blush.vercel.app";
const BRAND="MeroPatro";
const SIGNS=[
  ["aries","मेष","Aries","♈"],["taurus","वृष","Taurus","♉"],["gemini","मिथुन","Gemini","♊"],["cancer","कर्कट","Cancer","♋"],
  ["leo","सिंह","Leo","♌"],["virgo","कन्या","Virgo","♍"],["libra","तुला","Libra","♎"],["scorpio","वृश्चिक","Scorpio","♏"],
  ["sagittarius","धनु","Sagittarius","♐"],["capricorn","मकर","Capricorn","♑"],["aquarius","कुम्भ","Aquarius","♒"],["pisces","मीन","Pisces","♓"]
] as const;
const PERIODS={aaja:{api:"daily",ne:"आज",en:"Daily"},saptahik:{api:"weekly",ne:"साप्ताहिक",en:"Weekly"},masik:{api:"monthly",ne:"मासिक",en:"Monthly"}} as const;
const esc=(v:unknown)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
function nptDate(){
  const p=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()).map(x=>[x.type,x.value]));
  return p.year+"-"+p.month+"-"+p.day;
}
function canonical(path:string){return BASE+path}
async function loadReading(sign:string,period:string){
  const supabase=envGet("SUPABASE_URL")||"https://pxlsmxbpgdfzjzuqtict.supabase.co";
  const url=new URL(supabase+"/functions/v1/nepal-miti-protected/api/rashifal/universal");
  url.searchParams.set("period",period);url.searchParams.set("date",nptDate());url.searchParams.set("system","vedic");url.searchParams.set("calendar","bs");url.searchParams.set("sign",sign);
  try{
    const response=await fetch(url,{headers:{accept:"application/json"},signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw new Error("rashifal_"+response.status);
    return await response.json();
  }catch{return null}
}
function pageHead(title:string,description:string,path:string){
  const url=canonical(path);
  return '<!doctype html><html lang="ne"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>'+esc(title)+' · '+BRAND+'</title><meta name="description" content="'+esc(description)+'"><link rel="canonical" href="'+url+'">'+
  '<meta property="og:type" content="article"><meta property="og:site_name" content="'+BRAND+'"><meta property="og:title" content="'+esc(title)+' · '+BRAND+'"><meta property="og:description" content="'+esc(description)+'"><meta property="og:url" content="'+url+'"><meta name="theme-color" content="#176f3b">'+
  '<style>:root{--g:#176f3b;--ink:#111827;--muted:#4b5563;--line:#e5e7eb;--bg:#f7f7f5;--good:#e9f6ed;--warn:#fff7e7}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,"Noto Sans Devanagari",system-ui,sans-serif}.wrap{width:min(980px,calc(100% - 28px));margin:auto}.top{background:#fff;border-bottom:1px solid var(--line)}.top .wrap{height:64px;display:flex;align-items:center;justify-content:space-between}.top a{color:var(--g);font-weight:800;text-decoration:none}main{padding:36px 0 72px}.crumb{font-size:13px;color:var(--muted)}.crumb a{color:var(--g)}.hero{margin-top:12px}.hero h1{font-size:clamp(34px,6vw,54px);margin:6px 0}.hero p{color:var(--muted);max-width:760px}.switches,.signs{display:flex;gap:8px;overflow:auto;padding:12px 0}.switches a,.signs a{white-space:nowrap;border:1px solid var(--line);border-radius:999px;padding:7px 11px;background:#fff;color:var(--ink);text-decoration:none}.switches a.active,.signs a.active{background:var(--g);border-color:var(--g);color:#fff}.summary{margin:20px 0;padding:20px;border:1px solid var(--line);border-radius:14px;background:#fff}.summary>strong{display:block;font-size:18px;margin-bottom:8px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.card{border:1px solid var(--line);border-radius:14px;padding:16px;background:#fff}.card h2{font-size:17px;margin:0 0 7px}.card p{margin:0;color:var(--muted)}.score{margin-top:8px;color:var(--g);font-weight:800}.note{margin-top:18px;padding:14px;border-radius:12px;background:var(--warn);color:#6f5a2d;font-size:13px}.meta{margin-top:18px;color:var(--muted);font-size:12px}.empty{margin-top:20px;border:1px dashed var(--line);padding:18px;border-radius:12px;color:var(--muted)}@media(max-width:700px){.grid{grid-template-columns:1fr}}</style></head><body>';
}
export async function rashifalSsr(path:string){
  const m=path.match(/^\/rashifal\/([a-z-]+)\/(aaja|saptahik|masik)$/);
  if(!m)return null;
  const sign=SIGNS.find(x=>x[0]===m[1]);const period=PERIODS[m[2] as keyof typeof PERIODS];
  if(!sign||!period)return new Response("Not Found",{status:404});
  const data=await loadReading(sign[0],period.api),reading=data?.readings?.[0],ne=reading?.narrative?.ne;
  const title=sign[1]+" राशिफल · "+period.ne,description=sign[1]+" ("+sign[2]+") को "+period.ne+" राशिफल, काम, स्रोत/खर्च, सम्बन्ध, दैनिक सन्तुलन र सिकाइसम्बन्धी परम्परागत ज्योतिष व्याख्या।";
  const switches=Object.entries(PERIODS).map(([slug,p])=>'<a class="'+(slug===m[2]?"active":"")+'" href="/rashifal/'+sign[0]+'/'+slug+'">'+p.ne+'</a>').join("");
  const signs=SIGNS.map(s=>'<a class="'+(s[0]===sign[0]?"active":"")+'" href="/rashifal/'+s[0]+'/'+m[2]+'">'+s[3]+' '+s[1]+'</a>').join("");
  let content='';
  if(ne){
    const scores=reading?.scores?.domains||{};
    content='<section class="summary"><strong>'+esc(ne.summary||"")+'</strong><div class="score">समग्र सूचक: '+esc(reading?.scores?.overall??"—")+' / 100</div></section><section class="grid">'+
      (ne.sections||[]).map((s:any)=>'<article class="card"><h2>'+esc(s.title)+'</h2><p>'+esc(s.text)+'</p><div class="score">'+esc(scores[s.domain]??"—")+' / 100</div></article>').join("")+
      '</section><aside class="note">'+esc(ne.note||"")+'</aside><div class="meta">गणना: '+esc(reading?.method?.ephemeris||"")+' · Lahiri ayanamsha · अपडेट '+esc(reading?.generated_at||data?.generated_at||new Date().toISOString())+'</div>';
  }else{
    content='<div class="empty">यो राशिफल अहिले उपलब्ध छैन। पृष्ठमा पुरानो loading placeholder देखाइँदैन; केही समयपछि पुनः प्रयास गर्नुहोस्।</div>';
  }
  const body='<header class="top"><div class="wrap"><a href="/">MeroPatro</a><a href="/jyotish">ज्योतिष</a></div></header><main class="wrap"><div class="crumb"><a href="/jyotish">ज्योतिष</a> / राशिफल</div><section class="hero"><div>'+sign[3]+' '+esc(sign[1])+'</div><h1>'+esc(title)+'</h1><p>'+esc(description)+'</p></section><nav class="switches" aria-label="राशिफल अवधि">'+switches+'</nav><nav class="signs" aria-label="राशि">'+signs+'</nav>'+content+'</main>';
  return new Response(pageHead(title,description,path)+body+'</body></html>',{headers:{"content-type":"text/html; charset=utf-8","cache-control":"public, max-age=300, s-maxage=900, stale-while-revalidate=1800"}});
}
