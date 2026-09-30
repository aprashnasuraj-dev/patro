import { useEffect, useMemo, useRef, useState } from "react";

type HistoryItem = {
  id?: string;
  ad_year?: number;
  title_ne?: string | null;
  title_en?: string | null;
  category?: string | null;
  event_type?: string | null;
  source_url?: string | null;
  verification_status?: string | null;
};

type NewsItem = {
  id?: string;
  source_id?: string;
  title?: string;
  url?: string;
  category?: string | null;
  published_at?: string;
};

type MarketItem = {
  asset?: string;
  as_of?: string;
  value?: number | string | null;
  buy?: number | string | null;
  sell?: number | string | null;
  per?: number | string | null;
  change?: number | string | null;
  percent_change?: number | string | null;
  source_label?: string | null;
};

type LoadState<T> = { loading: boolean; error: string | null; data: T };

function useVisibleOnce<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    if(visible)return;
    const node=ref.current;
    if(!node){setVisible(true);return;}
    if(!("IntersectionObserver" in window)){setVisible(true);return;}
    const observer=new IntersectionObserver((entries)=>{
      if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}
    },{rootMargin:"220px"});
    observer.observe(node);
    return()=>observer.disconnect();
  },[visible]);
  return {ref,visible};
}

function CardShell({title,kicker,href,children}:{title:string;kicker:string;href?:string;children:React.ReactNode}){
  return <section className="home-depth-card">
    <header><div><p className="eyebrow">{kicker}</p><h2>{title}</h2></div>{href&&<a href={href}>सबै हेर्नुहोस् · View all →</a>}</header>
    <div className="home-depth-card__body">{children}</div>
  </section>;
}

function SkeletonLines({count=3}:{count?:number}){
  return <div className="home-depth-skeleton" aria-label="Loading" role="status">{Array.from({length:count},(_,i)=><span key={i}/>)}</div>;
}

function formatRelative(iso?:string){
  if(!iso)return"";
  const t=Date.parse(iso);
  if(!Number.isFinite(t))return"";
  const minutes=Math.max(0,Math.round((Date.now()-t)/60000));
  if(minutes<60)return minutes+" min ago";
  const hours=Math.floor(minutes/60);
  if(hours<24)return hours+" h ago";
  return Math.floor(hours/24)+" d ago";
}

function sourceBacked(items:HistoryItem[]){
  const preferred=items.filter(x=>/^(source-backed|verified|official|cross-checked)/i.test(String(x.verification_status||"")));
  return (preferred.length?preferred:items).slice(0,3);
}

function MediaPreview(){
  return <section className="home-media-row" aria-label="Live media">
    <a className="home-media-card" href="/tv">
      <span className="home-media-icon" aria-hidden="true">TV</span>
      <div><p className="eyebrow">Watch · हेर्नुहोस्</p><h2>लाइभ टिभी · Live TV</h2><p>Global catalog, Nepal filter, live checks, HLS quality controls and PiP. Playback starts only after you choose a channel.</p></div>
      <b aria-hidden="true">→</b>
    </a>
    <a className="home-media-card" href="/fm">
      <span className="home-media-icon" aria-hidden="true">FM</span>
      <div><p className="eyebrow">Listen · सुन्नुहोस्</p><h2>मेरो पात्रो रेडियो · FM</h2><p>Nepal-first station directory with location filters and persistent player. No station auto-plays on the home page.</p></div>
      <b aria-hidden="true">→</b>
    </a>
  </section>;
}

