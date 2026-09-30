import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { SyncPayload, TithiPayload, WeatherDay } from "../types";

interface Props {
  month: Date;
  selectedDate: string;
  today: string;
  onMonthChange: (month: Date) => void;
  onSelectDate: (date: string) => void;
}

type CalendarMode = "ad" | "bs";
type ViewMode = "month" | "agenda";

interface DayCell {
  iso: string;
  date: Date;
  inMonth: boolean;
}

const WEEKDAYS = ["आइत", "सोम", "मङ्गल", "बुध", "बिहि", "शुक्र", "शनि"];
const BS_MONTHS = ["बैशाख","जेठ","असार","श्रावण","भदौ","असोज","कार्तिक","मंसिर","पुष","माघ","फागुन","चैत"];
const NAKSHATRAS = ["अश्विनी","भरणी","कृत्तिका","रोहिणी","मृगशिरा","आर्द्रा","पुनर्वसु","पुष्य","आश्लेषा","मघा","पूर्व फाल्गुनी","उत्तर फाल्गुनी","हस्त","चित्रा","स्वाती","विशाखा","अनुराधा","ज्येष्ठा","मूल","पूर्वाषाढा","उत्तराषाढा","श्रवण","धनिष्ठा","शतभिषा","पूर्व भाद्रपद","उत्तर भाद्रपद","रेवती"];
const CHOGHADIYA: Record<number, string[]> = {
  0:["उद्वेग","चल","लाभ","अमृत","काल","शुभ","रोग","उद्वेग"],
  1:["अमृत","काल","शुभ","रोग","उद्वेग","चल","लाभ","अमृत"],
  2:["रोग","उद्वेग","चल","लाभ","अमृत","काल","शुभ","रोग"],
  3:["लाभ","अमृत","काल","शुभ","रोग","उद्वेग","चल","लाभ"],
  4:["शुभ","रोग","उद्वेग","चल","लाभ","अमृत","काल","शुभ"],
  5:["चल","लाभ","अमृत","काल","शुभ","रोग","उद्वेग","चल"],
  6:["काल","शुभ","रोग","उद्वेग","चल","लाभ","अमृत","काल"]
};
const GOOD = new Set(["चल","लाभ","अमृत","शुभ"]);

function iso(date: Date) {
  return date.getUTCFullYear()+"-"+String(date.getUTCMonth()+1).padStart(2,"0")+"-"+String(date.getUTCDate()).padStart(2,"0");
}
function parseIso(value: string) {
  const [y,m,d] = value.split("-").map(Number);
  return new Date(Date.UTC(y,m-1,d));
}
function monthCells(month: Date): DayCell[] {
  const year=month.getUTCFullYear(), monthIndex=month.getUTCMonth();
  const first=new Date(Date.UTC(year,monthIndex,1)), start=new Date(first);
  start.setUTCDate(1-first.getUTCDay());
  return Array.from({length:42},(_,index)=>{
    const date=new Date(start); date.setUTCDate(start.getUTCDate()+index);
    return {date,iso:iso(date),inMonth:date.getUTCMonth()===monthIndex};
  });
}
function shiftMonth(month: Date, amount: number) {
  return new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+amount,1));
}
function title(month: Date) {
  return new Intl.DateTimeFormat("en-US",{timeZone:"UTC",month:"long",year:"numeric"}).format(month);
}
async function loadMonthRange(dates: DayCell[], signal: AbortSignal): Promise<Map<string, SyncPayload>> {
  if (!dates.length) return new Map();
  const payload=await api.syncRange(dates[0].iso,dates[dates.length-1].iso,signal);
  return new Map(payload.days.map((day)=>[day.query_date,day]));
}
function nepaliDigits(value: string | number) {
  const map=["०","१","२","३","४","५","६","७","८","९"];
  return String(value).replace(/\d/g,(d)=>map[Number(d)]);
}

