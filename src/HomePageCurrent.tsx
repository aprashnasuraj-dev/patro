import {festivalTiming} from "./home-festival-label";
import {homeToday,homeMonth,homeEvents} from "./home-calendar-client";
import { DeferredHomeQuickNote } from "./components/DeferredHomeQuickNote";
import { HomePanchang, type HomePanchangData } from "./components/HomePanchang";
import { TodayHero } from "./components/TodayHero";
import { HomeWeather } from "./components/HomeWeather";
import "./home-extras.css";
import "./panchang-jyotish/home-discovery.css";
import { HomeHistoryCard } from "./components/HomeHistoryCard";
import { DeferredHomeSkyFact } from "./components/DeferredHomeSkyFact";
import "./patro-cell.css";
import { formatDate } from "./nepaliDate";
import { useCallback, useEffect, useMemo, useState } from "react";
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
type TodayView = { bs: BsDate | null; ns: string; tithi: string; sunrise: string; sunset: string; panchang?: HomePanchangData };

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
async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { accept: "application/json" }, credentials: "same-origin" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
async function loadMonth(year: number, month: number, fallback: CalendarDay[], signal: AbortSignal) {
  try {
    const body = await homeMonth(year,month,signal);
    const rows = (body?.days || []).map(normalizeDay).filter(Boolean) as CalendarDay[];
    return mergeDays(fallback, rows);
  } catch { return fallback; }
}
async function loadEvents(days: CalendarDay[], signal: AbortSignal) {
  const years = [...new Set(days.map((day) => Number(day.ad.slice(0, 4))).filter(Boolean))];
  const results = await Promise.all(years.map(year=>homeEvents(year,signal).catch(()=>({items:[]}))));
  const seen = new Set<string>();
  return results.flatMap((row) => row.items || []).filter((item) => {
    const key = `${festivalDate(item)}|${item.name_ne || item.name_en || item.title || item.key || ""}|${item.effect || ""}`;
    if (!festivalDate(item) || seen.has(key)) return false;
    seen.add(key); return true;
  });
}
function panchangTithi(day?: CalendarDay) {
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
function nsText(value: any) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.formatted_ne || value.formatted || [value.year, value.month?.dev || value.month?.roman, value.tithi_name_ne || value.day].filter(Boolean).join(" ");
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
  const today = useMemo(todayNepal, []);
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
  }, [calendarYear, calendarMonth]);

  useEffect(() => {
    const controller = new AbortController();
    homeToday(today,controller.signal).then((body) => {
      const p = body?.archive_panchang || body?.panchang || {};
      const t = body?.tithi || p?.tithi || {};
      const rawBs = body?.calendars?.bikram_sambat_detail || body?.bs || localToday;
      setTodayView({
        bs: rawBs ? decorateBs(rawBs) : localToday,
        ns: nsText(body?.calendars?.nepal_sambat_detail || body?.calendars?.nepal_sambat || body?.nepal_sambat),
        tithi: t?.ne || t?.name_ne || t?.tithi_name_ne || "",
        sunrise: p?.sunrise || "",
        sunset: p?.sunset || "",
        panchang: { ...p, tithi: t },
      });
    }).catch(() => {});
    return () => controller.abort();
  }, [today, localToday]);

  useEffect(() => {
    if (!cursor) return;
    const fallback = localMonthDays(cursor.year, cursor.month);
    setDays(fallback); setEvents(readServerToday(today)?.events || []);
    const controller = new AbortController();
    loadMonth(cursor.year, cursor.month, fallback, controller.signal).then(async (rows) => {
      setDays(rows);
      setEvents(await loadEvents(rows, controller.signal));
    }).catch(() => {});
    return () => controller.abort();
  }, [cursor?.year, cursor?.month]);

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

  const shift = useCallback((delta: number) => {
    if (!cursor) return;
    let year = cursor.year, month = cursor.month + delta;
    if (month < 1) { month = 12; year -= 1; }
    if (month > 12) { month = 1; year += 1; }
    if (year < 1883 || year > 2093) return;
    const next = { year, month };
    setCursor(next);
    const monthDays = localMonthDays(year, month);
    setSelected(monthDays[0]?.ad || "");
    // Updating history inside a React state updater fired navigation events
    // during rendering. Dispatch only from the click handler, exactly once.
    history.pushState(null, "", `/calendar/${year}/${String(month).padStart(2, "0")}`);
    window.dispatchEvent(new Event("patro:navigation"));
  }, [cursor]);

  const todayBs = todayView.bs || localToday;
  return <main id="main-content" className="rh-page">
    <TodayHero language={language} date={today} bsLabel={todayBs ? `${number(todayBs.day, language)} ${bsMonth(todayBs.month, language)} ${number(todayBs.year, language)}` : l(language, "आजको नेपाली पात्रो", "Today's Nepali calendar")} adLabel={adLabel(today, language)} ns={todayView.ns} panchang={todayView.panchang || {}} events={(eventMap.get(today) || []).map(event=>({name:festivalName(event,language)}))}/>
    <a className="rh-my-time-entry" href="/mytime"><span className="rh-my-time-orb">◉</span><span><strong>{l(language, "मेरो समय", "My Time")}</strong><small>{l(language, "तपाईंको स्थान, आकाश र पञ्चाङ्गलाई एउटै जीवित ड्यासबोर्डमा अनुभव गर्नुहोस्।", "Explore your local time, sky and Panchang in one connected dashboard.")}</small></span><b aria-hidden="true">↗</b></a>
    <HomeWeather language={language} today={today} />



    <div className="rh-actions" aria-label={l(language, "मुख्य छिटो कार्य", "Quick actions")}>
      <a href="/rashifal"><b>१२</b><span>{l(language, "राशिफल", "Rashifal")}</span></a>
      <a href="/convert"><b>↔</b><span>{l(language, "मिति रूपान्तरण", "Date converter")}</span></a>
      <a href="/me/reminders"><b>◷</b><span>{l(language, "तिथि रिमाइन्डर", "Tithi reminders")}</span></a>
      <a href="/me"><b>●</b><span>{l(language, "आफ्नै ठाउँ", "My space")}</span></a>
    </div>

    <div className="rh-layout">
      <div className="rh-main-stack">
        <section className="rh-card rh-calendar">
          <header className="rh-card-head"><div><span className="rh-kicker">{l(language, "नेपाली पात्रो", "Nepali calendar")}</span><h2>{cursor ? `${bsMonth(cursor.month, language)} ${number(cursor.year, language)}` : l(language, "यो महिना", "This month")}</h2><p>{l(language, "तिथि, चाडपर्व र सार्वजनिक बिदा", "Tithi, festivals and public holidays")}</p></div><div className="rh-month-actions"><button type="button" onClick={() => shift(-1)} aria-label={l(language, "अघिल्लो महिना", "Previous month")}>‹</button><a href="/">{l(language, "आज", "Today")}</a><button type="button" onClick={() => shift(1)} aria-label={l(language, "अर्को महिना", "Next month")}>›</button></div></header>
          <div className="rh-weekheads">{(language === "en" ? EN_DAYS : NE_DAYS).map((name, index) => <span className={index === 6 ? "is-red" : ""} key={name}>{name}</span>)}</div>
          <div className="rh-grid">
            {Array.from({ length: firstOffset }).map((_, index) => <span className="rh-cell is-empty" key={`empty-${index}`} />)}
            {days.map((day) => {
              const weekday = new Date(`${day.ad}T00:00:00Z`).getUTCDay();
              const dayEvents = eventMap.get(day.ad) || [];
              const holidayEvent = dayEvents.find(isHoliday);
              const holiday = weekday === 6 || !!holidayEvent;
              const tithi = panchangTithi(day);
              const label = dayEvents.slice(0, 2).map((item) => festivalName(item, language)).join(" / ");
              const adDate = new Date(`${day.ad}T00:00:00Z`);
              const ad = `${adDate.getUTCDate()} ${AD_MONTHS_SHORT[adDate.getUTCMonth()]}`;
              const ns = compactNepalSambat(day.nepal_sambat, language) || nsShort(day.nepal_sambat, language);
              const spoken = [`${number(day.bs.day, language)} ${bsMonth(day.bs.month, language)}`, ad, tithi, ns, label].filter(Boolean).join(", ");
              return <button type="button" key={day.ad} onClick={() => setSelected(day.ad)} aria-label={spoken} title={nsText(day.nepal_sambat) || undefined} aria-pressed={day.ad === selected} className={`rh-cell pc-cell${holiday ? " is-holiday" : ""}${day.ad === today ? " is-today" : ""}${day.ad === selected ? " is-selected" : ""}`}>
                <span className="pc-top" aria-hidden="true"><span className={`pc-event${holidayEvent ? " is-holiday" : ""}`}>{label}</span><span className="pc-ad">{ad}</span></span>
                <strong className="pc-bs" aria-hidden="true">{number(day.bs.day, language)}</strong>
                <span className="pc-tithi" aria-hidden="true">{tithi || "—"}</span>
                <span className="pc-ns" aria-hidden="true">{ns}</span>
                {dayEvents.length ? <i className={`pc-dot${holidayEvent ? " is-holiday" : ""}`} aria-hidden="true" /> : null}
              </button>;
            })}
          </div>
        </section>

        <section className="rh-card rh-selected" aria-live="polite">
          <header className="rh-card-head"><div><span className="rh-kicker">{l(language, "छानिएको दिन", "Selected day")}</span><h2>{selectedDay ? `${number(selectedDay.bs.day, language)} ${bsMonth(selectedDay.bs.month, language)} ${number(selectedDay.bs.year, language)}` : l(language, "दिन छान्नुहोस्", "Choose a day")}</h2><p>{selectedDay ? adLabel(selectedDay.ad, language) : l(language, "पात्रोबाट कुनै दिन छान्नुहोस्।", "Choose a day from the calendar.")}</p></div>{selectedDay ? <a className="rh-link" href={`/date/${selectedDay.ad}`}>{l(language, "पूरा दिन विवरण →", "Full day details →")}</a> : null}</header>
          {selectedDay ? <div className="rh-selected-grid">{panchangTithi(selectedDay) ? <div><span>{l(language, "तिथि", "Tithi")}</span><b>{panchangTithi(selectedDay)}</b></div> : null}{nsText(selectedDay.nepal_sambat) ? <div><span>{l(language, "नेपाल संवत्", "Nepal Sambat")}</span><b>{compactNepalSambat(selectedDay.nepal_sambat, language)}</b></div> : null}<div><span>{l(language, "ई.सं.", "AD")}</span><b>{formatDate(selectedDay.ad, language, { weekday: "short" })}</b></div><div><span>{l(language, "चाडपर्व / बिदा", "Festival / holiday")}</span><b>{selectedEvents.length ? selectedEvents.map((item) => festivalName(item, language)).join(" · ") : l(language, "कुनै सूचीबद्ध कार्यक्रम छैन", "No listed event")}</b></div></div> : null}
        </section>
          <DeferredHomeQuickNote language={language} />
      </div>

      <aside className="rh-side" aria-label={l(language, "पात्रो सहायक सामग्री", "Calendar shortcuts")}>
        <section className="rh-card"><header className="rh-card-head"><div><span className="rh-kicker">{l(language, "आगामी", "Upcoming")}</span><h2>{l(language, "नजिकका चाडपर्व", "Upcoming festivals")}</h2></div></header><div className="rh-upcoming">{upcoming.length ? upcoming.map((item, index) => <a href={`/date/${festivalDate(item)}`} key={`${festivalDate(item)}-${index}`}><strong>{festivalName(item, language)}</strong><small>{festivalTiming(festivalDate(item), today, language)}</small></a>) : <p className="rh-muted">{l(language, "यो महिनाका थप चाडपर्व विवरण उपलब्ध छैनन्।", "No additional festival entries are available for this month.")}</p>}</div></section>
        <section className="rh-card"><header className="rh-card-head"><div><span className="rh-kicker">{l(language, "छिटो पहुँच", "Quick access")}</span><h2>{l(language, "दैनिक प्रयोग", "Daily tools")}</h2></div></header><div className="rh-quick-grid"><a href="/tools/nepali-typing"><b>ने</b><span>{l(language, "नेपाली टाइपिङ", "Nepali typing")}</span></a><a href="/time-machine"><b>⌛</b><span>{l(language, "समययन्त्र", "Time Machine")}</span></a><a href="/samudaya"><b>समु</b><span>{l(language, "समुदाय पात्रो", "Community calendars")}</span></a><a href="/tools/astro"><b>☾</b><span>{l(language, "खगोलीय पात्रो", "Astronomical calendar")}</span></a></div></section>
        <section className="rh-card" aria-label="Aafnai Patro useful tools">
          <header className="rh-card-head"><div><span className="rh-kicker">{l(language, "थप खोज्नुहोस्", "Explore more")}</span><h2>{l(language, "क्यालेन्डर र उपयोगी टुल", "Calendars and tools")}</h2></div></header>
          <p className="rh-muted">{l(language, "नेपाली टाइपिङ, अंग्रेजी–नेपाली मिति रूपान्तरण, चन्द्र पात्रो र प्रत्यक्ष रेडियो एउटै ठाउँमा हेर्नुहोस्।", "Find Nepali typing, BS–AD dates, lunar calendars and online radio in one place.")}</p>
          <nav className="rh-quick-grid" aria-label="Explore tools">
            <a href="/moon"><b>☾</b><span>{l(language, "चन्द्र पात्रो", "Moon calendar")}</span></a>
            <a href="/convert"><b>मि</b><span>{l(language, "मिति रूपान्तरण", "Date converter")}</span></a>
            <a href="/fm"><b>FM</b><span>{l(language, "नेपाली रेडियो", "Nepali radio")}</span></a>
            <a href="/on-this-day"><b>आज</b><span>{l(language, "इतिहासमा आज", "Today in history")}</span></a>
          </nav>
        </section>
        <HomeHistoryCard language={language} todayAd={today} />
        <DeferredHomeSkyFact language={language} />
      </aside>
    </div>

    <section className="rh-card rh-pj-discovery" aria-labelledby="rh-pj-discovery-title">
      <header className="rh-pj-discovery-head">
        <div><span className="rh-kicker">{l(language,"आजको पञ्चाङ्ग र उपयोगी गणक","Today's Panchang & useful tools")}</span><h2 id="rh-pj-discovery-title">{l(language,"पात्रोबाट आफ्नो आवश्यक गणकमा जानुहोस्","Go from the calendar to the tool you need")}</h2><p>{l(language,"तिथि, नक्षत्र, शुभ समय, जन्मपत्रो र ग्रहस्थिति एउटै ठाउँबाट खोल्नुहोस्।","Open Tithi, Nakshatra, auspicious timing, birth-chart and planetary tools from one place.")}</p></div>
        <a href={`/panchang?date=${today}`} className="rh-pj-primary-link">{l(language,"आजको पञ्चाङ्ग","Today's Panchang")} ↗</a>
      </header>
      <div className="rh-pj-hub-grid">
        {[
          ["/panchang","☾","दैनिक पञ्चाङ्ग","Daily Panchang","तिथि, नक्षत्र र दिनका समयखण्ड।","Tithi, Nakshatra and daily windows."],
          ["/muhurat","✦","शुभ साइत","Auspicious timing","स्थानीय समयखण्ड र साइत नियम।","Local time windows and Sait rules."],
          ["/jyotish","✧","ज्योतिष गणक","Jyotish calculators","जन्मपत्रो, राशि र नक्षत्र।","Birth chart, Rashi and Nakshatra."],
          ["/planets","◎","ग्रह र खगोल","Planets & astronomy","ग्रहस्थिति र आकाशीय घटना।","Planet positions and sky events."],
          ["/nepal-calendar","▦","नेपाली संवत्","Nepal calendars","वि.सं., नेपाल संवत् र समुदाय पात्रो।","BS, Nepal Sambat and community calendars."]
        ].map(([href,icon,ne,en,descNe,descEn])=><a className="rh-pj-hub-card" href={href==="/panchang"?`/panchang?date=${today}`:href} key={href}>
          <span className="rh-pj-hub-icon" aria-hidden="true">{icon}</span><span className="rh-pj-hub-copy"><strong>{l(language,ne,en)}</strong><small>{l(language,descNe,descEn)}</small></span><span className="rh-pj-hub-arrow" aria-hidden="true">↗</span>
        </a>)}
      </div>
      <div className="rh-pj-discovery-foot"><span>{l(language,"उपलब्ध गणक पाँच समूहमा व्यवस्थित छन्।","Available tools are organized into five groups.")}</span><a href="/tools">{l(language,"सबै उपकरण हेर्नुहोस्","Browse all tools")} →</a></div>
    </section>
  </main>;
}
