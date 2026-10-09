import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type { ApodPayload, CosmicDayPayload, SyncPayload, TithiPayload } from "./types";
import { HeroCanvas } from "./components/HeroCanvas";
import { CosmicHero } from "./components/CosmicHero";
import { DateTravelExperience } from "./components/DateTravelExperience";
import { LunarPhaseDial } from "./components/LunarPhaseDial";
import { CalendarGrid } from "./components/CalendarGrid";
import { CosmicExperience } from "./components/CosmicExperience";
import { DailyDirectAnswer } from "./components/seo/DailyDirectAnswer";
import { sanitizeApod } from "./apod";
import { setPageTitle } from "./title";

type Loadable<T> = { data: T | null; error: string | null; loading: boolean };

function todayInKathmandu(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return get("year") + "-" + get("month") + "-" + get("day");
}
function isoFromDate(date: Date): string {
  return date.getUTCFullYear()+"-"+String(date.getUTCMonth()+1).padStart(2,"0")+"-"+String(date.getUTCDate()).padStart(2,"0");
}
function parseIso(iso: string): Date {
  const [y,m,d]=iso.split("-").map(Number); return new Date(Date.UTC(y,m-1,d));
}
function initialDate(today: string) {
  const value=new URLSearchParams(window.location.search).get("date");
  if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return today;
  const date=parseIso(value); return Number.isNaN(date.getTime())?today:value;
}

export default function App() {
  const today=useMemo(todayInKathmandu,[]);
  const [selectedDate,setSelectedDate]=useState(()=>initialDate(today));
  const [monthCursor,setMonthCursor]=useState(()=>{const d=parseIso(initialDate(today));return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1));});
  const [sync,setSync]=useState<Loadable<SyncPayload>>({data:null,error:null,loading:true});
  const [apod,setApod]=useState<Loadable<ApodPayload>>({data:null,error:null,loading:true});
  const [tithi,setTithi]=useState<Loadable<TithiPayload>>({data:null,error:null,loading:true});
  const [cosmic,setCosmic]=useState<Loadable<CosmicDayPayload>>({data:null,error:null,loading:true});

  useEffect(()=>{setPageTitle("खगोलीय पात्रो")},[]);
  useEffect(()=>{
    const c=new AbortController();
    setSync(s=>({...s,loading:true,error:null}));setApod(s=>({...s,loading:true,error:null}));setTithi(s=>({...s,loading:true,error:null}));setCosmic(s=>({...s,loading:true,error:null}));
    api.sync(selectedDate,c.signal).then(data=>setSync({data,error:null,loading:false})).catch(e=>{if(e?.name!=="AbortError")setSync({data:null,error:e.message,loading:false})});
    api.apod(selectedDate,c.signal).then(data=>setApod({data:sanitizeApod(data),error:null,loading:false})).catch(e=>{if(e?.name!=="AbortError")setApod({data:null,error:e.message,loading:false})});
    api.tithi(selectedDate,27.7172,85.324,c.signal).then(data=>setTithi({data,error:null,loading:false})).catch(e=>{if(e?.name!=="AbortError")setTithi({data:null,error:e.message,loading:false})});
    api.cosmic(selectedDate,c.signal).then(data=>setCosmic({data,error:null,loading:false})).catch(e=>{if(e?.name!=="AbortError")setCosmic({data:null,error:e.message,loading:false})});
    return()=>c.abort();
  },[selectedDate]);
  useEffect(()=>{const q=new URLSearchParams(window.location.search);q.set("date",selectedDate);history.replaceState(null,"",window.location.pathname+"?"+q.toString())},[selectedDate]);

  function chooseDate(iso:string){setSelectedDate(iso);const d=parseIso(iso);setMonthCursor(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1)))}
  function shiftSelected(days:number){const d=parseIso(selectedDate);d.setUTCDate(d.getUTCDate()+days);const next=isoFromDate(d);if(next<"1826-04-11"||next>"2037-04-13")return;chooseDate(next)}

  const effectiveApod=sanitizeApod(apod.data||cosmic.data?.apod||null);
  return <div className="app-shell astro-app">
    <HeroCanvas imageUrl={effectiveApod?.hdurl||effectiveApod?.url||null} loading={apod.loading}/>
    <main className="app-content cosmic-app-content">
      <CosmicHero sync={sync.data} tithi={tithi.data} cosmic={cosmic.data} apod={effectiveApod} selectedDate={selectedDate} today={today} loading={cosmic.loading||tithi.loading} onDateChange={chooseDate} onPreviousDay={()=>shiftSelected(-1)} onNextDay={()=>shiftSelected(1)} onToday={()=>chooseDate(today)}/>
      <DailyDirectAnswer selectedDate={selectedDate} today={today} sync={sync.data}/>
      {sync.error&&<div className="inline-error cosmic-top-error" role="status"><strong>पात्रो विवरण अहिले पूर्ण रूपमा उपलब्ध छैन।</strong><span>उपलब्ध खगोलीय जानकारी भने तल हेर्न सक्नुहुन्छ।</span></div>}
      <DateTravelExperience selectedDate={selectedDate} today={today} onDateChange={chooseDate}/>
      <section className="dashboard-grid" aria-label="खगोलीय पात्रो">
        <LunarPhaseDial data={tithi.data} loading={tithi.loading} error={tithi.error}/>
        <CalendarGrid month={monthCursor} selectedDate={selectedDate} today={today} onMonthChange={setMonthCursor} onSelectDate={chooseDate}/>
      </section>
      <CosmicExperience data={cosmic.data} apod={effectiveApod} tithi={tithi.data} loading={cosmic.loading} error={cosmic.error}/>
    </main>
  </div>;
}