function tithiTransitionLabel(day: SyncPayload) {
  const transition=day.archive_panchang.tithi_transition;
  if(!transition?.time || !transition.next_ne) return null;
  const clock=transition.time.match(/\d{1,2}:\d{2}/)?.[0] || transition.time;
  return nepaliDigits(clock)+" देखि "+transition.next_ne;
}
function nakshatraFromMoon(longitude: number | null) {
  if (longitude == null || !Number.isFinite(longitude)) return "—";
  return NAKSHATRAS[Math.floor((((longitude%360)+360)%360)/(360/27))] ?? "—";
}
function parseClock(dateIso: string, clock: string | null, fallbackHour: number) {
  if (!clock) return new Date(dateIso+"T"+String(fallbackHour).padStart(2,"0")+":00:00");
  const match=clock.match(/(\d{1,2}):(\d{2})/);
  if (!match) return new Date(dateIso+"T"+String(fallbackHour).padStart(2,"0")+":00:00");
  return new Date(dateIso+"T"+String(Number(match[1])).padStart(2,"0")+":"+match[2]+":00");
}
function choghadiyaFor(day: string, sunrise: string | null, sunset: string | null) {
  const date=parseIso(day);
  const start=parseClock(day,sunrise,6), end=parseClock(day,sunset,18);
  const total=Math.max(8*60*60*1000,end.getTime()-start.getTime());
  const unit=total/8, names=CHOGHADIYA[date.getUTCDay()] || CHOGHADIYA[0];
  return names.map((name,index)=>{
    const a=new Date(start.getTime()+index*unit), b=new Date(start.getTime()+(index+1)*unit);
    const fmt=(x:Date)=>x.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",hour12:false});
    return {name,start:fmt(a),end:fmt(b),good:GOOD.has(name)};
  });
}
function escapeIcs(value: string) {
  return value.replace(/\\/g,"\\\\").replace(/,/g,"\\,").replace(/;/g,"\\;").replace(/\n/g,"\\n");
}
function downloadIcs(day: SyncPayload, note: string) {
  const start=day.query_date.replaceAll("-","");
  const next=parseIso(day.query_date); next.setUTCDate(next.getUTCDate()+1);
  const end=iso(next).replaceAll("-","");
  const titleText=day.tithi.ne+" · "+day.calendars.bikram_sambat;
  const body=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Mero Patro//Calendar//NE","CALSCALE:GREGORIAN","BEGIN:VEVENT",
    "UID:"+crypto.randomUUID()+"@nepalipatro","DTSTAMP:"+new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,""),
    "DTSTART;VALUE=DATE:"+start,"DTEND;VALUE=DATE:"+end,"SUMMARY:"+escapeIcs(titleText),
    "DESCRIPTION:"+escapeIcs(note || day.tithi.en+" · "+day.tithi.paksha),"END:VEVENT","END:VCALENDAR"].join("\r\n");
  const blob=new Blob([body],{type:"text/calendar;charset=utf-8"});
  const url=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=url; a.download="mero-patro-"+day.query_date+".ics"; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function googleCalendarUrl(day: SyncPayload, note: string) {
  const next=parseIso(day.query_date); next.setUTCDate(next.getUTCDate()+1);
  const dates=day.query_date.replaceAll("-","")+"/"+iso(next).replaceAll("-","");
  const p=new URLSearchParams({action:"TEMPLATE",text:day.tithi.ne+" · "+day.calendars.bikram_sambat,dates,details:note || day.tithi.en+" · "+day.tithi.paksha});
  return "https://calendar.google.com/calendar/render?"+p.toString();
}
function extractHoliday(payload: unknown) {
  if (!payload || typeof payload!=="object") return null;
  const obj=payload as Record<string,unknown>;
  const list=Array.isArray(obj.holidays)?obj.holidays:Array.isArray(obj.items)?obj.items:[];
  const first=list[0];
  if (first && typeof first==="object") {
    const row=first as Record<string,unknown>;
    return String(row.name_ne || row.name || row.title || "Public holiday");
  }
  return null;
}

