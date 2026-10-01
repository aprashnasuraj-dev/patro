import { useEffect, useMemo, useState } from "react";
import type { SyncPayload } from "./types";
import { BS_MONTHS, calendarTitle, pageTitle, setPageTitle, toNepaliDigits } from "./title";

const NE_DAYS = ["आइत","सोम","मंगल","बुध","बिही","शुक्र","शनि"];
const FULL_NE_DAYS = ["आइतबार","सोमबार","मंगलबार","बुधबार","बिहीबार","शुक्रबार","शनिबार"];

type CalendarDay = { ad:string; bs:{year:number;month:number;day:number;month_ne?:string;formatted?:string}; nepal_sambat?:any; panchang?:any };
type CalendarMonthPayload = { ok:boolean; year:number; month:number; days:CalendarDay[] };
type Festival = { ad_date?:string; fact_date?:string; date?:string; name_ne?:string; title_ne?:string; name_en?:string; title?:string; effect?:string; status?:string };

function todayNepal(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
async function getJson<T>(url:string, signal?:AbortSignal):Promise<T>{const r=await fetch(url,{headers:{accept:"application/json"},signal});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}
function neDate(iso:string){return new Intl.DateTimeFormat("ne-NP",{timeZone:"Asia/Kathmandu",weekday:"long",year:"numeric",month:"long",day:"numeric"}).format(new Date(iso+"T06:00:00Z"));}
function festivalDate(x:Festival){return x.ad_date||x.fact_date||x.date||"";}
function festivalName(x:Festival){return x.name_ne||x.title_ne||x.title||x.name_en||"चाडपर्व";}

function MonthGrid({year,month,onLoaded}:{year:number;month:number;onLoaded?:(days:CalendarDay[])=>void}){
 const [days,setDays]=useState<CalendarDay[]>([]); const [events,setEvents]=useState<Festival[]>([]); const [error,setError]=useState("");
 useEffect(()=>{const c=new AbortController();setError("");Promise.all([
   getJson<CalendarMonthPayload>(`/api/v1/calendar/${year}/${month}?calendar=bs`,c.signal),
 ]).then(async([cal])=>{setDays(cal.days||[]);onLoaded?.(cal.days||[]);const years=[...new Set((cal.days||[]).map(d=>Number(d.ad.slice(0,4))))];const data=await Promise.all(years.map(y=>getJson<{items:Festival[]}>(`/api/v1/festivals?year=${y}`,c.signal).catch(()=>({items:[]}))));setEvents(data.flatMap(x=>x.items||[]));}).catch(()=>setError("पात्रो डेटा लोड हुन सकेन। फेरि प्रयास गर्नुहोस्।"));return()=>c.abort();},[year,month]);
 const byDate=useMemo(()=>{const m=new Map<string,Festival[]>();events.forEach(e=>{const d=festivalDate(e);if(!d)return;const a=m.get(d)||[];a.push(e);m.set(d,a)});return m},[events]);
 const first=days[0]?.ad; const offset=first?new Date(first+"T00:00:00Z").getUTCDay():0;
 if(error)return <div className="ap-state ap-error">{error}</div>;
 if(!days.length)return <div className="ap-state">पात्रो लोड हुँदैछ…</div>;
 return <><div className="ap-weekheads">{NE_DAYS.map((d,i)=><span key={d} className={i===6?"is-holiday":""}>{d}</span>)}</div><div className="ap-month-grid">{Array.from({length:offset}).map((_,i)=><div className="ap-day is-empty" key={`e${i}`}/>) }{days.map(day=>{const weekday=new Date(day.ad+"T00:00:00Z").getUTCDay();const ev=byDate.get(day.ad)||[];const holiday=weekday===6||ev.some(x=>String(x.effect||"").toLowerCase().includes("holiday"));return <a href={`/date/${day.ad}`} className={`ap-day ${holiday?"is-holiday":""}`} key={day.ad}><span className="ap-bsday">{toNepaliDigits(day.bs.day)}</span><span className="ap-adday">{new Date(day.ad+"T00:00:00Z").getUTCDate()}</span><span className="ap-tithi">{day.panchang?.tithi?.ne||""}</span>{ev.slice(0,2).map((e,i)=><span className="ap-festival" key={i}>{festivalName(e)}</span>)}</a>})}</div><div className="ap-legend"><span><i className="red-dot"/> शनिबार / बिदा</span><span><i className="gold-dot"/> चाडपर्व</span></div></>;
}

export function HomePage({calendarYear,calendarMonth}:{calendarYear?:number;calendarMonth?:number}){
 const today=todayNepal(); const [sync,setSync]=useState<SyncPayload|null>(null); const [events,setEvents]=useState<Festival[]>([]); const [cursor,setCursor]=useState<{year:number;month:number}|null>(calendarYear&&calendarMonth?{year:calendarYear,month:calendarMonth}:null);
 useEffect(()=>{const c=new AbortController();getJson<SyncPayload>(`/api/v1/sync?date=${today}`,c.signal).then(d=>{setSync(d);if(!calendarYear&&!calendarMonth)setCursor({year:d.calendars.bikram_sambat_detail.year,month:d.calendars.bikram_sambat_detail.month});}).catch(()=>{});getJson<{items:Festival[]}>(`/api/v1/festivals?year=${today.slice(0,4)}`,c.signal).then(x=>setEvents(x.items||[])).catch(()=>{});return()=>c.abort();},[calendarYear,calendarMonth]);
 useEffect(()=>{document.title=calendarYear&&calendarMonth?calendarTitle(calendarYear,calendarMonth):pageTitle();},[calendarYear,calendarMonth]);
 const next=events.filter(e=>festivalDate(e)>=today).sort((a,b)=>festivalDate(a).localeCompare(festivalDate(b)))[0];
 const shift=(delta:number)=>setCursor(c=>{if(!c)return c;let y=c.year,m=c.month+delta;if(m<1){m=12;y--}if(m>12){m=1;y++}history.pushState(null,"",`/calendar/${y}/${String(m).padStart(2,"0")}`);window.dispatchEvent(new Event("patro:navigation"));return{year:y,month:m}});
 const bs=sync?.calendars.bikram_sambat_detail;
 return <main className="ap-page ap-home"><section className="ap-today-card"><div><span className="ap-eyebrow">आज</span><h1>{bs?`${bs.month_ne||BS_MONTHS[bs.month-1]} ${toNepaliDigits(bs.day)}, ${toNepaliDigits(bs.year)}`:"आजको नेपाली पात्रो"}</h1><p>{neDate(today)} · {sync?.calendars.gregorian_ad||today}</p></div><div className="ap-today-facts"><div><b>{sync?.tithi?.ne||"तिथि"}</b><small>{sync?.archive_panchang?.tithi_transition?.time?`${sync.archive_panchang.tithi_transition.time} देखि ${sync.archive_panchang.tithi_transition.next_ne}`:"आजको तिथि"}</small></div><div><b>{sync?.calendars.nepal_sambat||"नेपाल संवत्"}</b><small>नेपाल संवत्</small></div><div><b>{sync?.archive_panchang?.sunrise||"—"}</b><small>सूर्योदय</small></div><div><b>{sync?.archive_panchang?.sunset||"—"}</b><small>सूर्यास्त</small></div></div>{next&&<a className="ap-next-festival" href={`/date/${festivalDate(next)}`}><span>आगामी चाडपर्व</span><strong>{festivalName(next)}</strong><small>{festivalDate(next)}</small></a>}</section>
 {cursor&&<section className="ap-calendar-card"><header className="ap-section-head"><div><h2>{BS_MONTHS[cursor.month-1]} {toNepaliDigits(cursor.year)}</h2><p>वि.सं. महिनाको पात्रो · तिथि, चाडपर्व र बिदा</p></div><div className="ap-month-actions"><button onClick={()=>shift(-1)} aria-label="अघिल्लो महिना">‹</button><a href="/">आज</a><button onClick={()=>shift(1)} aria-label="अर्को महिना">›</button></div></header><MonthGrid year={cursor.year} month={cursor.month}/></section>}
 </main>;
}

const toolGroups=[
 ["मिति र पात्रो",[["↔","मिति रूपान्तरण","BS र AD मिति रूपान्तरण","/convert"],["ने","नेपाल संवत्","नेपाल संवत् र पात्रो","/nepal-sambat"],["देश","विदेश पात्रो","नेपाल समय र मिति सन्दर्भ","/tools/diaspora"],["⏳","समययन्त्र","नेपालको ऐतिहासिक समयरेखा","/time-machine"],["इत","आज इतिहासमा","आजकै दिनका ऐतिहासिक घटना","/on-this-day"]]],
 ["भाषा",[["क","नेपाली टाइपिङ","Roman बाट नेपाली Unicode","/tools/nepali-typing"],["प्री","प्रीति रूपान्तरण","Preeti र Unicode बीच रूपान्तरण","/tools/preeti-converter"]]],
 ["ज्योतिष",[["चि","चिना","जन्मपत्रिका र ग्रहस्थिति","/jyotish/china"],["रा","राशिफल","दैनिक, साप्ताहिक र मासिक राशिफल","/rashifal"],["ख","खगोलीय पात्रो","NASA र खगोलीय डेटा सहितको उन्नत उपकरण","/tools/astro"]]]
] as const;
export function ToolsPage(){useEffect(()=>setPageTitle("उपकरण"),[]);return <main className="ap-page"><header className="ap-page-title"><span className="ap-eyebrow">उपकरण</span><h1>दैनिक कामका उपयोगी उपकरण</h1><p>मिति, भाषा, ज्योतिष र अन्य सुविधाहरू एउटै ठाउँमा।</p></header>{toolGroups.map(([g,items])=><section className="ap-tool-section" key={g}><h2>{g}</h2><div className="ap-tool-grid">{items.map(([icon,title,desc,path])=><a className="ap-tool-card" href={path} key={path}><span className="ap-tool-icon">{icon}</span><div><strong>{title}</strong><small>{desc}</small></div><span>›</span></a>)}</div></section>)}</main>}

const personalGroups=[
 ["लेखन",[["✎","डायरी","निजी दैनिक लेख र सम्झना","/me/diary"],["▤","नोट","छोटो नोट र सूची","/me/notes"],["✓","योजना","काम र दिनको योजना","/me/planner"]]],
 ["परिवार र सम्झना",[["परि","परिवार","परिवारका मिति र साझा घटना","/me/family"],["घ","रिमाइन्डर","तिथि र मिति अनुसार सूचना","/me/reminders"],["▣","कार्ड","मिति र चाडपर्व शेयर कार्ड","/me/cards"]]],
 ["सेटिङ",[["⚙","सेटिङ","बिदा, भाषा र सूचना प्राथमिकता","/me/settings"],["डेटा","डेटा","आफ्नो डेटा हेर्नुहोस्, निर्यात वा हटाउनुहोस्","/me/data"]]]
] as const;
export function MePage(){useEffect(()=>setPageTitle("आफ्नै ठाउँ"),[]);return <main className="ap-page"><header className="ap-page-title"><span className="ap-eyebrow">आफ्नै ठाउँ</span><h1>तपाईंका निजी उपकरण</h1><p>लेखन, परिवार, सम्झना र सेटिङ सुरक्षित रूपमा एउटै ठाउँमा।</p></header>{personalGroups.map(([g,items])=><section className="ap-tool-section" key={g}><h2>{g}</h2><div className="ap-tool-grid">{items.map(([icon,title,desc,path])=><a className="ap-tool-card" href={path} key={path}><span className="ap-tool-icon">{icon}</span><div><strong>{title}</strong><small>{desc}</small></div><span>›</span></a>)}</div></section>)}</main>}

export function RashifalPage(){const [data,setData]=useState<any>(null);const [error,setError]=useState("");useEffect(()=>{setPageTitle("राशिफल");const c=new AbortController();getJson<any>(`/api/v1/rashifal/universal?period=daily&system=vedic&calendar=bs&date=${todayNepal()}`,c.signal).then(setData).catch(()=>setError("आजको राशिफल लोड हुन सकेन।"));return()=>c.abort()},[]);const readings=data?.readings||[];return <main className="ap-page"><header className="ap-page-title"><span className="ap-eyebrow">ज्योतिष</span><h1>आजको राशिफल</h1><p>वैदिक राशिफल · दैनिक मार्गदर्शन</p></header>{error?<div className="ap-state ap-error">{error}</div>:!data?<div className="ap-state">राशिफल लोड हुँदैछ…</div>:<div className="ap-rashi-grid">{readings.map((r:any,i:number)=><article className="ap-rashi-card" key={r?.sign?.id||i}><h2>{r?.sign?.name_ne||r?.sign?.name||r?.sign?.id||"राशि"}</h2><p>{r?.summary_ne||r?.summary||r?.text_ne||r?.text||"आजको राशिफल उपलब्ध छ।"}</p></article>)}</div>}</main>}

export function SamacharPage(){const [items,setItems]=useState<any[]>([]);const [loading,setLoading]=useState(true);useEffect(()=>{setPageTitle("समाचार");const c=new AbortController();getJson<any>("/api/v1/news?limit=30",c.signal).then(x=>setItems(x.items||[])).catch(()=>setItems([])).finally(()=>setLoading(false));return()=>c.abort()},[]);return <main className="ap-page"><header className="ap-page-title"><span className="ap-eyebrow">समाचार</span><h1>ताजा समाचार</h1><p>समर्थित नेपाली स्रोतहरूबाट संकलित शीर्ष समाचार।</p></header>{loading?<div className="ap-state">समाचार लोड हुँदैछ…</div>:items.length?<div className="ap-news-grid">{items.map((n:any,i)=><a className="ap-news-card" href={n.url||n.link||"#"} target="_blank" rel="noopener noreferrer" key={n.id||i}><small>{n.source_name||n.source||"समाचार"}</small><h2>{n.title_ne||n.title||"समाचार"}</h2>{(n.summary_ne||n.summary)&&<p>{n.summary_ne||n.summary}</p>}</a>)}</div>:<div className="ap-state">अहिले समाचार उपलब्ध छैन। केहीबेरमा फेरि हेर्नुहोस्।</div>}</main>}

export function NotFoundPage(){useEffect(()=>setPageTitle("पृष्ठ भेटिएन"),[]);return <main className="ap-page ap-not-found"><b>४०४</b><h1>पृष्ठ भेटिएन</h1><p>तपाईंले खोज्नुभएको ठेगाना उपलब्ध छैन।</p><div><a href="/">पात्रोमा जानुहोस्</a><a href="/tools">उपकरण हेर्नुहोस्</a></div></main>}