function HistoryWidget({date}:{date:string}){
  const [state,setState]=useState<LoadState<HistoryItem[]>>({loading:true,error:null,data:[]});
  useEffect(()=>{
    const c=new AbortController();
    setState({loading:true,error:null,data:[]});
    fetch("/api/v1/on-this-day?date="+encodeURIComponent(date),{signal:c.signal,headers:{Accept:"application/json"}})
      .then(async r=>{const j=await r.json();if(!r.ok||!Array.isArray(j?.items))throw new Error(j?.error||"History unavailable");return j.items as HistoryItem[];})
      .then(items=>setState({loading:false,error:null,data:sourceBacked(items)}))
      .catch(error=>{if((error as any)?.name!=="AbortError")setState({loading:false,error:"History is temporarily unavailable.",data:[]});});
    return()=>c.abort();
  },[date]);
  return <CardShell kicker="आज इतिहासमा · On this day" title={date} href="/on-this-day">
    {state.loading?<SkeletonLines/>:state.error?<p className="home-depth-empty">{state.error}</p>:state.data.length?
      <ol className="home-history-list">{state.data.map((item,i)=><li key={item.id||i}><time>{item.ad_year||"—"}</time><div><strong>{item.title_ne||item.title_en||"Historical event"}</strong><small>{item.event_type||item.category||"event"}{item.verification_status?" · "+item.verification_status:""}</small>{item.source_url&&<a href={item.source_url} target="_blank" rel="noreferrer">Source ↗</a>}</div></li>)}</ol>
      :<p className="home-depth-empty">No published events are available for this date.</p>}
  </CardShell>;
}

function NewsWidget(){
  const [state,setState]=useState<LoadState<NewsItem[]>>({loading:true,error:null,data:[]});
  useEffect(()=>{
    const c=new AbortController();
    fetch("/api/v1/news/latest?limit=5",{signal:c.signal,headers:{Accept:"application/json"}})
      .then(async r=>{const j=await r.json();if(!r.ok||!Array.isArray(j?.items))throw new Error(j?.error||"News unavailable");return j.items as NewsItem[];})
      .then(items=>setState({loading:false,error:null,data:items.slice(0,5)}))
      .catch(error=>{if((error as any)?.name!=="AbortError")setState({loading:false,error:"News is temporarily unavailable.",data:[]});});
    return()=>c.abort();
  },[]);
  return <CardShell kicker="समाचार · News" title="ताजा शीर्षक · Latest headlines" href="/samachar">
    {state.loading?<SkeletonLines count={5}/>:state.error?<p className="home-depth-empty">{state.error}</p>:state.data.length?
      <ul className="home-news-list">{state.data.map((item,i)=><li key={item.id||i}><a href={item.url||"/samachar"} target={item.url?"_blank":undefined} rel={item.url?"noreferrer":undefined}><strong>{item.title||"News"}</strong><small>{item.source_id||"source"}{item.published_at?" · "+formatRelative(item.published_at):""}</small></a></li>)}</ul>
      :<p className="home-depth-empty">No verified headlines are available right now.</p>}
  </CardShell>;
}

function MarketsWidget(){
  const [fx,setFx]=useState<LoadState<MarketItem[]>>({loading:true,error:null,data:[]});
  const [index,setIndex]=useState<LoadState<MarketItem[]>>({loading:true,error:null,data:[]});
  useEffect(()=>{
    const c=new AbortController();
    const load=async(kind:"forex"|"index",setter:(v:LoadState<MarketItem[]>)=>void)=>{
      try{
        const r=await fetch("/api/v1/markets/latest?kind="+kind,{signal:c.signal,headers:{Accept:"application/json"}});
        const j=await r.json();if(!r.ok||!Array.isArray(j?.items))throw new Error(j?.error||"market unavailable");
        setter({loading:false,error:null,data:j.items});
      }catch(error){if((error as any)?.name!=="AbortError")setter({loading:false,error:"Unavailable",data:[]});}
    };
    void load("forex",setFx);void load("index",setIndex);
    return()=>c.abort();
  },[]);
  const currencies=useMemo(()=>["USD","EUR","GBP","JPY","INR"].map(code=>fx.data.find(x=>x.asset===code)).filter(Boolean) as MarketItem[],[fx.data]);
  const nepse=index.data[0];
  return <CardShell kicker="बजार · Markets" title="Forex, NEPSE & money tools">
    {(fx.loading||index.loading)?<SkeletonLines/>:<>
      <div className="home-market-grid">
        {currencies.map(row=><a href="/tools/forex" key={row.asset}><span>{row.asset}</span><strong>{Number(row.sell||row.value||0).toLocaleString("en-IN",{maximumFractionDigits:2})}</strong><small>{row.per||1} unit · sell · {row.as_of}</small></a>)}
        {nepse&&<a href="https://www.nepalstock.com" target="_blank" rel="noreferrer"><span>NEPSE</span><strong>{Number(nepse.value||0).toLocaleString("en-IN",{maximumFractionDigits:2})}</strong><small>{nepse.percent_change==null?"index":String(nepse.percent_change)+"%"} · {nepse.as_of}</small></a>}
      </div>
      {(fx.error||index.error)&&<p className="home-depth-empty">Some market data is unavailable; no missing values are fabricated.</p>}
      <div className="home-market-actions"><a href="/tools/forex">Forex converter</a><a href="/tools/gold">Gold calculator</a><a href="/tools/emi">EMI</a><a href="/tools/fuelprice">Fuel prices</a></div>
    </>}
  </CardShell>;
}