function DaySheet({ day, onClose }: { day: SyncPayload; onClose: () => void }) {
  const [astro,setAstro]=useState<TithiPayload|null>(null);
  const [holiday,setHoliday]=useState<string|null>(null);
  const [note,setNote]=useState(()=>localStorage.getItem("patro.note."+day.query_date) || "");
  useEffect(()=>{
    const controller=new AbortController();
    api.tithi(day.query_date,27.7172,85.324,controller.signal).then(setAstro).catch(()=>setAstro(null));
    fetch("/api/v1/holidays?date="+encodeURIComponent(day.query_date),{signal:controller.signal,headers:{Accept:"application/json"}})
      .then((r)=>r.ok?r.json():null).then((x)=>setHoliday(extractHoliday(x))).catch(()=>setHoliday(null));
    return ()=>controller.abort();
  },[day.query_date]);
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();};
    window.addEventListener("keydown",onKey); return ()=>window.removeEventListener("keydown",onKey);
  },[onClose]);
  const slots=choghadiyaFor(day.query_date,day.archive_panchang.sunrise,day.archive_panchang.sunset);
  const saveNote=(value:string)=>{setNote(value); try{localStorage.setItem("patro.note."+day.query_date,value);}catch{}};
  return (
    <motion.div className="day-sheet-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={(e)=>{if(e.currentTarget===e.target)onClose();}}>
      <motion.aside className="day-sheet" role="dialog" aria-modal="true" aria-label={"Details for "+day.query_date}
        initial={{opacity:0,y:40,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:30,scale:.98}}>
        <header><div><p className="eyebrow">{day.query_date}</p><h3>{day.calendars.bikram_sambat}</h3><p>{day.calendars.nepal_sambat}</p></div>
          <button className="icon-button" onClick={onClose} aria-label="Close day details">×</button></header>
        <div className="day-facts">
          <article><small>तिथि</small><strong>{day.tithi.ne}</strong><span>{day.tithi.paksha}</span></article>
          <article><small>नक्षत्र</small><strong>{nakshatraFromMoon(astro?.moon_longitude_deg ?? null)}</strong><span>{astro?"Moon "+astro.moon_longitude_deg.toFixed(2)+"°":"Calculating…"}</span></article>
          <article><small>सूर्योदय</small><strong>{day.archive_panchang.sunrise || "—"}</strong><span>काठमाडौं reference</span></article>
          <article><small>सूर्यास्त</small><strong>{day.archive_panchang.sunset || "—"}</strong><span>{holiday || "No public-holiday badge returned"}</span></article>
        </div>
        <section><div className="day-section-heading"><h4>चौघडिया · Choghadiya</h4><span>Daylight divided into 8 equal periods</span></div>
          <div className="choghadiya-grid">{slots.map((slot)=><div key={slot.start} className={slot.good?"is-good":""}><strong>{slot.name}</strong><span>{slot.start}–{slot.end}</span>{slot.good&&<small>शुभ समय</small>}</div>)}</div>
        </section>
        <section><div className="day-section-heading"><h4>My note</h4><span>Stored only in this browser</span></div>
          <textarea value={note} onChange={(e)=>saveNote(e.target.value)} rows={4} placeholder="यो दिनको निजी नोट… / Add a private note…" aria-label="Private note for this day" />
        </section>
        <footer className="day-sheet-actions">
          <button onClick={()=>downloadIcs(day,note)}>Export .ics</button>
          <a href={googleCalendarUrl(day,note)} target="_blank" rel="noreferrer">Google Calendar</a>
        </footer>
      </motion.aside>
    </motion.div>
  );
}

