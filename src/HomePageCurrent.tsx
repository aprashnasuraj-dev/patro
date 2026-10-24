import {festivalTiming} from "./home-festival-label";
import {homeToday,homeMonth,homeEvents} from "./home-calendar-client";
import { HomeNotesDisclosure } from "./components/HomeNotesDisclosure";
import { type HomePanchangData } from "./components/HomePanchang";
import { TodayHero } from "./components/TodayHero";
import { DeferredHomeWeather } from "./components/DeferredHomeWeather";
import { HomeToolDirectory } from "./components/HomeToolDirectory";
import { HomeReading } from "./components/HomeReading";
import { CalendarDays, Languages, Calculator, BookOpen, Search } from "lucide-react";
import "./home-extras.css";
import "./panchang-jyotish/home-discovery.css";
import { DeferredHomeSkyFact } from "./components/DeferredHomeSkyFact";
import "./patro-cell.css";
import { formatDate } from "./nepaliDate";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adToBs, bsToAd, daysInBsMonth } from "../packages/core/src";
import { BS_MONTHS, calendarTitle, pageTitle, toNepaliDigits } from "./title";
import { compactNepalSambat } from "./nepalSambatCompact";
import { l, useUiLanguage } from "./useUiLanguage";
import "./reference-home.css";

type BsDate = { year: number; month: number; day: number; month_ne?: string };
type CalendarDay = { ad: string; bs: BsDate; nepal_sambat?: unknown; panchang?: any };
type Festival = {
  ad_date?: string; fact_date?: string; date?: string; name_ne?: string; title_ne?: string;
  label_ne?: string; name_en?: string; title?: string; key?: string; effect?: string; status?: string;
  value?: { label_ne?: string; label_en?: string };
};
type TodayView = { bs: BsDate | null; ns: string; nsEn?: string; tithi: string; sunrise: string; sunset: string; panchang?: HomePanchangData };

