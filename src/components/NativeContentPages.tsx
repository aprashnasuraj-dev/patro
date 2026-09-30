import { FormEvent, useEffect, useMemo, useState } from "react";

async function getJson(path:string){
  const response=await fetch(path,{headers:{Accept:"application/json"},cache:"no-store",credentials:"same-origin"});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(body?.error||body?.detail||("HTTP "+response.status));
  return body;
}
function todayNepal(){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const get=(type:Intl.DateTimeFormatPartTypes)=>parts.find(x=>x.type===type)?.value||"";
  return get("year")+"-"+get("month")+"-"+get("day");
}
function textOf(value:any,...keys:string[]){
  for(const key of keys){const v=value?.[key];if(typeof v==="string"&&v.trim())return v.trim();}
  return "";
}
function SourceLink({url}:{url?:string|null}){
  return url&&/^https:\/\//i.test(url)?<a href={url} target="_blank" rel="noreferrer">Source ↗</a>:null;
}

export function NewsPage(){
  const [items,setItems]=useState<any[]>([]),[error,setError]=useState(""),[q,setQ]=useState(""),[category,setCategory]=useState("all");
  useEffect(()=>{const c=new AbortController();const p=new URLSearchParams({limit:"60"});if(q.trim())p.set("q",q.trim());if(category!=="all")p.set("category",category);fetch("/api/v1/news/latest?"+p,{signal:c.signal,cache:"no-store"}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b?.error||"News unavailable");return b}).then(b=>{setItems(b.items||[]);setError("")}).catch(e=>{if(e?.name!=="AbortError")setError(String(e?.message||e))});return()=>c.abort()},[q,category]);
  const cats=useMemo(()=>["all",...Array.from(new Set(items.map(x=>String(x.category||"").toLowerCase()).filter(Boolean))).sort()],[items]);
  return <main className="mp-page"><section className="mp-page-hero"><p className="eyebrow">समाचार · Samachar</p><h1>ताजा नेपाली समाचार</h1><p>Headlines come from the migrated news source set; opening an item takes you to the original publisher.</p></section>
    <section className="mp-card"><div className="mp-native-toolbar"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search headlines…"/><select value={category} onChange={e=>setCategory(e.target.value)}>{cats.map(c=><option key={c} value={c}>{c==="all"?"All categories":c}</option>)}</select></div>{error&&<p className="inline-error">{error}</p>}<div className="mp-content-list">{items.map(item=><article key={item.id||item.url}><div><small>{item.source_id||"source"} · {item.published_at||""}</small><h2>{item.title}</h2>{item.excerpt&&<p>{item.excerpt}</p>}</div><SourceLink url={item.url}/></article>)}</div></section>
  </main>;
}

export function TimeMachinePage(){
  const [year,setYear]=useState(""),[items,setItems]=useState<any[]>([]),[error,setError]=useState("");
  useEffect(()=>{const c=new AbortController();const p=new URLSearchParams({limit:"120"});if(year)p.set("year",year);fetch("/api/v1/time-machine?"+p,{signal:c.signal,cache:"no-store"}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b?.error||"Timeline unavailable");return b}).then(b=>{setItems(b.items||[]);setError("")}).catch(e=>{if(e?.name!=="AbortError")setError(String(e?.message||e))});return()=>c.abort()},[year]);
  return <main className="mp-page"><section className="mp-page-hero"><p className="eyebrow">इतिहास · History</p><h1>Time Machine</h1><p>Explore the migrated Nepal timeline by year.</p></section><section className="mp-card"><label className="mp-native-filter">AD year<input type="number" min="1800" max="2100" value={year} onChange={e=>setYear(e.target.value)} placeholder="All recent years"/></label>{error&&<p className="inline-error">{error}</p>}<div className="mp-timeline-list">{items.map((item,i)=><article key={item.id||i}><time>{item.year||item.ad_year||item.date||"—"}</time><div><h2>{textOf(item,"title_ne","title","title_en")||"Historical moment"}</h2><p>{textOf(item,"summary_ne","summary","description_ne","description","summary_en")}</p><SourceLink url={item.source_url}/></div></article>)}</div></section></main>;
}

export function OnThisDayPage(){
  const [date,setDate]=useState(todayNepal),[items,setItems]=useState<any[]>([]),[error,setError]=useState("");
  useEffect(()=>{const c=new AbortController();fetch("/api/v1/on-this-day?date="+encodeURIComponent(date),{signal:c.signal,cache:"no-store"}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b?.error||"History unavailable");return b}).then(b=>{setItems(b.items||[]);setError("")}).catch(e=>{if(e?.name!=="AbortError")setError(String(e?.message||e))});return()=>c.abort()},[date]);
  return <main className="mp-page"><section className="mp-page-hero"><p className="eyebrow">आज इतिहासमा · On This Day</p><h1>{date}</h1><p>Historical events for this month and day from the migrated, source-backed archive.</p></section><section className="mp-card"><label className="mp-native-filter">Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>{error&&<p className="inline-error">{error}</p>}<div className="mp-timeline-list">{items.map((item,i)=><article key={item.id||i}><time>{item.ad_year||item.year||"—"}</time><div><h2>{textOf(item,"title_ne","title","title_en")||"Historical event"}</h2><p>{textOf(item,"summary_ne","summary","description","summary_en")}</p><small>{item.verification_status||item.event_type||item.category||""}</small><SourceLink url={item.source_url}/></div></article>)}</div></section></main>;
}

