import { useEffect, useMemo, useState } from "react";
import { BS_MONTHS, calendarTitle, pageTitle, setPageTitle, toNepaliDigits } from "./title";

const NE_DAYS=["आइत","सोम","मंगल","बुध","बिही","शुक्र","शनि"];
const FULL_NE_DAYS=["आइतबार","सोमबार","मंगलबार","बुधबार","बिहीबार","शुक्रबार","शनिबार"];

type BsDate={year:number;month:number;day:number;month_ne?:string;formatted?:string};
type CalendarDay={ad:string;bs:BsDate;nepal_sambat?:any;panchang?:any};
type Festival={ad_date?:string;fact_date?:string;date?:string;name_ne?:string;title_ne?:string;label_ne?:string;name_en?:string;title?:string;key?:string;effect?:string;status?:string;description_ne?:string;value?:any};
type TodayView={ad:string;bs:BsDate|null;ns:string;tithi:string;tithiNext:string;sunrise:string;sunset:string};
type Tool={icon:string;title:string;desc:string;href:string;badge?:string};

function todayNepal(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
async function getJson<T>(url:string,signal?:AbortSignal):Promise<T>{const r=await fetch(url,{headers:{accept:"application/json"},signal,credentials:"same-origin"});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()}
function neDate(iso:string){return new Intl.DateTimeFormat("ne-NP",{timeZone:"Asia/Kathmandu",weekday:"long",year:"numeric",month:"long",day:"numeric"}).format(new Date(iso+"T06:00:00Z"))}
function festivalDate(x:Festival){return x.ad_date||x.fact_date||x.date||""}
function festivalName(x:Festival){return x.name_ne||x.title_ne||x.label_ne||x.value?.label_ne||x.title||x.name_en||x.key||"चाडपर्व"}
function isoDay(date:Date){return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}-${String(date.getUTCDate()).padStart(2,"0")}`}
function previousDay(iso:string){const d=new Date(iso+"T00:00:00Z");d.setUTCDate(d.getUTCDate()-1);return isoDay(d)}
function daysUntil(from:string,to:string){return Math.max(0,Math.ceil((Date.parse(to+"T00:00:00Z")-Date.parse(from+"T00:00:00Z"))/86400000))}
function nsText(value:any){if(typeof value==="string")return value;if(!value)return "नेपाल संवत्";return value.formatted_ne||value.formatted||[value.year,value.month?.dev||value.month?.roman,value.tithi_name_ne].filter(Boolean).join(" ")||"नेपाल संवत्"}
function normalizeToday(payload:any,date:string):TodayView{
 const calendars=payload?.calendars;
 const bs:BsDate|null=calendars?.bikram_sambat_detail||payload?.bs||null;
 const p=payload?.archive_panchang||payload?.panchang||{};
 const t=payload?.tithi||p?.tithi||{};
 return {ad:calendars?.gregorian_ad||payload?.ad||payload?.date||date,bs,ns:nsText(calendars?.nepal_sambat_detail||calendars?.nepal_sambat||payload?.nepal_sambat),tithi:t?.ne||t?.name_ne||t?.tithi_name_ne||"तिथि",tithiNext:p?.tithi_transition?.time&&p?.tithi_transition?.next_ne?`${p.tithi_transition.time} देखि ${p.tithi_transition.next_ne}`:"आजको तिथि",sunrise:p?.sunrise||"—",sunset:p?.sunset||"—"}
}
function normalizeCalendarDay(row:any):CalendarDay|null{
 if(row?.ad&&row?.bs)return {ad:String(row.ad),bs:row.bs,nepal_sambat:row.nepal_sambat||row.ns,panchang:row.panchang||{}};
 if(row?.calendars?.gregorian_ad&&row?.calendars?.bikram_sambat_detail)return {ad:row.calendars.gregorian_ad,bs:row.calendars.bikram_sambat_detail,nepal_sambat:row.calendars.nepal_sambat_detail||row.calendars.nepal_sambat,panchang:row.archive_panchang||{}};
 return null
}
async function loadMonth(year:number,month:number,signal:AbortSignal){
 try{
  const primary=await getJson<any>(`/api/v1/calendar/${year}/${month}?calendar=bs`,signal);
  const rows=(primary?.days||[]).map(normalizeCalendarDay).filter(Boolean) as CalendarDay[];
  if(rows.length>=27)return rows;
 }catch{}
 const nextYear=month===12?year+1:year,nextMonth=month===12?1:month+1;
 const [start,next]=await Promise.all([getJson<any>(`/api/v1/convert?bs=${year}-${String(month).padStart(2,"0")}-01`,signal),getJson<any>(`/api/v1/convert?bs=${nextYear}-${String(nextMonth).padStart(2,"0")}-01`,signal)]);
 if(!start?.ad||!next?.ad)throw new Error("month_anchor_unavailable");
 const range=await getJson<any>(`/api/v1/sync?start=${encodeURIComponent(start.ad)}&end=${encodeURIComponent(previousDay(next.ad))}`,signal);
 const rows=(range?.days||[]).map(normalizeCalendarDay).filter(Boolean) as CalendarDay[];
 if(!rows.length)throw new Error("month_range_unavailable");
 return rows.filter(d=>d.bs.year===year&&d.bs.month===month)
}
async function loadDecorations(days:CalendarDay[],signal:AbortSignal){
 const years=[...new Set(days.map(d=>Number(d.ad.slice(0,4))).filter(Boolean))];
 const responses=await Promise.all(years.flatMap(y=>[
  getJson<{items?:Festival[]}>(`/api/v1/festivals?year=${y}`,signal).catch(()=>({items:[]})),
  getJson<{items?:Festival[]}>(`/api/v1/holidays?year=${y}`,signal).catch(()=>({items:[]}))
 ]));
 const all=responses.flatMap(x=>x.items||[]),seen=new Set<string>();
 return all.filter(x=>{const key=`${festivalDate(x)}|${festivalName(x)}|${x.effect||""}`;if(!festivalDate(x)||seen.has(key))return false;seen.add(key);return true})
}

function MonthGrid({year,month}:{year:number;month:number}){
 const[days,setDays]=useState<CalendarDay[]>([]),[events,setEvents]=useState<Festival[]>([]),[error,setError]=useState(""),[attempt,setAttempt]=useState(0);
 useEffect(()=>{const c=new AbortController();setError("");setDays([]);loadMonth(year,month,c.signal).then(async rows=>{setDays(rows);setEvents(await loadDecorations(rows,c.signal))}).catch(()=>setError("पात्रो डेटा लोड हुन सकेन। पुनः प्रयास गर्नुहोस्।"));return()=>c.abort()},[year,month,attempt]);
 const byDate=useMemo(()=>{const m=new Map<string,Festival[]>();events.forEach(e=>{const d=festivalDate(e);if(!d)return;const a=m.get(d)||[];a.push(e);m.set(d,a)});return m},[events]);
 const first=days[0]?.ad,offset=first?new Date(first+"T00:00:00Z").getUTCDay():0;
 if(error)return <div className="ap-state ap-error"><p>{error}</p><button className="ap-retry" type="button" onClick={()=>setAttempt(x=>x+1)}>फेरि लोड गर्नुहोस्</button></div>;
 if(!days.length)return <div className="ap-state">पात्रो लोड हुँदैछ…</div>;
 return <><div className="ap-weekheads">{NE_DAYS.map((d,i)=><span key={d} className={i===6?"is-holiday":""}>{d}</span>)}</div><div className="ap-month-grid">{Array.from({length:offset}).map((_,i)=><div className="ap-day is-empty" key={`empty-${i}`}/>)}{days.map(day=>{const weekday=new Date(day.ad+"T00:00:00Z").getUTCDay(),ev=byDate.get(day.ad)||[];const holiday=weekday===6||ev.some(x=>String(x.effect||x.status||"").toLowerCase().includes("holiday")||String(x.effect||"").includes("बिदा"));const festival=ev.find(x=>!String(x.effect||"").toLowerCase().includes("holiday"))||ev[0];return <a href={`/date/${day.ad}`} className={`ap-day ${holiday?"is-holiday":""} ${festival?"has-festival":""}`} key={day.ad} aria-label={`${FULL_NE_DAYS[weekday]}, ${day.bs.day} ${BS_MONTHS[day.bs.month-1]} ${day.bs.year}`}><span className="ap-bsday">{toNepaliDigits(day.bs.day)}</span><span className="ap-adday">{toNepaliDigits(new Date(day.ad+"T00:00:00Z").getUTCDate())}</span><span className="ap-tithi">{day.panchang?.tithi?.ne||day.panchang?.tithi_name_ne||""}</span>{festival&&<span className="ap-festival">{festivalName(festival)}</span>}{holiday&&<i className="ap-holiday-dot" aria-hidden="true"/>}</a>})}</div><div className="ap-legend"><span><i className="red-dot"/> शनिबार / बिदा</span><span><i className="gold-dot"/> चाडपर्व</span></div></>
}

export function HomePage({calendarYear,calendarMonth}:{calendarYear?:number;calendarMonth?:number}){
 const today=todayNepal();const[todayData,setTodayData]=useState<TodayView|null>(null),[todayError,setTodayError]=useState(""),[events,setEvents]=useState<Festival[]>([]),[cursor,setCursor]=useState<{year:number;month:number}|null>(calendarYear&&calendarMonth?{year:calendarYear,month:calendarMonth}:null);
 useEffect(()=>{const c=new AbortController();(async()=>{try{let raw:any;try{raw=await getJson<any>(`/api/v1/sync?date=${today}`,c.signal)}catch{raw=await getJson<any>(`/api/v1/today?date=${today}`,c.signal)}const view=normalizeToday(raw,today);setTodayData(view);if(!calendarYear&&!calendarMonth&&view.bs)setCursor({year:view.bs.year,month:view.bs.month})}catch{setTodayError("आजको पात्रो लोड हुन सकेन।")}})();const adYear=Number(today.slice(0,4));Promise.all([adYear,adYear+1].map(y=>getJson<{items?:Festival[]}>(`/api/v1/festivals?year=${y}`,c.signal).catch(()=>({items:[]})))).then(rows=>setEvents(rows.flatMap(r=>r.items||[])));return()=>c.abort()},[calendarYear,calendarMonth,today]);
 useEffect(()=>{document.title=calendarYear&&calendarMonth?calendarTitle(calendarYear,calendarMonth):pageTitle()},[calendarYear,calendarMonth]);
 const next=events.filter(e=>festivalDate(e)>=today).sort((a,b)=>festivalDate(a).localeCompare(festivalDate(b)))[0];
 const shift=(delta:number)=>setCursor(c=>{if(!c)return c;let y=c.year,m=c.month+delta;if(m<1){m=12;y--}if(m>12){m=1;y++}history.pushState(null,"",`/calendar/${y}/${String(m).padStart(2,"0")}`);window.dispatchEvent(new Event("patro:navigation"));return{year:y,month:m}});
 const bs=todayData?.bs;
 return <main className="ap-page ap-home"><section className="ap-home-top"><article className="ap-today-card"><div><span className="ap-eyebrow">आज</span><h1>{bs?`${toNepaliDigits(bs.day)} ${bs.month_ne||BS_MONTHS[bs.month-1]} ${toNepaliDigits(bs.year)}`:"आजको नेपाली पात्रो"}</h1><p>{neDate(today)} · {toNepaliDigits(today)}</p>{todayError&&<small className="ap-inline-error">{todayError}</small>}</div><div className="ap-today-facts"><div><b>{todayData?.tithi||"तिथि"}</b><small>{todayData?.tithiNext||"आजको तिथि"}</small></div><div><b>{todayData?.ns||"नेपाल संवत्"}</b><small>नेपाल संवत्</small></div><div><b>{todayData?.sunrise||"—"}</b><small>सूर्योदय</small></div><div><b>{todayData?.sunset||"—"}</b><small>सूर्यास्त</small></div></div></article>{next&&<a className="ap-next-festival ap-next-card" href={`/date/${festivalDate(next)}`}><span>आगामी चाडपर्व</span><strong>{festivalName(next)}</strong><small>{neDate(festivalDate(next))}</small><b>{toNepaliDigits(daysUntil(today,festivalDate(next)))} दिन बाँकी</b></a>}</section>{cursor?<section className="ap-calendar-card"><header className="ap-section-head"><div><h2>{BS_MONTHS[cursor.month-1]} {toNepaliDigits(cursor.year)}</h2><p>वि.सं. महिनाको पात्रो · तिथि, चाडपर्व र बिदा</p></div><div className="ap-month-actions"><button onClick={()=>shift(-1)} aria-label="अघिल्लो महिना">‹</button><a href="/">आज</a><button onClick={()=>shift(1)} aria-label="अर्को महिना">›</button></div></header><MonthGrid year={cursor.year} month={cursor.month}/></section>:<section className="ap-calendar-card"><div className="ap-state">आजको वि.सं. मिति पहिचान हुँदैछ…</div></section>}</main>
}

const toolGroups:{name:string;items:Tool[]}[]=[
 {name:"मिति र पात्रो",items:[
  {icon:"↔",title:"मिति रूपान्तरण",desc:"वि.सं. र ई.सं. मिति दुवैतर्फ रूपान्तरण",href:"/convert"},
  {icon:"वि",title:"वि.सं. बाट ई.सं.",desc:"बिक्रम संवत् मितिलाई ई.सं. मा बदल्नुहोस्",href:"/tools/bstoad"},
  {icon:"ई",title:"ई.सं. बाट वि.सं.",desc:"ई.सं. मितिलाई बिक्रम संवत् मा बदल्नुहोस्",href:"/tools/adtobs"},
  {icon:"±",title:"दिन गणना",desc:"दुई मितिबीचका दिन वा मितिमा दिन थपघट",href:"/tools/calc"},
  {icon:"उ",title:"उमेर गणक",desc:"वर्ष, महिना र दिनसहित उमेर गणना",href:"/tools/age"},
  {icon:"त",title:"तिथि रिमाइन्डर",desc:"तिथि, श्राद्ध र जन्मदिनका आगामी मिति",href:"/tools/tithi-reminder"},
  {icon:"⏳",title:"समययन्त्र",desc:"नेपालको ऐतिहासिक समयरेखा अन्वेषण",href:"/time-machine"},
  {icon:"इत",title:"आज इतिहासमा",desc:"चयन गरिएको मितिका ऐतिहासिक घटना",href:"/on-this-day"},
  {icon:"घ",title:"विश्व घडी",desc:"नेपालसहित विश्वका शहरहरूको समय",href:"/tools/clock"}
 ]},
 {name:"भाषा र लेखन",items:[
  {icon:"क",title:"नेपाली टाइपिङ",desc:"रोमन अक्षरबाट नेपाली युनिकोड टाइपिङ",href:"/tools/nepali-typing"},
  {icon:"प्री",title:"प्रीति रूपान्तरण",desc:"प्रीति र युनिकोडबीच दुवैतर्फ रूपान्तरण",href:"/tools/preeti-converter"},
  {icon:"✓",title:"नेपाली हिज्जे जाँच",desc:"नेपाली पाठको हिज्जे जाँच र सुझाव",href:"/tools/spell-check"},
  {icon:"🎙",title:"बोली टाइपिङ",desc:"बोलेर नेपाली पाठ लेख्नुहोस्",href:"/tools/voice-typing"},
  {icon:"OCR",title:"नेपाली OCR",desc:"तस्बिरबाट नेपाली अक्षर निकाल्नुहोस्",href:"/tools/ocr"},
  {icon:"🔊",title:"पढेर सुनाउने",desc:"नेपाली पाठ आवाजमा सुन्नुहोस्",href:"/tools/read-aloud"},
  {icon:"अ",title:"अंकलाई शब्दमा",desc:"रकमलाई नेपाली वा अङ्ग्रेजी शब्दमा",href:"/tools/words"}
 ]},
 {name:"ज्योतिष र संस्कार",items:[
  {icon:"रा",title:"राशिफल",desc:"दैनिक वैदिक राशिफल",href:"/rashifal"},
  {icon:"चि",title:"चिना",desc:"जन्ममिति, समय र स्थानका आधारमा जन्मपत्रिका",href:"/jyotish/china"},
  {icon:"शु",title:"साइत",desc:"आधिकारिक र गणनामा आधारित शुभ समय",href:"/tools/sait"},
  {icon:"ना",title:"नक्षत्र अनुसार बच्चाको नाम",desc:"नक्षत्र र पदका आधारमा नाम सुझाव",href:"/tools/baby-names"},
  {icon:"नाम",title:"नाम जाँच",desc:"नामको सुरु अक्षर र नक्षत्र मिलान",href:"/tools/name-check"}
 ]},
 {name:"हिसाब, वित्त र दैनिक उपयोग",items:[
  {icon:"$",title:"विदेशी मुद्रा",desc:"नेपाल राष्ट्र बैंकका विनिमय दर",href:"/tools/forex"},
  {icon:"सु",title:"सुनचाँदी हिसाब",desc:"तौल र दरका आधारमा मूल्य अनुमान",href:"/tools/gold"},
  {icon:"%",title:"कर्जा EMI",desc:"मासिक किस्ता र कुल ब्याज गणना",href:"/tools/emi"},
  {icon:"भ",title:"भ्याट र प्रतिशत",desc:"भ्याट थपघट र प्रतिशत गणना",href:"/tools/vat"},
  {icon:"रु",title:"आयकर",desc:"आ.व. २०८३/८४ को व्यक्तिगत आयकर अनुमान",href:"/tools/incometax"},
  {icon:"रो",title:"जग्गा नाप",desc:"रोपनी–आना र बिघा–कट्ठा रूपान्तरण",href:"/tools/landconverter"},
  {icon:"ना",title:"नाप–तौल",desc:"परम्परागत नेपाली एकाइ रूपान्तरण",href:"/tools/units"},
  {icon:"इ",title:"इन्धन मूल्य",desc:"नेपाल आयल निगमको मूल्य सन्दर्भ",href:"/tools/fuelprice"},
  {icon:"QR",title:"QR कोड",desc:"नेपाली वा अङ्ग्रेजी पाठबाट निजी QR",href:"/tools/nepaliqr"}
 ]},
 {name:"सिर्जना र सहायक",items:[
  {icon:"📰",title:"जन्मदिन अखबार",desc:"जन्मदिनको पात्रो र इतिहासबाट शेयर कार्ड",href:"/tools/janmadin-akhbar"},
  {icon:"✉",title:"भविष्यको चिठी",desc:"छानिएको मिति वा तिथिमा खुल्ने निजी चिठी",href:"/tools/future-letter"},
  {icon:"Bot",title:"पात्रो बोट",desc:"मिति, तिथि र पात्रोका छोटा प्रश्नको सहायक",href:"/tools/patro-bot"},
  {icon:"</>",title:"विकासकर्ता API",desc:"उपलब्ध API र एकीकरण विवरण",href:"/tools/api"}
 ]}
];
export function ToolsPage(){useEffect(()=>setPageTitle("उपकरण"),[]);return <main className="ap-page ap-tools-page"><header className="ap-page-title"><span className="ap-eyebrow">उपकरण</span><h1>दैनिक कामका उपयोगी उपकरण</h1><p>मिति, भाषा, ज्योतिष, हिसाब र सामग्री निर्माणका काम एकै ठाउँमा।</p></header><a className="ap-astro-feature" href="/tools/astro"><span className="ap-astro-orb" aria-hidden="true"/><span><strong>खगोलीय पात्रो</strong><small>तिथि, चन्द्र अवस्था, आकाशीय घटना र NASA सामग्रीसहितको उन्नत पात्रो</small></span><b>खोल्नुहोस् →</b></a>{toolGroups.map(group=><section className="ap-tool-section" key={group.name}><h2>{group.name}</h2><div className="ap-tool-grid">{group.items.map(item=><a className="ap-tool-card" href={item.href} key={item.href}><span className="ap-tool-icon">{item.icon}</span><div><strong>{item.title}</strong><small>{item.desc}</small></div><span aria-hidden="true">›</span></a>)}</div></section>)}</main>}

const personalGroups:{name:string;items:Tool[]}[]=[
 {name:"लेखन",items:[{icon:"✎",title:"डायरी",desc:"निजी दैनिक लेख र सम्झना",href:"/me/diary"},{icon:"▤",title:"नोट",desc:"छोटो नोट र सूची",href:"/me/notes"},{icon:"✓",title:"योजना",desc:"काम र दिनको योजना",href:"/me/planner"}]},
 {name:"परिवार र सम्झना",items:[{icon:"परि",title:"परिवार",desc:"परिवारका मिति र साझा घटना",href:"/me/family"},{icon:"घ",title:"रिमाइन्डर",desc:"तिथि र मिति अनुसार सूचना",href:"/me/reminders"},{icon:"▣",title:"कार्ड",desc:"मिति र चाडपर्व शेयर कार्ड",href:"/me/cards"}]},
 {name:"सेटिङ",items:[{icon:"⚙",title:"सेटिङ",desc:"बिदा, भाषा र सूचना प्राथमिकता",href:"/me/settings"},{icon:"डेटा",title:"डेटा",desc:"व्यक्तिगत डेटा हेर्नुहोस्, निर्यात वा हटाउनुहोस्",href:"/me/data"}]}
];
export function MePage(){useEffect(()=>setPageTitle("आफ्नै ठाउँ"),[]);return <main className="ap-page ap-me-hub"><header className="ap-page-title"><span className="ap-eyebrow">आफ्नै ठाउँ</span><h1>तपाईंका निजी उपकरण</h1><p>लेखन, परिवार, सम्झना र सेटिङ एउटै सुरक्षित ठाउँमा।</p></header>{personalGroups.map(group=><section className="ap-tool-section" key={group.name}><h2>{group.name}</h2><div className="ap-tool-grid">{group.items.map(item=><a className="ap-tool-card" href={item.href} key={item.href}><span className="ap-tool-icon">{item.icon}</span><div><strong>{item.title}</strong><small>{item.desc}</small></div><span aria-hidden="true">›</span></a>)}</div></section>)}</main>}

export function RashifalPage(){const[data,setData]=useState<any>(null),[error,setError]=useState("");useEffect(()=>{setPageTitle("राशिफल");const c=new AbortController();getJson<any>(`/api/v1/rashifal/universal?period=daily&system=vedic&calendar=bs&date=${todayNepal()}`,c.signal).then(setData).catch(()=>setError("आजको राशिफल लोड हुन सकेन।"));return()=>c.abort()},[]);const readings=data?.readings||data?.items||[];return <main className="ap-page"><header className="ap-page-title"><span className="ap-eyebrow">ज्योतिष</span><h1>आजको राशिफल</h1><p>वैदिक प्रणालीमा आधारित दैनिक राशिफल</p></header>{error?<div className="ap-state ap-error">{error}</div>:!data?<div className="ap-state">राशिफल लोड हुँदैछ…</div>:readings.length?<div className="ap-rashi-grid">{readings.map((r:any,i:number)=><article className="ap-rashi-card" key={r?.sign?.id||r?.sign||i}><h2>{r?.sign?.name_ne||r?.sign_name_ne||r?.sign?.name||r?.sign||"राशि"}</h2><p>{r?.summary_ne||r?.summary||r?.text_ne||r?.text||r?.reading_ne||"आजको राशिफल उपलब्ध छ।"}</p></article>)}</div>:<div className="ap-state">आजको राशिफल प्रकाशन उपलब्ध छैन।</div>}</main>}

export function SamacharPage(){const[items,setItems]=useState<any[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");useEffect(()=>{setPageTitle("समाचार");const c=new AbortController();getJson<any>("/api/v1/news?limit=30",c.signal).then(x=>setItems(x.items||x.articles||[])).catch(()=>setError("समाचार सेवा अहिले उपलब्ध छैन।")).finally(()=>setLoading(false));return()=>c.abort()},[]);return <main className="ap-page"><header className="ap-page-title"><span className="ap-eyebrow">समाचार</span><h1>ताजा समाचार</h1><p>समर्थित नेपाली स्रोतहरूबाट संकलित शीर्ष समाचार</p></header>{loading?<div className="ap-state">समाचार लोड हुँदैछ…</div>:error?<div className="ap-state ap-error">{error}</div>:items.length?<div className="ap-news-grid">{items.map((n:any,i)=><a className="ap-news-card" href={n.url||n.link||"#"} target="_blank" rel="noopener noreferrer" key={n.id||i}><small>{n.source_name||n.source||"समाचार"}</small><h2>{n.title_ne||n.title||"समाचार"}</h2>{(n.summary_ne||n.summary)&&<p>{n.summary_ne||n.summary}</p>}</a>)}</div>:<div className="ap-state">अहिले समाचार उपलब्ध छैन।</div>}</main>}

export function NotFoundPage(){useEffect(()=>setPageTitle("पृष्ठ भेटिएन"),[]);return <main className="ap-page ap-not-found"><b>४०४</b><h1>पृष्ठ भेटिएन</h1><p>तपाईंले खोज्नुभएको ठेगाना उपलब्ध छैन।</p><div><a href="/">पात्रोमा जानुहोस्</a><a href="/tools">उपकरण हेर्नुहोस्</a></div></main>}
