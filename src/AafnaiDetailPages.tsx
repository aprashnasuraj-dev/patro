import { useEffect, useMemo, useState } from "react";
import { setPageTitle, toNepaliDigits } from "./title";

type AnyRecord = Record<string, any>;

function todayNepal(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
async function getJson<T>(url:string,signal?:AbortSignal):Promise<T>{const response=await fetch(url,{headers:{accept:"application/json"},signal});if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json()}
function text(value:unknown,fallback="—"){const out=String(value??"").trim();return out||fallback}
function itemTitle(item:AnyRecord){return text(item.title_ne||item.name_ne||item.title||item.name||item.event||item.headline,"ऐतिहासिक घटना")}
function itemBody(item:AnyRecord){return text(item.summary_ne||item.description_ne||item.summary||item.description||item.detail||item.details||item.body,"विवरण उपलब्ध छ।")}
function itemYear(item:AnyRecord){const year=item.year||item.bs_year||item.ad_year||item.date?.slice?.(0,4);return year?toNepaliDigits(year):""}

export function TimeMachinePage(){
 const[data,setData]=useState<AnyRecord[]>([]);const[error,setError]=useState("");const[loading,setLoading]=useState(true);const[year,setYear]=useState("");
 useEffect(()=>{setPageTitle("समययन्त्र")},[]);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError("");const query=year?`?year=${encodeURIComponent(year)}&limit=120`:"?limit=120";getJson<{items?:AnyRecord[]}>(`/api/v1/time-machine${query}`,controller.signal).then(payload=>setData(payload.items||[])).catch(()=>setError("ऐतिहासिक समयरेखा लोड हुन सकेन।")).finally(()=>setLoading(false));return()=>controller.abort()},[year]);
 return <main className="ap-page"><header className="ap-page-title"><span className="ap-eyebrow">इतिहास</span><h1>समययन्त्र</h1><p>नेपालको इतिहासका अभिलेखित क्षणहरू वर्षअनुसार हेर्नुहोस्।</p></header><section className="ap-tool-section"><div className="ap-section-head"><div><h2>ऐतिहासिक समयरेखा</h2><p>वर्ष खाली राख्दा पछिल्ला अभिलेख देखिन्छन्।</p></div><label>वर्ष <input value={year} inputMode="numeric" pattern="[0-9]*" placeholder="जस्तै २००८" onChange={event=>setYear(event.target.value.replace(/[^0-9]/g,""))}/></label></div>{loading?<div className="ap-state">समयरेखा लोड हुँदैछ…</div>:error?<div className="ap-state ap-error">{error}</div>:<div className="ap-news-grid">{data.map((item,index)=><article className="ap-news-card" key={item.id||item.key||index}>{itemYear(item)&&<small>{itemYear(item)}</small>}<h2>{itemTitle(item)}</h2><p>{itemBody(item)}</p></article>)}</div>}</section></main>
}

export function OnThisDayPage(){
 const[date,setDate]=useState(todayNepal);const[data,setData]=useState<AnyRecord[]>([]);const[error,setError]=useState("");const[loading,setLoading]=useState(true);
 useEffect(()=>{setPageTitle("आज इतिहासमा")},[]);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError("");getJson<{items?:AnyRecord[]}>(`/api/v1/on-this-day?date=${encodeURIComponent(date)}`,controller.signal).then(payload=>setData(payload.items||[])).catch(()=>setError("यो मितिको इतिहास लोड हुन सकेन।")).finally(()=>setLoading(false));return()=>controller.abort()},[date]);
 return <main className="ap-page"><header className="ap-page-title"><span className="ap-eyebrow">इतिहास</span><h1>आज इतिहासमा</h1><p>चयन गरिएको मिति नेपाल र विश्व इतिहासमा किन महत्वपूर्ण थियो हेर्नुहोस्।</p></header><section className="ap-tool-section"><div className="ap-section-head"><div><h2>मिति अनुसार घटना</h2><p>{date}</p></div><label>मिति <input type="date" value={date} onChange={event=>setDate(event.target.value)}/></label></div>{loading?<div className="ap-state">इतिहास लोड हुँदैछ…</div>:error?<div className="ap-state ap-error">{error}</div>:data.length?<div className="ap-news-grid">{data.map((item,index)=><article className="ap-news-card" key={item.id||item.key||index}>{itemYear(item)&&<small>{itemYear(item)}</small>}<h2>{itemTitle(item)}</h2><p>{itemBody(item)}</p></article>)}</div>:<div className="ap-state">यो मितिका लागि अभिलेख भेटिएन।</div>}</section></main>
}