export function CalendarGrid({month,selectedDate,today,onMonthChange,onSelectDate}:Props) {
  const [mode,setMode]=useState<CalendarMode>("bs");
  const [view,setView]=useState<ViewMode>("month");
  const [entries,setEntries]=useState<Map<string,SyncPayload>>(new Map());
  const [weather,setWeather]=useState<Map<string,WeatherDay>>(new Map());
  const [loading,setLoading]=useState(true);
  const [monthError,setMonthError]=useState<string|null>(null);
  const [openDay,setOpenDay]=useState<SyncPayload|null>(null);
  const [jumpOpen,setJumpOpen]=useState(false);
  const [jumpYear,setJumpYear]=useState(2083);
  const [jumpMonth,setJumpMonth]=useState(1);
  const [jumping,setJumping]=useState(false);
  const cells=useMemo(()=>monthCells(month),[month]);

  useEffect(()=>{
    const controller=new AbortController();
    api.weatherDaily(27.7172,85.324,controller.signal)
      .then((payload)=>{if(!controller.signal.aborted)setWeather(new Map(payload.days.map((day)=>[day.date,day])));})
      .catch(()=>{if(!controller.signal.aborted)setWeather(new Map());});
    return ()=>controller.abort();
  },[]);

  useEffect(()=>{
    const controller=new AbortController(); setLoading(true); setMonthError(null);
    loadMonthRange(cells,controller.signal).then((data)=>{if(!controller.signal.aborted){setEntries(data);setLoading(false);if(!data.size)setMonthError("Calendar data is unavailable for this month.");}})
      .catch((error)=>{if(!controller.signal.aborted){setLoading(false);setMonthError(error?.message || "Unable to load the month.");}});
    return ()=>controller.abort();
  },[cells]);

  useEffect(()=>{
    const current=entries.get(selectedDate);
    if(current){setJumpYear(current.calendars.bikram_sambat_detail.year);setJumpMonth(current.calendars.bikram_sambat_detail.month);}
  },[entries,selectedDate]);

  async function jumpToBs(){
    setJumping(true); setMonthError(null);
    try{
      const approxYear=jumpYear-57;
      const approxMonth=(jumpMonth+2)%12;
      const center=new Date(Date.UTC(approxYear+(jumpMonth>=10?1:0),approxMonth,15));
      const start=new Date(center); start.setUTCDate(start.getUTCDate()-30);
      const end=new Date(center); end.setUTCDate(end.getUTCDate()+30);
      const payload=await api.syncRange(iso(start),iso(end));
      const hit=payload.days.find((d)=>d.calendars.bikram_sambat_detail.year===jumpYear&&d.calendars.bikram_sambat_detail.month===jumpMonth&&d.calendars.bikram_sambat_detail.day===1)
        || payload.days.find((d)=>d.calendars.bikram_sambat_detail.year===jumpYear&&d.calendars.bikram_sambat_detail.month===jumpMonth);
      if(!hit) throw new Error("Selected BS month is outside the currently indexed archive.");
      const target=parseIso(hit.query_date); onMonthChange(new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth(),1))); onSelectDate(hit.query_date); setJumpOpen(false);
    }catch(error){setMonthError(error instanceof Error?error.message:"Unable to jump to that BS month.");}finally{setJumping(false);}
  }

  const monthEntries=cells.filter((x)=>x.inMonth).map((cell)=>({cell,data:entries.get(cell.iso)}));
  return (
    <section className="glass-panel calendar-card enhanced-calendar">
      <div className="calendar-toolbar">
        <div><p className="eyebrow">Synchronized calendar</p><h2>{title(month)}</h2></div>
        <div className="calendar-actions">
          <div className="segmented-control" aria-label="Calendar label"><button className={mode==="ad"?"active":""} onClick={()=>setMode("ad")} aria-pressed={mode==="ad"}>AD</button><button className={mode==="bs"?"active":""} onClick={()=>setMode("bs")} aria-pressed={mode==="bs"}>BS</button></div>
          <div className="segmented-control" aria-label="Calendar view"><button className={view==="month"?"active":""} onClick={()=>setView("month")} aria-pressed={view==="month"}>Grid</button><button className={view==="agenda"?"active":""} onClick={()=>setView("agenda")} aria-pressed={view==="agenda"}>Agenda</button></div>
          <button className="icon-button" onClick={()=>setJumpOpen(true)} aria-label="Jump to Bikram Sambat year and month">⌘</button>
          <button className="icon-button" onClick={()=>onMonthChange(shiftMonth(month,-1))} aria-label="Previous month">←</button>
          <button className="icon-button" onClick={()=>onMonthChange(shiftMonth(month,1))} aria-label="Next month">→</button>
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {view==="month"?(
          <motion.div key={"grid-"+month.toISOString()} initial={{opacity:0,x:24}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-24}} transition={{duration:.18}}>
            <div className="weekday-row sticky-weekdays" aria-label="Weekdays">{WEEKDAYS.map((w)=><span key={w}>{w}</span>)}</div>
            <div className="month-grid" role="grid" aria-label={title(month)}>
              {cells.map((cell)=>{
                const data=entries.get(cell.iso), forecast=weather.get(cell.iso), tithiNumber=data?.tithi.number;
                const transition=data?tithiTransitionLabel(data):null;
                const special=tithiNumber===15?"purnima":tithiNumber===30?"amavasya":"";
                const primary=mode==="bs"?(data?.calendars.bikram_sambat_detail.day??"—"):cell.date.getUTCDate();
                const secondary=mode==="bs"?String(cell.date.getUTCDate())+" AD":data?data.calendars.bikram_sambat_detail.day+" BS":"";
                const classes=["calendar-day",!cell.inMonth?"calendar-day--muted":"",cell.iso===today?"calendar-day--today":"",cell.iso===selectedDate?"calendar-day--selected":"",special?"calendar-day--special "+special:""].filter(Boolean).join(" ");
                return <button key={cell.iso} className={classes} onClick={()=>{onSelectDate(cell.iso);if(data)setOpenDay(data);}} role="gridcell" aria-selected={cell.iso===selectedDate}
                  aria-label={cell.iso+(data?", "+data.tithi.ne+(transition?", "+transition:"")+", "+data.tithi.paksha:"")}>
                  <span className="day-number" aria-label={"day "+primary}>{mode==="bs"&&typeof primary==="number"?nepaliDigits(primary):primary}</span>
                  <span className="day-secondary">{secondary}</span>
                  {forecast&&<span className="weather-chip" title={forecast.label+(forecast.precipitation_probability_max==null?"":" · "+Math.round(forecast.precipitation_probability_max)+"% rain")}><span aria-hidden="true">{forecast.icon}</span>{forecast.temperature_max_c!=null&&<span>{Math.round(forecast.temperature_max_c)}°</span>}</span>}
                  {loading&&!data?<span className="cell-skeleton skeleton" role="status" aria-label="Loading day"/>:data?<><span className="tithi-badge">{data.tithi.ne}</span>{transition&&<span className="tithi-transition">{transition}</span>}<span className="paksha-dot" title={data.tithi.paksha}>{data.tithi.paksha.startsWith("Shukla")?"शु":"कृ"}</span></>:<span className="tithi-badge tithi-badge--unavailable">—</span>}
                  {cell.iso===today&&<span className="today-marker">Today</span>}{special&&<span className="special-marker">{special==="purnima"?"पूर्णिमा":"औंसी"}</span>}
                </button>;
              })}
            </div>
          </motion.div>
        ):(
          <motion.div key={"agenda-"+month.toISOString()} className="calendar-agenda" initial={{opacity:0,x:-24}} animate={{opacity:1,x:0}} exit={{opacity:0,x:24}} transition={{duration:.18}}>
            {monthEntries.map(({cell,data})=><button key={cell.iso} className={cell.iso===selectedDate?"agenda-row is-selected":"agenda-row"} onClick={()=>{onSelectDate(cell.iso);if(data)setOpenDay(data);}}>
              <time dateTime={cell.iso}><strong>{cell.date.getUTCDate()}</strong><span>{WEEKDAYS[cell.date.getUTCDay()]}</span></time>
              <div><strong>{data?data.calendars.bikram_sambat:"Loading…"}</strong><span>{data?data.tithi.ne+(tithiTransitionLabel(data)?" — "+tithiTransitionLabel(data):"")+" · "+data.tithi.paksha:"Synchronizing day"}</span></div>
              <span aria-hidden="true">›</span>
            </button>)}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="calendar-legend"><span><i className="legend-dot legend-dot--today"/>Today</span><span><i className="legend-dot legend-dot--selected"/>Selected</span><span><i className="legend-dot legend-dot--special"/>Purnima / Amavasya</span>{loading&&<span className="calendar-status">Synchronizing month…</span>}</div>
      {monthError&&<div className="inline-error calendar-error" role="alert">{monthError}</div>}
      <AnimatePresence>{openDay&&<DaySheet key={openDay.query_date} day={openDay} onClose={()=>setOpenDay(null)}/>}</AnimatePresence>
      <AnimatePresence>{jumpOpen&&<motion.div className="day-sheet-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><motion.div className="jump-dialog" role="dialog" aria-modal="true" aria-label="Jump to Bikram Sambat month" initial={{scale:.96,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.96,opacity:0}}>
        <header><div><p className="eyebrow">Fast navigation</p><h3>BS Year / Month</h3></div><button className="icon-button" onClick={()=>setJumpOpen(false)} aria-label="Close jump menu">×</button></header>
        <label>वर्ष · Year<input type="number" min="1883" max="2094" value={jumpYear} onChange={(e)=>setJumpYear(Number(e.target.value))}/></label>
        <label>महिना · Month<select value={jumpMonth} onChange={(e)=>setJumpMonth(Number(e.target.value))}>{BS_MONTHS.map((name,i)=><option key={name} value={i+1}>{i+1}. {name}</option>)}</select></label>
        <button className="jump-primary" onClick={jumpToBs} disabled={jumping}>{jumping?"Finding month…":"Jump"}</button>
      </motion.div></motion.div>}</AnimatePresence>
    </section>
  );
}
