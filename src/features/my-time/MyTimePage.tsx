import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CircleAlert, Globe2, Moon, RefreshCw, Sun, TimerReset } from "lucide-react";
import { setPageTitle } from "../../title";
import { homeToday } from "../../home-calendar-client";
import { NAKSHATRAS, RASHIS } from "../../patro-tools/core/names";
import { deviceZone, readPlace } from "../../place/place";
import { useUiLanguage, l } from "../../useUiLanguage";
import MyTimeTemporalLayers from "./MyTimeTemporalLayers";
import "./my-time.css";

type Snapshot = {
  schema_version: number;
  date: string;
  timezone: string;
  weekday: number;
  evaluated_at_utc: string;
  location: { lat: number; lng: number };
  panchang: { tithi_index: number; tithi_name: string; tithi_name_ne: string; paksha: string; phase_angle_deg: number; tithi_progress_percent: number; nakshatra_index: number; nakshatra_name_ne: string; nakshatra_pada: number; moon_rashi_index: number; sun_rashi_index: number; yoga_index: number; yoga_name_ne: string; karana_index: number; karana_name_ne: string; moon_rashi_ne: string; sun_rashi_ne: string; sunrise_utc: string | null; sunset_utc: string | null; next_sunrise_utc: string | null; moonrise_utc: string | null; tithi_end_utc: string | null };
  sky: { sun_longitude_tropical_deg: number; moon_longitude_tropical_deg: number; sun_longitude_sidereal_deg: number; moon_longitude_sidereal_deg: number; solar_altitude_deg_at_evaluation: number; moon_illumination_percent: number };
  methodology: { engine: string; time_anchor: string; sidereal_positions: boolean; limitations: string[] };
};
type Preferences = { timezone: string; lat: number; lng: number };
type CalendarReference = { date: string; bs: string; ns: string; tithi: string; sunrise: string; sunset: string; source: string };
type PersonalContext = { birthChart: { rashi: string; lagna: string; nakshatra: string; pada: number | null } | null; rashifalSign: string | null; effectiveSign: string | null };
const SIGNS = [{id:"aries",ne:"मेष",en:"Aries"},{id:"taurus",ne:"वृष",en:"Taurus"},{id:"gemini",ne:"मिथुन",en:"Gemini"},{id:"cancer",ne:"कर्कट",en:"Cancer"},{id:"leo",ne:"सिंह",en:"Leo"},{id:"virgo",ne:"कन्या",en:"Virgo"},{id:"libra",ne:"तुला",en:"Libra"},{id:"scorpio",ne:"वृश्चिक",en:"Scorpio"},{id:"sagittarius",ne:"धनु",en:"Sagittarius"},{id:"capricorn",ne:"मकर",en:"Capricorn"},{id:"aquarius",ne:"कुम्भ",en:"Aquarius"},{id:"pisces",ne:"मीन",en:"Pisces"}];
const TARA_NE = ["जन्म","सम्पत्","विपत्","क्षेम","प्रत्यरि","साधक","नैधन","मित्र","परम मित्र"];
const TARA_EN = ["Janma","Sampat","Vipat","Kshema","Pratyari","Sadhaka","Naidhana","Mitra","Parama Mitra"];
const TARA_SCORES = [50,87.5,12.5,75,25,100,0,87.5,100];
function readPersonalContext(): PersonalContext {
  try {
    const raw = JSON.parse(localStorage.getItem("aafnai.jyotish.china.context.v1") || "null");
    const birthChart = raw && typeof raw === "object" ? {
      rashi: String(raw.rashi?.name || ""), lagna: String(raw.lagna?.name || ""),
      nakshatra: String(raw.nakshatra?.name || ""), pada: Number.isInteger(raw.nakshatra?.pada) ? raw.nakshatra.pada : null
    } : null;
    const stored = localStorage.getItem("patro.rashifal.sign.v2");
    const rashifalSign = stored && SIGNS.some(sign => sign.id === stored) ? stored : null;
    const birthSign = SIGNS.find(sign => sign.ne === birthChart?.rashi)?.id || null;
    return { birthChart: birthChart && (birthChart.rashi || birthChart.nakshatra) ? birthChart : null, rashifalSign, effectiveSign: rashifalSign || birthSign };
  } catch { return { birthChart: null, rashifalSign: null, effectiveSign: null }; }
}
const PREF_KEY = "aafnaipatro.mytime.preferences.v1";
const TITHI_EN = ["Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Purnima","Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Amavasya"];
const TITHI_NE = ["प्रतिपदा","द्वितीया","तृतीया","चतुर्थी","पञ्चमी","षष्ठी","सप्तमी","अष्टमी","नवमी","दशमी","एकादशी","द्वादशी","त्रयोदशी","चतुर्दशी","पूर्णिमा","प्रतिपदा","द्वितीया","तृतीया","चतुर्थी","पञ्चमी","षष्ठी","सप्तमी","अष्टमी","नवमी","दशमी","एकादशी","द्वादशी","त्रयोदशी","चतुर्दशी","औंसी"];
function readPreferences(): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem(PREF_KEY) || "null");
    if (saved && typeof saved.timezone === "string" && Number.isFinite(saved.lat) && Number.isFinite(saved.lng)) return saved;
  } catch {}
  const place = readPlace();
  return place
    ? { timezone: place.tz, lat: place.lat, lng: place.lon }
    : { timezone: deviceZone() || "Asia/Kathmandu", lat: 27.7172, lng: 85.324 };
}
function localDate(timezone: string, now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch { return now.toISOString().slice(0, 10); }
}
function localClock(timezone: string, now: Date) {
  try { return new Intl.DateTimeFormat(undefined, { timeZone: timezone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(now); }
  catch { return now.toLocaleTimeString(); }
}
function localDateLabel(date: string, timezone: string, language: "ne" | "en") {
  try { return new Intl.DateTimeFormat(language === "ne" ? "ne-NP" : "en", { timeZone: "UTC", weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(new Date(date + "T12:00:00Z")); }
  catch { return date; }
}
function fmt(value: number, digits = 2) { return Number.isFinite(value) ? value.toFixed(digits) : "—"; }
function formatInstant(value: string | null, timezone: string, language: "ne" | "en") { if (!value) return "—"; try { return new Intl.DateTimeFormat(language === "ne" ? "ne-NP" : "en", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value)); } catch { return "—"; } }

function PolarClock({ timezone, now, language }: { timezone: string; now: Date; language: "ne" | "en" }) {
  const hours = Number(new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", hourCycle: "h23" }).format(now));
  const minutes = Number(new Intl.DateTimeFormat("en-GB", { timeZone: timezone, minute: "2-digit" }).format(now));
  const seconds = Number(new Intl.DateTimeFormat("en-GB", { timeZone: timezone, second: "2-digit" }).format(now));
  const angle = ((hours + minutes / 60 + seconds / 3600) / 24) * Math.PI * 2 - Math.PI / 2;
  const x = 150 + Math.cos(angle) * 92, y = 150 + Math.sin(angle) * 92;
  return <div className="mt-polar-wrap">
    <svg className="mt-polar" viewBox="0 0 300 300" role="img" aria-label={l(language, "तपाईंको स्थानीय दिनको २४ घण्टे घडी", "24-hour clock for your selected timezone")}>
      <defs><linearGradient id="mt-ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#e8bd70"/><stop offset="100%" stopColor="#4d9d8b"/></linearGradient></defs>
      <circle cx="150" cy="150" r="118" fill="none" stroke="var(--mt-line)" strokeWidth="1"/>
      <circle cx="150" cy="150" r="100" fill="none" stroke="var(--mt-line)" strokeWidth="10" opacity=".55"/>
      <circle cx="150" cy="150" r="100" fill="none" stroke="url(#mt-ring)" strokeWidth="10" strokeDasharray="157 471" transform="rotate(-90 150 150)" strokeLinecap="round"/>
      <circle cx="150" cy="150" r="78" fill="none" stroke="var(--mt-line)" strokeDasharray="2 6"/>
      {Array.from({ length: 24 }, (_, hour) => {
        const a = (hour / 24) * Math.PI * 2 - Math.PI / 2;
        const major = hour % 6 === 0;
        return <g key={hour}><line x1={150 + Math.cos(a) * (major ? 104 : 109)} y1={150 + Math.sin(a) * (major ? 104 : 109)} x2={150 + Math.cos(a) * 116} y2={150 + Math.sin(a) * 116} stroke="var(--mt-muted)" strokeWidth={major ? 2 : 1}/>{major && <text x={150 + Math.cos(a) * 88} y={154 + Math.sin(a) * 88} textAnchor="middle" fontSize="10" fill="var(--mt-muted)">{String(hour).padStart(2,"0")}</text>}</g>;
      })}
      <line x1="150" y1="150" x2={x} y2={y} stroke="var(--mt-accent)" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx={x} cy={y} r="6" fill="var(--mt-accent)" stroke="var(--mt-card)" strokeWidth="3"/>
      <circle cx="150" cy="150" r="43" fill="var(--mt-card)" stroke="var(--mt-line)"/>
      <text x="150" y="145" textAnchor="middle" fontSize="23" fontWeight="700" fill="var(--mt-ink)">{localClock(timezone, now).slice(0,5)}</text>
      <text x="150" y="164" textAnchor="middle" fontSize="10" fill="var(--mt-muted)">LOCAL TIME</text>
    </svg>
    <div className="mt-polar-legend"><span><i className="mt-legend-time"/> {l(language,"स्थानीय समय","Local time")}</span><span><i className="mt-legend-day"/> {l(language,"२४ घण्टे चक्र","24-hour cycle")}</span></div>
  </div>;
}

const UPCOMING = [
  ["☼","सूर्योदय र सूर्यास्त","Sunrise & sunset","स्थानअनुसार सौर घटना गणना","Location-specific solar events","solar"],
  ["◌","नक्षत्र, पाद र योग","Nakshatra, Pada & Yoga","साइडेरियल चन्द्र र सूर्य गणना","Sidereal lunar and solar combinations","ready"],
  ["◷","चौघडिया, राहुकाल र होरा","Choghadiya, Rahu Kaal & Hora","स्थानीय सूर्योदय/सूर्यास्तमा आधारित समय","Local sunrise/sunset-based timing","solar"],
  ["✦","शुभ मुहूर्त","Smart Muhurta","व्याख्या गर्न मिल्ने व्यक्तिगत समय सिफारिस","Explainable personal timing windows","pending"],
  ["☾","ताराबल र चन्द्रबल","Tarabalam & Chandrabalam","घोषित जन्मपत्रो सन्दर्भ प्रयोग गर्छ","Uses declared birth-chart context","personal"],
  ["◎","ग्रहण र आकाशीय घटना","Eclipses & sky events","ग्रहण सम्पर्क समय र दृश्यता","Event contacts and visibility context","sky"]
] as const;

export default function MyTimePage() {
  const language = useUiLanguage();
  const [preferences, setPreferences] = useState<Preferences>(readPreferences);
  const [date, setDate] = useState(() => localDate(readPreferences().timezone));
  const [now, setNow] = useState(() => new Date());
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [calendarReference, setCalendarReference] = useState<CalendarReference | null>(null);
  const [personalContext, setPersonalContext] = useState<PersonalContext>(readPersonalContext);
  const [rashifalSummary, setRashifalSummary] = useState("");
  const [rashifalLoading, setRashifalLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ne = language === "ne";

  useEffect(() => { setPageTitle(ne ? "मेरो समय · आफ्नै पात्रो" : "My Time · Aafnai Patro"); }, [ne]);
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(id); }, []);
  useEffect(() => { const sync = () => setPersonalContext(readPersonalContext()); window.addEventListener("storage", sync); window.addEventListener("patro:china-updated", sync as EventListener); return () => { window.removeEventListener("storage", sync); window.removeEventListener("patro:china-updated", sync as EventListener); }; }, []);
  useEffect(() => {
    const sign = personalContext.effectiveSign;
    if (!sign) { setRashifalSummary(""); setRashifalLoading(false); return; }
    const controller = new AbortController(); setRashifalLoading(true);
    const query = new URLSearchParams({ period: "daily", system: "vedic", calendar: "gregorian", date, sign });
    fetch(`/api/v1/rashifal/universal?${query}`, { signal: controller.signal, credentials: "same-origin", headers: { accept: "application/json" } })
      .then(response => response.ok ? response.json() : Promise.reject(new Error("rashifal_unavailable")))
      .then((body: any) => { const reading = body?.reading || body?.readings?.find((row: any) => row?.id === sign || row?.sign?.id === sign) || body?.readings?.[0]; const summary = reading?.narrative?.[language]?.summary || (language === "ne" ? reading?.summary_ne : reading?.summary_en) || reading?.summary_ne || reading?.summary_en || ""; setRashifalSummary(String(summary)); })
      .catch(() => { if (!controller.signal.aborted) setRashifalSummary(""); })
      .finally(() => { if (!controller.signal.aborted) setRashifalLoading(false); });
    return () => controller.abort();
  }, [personalContext.effectiveSign, date, language]);

  const loadSnapshot = useCallback(async (nextDate = date, nextPreferences = preferences, persistPreferences = false) => {
    setLoading(true); setError("");
    const controller = new AbortController();
    const referencePromise = homeToday(nextDate, controller.signal).then((body: any) => {
      const p = body?.archive_panchang || body?.panchang || {};
      const t = body?.tithi || p?.tithi || {};
      const bs = body?.calendars?.bikram_sambat_detail || body?.bs || {};
      const ns = body?.calendars?.nepal_sambat_detail || body?.calendars?.nepal_sambat || body?.nepal_sambat || "";
      const bsLabel = bs?.formatted || [bs?.day, bs?.month_ne, bs?.year].filter(Boolean).join(" ");
      const nsLabel = typeof ns === "string" ? ns : ns?.formatted_ne || ns?.formatted || [ns?.year, ns?.month?.dev || ns?.month?.roman].filter(Boolean).join(" ");
      return { date: nextDate, bs: bsLabel || "—", ns: nsLabel || "—", tithi: t?.ne || t?.name_ne || t?.tithi_name_ne || "—", sunrise: p?.sunrise || "—", sunset: p?.sunset || "—", source: body?.source || "AafnaiPatro calendar archive / D1 fallback" } as CalendarReference;
    }).catch(() => null);
    try {
      const query = new URLSearchParams({
        date: nextDate, timezone: nextPreferences.timezone,
        lat: String(nextPreferences.lat), lng: String(nextPreferences.lng)
      });
      const response = await fetch(`/api/v1/mytime/today?${query}`, { signal: controller.signal, headers: { accept: "application/json" }, credentials: "same-origin" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.ok || !body?.data) throw new Error(body?.error || `HTTP ${response.status}`);
      setSnapshot(body.data as Snapshot);
      if (persistPreferences) try { localStorage.setItem(PREF_KEY, JSON.stringify(nextPreferences)); } catch {}
    } catch (cause) {
      setSnapshot(null);
      const message = cause instanceof Error ? cause.message : "request_failed";
      setError(message === "feature_disabled"
        ? l(language, "My Time को गणना सेवा अझै सक्रिय गरिएको छैन।", "The My Time calculation service is not enabled yet.")
        : l(language, "गणना लोड हुन सकेन। नेटवर्क र सेटिङ जाँच गरी फेरि प्रयास गर्नुहोस्।", "Could not load calculations. Check the network and settings, then try again."));
    } finally {
      const reference = await referencePromise;
      if (reference) setCalendarReference(reference);
      setLoading(false);
    }
  }, [date, preferences, language]);

  useEffect(() => { void loadSnapshot(date, preferences); }, []); // Initial load only; edits apply on submit.
  const dateLabel = useMemo(() => localDateLabel(date, preferences.timezone, language), [date, preferences.timezone, language]);
  const localTime = localClock(preferences.timezone, now);
  const tithiName = snapshot ? (ne ? TITHI_NE[snapshot.panchang.tithi_index - 1] : TITHI_EN[snapshot.panchang.tithi_index - 1]) : "—";
  const natalStarIndex = personalContext.birthChart ? NAKSHATRAS.indexOf(personalContext.birthChart.nakshatra as typeof NAKSHATRAS[number]) : -1;
  const natalMoonSignIndex = personalContext.birthChart ? RASHIS.indexOf(personalContext.birthChart.rashi as typeof RASHIS[number]) : -1;
  const transitStarIndex = snapshot ? snapshot.panchang.nakshatra_index - 1 : -1;
  const taraCount = natalStarIndex >= 0 && transitStarIndex >= 0 ? ((transitStarIndex - natalStarIndex + 27) % 27) + 1 : null;
  const taraIndex = taraCount ? (taraCount - 1) % 9 : -1;
  const chandraHouse = snapshot && natalMoonSignIndex >= 0 ? ((snapshot.panchang.moon_rashi_index - natalMoonSignIndex + 12) % 12) + 1 : null;
  const chandraScore = chandraHouse === null ? null : [1,3,6,7,10,11].includes(chandraHouse) ? 100 : [4,8,12].includes(chandraHouse) ? 0 : 50;
  const declaredSign = SIGNS.find(sign => sign.id === personalContext.effectiveSign);

  return <main className="mt-page">
    <header className="mt-heading">
      <div className="mt-eyebrow"><span className="mt-pulse"/> {l(language,"समयलाई आफ्नै दृष्टिले अनुभव गर्नुहोस्","Experience time through your own lens")}</div>
      <div className="mt-heading-row"><div><h1>{l(language,"मेरो समय","My Time")}</h1><p>{l(language,"पात्रो, आकाश, स्थानीय समय र व्यक्तिगत सन्दर्भलाई एउटै जीवित ड्यासबोर्डमा।","A living dashboard for calendars, sky, local time and personal context.")}</p></div><div className="mt-now"><span>{l(language,"तपाईंको स्थानीय समय","Your local time")}</span><strong>{localTime}</strong><small>{dateLabel}</small></div></div>
    </header>

    <section className="mt-control-bar" aria-label={l(language,"समय र स्थान सेटिङ","Time and location settings")}>
      <label><span>{l(language,"मिति","Date")}</span><input type="date" value={date} onChange={event=>setDate(event.target.value)} /></label>
      <label><span>{l(language,"समय क्षेत्र (IANA)","Timezone (IANA)")}</span><input value={preferences.timezone} onChange={event=>setPreferences(old=>({...old,timezone:event.target.value}))} placeholder="Asia/Kathmandu" autoComplete="off"/></label>
      <label><span>{l(language,"अक्षांश","Latitude")}</span><input type="number" min="-90" max="90" step="0.0001" value={preferences.lat} onChange={event=>setPreferences(old=>({...old,lat:Number(event.target.value)}))}/></label>
      <label><span>{l(language,"देशान्तर","Longitude")}</span><input type="number" min="-180" max="180" step="0.0001" value={preferences.lng} onChange={event=>setPreferences(old=>({...old,lng:Number(event.target.value)}))}/></label>
      <button type="button" className="mt-primary" disabled={loading || !date || !preferences.timezone.trim()} onClick={()=>void loadSnapshot(date,preferences,true)}><RefreshCw size={16} className={loading?"mt-spinning":""}/>{l(language,"गणना अपडेट","Update calculations")}</button>
    </section>

    {error && <div className="mt-notice" role="status"><CircleAlert size={19}/><div><strong>{l(language,"गणना सेवा","Calculation service")}</strong><p>{error}</p>{error.includes("not enabled") || error.includes("सक्रिय") ? <small>{l(language,"यो पृष्ठ र API feature flag सक्रिय भएपछि परिणाम देखिनेछ।","Results appear when the page and API rollout are enabled.")}</small> : null}</div></div>}

    <div className="mt-dashboard-grid">
      <section className="mt-panel mt-polar-panel">
        <div className="mt-panel-head"><div><span className="mt-section-kicker">{l(language,"बहुआयामिक समय","MULTIDIMENSIONAL TIME")}</span><h2>{l(language,"२४ घण्टे समय चक्र","24-hour temporal dial")}</h2></div><span className="mt-live"><i/> LIVE</span></div>
        <PolarClock timezone={preferences.timezone} now={now} language={language}/>
        <div className="mt-polar-foot"><Globe2 size={16}/><span>{preferences.timezone}</span><span className="mt-dot-sep">·</span><span>{fmt(preferences.lat,4)}, {fmt(preferences.lng,4)}</span></div>
      </section>

      <section className="mt-panel mt-panchang-panel">
        <div className="mt-panel-head"><div><span className="mt-section-kicker">{l(language,"आजको खगोलीय आधार","ASTRONOMICAL SNAPSHOT")}</span><h2>{l(language,"पञ्चाङ्ग र चन्द्र अवस्था","Panchang & lunar phase")}</h2></div><Moon size={21}/></div>
        {snapshot ? <>
          <div className="mt-tithi-hero"><div className="mt-moon-mark"><Moon size={28}/></div><div><small>{l(language,"तिथि","Tithi")} {snapshot.panchang.tithi_index}/30</small><strong>{tithiName}</strong><span>{snapshot.panchang.paksha === "Shukla Paksha" ? l(language,"शुक्ल पक्ष","Shukla Paksha") : l(language,"कृष्ण पक्ष","Krishna Paksha")}</span></div><div className="mt-tithi-progress"><b>{fmt(snapshot.panchang.tithi_progress_percent,0)}%</b><span>{l(language,"प्रगति","progress")}</span></div></div>
          <div className="mt-progress-track"><span style={{width:`${snapshot.panchang.tithi_progress_percent}%`}}/></div>
          <div className="mt-panchang-details">
            <div><small>{l(language,"नक्षत्र / पाद","Nakshatra / Pada")}</small><strong>{snapshot.panchang.nakshatra_name_ne} · {snapshot.panchang.nakshatra_pada}</strong></div>
            <div><small>{l(language,"योग","Yoga")}</small><strong>{snapshot.panchang.yoga_name_ne}</strong></div>
            <div><small>{l(language,"करण","Karana")}</small><strong>{snapshot.panchang.karana_name_ne}</strong></div>
            <div><small>{l(language,"चन्द्र / सूर्य राशि","Moon / Sun Rashi")}</small><strong>{snapshot.panchang.moon_rashi_ne} / {snapshot.panchang.sun_rashi_ne}</strong></div>
            <div><small>{l(language,"सूर्योदय / सूर्यास्त","Sunrise / sunset")}</small><strong>{formatInstant(snapshot.panchang.sunrise_utc,preferences.timezone,language)} / {formatInstant(snapshot.panchang.sunset_utc,preferences.timezone,language)}</strong></div>
            <div><small>{l(language,"सौर उचाइ","Solar altitude")}</small><strong>{fmt(snapshot.sky.solar_altitude_deg_at_evaluation,1)}°</strong></div>
          </div>
          <div className="mt-metrics"><div><span>{l(language,"चन्द्र उज्यालोपन","Moon illumination")}</span><strong>{fmt(snapshot.sky.moon_illumination_percent,1)}%</strong></div><div><span>{l(language,"सूर्य देशान्तर","Sun longitude")}</span><strong>{fmt(snapshot.sky.sun_longitude_tropical_deg)}°</strong></div><div><span>{l(language,"चन्द्र देशान्तर","Moon longitude")}</span><strong>{fmt(snapshot.sky.moon_longitude_tropical_deg)}°</strong></div></div>
        </> : <div className="mt-empty-snapshot"><Moon size={28}/><strong>{l(language,"तपाईंको समयको गणना तयार हुँदैछ","Your time snapshot is waiting")}</strong><span>{l(language,"स्थान, समय क्षेत्र र मिति अनुसार गणना लोड गर्नुहोस्।","Load calculations for your location, timezone and date.")}</span></div>}
        <div className="mt-method-note"><span>{l(language,"इन्जिन","Engine")}: {snapshot?.methodology.engine || "astronomy-engine"}</span><span>{l(language,"स्थानीय मिति एंकर","Local date anchor")}: {snapshot?.methodology.time_anchor || l(language,"स्थानीय मध्याह्न","Local noon")}</span></div>
      </section>
    </div>

    <section className="mt-reference-panel">
      <div className="mt-reference-title"><div><span className="mt-section-kicker">{l(language,"आफ्नै पात्रोको विद्यमान स्रोत","EXISTING AAFNAIPATRO SOURCE")}</span><h2>{l(language,"नेपाल पात्रो सन्दर्भ","Nepal calendar reference")}</h2></div><span>{l(language,"स्थिर पात्रो / D1","Archive / D1")}</span></div>
      {calendarReference ? <><div className="mt-reference-grid"><div><small>{l(language,"विक्रम संवत्","Bikram Sambat")}</small><strong>{calendarReference.bs}</strong></div><div><small>{l(language,"नेपाल संवत्","Nepal Sambat")}</small><strong>{calendarReference.ns}</strong></div><div><small>{l(language,"संग्रहित तिथि","Archived Tithi")}</small><strong>{calendarReference.tithi}</strong></div><div><small>{l(language,"सूर्योदय / सूर्यास्त","Sunrise / sunset")}</small><strong>{calendarReference.sunrise} / {calendarReference.sunset}</strong></div></div><p>{l(language,"यो AafnaiPatro को विद्यमान पात्रो अभिलेख हो; यसलाई तपाईंको चयन गरिएको स्थानका सौर समयसँग नझुक्याउनुहोस्।","This is AafnaiPatro's existing calendar archive reference; it is not a substitute for solar event times at your selected location.")}</p></> : <p className="mt-reference-empty">{l(language,"अभिलेख सन्दर्भ अहिले उपलब्ध छैन।","The archive reference is not available right now.")}</p>}
    </section>

    {snapshot && <MyTimeTemporalLayers snapshot={snapshot} timezone={preferences.timezone} language={language} now={now} />}

    <section className="mt-section">
      <div className="mt-section-title"><div><span className="mt-section-kicker">{l(language,"एउटै ठाउँमा","ONE CONNECTED EXPERIENCE")}</span><h2>{l(language,"समयका तहहरू","Layers of time")}</h2></div><p>{l(language,"हरेक तह एउटै मिति, स्थान र समय क्षेत्रसँग जोडिन्छ। गणना उपलब्ध नभएका भागलाई स्पष्ट रूपमा चिनाइएको छ।","Every layer shares the same date, location and timezone. Capabilities not yet calculated are explicitly marked.")}</p></div>
      <div className="mt-layer-grid">{UPCOMING.map(([icon,titleNe,titleEn,descNe,descEn,status])=>{const ready=status==="ready"||(status==="solar"&&Boolean(snapshot?.panchang.sunrise_utc&&snapshot.panchang.sunset_utc&&snapshot.panchang.next_sunrise_utc))||(status==="personal"&&Boolean(snapshot&&personalContext.birthChart))||(status==="sky"&&Boolean(snapshot));const waiting=status==="personal"&&!personalContext.birthChart?l(language,"जन्मपत्रो जोड्नुहोस्","Connect birth chart"):status==="solar"&&snapshot&&!snapshot.panchang.sunrise_utc?l(language,"यस दिन सौर घटना उपलब्ध छैन","Solar events unavailable for this day"):l(language,"इन्जिन जडान हुँदै","Engine integration pending");return <article className="mt-layer-card" key={titleEn}><span className="mt-layer-icon">{icon}</span><div><h3>{l(language,titleNe,titleEn)}</h3><p>{l(language,descNe,descEn)}</p></div><span className={"mt-layer-status "+(ready?"is-ready":"")}>{ready?l(language,"गणना उपलब्ध","Calculation available"):waiting}</span></article>})}</div>
    </section>

    <section className="mt-personal">
      <div><span className="mt-section-kicker">{l(language,"व्यक्तिगत सन्दर्भ","PERSONAL CONTEXT")}</span><h2>{l(language,"तपाईंको राशिफल र जन्मपत्रोसँग जोडिएको समय","Time connected to your horoscope and birth chart")}</h2><p>{l(language,"My Time ले यस ब्राउजरमा तपाईंले पहिले नै सुरक्षित गर्नुभएको जन्मपत्रो र राशिफल प्राथमिकता पढ्छ। जन्म विवरण यो गणनाका लागि अर्को सर्भरमा पठाइँदैन।","My Time reads the birth-chart context and Rashifal preference already saved in this browser. Birth details are not sent to another server for these calculations.")}</p>
      {personalContext.birthChart ? <div className="mt-personal-data"><div><small>{l(language,"जन्म राशि","Natal Moon sign")}</small><strong>{personalContext.birthChart.rashi || "—"}</strong></div><div><small>{l(language,"लग्न","Ascendant")}</small><strong>{personalContext.birthChart.lagna || "—"}</strong></div><div><small>{l(language,"जन्म नक्षत्र","Natal Nakshatra")}</small><strong>{personalContext.birthChart.nakshatra || "—"}{personalContext.birthChart.pada ? ` · ${personalContext.birthChart.pada}` : ""}</strong></div></div> : <p className="mt-personal-muted">{l(language,"अहिलेसम्म यस ब्राउजरमा जन्मपत्रो सन्दर्भ भेटिएन।","No birth-chart context was found in this browser yet.")}</p>}
      {snapshot && personalContext.birthChart && <div className="mt-balance-grid"><div><small>{l(language,"ताराबल","Tarabalam")}</small><strong>{taraIndex >= 0 ? (ne ? TARA_NE[taraIndex] : TARA_EN[taraIndex]) : "—"}</strong><span>{taraCount !== null ? l(language,`जन्म नक्षत्रबाट ${taraCount}औँ ताराको गणना`,`Tara count ${taraCount} from natal Nakshatra`) : l(language,"नक्षत्र नाम मिलाउन सकिएन","Could not match the saved Nakshatra name")}</span><b>{taraIndex >= 0 ? `${TARA_SCORES[taraIndex]} / 100` : ""}</b></div><div><small>{l(language,"चन्द्रबल","Chandrabalam")}</small><strong>{chandraHouse !== null ? l(language,`चन्द्रमा ${chandraHouse}औँ भावमा`,`Moon is in house ${chandraHouse}`) : "—"}</strong><span>{chandraScore === 100 ? l(language,"परम्परागत रूपमा अनुकूल","Traditionally supportive") : chandraScore === 0 ? l(language,"परम्परागत सावधानी","Traditional caution") : chandraScore === 50 ? l(language,"मिश्रित संकेत","Mixed indication") : l(language,"जन्म राशि आवश्यक","Natal Moon sign needed")}</span><b>{chandraScore !== null ? `${chandraScore} / 100` : ""}</b></div></div>}
      {personalContext.effectiveSign && <div className="mt-rashifal-context"><div><small>{l(language,"जोडिएको राशिफल","Connected Rashifal")}</small><strong>{declaredSign ? l(language,declaredSign.ne,declaredSign.en) : personalContext.effectiveSign}</strong></div>{rashifalLoading ? <span>{l(language,"राशिफल लोड हुँदैछ…","Loading Rashifal…")}</span> : rashifalSummary ? <p>{rashifalSummary}</p> : <span>{l(language,"आजको राशिफल सारांश अहिले उपलब्ध छैन।","Today's Rashifal summary is not available right now.")}</span>}</div>}
      </div>
      <div className="mt-personal-links"><a href="/rashifal"><Moon size={18}/>{l(language,"राशिफल खोल्नुहोस्","Open Rashifal")}<ArrowUpRight size={16}/></a><a href="/janmapatro"><Sun size={18}/>{l(language,"जन्मपत्रो खोल्नुहोस्","Open birth chart")}<ArrowUpRight size={16}/></a></div>
    </section>

    <footer className="mt-disclaimer"><TimerReset size={16}/><span>{l(language,"परिणामहरू प्रयोग गरिएको इन्जिन र गणना विधिसहित देखाइन्छन्। हालको पहिलो चरणको snapshot पूर्ण पञ्चाङ्ग वा व्यक्तिगत शुभाशुभ निर्णय होइन।","Results are shown with their engine and method. This first-stage snapshot is not a complete Panchang or a personalized auspiciousness decision.")}</span></footer>
  </main>;
}