type SyncData={calendars?:{gregorian_ad?:string;bikram_sambat?:string;nepal_sambat?:string};tithi?:AnyRecord;archive_panchang?:AnyRecord};
function festivalDate(item:AnyRecord){return item.ad_date||item.fact_date||item.date||""}
function festivalName(item:AnyRecord){return text(item.name_ne||item.title_ne||item.title||item.name_en,"चाडपर्व")}

export function DateDetailPage({date}:{date:string}){
 const[sync,setSync]=useState<SyncData|null>(null);const[events,setEvents]=useState<AnyRecord[]>([]);const[error,setError]=useState("");
 const valid=useMemo(()=>/^\d{4}-\d{2}-\d{2}$/.test(date),[date]);
 useEffect(()=>{setPageTitle(valid?`${date} को पात्रो`:"मिति")},[date,valid]);
 useEffect(()=>{if(!valid)return;const controller=new AbortController();setError("");Promise.all([getJson<SyncData>(`/api/v1/sync?date=${encodeURIComponent(date)}`,controller.signal),getJson<{items?:AnyRecord[]}>(`/api/v1/festivals?year=${date.slice(0,4)}`,controller.signal).catch(()=>({items:[]}))]).then(([calendar,festivalPayload])=>{setSync(calendar);setEvents((festivalPayload.items||[]).filter(item=>festivalDate(item)===date))}).catch(()=>setError("मिति विवरण लोड हुन सकेन।"));return()=>controller.abort()},[date,valid]);
 if(!valid)return <main className="ap-page"><div className="ap-state ap-error">मिति मान्य छैन।</div></main>;
 if(error)return <main className="ap-page"><div className="ap-state ap-error">{error}</div></main>;
 if(!sync)return <main className="ap-page"><div className="ap-state">मिति विवरण लोड हुँदैछ…</div></main>;
 const p=sync.archive_panchang||{};
 return <main className="ap-page"><header className="ap-page-title"><span className="ap-eyebrow">दैनिक पात्रो</span><h1>{sync.calendars?.bikram_sambat||date}</h1><p>{sync.calendars?.gregorian_ad||date} · {sync.calendars?.nepal_sambat||"नेपाल संवत्"}</p></header><section className="ap-tool-section"><h2>आजको पञ्चाङ्ग</h2><div className="ap-tool-grid"><div className="ap-tool-card"><span className="ap-tool-icon">ति</span><div><strong>{text(sync.tithi?.ne||sync.tithi?.name_ne||sync.tithi?.name,"तिथि")}</strong><small>तिथि</small></div></div><div className="ap-tool-card"><span className="ap-tool-icon">सू</span><div><strong>{text(p.sunrise)}</strong><small>सूर्योदय</small></div></div><div className="ap-tool-card"><span className="ap-tool-icon">अ</span><div><strong>{text(p.sunset)}</strong><small>सूर्यास्त</small></div></div></div></section>{events.length>0&&<section className="ap-tool-section"><h2>चाडपर्व र बिदा</h2><div className="ap-news-grid">{events.map((item,index)=><article className="ap-news-card" key={item.id||index}><small>{text(item.effect||item.status,"पात्रो")}</small><h2>{festivalName(item)}</h2><p>{text(item.description_ne||item.description,"यस दिनको पात्रो घटना")}</p></article>)}</div></section>}<section className="ap-tool-section"><a href="/">← पात्रोमा फर्कनुहोस्</a></section></main>
}