const SIGN_ORDER=["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"];
const SIGN_NE:Record<string,string>={aries:"मेष",taurus:"वृष",gemini:"मिथुन",cancer:"कर्कट",leo:"सिंह",virgo:"कन्या",libra:"तुला",scorpio:"वृश्चिक",sagittarius:"धनु",capricorn:"मकर",aquarius:"कुम्भ",pisces:"मीन"};
function readingText(reading:any){
  for(const key of ["summary_ne","summary","overview","prediction","reading","body","text"]){if(typeof reading?.[key]==="string"&&reading[key].trim())return reading[key].trim();}
  const sections=reading?.sections&&typeof reading.sections==="object"?Object.values(reading.sections).filter(x=>typeof x==="string") as string[]:[];
  return sections.join(" · ");
}
export function RashifalPage(){
  const [period,setPeriod]=useState("daily"),[system,setSystem]=useState("vedic"),[date,setDate]=useState(todayNepal),[data,setData]=useState<any>(null),[error,setError]=useState("");
  useEffect(()=>{const c=new AbortController();const p=new URLSearchParams({period,system,calendar:"bs",date});fetch("/api/v1/rashifal/universal?"+p,{signal:c.signal,cache:"no-store"}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b?.error||b?.detail||"Rashifal unavailable");return b}).then(b=>{setData(b);setError("")}).catch(e=>{if(e?.name!=="AbortError")setError(String(e?.message||e))});return()=>c.abort()},[period,system,date]);
  const readings=Array.isArray(data?.readings)?data.readings:[];
  return <main className="mp-page"><section className="mp-page-hero"><p className="eyebrow">ज्योतिष · Jyotish</p><h1>राशिफल · Rashifal</h1><p>Published daily, weekly and monthly readings from the migrated Rashifal publication store.</p><div className="community-actions"><a className="community-button" href="/jyotish/china">चिना टिपन</a><a className="community-button secondary" href="/jyotish/janma-patro">Birth chart</a></div></section><section className="mp-card"><div className="mp-native-toolbar"><select value={period} onChange={e=>setPeriod(e.target.value)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select><select value={system} onChange={e=>setSystem(e.target.value)}><option value="vedic">Vedic</option><option value="western">Western</option></select><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>{error&&<p className="inline-error">{error}</p>}<div className="mp-rashifal-grid">{readings.map((reading:any,i:number)=>{const id=String(reading?.sign?.id||reading?.sign||SIGN_ORDER[i]||"");return <article key={id||i}><small>{id}</small><h2>{SIGN_NE[id]||reading?.sign?.name_ne||reading?.sign?.name_en||id}</h2><p>{readingText(reading)||"Reading available in the publication data."}</p></article>})}</div>{data?.window&&<small>{data.window.key||data.window.label||""}</small>}</section></main>;
}

export function FestivalPage(){
  const path=location.pathname.split("/").filter(Boolean),slug=path[1]||"";
  const [year,setYear]=useState(String(new Date().getFullYear())),[items,setItems]=useState<any[]>([]),[error,setError]=useState("");
  useEffect(()=>{const c=new AbortController();fetch("/api/v1/festivals?year="+encodeURIComponent(year),{signal:c.signal,cache:"no-store"}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b?.error||"Festivals unavailable");return b}).then(b=>{setItems(b.items||[]);setError("")}).catch(e=>{if(e?.name!=="AbortError")setError(String(e?.message||e))});return()=>c.abort()},[year]);
  const shown=useMemo(()=>slug?items.filter(item=>{const hay=(String(item.key||"")+" "+String(item.id||"")+" "+String(item.name_en||"")+" "+String(item.name_ne||"")).toLowerCase();return hay.includes(slug.toLowerCase())}):items,[items,slug]);
  return <main className="mp-page"><section className="mp-page-hero"><p className="eyebrow">चाडपर्व · Festivals</p><h1>{slug?slug.replaceAll("-"," "):"Festival calendar"}</h1><p>Official panchang facts and announced holiday data from the migrated D1 archive.</p></section><section className="mp-card"><label className="mp-native-filter">AD year<input type="number" value={year} onChange={e=>setYear(e.target.value)}/></label>{error&&<p className="inline-error">{error}</p>}<div className="mp-content-list">{shown.map((item:any,i)=><article key={item.id||item.key||i}><div><small>{item.fact_date||item.ad_date||""}</small><h2>{item.name_ne||item.name_en||item.key||"Festival"}</h2><p>{item.source_title||item.value?.tier||item.status||""}</p></div><SourceLink url={item.source_url}/></article>)}</div></section></main>;
}