const NE_DAYS = ["आइत", "सोम", "मंगल", "बुध", "बिही", "शुक्र", "शनि"];
const EN_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const BS_MONTHS_EN = ["Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];

function todayNepal() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function festivalDate(item: Festival) { return item.ad_date || item.fact_date || item.date || ""; }
function festivalName(item: Festival, language: "ne" | "en") {
  const fromKey = item.key ? String(item.key).replace(/[_-]+/g, " ").replace(/\b[a-z]/g, (c: string) => c.toUpperCase()) : "";
  if (language === "en") return item.name_en || item.title || item.name_ne || item.title_ne || fromKey || "Festival";
  return item.name_ne || item.title_ne || item.label_ne || item.value?.label_ne || item.title || item.name_en || fromKey || "चाडपर्व";
}
function isHoliday(item: Festival) {
  // Holiday rows mark public closures as effect "closed" (some also say "holiday" / बिदा in the name).
  if (String(item.effect || "").toLowerCase() === "closed") return true;
  const text = `${item.effect || ""} ${item.status || ""} ${item.name_ne || ""} ${item.name_en || ""}`.toLowerCase();
  return text.includes("holiday") || text.includes("बिदा") || text.includes("छुट्टी");
}
function decorateBs(value: { year: number; month: number; day: number }): BsDate {
  return { ...value, month_ne: BS_MONTHS[value.month - 1] };
}
function localMonthDays(year: number, month: number): CalendarDay[] {
  try {
    return Array.from({ length: daysInBsMonth(year, month) }, (_, index) => {
      const day = index + 1;
      return { ad: bsToAd({ year, month, day }), bs: decorateBs({ year, month, day }), panchang: {} };
    });
  } catch { return []; }
}
function normalizeDay(row: any): CalendarDay | null {
  if (row?.ad && row?.bs) return { ad: String(row.ad), bs: decorateBs(row.bs), nepal_sambat: row.nepal_sambat || row.ns, panchang: row.panchang || {} };
  if (row?.calendars?.gregorian_ad && row?.calendars?.bikram_sambat_detail) {
    return { ad: row.calendars.gregorian_ad, bs: decorateBs(row.calendars.bikram_sambat_detail), nepal_sambat: row.calendars.nepal_sambat_detail || row.calendars.nepal_sambat, panchang: row.archive_panchang || {} };
  }
  return null;
}
function mergeDays(local: CalendarDay[], remote: CalendarDay[]) {
  if (!remote.length) return local;
  if (!local.length) return remote; // months outside the built-in converter: trust the archive
  const byDate = new Map(remote.map((row) => [row.ad, row]));
  return local.map((row) => {
    const richer = byDate.get(row.ad);
    return richer ? { ...row, ...richer, bs: { ...row.bs, ...richer.bs } } : row;
  });
}
async function loadMonth(year: number, month: number, fallback: CalendarDay[], signal: AbortSignal) {
  const body = await homeMonth(year,month,signal);
    const rows = (body?.days || []).map(normalizeDay).filter(Boolean) as CalendarDay[];
    return mergeDays(fallback, rows);
}
async function loadEvents(days: CalendarDay[], signal: AbortSignal) {
  const years = [...new Set(days.map((day) => Number(day.ad.slice(0, 4))).filter(Boolean))];
  const results = await Promise.all(years.map(year=>homeEvents(year,signal)));
  const seen = new Set<string>();
  const items = results.flatMap((row) => row.items || []).filter((item) => {
    const key = `${festivalDate(item)}|${item.name_ne || item.name_en || item.title || item.key || ""}|${item.effect || ""}`;
    if (!festivalDate(item) || seen.has(key)) return false;
    seen.add(key); return true;
  });
  return {items,partial:results.some(row=>row.partial)};
}
function panchangTithi(day?: CalendarDay, language: "ne"|"en" = "ne") {
  if(language === "en") return day?.panchang?.tithi?.en || day?.panchang?.tithi?.name_en || "";
  return day?.panchang?.tithi?.ne || day?.panchang?.tithi?.name_ne || day?.panchang?.tithi_name_ne || "";
}
const AD_MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Nepal Sambat date parts for a cell: [month, paksha, tithi number], e.g. ["बछला", "थ्वः", "७"]. */
function nsParts(value: any, language: "ne" | "en"): string[] {
  if (!value || typeof value !== "object" || !value.month) return [];
  const n = value.tithi_number || value.tithi_ordinal;
  if (language === "en") return [value.month?.roman || "", value.paksha || "", n ? String(n) : ""];
  return [value.month?.dev || "", value.paksha_dev || "", n ? toNepaliDigits(n) : ""];
}
/** Compact Nepal Sambat date, e.g. "बछला थ्वः ७". */
function nsShort(value: any, language: "ne" | "en") { return nsParts(value, language).filter(Boolean).join(" "); }
function nsText(value: any, language: "ne" | "en" = "ne") {
  if (!value) return "";
  if (typeof value === "string") return value;
  const formatted = language === "en" ? value.formatted || value.formatted_ne : value.formatted_ne || value.formatted;
  return formatted || [value.year, ...nsParts(value, language)].filter(Boolean).join(" ");
}
function adLabel(iso: string, language: "ne" | "en") {
  return formatDate(iso, language, { weekday: "long" });
}
function bsMonth(month: number, language: "ne" | "en") { return language === "en" ? BS_MONTHS_EN[month - 1] : BS_MONTHS[month - 1]; }
function number(value: number, language: "ne" | "en") { return language === "en" ? String(value) : toNepaliDigits(value); }

function readServerToday(date:string): {view:TodayView;events:Festival[]} | null {
  if(typeof document==="undefined")return null;
  try {const value=JSON.parse(document.getElementById("patro-today-data")?.textContent||"null");return value?.date===date && value?.view ? value : null;} catch{return null;}
}

export function ReferenceHomePage({ calendarYear, calendarMonth }: { calendarYear?: number; calendarMonth?: number }) {
  const language = useUiLanguage();
  const [today, setToday] = useState(todayNepal);
  useEffect(() => { const refresh = () => setToday(todayNepal()); const timer = window.setInterval(refresh, 60000); window.addEventListener("focus",refresh); return () => { clearInterval(timer); window.removeEventListener("focus",refresh); }; }, []);
  const [layers,setLayers] = useState({ad:true,tithi:true,ns:false,holidays:true,festivals:true});
  const [monthState,setMonthState] = useState<"loading"|"ready"|"error">("loading");
  const [retry,setRetry] = useState(0);
  const [todayError,setTodayError] = useState(false);
  const [online,setOnline] = useState(() => navigator.onLine);
  const grid = useRef<HTMLDivElement>(null);
  const keyboardMonth = useRef(false);
  useEffect(() => { const sync = () => setOnline(navigator.onLine); window.addEventListener("online",sync);window.addEventListener("offline",sync);return()=>{window.removeEventListener("online",sync);window.removeEventListener("offline",sync);}; }, []);
  const localToday = useMemo(() => { try { return decorateBs(adToBs(today)); } catch { return null; } }, [today]);
  const initialCursor = calendarYear && calendarMonth ? { year: calendarYear, month: calendarMonth } : localToday ? { year: localToday.year, month: localToday.month } : null;
  const [cursor, setCursor] = useState<{ year: number; month: number } | null>(initialCursor);
  const [selected, setSelected] = useState(today);
  const [days, setDays] = useState<CalendarDay[]>(() => initialCursor ? localMonthDays(initialCursor.year, initialCursor.month) : []);
  const [events, setEvents] = useState<Festival[]>(() => readServerToday(today)?.events || []);
  const [todayView, setTodayView] = useState<TodayView>(() => readServerToday(today)?.view || { bs: localToday, ns: "", tithi: "", sunrise: "", sunset: "" });

  // Sync the displayed month whenever the URL changes (picker, back/forward
  // or an internal link). Reset to today's month when returning to the root.
  useEffect(() => {
    const next = calendarYear && calendarMonth
      ? { year: calendarYear, month: calendarMonth }
      : localToday ? { year: localToday.year, month: localToday.month } : null;
    if (!next) return;
    setCursor((previous) => previous?.year === next.year && previous?.month === next.month ? previous : next);
    const monthDays = localMonthDays(next.year, next.month);
    setDays(monthDays);
    setSelected(monthDays.some((day) => day.ad === today) ? today : monthDays[0]?.ad || "");
  }, [calendarYear, calendarMonth, localToday, today]);

  useEffect(() => {
    document.title = calendarYear && calendarMonth ? calendarTitle(calendarYear, calendarMonth) : pageTitle();
  }, [calendarYear, calendarMonth, language]);

  useEffect(() => {
    const controller = new AbortController();
    setTodayError(false);
    homeToday(today,controller.signal).then((body) => {
      const p = body?.archive_panchang || body?.panchang || {};
      const t = body?.tithi || p?.tithi || {};
      const rawBs = body?.calendars?.bikram_sambat_detail || body?.bs || localToday;
      setTodayView({
        bs: rawBs ? decorateBs(rawBs) : localToday,
        ns: nsText(body?.calendars?.nepal_sambat_detail || body?.calendars?.nepal_sambat || body?.nepal_sambat),
        nsEn: (body?.calendars?.nepal_sambat_detail || body?.nepal_sambat)?.formatted || "",
        tithi: t?.ne || t?.name_ne || t?.tithi_name_ne || "",
        sunrise: p?.sunrise || "",
        sunset: p?.sunset || "",
        panchang: { ...p, tithi: t },
      });
    }).catch(() => { if(!controller.signal.aborted) setTodayError(true); });
    return () => controller.abort();
  }, [today, localToday, retry]);

  useEffect(() => {
    if (!cursor) return;
    const fallback = localMonthDays(cursor.year, cursor.month);
    setDays(fallback); setEvents(readServerToday(today)?.events || []);
    const controller = new AbortController();
    setMonthState("loading");
    Promise.allSettled([loadMonth(cursor.year, cursor.month, fallback, controller.signal), loadEvents(fallback,controller.signal)])
      .then(([rows, items]) => { if(controller.signal.aborted)return; if(rows.status==="fulfilled")setDays(rows.value); if(items.status==="fulfilled")setEvents(items.value.items); setMonthState(rows.status==="fulfilled"&&items.status==="fulfilled"&&!items.value.partial?"ready":"error"); })
      .catch(() => { if(!controller.signal.aborted) setMonthState("error"); });
    return () => controller.abort();
  }, [cursor?.year, cursor?.month, retry, today]);

  useEffect(()=>{if(!keyboardMonth.current||!days.length)return;keyboardMonth.current=false;grid.current?.querySelector<HTMLButtonElement>(`[data-ad="${days[0].ad}"]`)?.focus();},[days]);
  const eventMap = useMemo(() => {
    const map = new Map<string, Festival[]>();
    for (const item of events) { const key = festivalDate(item); const list = map.get(key) || []; list.push(item); map.set(key, list); }
    return map;
  }, [events]);
  const selectedDay = days.find((day) => day.ad === selected);
  const selectedEvents = eventMap.get(selected) || [];
  // Multi-day holidays (e.g. बडादशैं बिदा) appear once per day in the data — list each name once.
  const upcoming = [...events].filter((item) => festivalDate(item) >= today).sort((a, b) => festivalDate(a).localeCompare(festivalDate(b)))
    .filter((item, index, list) => list.findIndex((other) => festivalName(other, language) === festivalName(item, language)) === index).slice(0, 6);
  const firstOffset = days[0] ? new Date(`${days[0].ad}T00:00:00Z`).getUTCDay() : 0;

  const shift = useCallback((delta: number, focus = false) => {
    if (!cursor) return;
    let year = cursor.year, month = cursor.month + delta;
    if (month < 1) { month = 12; year -= 1; }
    if (month > 12) { month = 1; year += 1; }
    if (year < 1883 || year > 2093) return;
    keyboardMonth.current = focus;
    const next = { year, month };
    setCursor(next);
    const monthDays = localMonthDays(year, month);
    setSelected(monthDays[0]?.ad || "");
    // Updating history inside a React state updater fired navigation events
    // during rendering. Dispatch only from the click handler, exactly once.
    history.pushState(null, "", `/calendar/${year}/${String(month).padStart(2, "0")}`);
    window.dispatchEvent(new Event("patro:navigation"));
  }, [cursor]);

  const jump = (year:number,month:number) => {
    history.pushState(null,"",`/calendar/${year}/${String(month).padStart(2,"0")}`);
    window.dispatchEvent(new Event("patro:navigation"));
  };
  const focusDay = (index:number) => {
    const day=days[Math.max(0,Math.min(days.length-1,index))]; if(!day)return;
    setSelected(day.ad); grid.current?.querySelector<HTMLButtonElement>(`[data-ad="${day.ad}"]`)?.focus();
  };
  const weekCount = Math.ceil((firstOffset+days.length)/7);
  const todayBs = todayView.bs || localToday;
  return <main className="rh-page home-redesign">
    <header className="home-intro"><div><p>{l(language,"पात्रो, उपकरण र उपयोगी लेख","Calendar, tools and useful reading")}</p></div><button type="button" onClick={()=>window.dispatchEvent(new Event("patro:open-search"))}><Search size={19} aria-hidden="true"/>{l(language,"आज के गर्न चाहनुहुन्छ?","What would you like to do today?")}</button></header>
    {!online?<p className="home-status" role="status">{l(language,"तपाईं अफलाइन हुनुहुन्छ। सुरक्षित विवरण हेर्न सकिन्छ; नयाँ विवरणका लागि इन्टरनेट जोड्नुहोस्।","You’re offline. Saved details remain available; reconnect for updates.")}</p>:null}
    <TodayHero language={language} date={today} bsLabel={todayBs ? `${number(todayBs.day, language)} ${bsMonth(todayBs.month, language)} ${number(todayBs.year, language)}` : l(language, "आजको नेपाली पात्रो", "Today's Nepali calendar")} adLabel={adLabel(today, language)} ns={language==="en"?todayView.nsEn||todayView.ns:todayView.ns} panchang={todayView.panchang || {}} events={(eventMap.get(today) || []).map(event=>({name:festivalName(event,language)}))}/>
    {todayError?<p className="home-status" role="status">{l(language,"आजको विस्तृत विवरण आएन। फेरि प्रयास गर्नुहोस्।","Today’s full details could not load. Please retry.")}<button type="button" onClick={()=>setRetry(n=>n+1)}>{l(language,"फेरि प्रयास","Retry")}</button></p>:null}
    <nav className="home-task-strip" aria-label={l(language,"दैनिक काम","Everyday tasks")}>
      {[["/convert","मिति बदल्नुहोस्","Convert a date",CalendarDays],["/tools/nepali-typing","नेपाली लेख्नुहोस्","Type in Nepali",Languages],["/tools/emi","किस्ता हिसाब गर्नुहोस्","Calculate loan EMI",Calculator],["/tool/nepalidictionary","शब्दको अर्थ खोज्नुहोस्","Look up a word",BookOpen]].map(([href,ne,en,Icon]:any)=><a key={href} href={href}><Icon size={21} strokeWidth={1.8} aria-hidden="true"/><span>{l(language,ne,en)}</span></a>)}
    </nav>

    <div className="rh-layout">
      <div className="rh-main-stack">
        <section id="home-calendar" className="rh-card rh-calendar" aria-labelledby="home-month-title">
          <header className="rh-card-head"><div><span className="rh-kicker">{l(language, "नेपाली पात्रो", "Nepali calendar")}</span><h2 id="home-month-title" aria-live="polite">{cursor ? `${bsMonth(cursor.month, language)} ${number(cursor.year, language)}` : l(language, "यो महिना", "This month")}</h2><p>{l(language, "तिथि, चाडपर्व र सार्वजनिक बिदा", "Tithi, festivals and public holidays")}</p></div><div className="rh-month-actions">{cursor?<div className="home-month-picker"><label>{l(language,"वर्ष","Year")}<select aria-label={l(language,"विक्रम संवत् वर्ष","Bikram Sambat year")} value={cursor.year} onChange={event=>jump(Number(event.target.value),cursor.month)}>{Array.from({length:211},(_,i)=>1883+i).map(year=><option key={year} value={year}>{number(year,language)}</option>)}</select></label><label>{l(language,"महिना","Month")}<select aria-label={l(language,"विक्रम संवत् महिना","Bikram Sambat month")} value={cursor.month} onChange={event=>jump(cursor.year,Number(event.target.value))}>{BS_MONTHS.map((_,index)=><option key={index} value={index+1}>{bsMonth(index+1,language)}</option>)}</select></label></div>:null}<button type="button" disabled={cursor?.year===1883 && cursor?.month===1} onClick={() => shift(-1)} aria-label={l(language, "अघिल्लो महिना", "Previous month")}>‹</button><button type="button" onClick={()=>{if(!localToday)return;setSelected(today);setCursor({year:localToday.year,month:localToday.month});history.pushState(null,"","/");window.dispatchEvent(new Event("patro:navigation"));}}>{l(language, "आज", "Today")}</button><button type="button" disabled={cursor?.year===2093 && cursor?.month===12} onClick={() => shift(1)} aria-label={l(language, "अर्को महिना", "Next month")}>›</button></div></header>
          <fieldset className="home-calendar-layers"><legend>{l(language,"पात्रोमा देखाउनुहोस्","Show on calendar")}</legend>{([['ad','ई.सं.','AD'],['tithi','तिथि','Tithi'],['ns','नेपाल संवत्','Nepal Sambat'],['holidays','बिदा','Holidays'],['festivals','चाडपर्व','Festivals']] as const).map(([key,ne,en])=><label key={key}><input type="checkbox" checked={layers[key]} onChange={event=>setLayers({...layers,[key]:event.target.checked})}/>{l(language,ne,en)}</label>)}</fieldset>
          <p className="home-calendar-status" role="status">{monthState==="loading"?l(language,"तिथि र चाडपर्व खोल्दैछ…","Loading tithi and events…"):monthState==="error"?l(language,"मिति उपलब्ध छ। तिथि वा चाडपर्वका केही विवरण आएनन्।","Dates are available. Some tithi or event details could not load."):""}{monthState==="error"?<button type="button" onClick={()=>setRetry(n=>n+1)}>{l(language,"फेरि प्रयास","Retry")}</button>:null}</p>
          <div className="rh-grid home-calendar-grid" ref={grid} role="grid" aria-labelledby="home-month-title" aria-describedby="calendar-keys" aria-colcount={7}>
            <div className="rh-weekheads" role="row">{(language === "en" ? EN_DAYS : NE_DAYS).map((name,index)=><span role="columnheader" key={name} className={index===6?"is-red":""}>{name}</span>)}</div>
            {Array.from({length:weekCount},(_,week)=><div className="home-calendar-week" role="row" key={week}>{Array.from({length:7},(_,column)=>{
              const index=week*7+column-firstOffset;
              const day=days[index];
              if(!day)return <div role="gridcell" className="rh-cell is-empty" key={column}/>;
              const dayEvents=eventMap.get(day.ad)||[];
              const holiday=column===6||dayEvents.some(isHoliday);
              const shownEvents=dayEvents.filter(event=>isHoliday(event)?layers.holidays:layers.festivals);
              const label=shownEvents.map(item=>festivalName(item,language)).join(" / ");
              const tithi=panchangTithi(day,language);
              const fullNs=nsText(day.nepal_sambat,language);
              const ns=nsShort(day.nepal_sambat,language)||compactNepalSambat(day.nepal_sambat,language);
              const adDate=new Date(`${day.ad}T00:00:00Z`);
              const ad=language==="ne"?number(adDate.getUTCDate(),language):`${adDate.getUTCDate()} ${AD_MONTHS_SHORT[adDate.getUTCMonth()]}`;
              const spoken=[`${number(day.bs.day,language)} ${bsMonth(day.bs.month,language)} ${number(day.bs.year,language)}`,adLabel(day.ad,language),tithi,fullNs,label,holiday?l(language,"बिदा","Holiday"):""].filter(Boolean).join(", ");
              return <div role="gridcell" aria-selected={day.ad===selected} key={day.ad}><button type="button" data-ad={day.ad} tabIndex={day.ad===selected||(!selectedDay&&index===0)?0:-1} aria-current={day.ad===today?"date":undefined} aria-label={spoken} title={fullNs||undefined} onClick={()=>setSelected(day.ad)} onKeyDown={event=>{
                const steps:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};
                if(event.key in steps){event.preventDefault();focusDay(index+steps[event.key]);}
                if(event.key==="Home"||event.key==="End"){event.preventDefault();focusDay(event.ctrlKey?(event.key==="Home"?0:days.length-1):index+(event.key==="Home"?-column:6-column));}
                if(event.key==="PageUp"||event.key==="PageDown"){event.preventDefault();shift(event.key==="PageUp"?-1:1,true);}
              }} className={`rh-cell pc-cell${holiday&&layers.holidays?" is-holiday":""}${day.ad===today?" is-today":""}${day.ad===selected?" is-selected":""}`}>
                <strong className="pc-bs" aria-hidden="true">{number(day.bs.day,language)}</strong>
                {layers.ad?<span className="pc-ad" aria-hidden="true">{ad}</span>:null}
                {layers.tithi?<span className="pc-tithi" aria-hidden="true">{tithi||"—"}</span>:null}
                {layers.ns?<span className="pc-ns" aria-hidden="true">{ns}</span>:null}
                {label?<span className="pc-event" aria-hidden="true">{label}</span>:null}
                {shownEvents.length?<i className="pc-dot" aria-hidden="true"/>:null}
              </button></div>;
            })}</div>)}
          </div>
          <details className="home-calendar-help"><summary>{l(language,"पात्रो पढ्ने तरिका","How to read this calendar")}</summary><p>{l(language,"ठूलो अंक विक्रम संवत् हो। सानो अंक ईस्वी मिति हो। दिन छानेर पूरा नेपाल संवत् र चाडपर्व हेर्नुहोस्।","The large number is the BS day; the smaller number is the AD day. Select a day for its full Nepal Sambat date and events.")}</p><p id="calendar-keys">{l(language,"तीर कुञ्जीले दिन छान्नुहोस्। Home र End ले साताको छेउ, Page Up र Page Down ले महिना बदल्नुहोस्।","Use arrow keys to select days, Home/End for week boundaries, and Page Up/Page Down to change month.")}</p><a href="/nepal-sambat/mandala">{l(language,"नेपाल संवत्को विस्तृत परिचय","Explore Nepal Sambat")}</a></details>
          <details className="home-calendar-help"><summary>{l(language,"चाडपर्व र बिदा आफ्नो पात्रोमा थप्नुहोस्","Add festivals and holidays to your calendar")}</summary><a href="/calendar/festivals.ics" download>{l(language,"पात्रो फाइल डाउनलोड गर्नुहोस् (.ics)","Download calendar file (.ics)")}</a><p>{l(language,"स्वतः अद्यावधिकका लागि आफ्नो पात्रो एपको URL बाट सदस्यता विकल्पमा यो ठेगाना राख्नुहोस्। अफलाइन हुँदा पुराना विवरण रहन्छन्; नयाँ विवरणका लागि इन्टरनेट चाहिन्छ।","For updates, subscribe by URL in your calendar app. Previously imported events remain offline; refreshing requires internet.")}</p><code>https://aafnaipatro.com/calendar/festivals.ics</code></details>
        </section>

        <section className="rh-card rh-selected" aria-live="polite">
          <header className="rh-card-head"><div><span className="rh-kicker">{l(language, "छानिएको दिन", "Selected day")}</span><h2>{selectedDay ? `${number(selectedDay.bs.day, language)} ${bsMonth(selectedDay.bs.month, language)} ${number(selectedDay.bs.year, language)}` : l(language, "दिन छान्नुहोस्", "Choose a day")}</h2><p>{selectedDay ? adLabel(selectedDay.ad, language) : l(language, "पात्रोबाट कुनै दिन छान्नुहोस्।", "Choose a day from the calendar.")}</p></div>{selectedDay ? <a className="rh-link" href={`/date/${selectedDay.ad}`}>{l(language, "पूरा दिन विवरण", "Full day details")}</a> : null}</header>
          {selectedDay ? <div className="rh-selected-grid">{panchangTithi(selectedDay,language) ? <div><span>{l(language, "तिथि", "Tithi")}</span><b>{panchangTithi(selectedDay,language)}</b></div> : null}{nsText(selectedDay.nepal_sambat) ? <div><span>{l(language, "नेपाल संवत्", "Nepal Sambat")}</span><b>{language==="ne"?toNepaliDigits(nsText(selectedDay.nepal_sambat)):nsText(selectedDay.nepal_sambat, language)}</b></div> : null}<div><span>{l(language, "ई.सं.", "AD")}</span><b>{formatDate(selectedDay.ad, language, { weekday: "short" })}</b></div><div><span>{l(language, "चाडपर्व / बिदा", "Festival / holiday")}</span><b>{selectedEvents.length ? selectedEvents.map((item) => festivalName(item, language)).join(" / ") : monthState==="ready"?l(language, "कुनै सूचीबद्ध कार्यक्रम छैन", "No listed event"):l(language,"कार्यक्रम विवरण उपलब्ध छैन","Event details are unavailable")}</b></div></div> : null}
        </section>
      </div>

      <aside className="rh-side" aria-label={l(language, "पात्रो सहायक सामग्री", "Calendar shortcuts")}>
        <section className="rh-card"><header className="rh-card-head"><div><span className="rh-kicker">{l(language, "आगामी", "Upcoming")}</span><h2>{l(language, "नजिकका चाडपर्व", "Upcoming festivals")}</h2></div></header><div className="rh-upcoming">{upcoming.length ? upcoming.map((item, index) => <a href={`/date/${festivalDate(item)}`} key={`${festivalDate(item)}-${index}`}><strong>{festivalName(item, language)}</strong><small>{festivalTiming(festivalDate(item), today, language)}</small></a>) : <p className="rh-muted">{monthState==="loading"?l(language,"चाडपर्व खोल्दैछ…","Loading events…"):monthState==="error"?l(language,"चाडपर्वका विवरण आएनन्। पात्रोको फेरि प्रयास बटन थिच्नुहोस्।","Event details could not load. Use the calendar’s Retry button."):l(language, "यो महिनाका थप चाडपर्व विवरण उपलब्ध छैनन्।", "No additional festival entries are available for this month.")}</p>}</div></section>
        <a className="home-mytime" href="/mytime"><h2>{l(language,"मेरो समय","My Time")}</h2><p>{l(language,"तपाईंको स्थान, जन्मपत्रो र पञ्चाङ्गसँग जोडिएको व्यक्तिगत समय।","Personal time connected to your location, birth chart and Panchang.")}</p></a>
        <DeferredHomeWeather language={language} today={today}/>
        <DeferredHomeSkyFact language={language} />
      </aside>
    </div>

    <HomeToolDirectory language={language}/>
    <HomeReading language={language}/>
    <HomeNotesDisclosure language={language}/>
  </main>;
}