const WORLD_ZONES=[
  ["Kathmandu","Asia/Kathmandu"],["Tokyo","Asia/Tokyo"],["Dubai","Asia/Dubai"],["London","Europe/London"],["New York","America/New_York"]
] as const;
function WorldTimeStrip(){
  const [now,setNow]=useState(()=>new Date());
  useEffect(()=>{const id=window.setInterval(()=>setNow(new Date()),1000);return()=>window.clearInterval(id);},[]);
  return <section className="home-world-time" aria-label="World time">
    <header><div><p className="eyebrow">विश्व समय · World time</p><h2>नेपालसँगै मुख्य शहरहरू</h2></div><a href="/tools/clock">Open world clock →</a></header>
    <div>{WORLD_ZONES.map(([city,tz])=><time key={tz}><span>{city}</span><strong>{new Intl.DateTimeFormat("en-GB",{timeZone:tz,hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(now)}</strong><small>{new Intl.DateTimeFormat("en-GB",{timeZone:tz,weekday:"short",day:"2-digit",month:"short"}).format(now)}</small></time>)}</div>
  </section>;
}

const HOME_TOOLS=[
  ["/tools/convert","वि","मिति रूपान्तरण","Date converter"],
  ["/tools/calc","±","दिन गणना","Date calculator"],
  ["/tools/age","उ","उमेर गणक","Age calculator"],
  ["/tools/forex","$","विदेशी मुद्रा","Forex"],
  ["/tools/emi","%","कर्जा EMI","Loan EMI"],
  ["/tools/vat","भ","भ्याट/प्रतिशत","VAT & percent"],
  ["/tools/units","ना","नाप–तौल","Traditional units"],
  ["/tools/words","अ","अंकलाई शब्दमा","Amount in words"]
] as const;
function ToolGrid(){
  return <section className="home-tool-grid" aria-label="Popular tools">
    <header><div><p className="eyebrow">उपकरण · Tools</p><h2>दैनिक कामका छिटो उपकरण</h2></div><a href="/tools">All tools →</a></header>
    <div>{HOME_TOOLS.map(([href,icon,ne,en])=><a href={href} key={href}><span>{icon}</span><strong>{ne}</strong><small>{en}</small></a>)}</div>
  </section>;
}

export function HomeDeepSections({selectedDate}:{selectedDate:string}){
  const {ref,visible}=useVisibleOnce<HTMLDivElement>();
  return <div className="home-depth" ref={ref}>
    <MediaPreview/>
    {visible?<><div className="home-depth-grid"><HistoryWidget date={selectedDate}/><NewsWidget/></div><MarketsWidget/><WorldTimeStrip/><ToolGrid/></>:<div className="home-depth-lazy-placeholder" aria-hidden="true"/>}
  </div>;
}
