import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarClock, CircleAlert, Compass, Globe2, Moon, RefreshCw, Sun, TimerReset } from "lucide-react";
import { setPageTitle } from "../../title";
import { useUiLanguage, l } from "../../useUiLanguage";
import "./my-time.css";

type Snapshot = {
  schema_version: number;
  date: string;
  timezone: string;
  evaluated_at_utc: string;
  location: { lat: number; lng: number };
  panchang: { tithi_index: number; tithi_name: string; tithi_name_ne: string; paksha: string; phase_angle_deg: number; tithi_progress_percent: number };
  sky: { sun_longitude_tropical_deg: number; moon_longitude_tropical_deg: number; moon_illumination_percent: number };
  methodology: { engine: string; time_anchor: string; sidereal_positions: boolean; limitations: string[] };
};
type Preferences = { timezone: string; lat: number; lng: number };
const PREF_KEY = "aafnaipatro.mytime.preferences.v1";
const TITHI_EN = ["Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Purnima","Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Amavasya"];
const TITHI_NE = ["प्रतिपदा","द्वितीया","तृतीया","चतुर्थी","पञ्चमी","षष्ठी","सप्तमी","अष्टमी","नवमी","दशमी","एकादशी","द्वादशी","त्रयोदशी","चतुर्दशी","पूर्णिमा","प्रतिपदा","द्वितीया","तृतीया","चतुर्थी","पञ्चमी","षष्ठी","सप्तमी","अष्टमी","नवमी","दशमी","एकादशी","द्वादशी","त्रयोदशी","चतुर्दशी","औंसी"];
function readPreferences(): Preferences {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kathmandu";
  try {
    const saved = JSON.parse(localStorage.getItem(PREF_KEY) || "null");
    if (saved && typeof saved.timezone === "string" && Number.isFinite(saved.lat) && Number.isFinite(saved.lng)) return saved;
  } catch {}
  return { timezone, lat: 27.7172, lng: 85.324 };
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
  try { return new Intl.DateTimeFormat(language === "ne" ? "ne-NP" : "en", { timeZone: timezone, weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(new Date(date + "T12:00:00Z")); }
  catch { return date; }
}
function fmt(value: number, digits = 2) { return Number.isFinite(value) ? value.toFixed(digits) : "—"; }

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
  ["☼","सूर्योदय र सूर्यास्त","Sunrise & sunset","Solar horizon and twilight"],
  ["◌","नक्षत्र, पाद र योग","Nakshatra, Pada & Yoga","Sidereal lunar and solar combinations"],
  ["◷","चौघडिया, राहुकाल र होरा","Choghadiya, Rahu Kaal & Hora","Local sunrise/sunset-based timing"],
  ["✦","शुभ मुहूर्त","Smart Muhurta","Explainable personal timing windows"],
  ["☾","ताराबल र चन्द्रबल","Tarabalam & Chandrabalam","Uses declared birth-chart context"],
  ["◎","ग्रहण र आकाशीय घटना","Eclipses & sky events","Event contacts and visibility context"]
] as const;

export default function MyTimePage() {
  const language = useUiLanguage();
  const [preferences, setPreferences] = useState<Preferences>(readPreferences);
  const [date, setDate] = useState(() => localDate(readPreferences().timezone));
  const [now, setNow] = useState(() => new Date());
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const ne = language === "ne";

  useEffect(() => { setPageTitle(ne ? "मेरो समय · आफ्नै पात्रो" : "My Time · Aafnai Patro"); }, [ne]);
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(id); }, []);

  const loadSnapshot = useCallback(async (nextDate = date, nextPreferences = preferences) => {
    setLoading(true); setError(""); setSubmitted(true);
    try {
      const query = new URLSearchParams({
        date: nextDate, timezone: nextPreferences.timezone,
        lat: String(nextPreferences.lat), lng: String(nextPreferences.lng)
      });
      const response = await fetch(`/api/v1/mytime/today?${query}`, { headers: { accept: "application/json" }, credentials: "same-origin" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.ok || !body?.data) throw new Error(body?.error || `HTTP ${response.status}`);
      setSnapshot(body.data as Snapshot);
      try { localStorage.setItem(PREF_KEY, JSON.stringify(nextPreferences)); } catch {}
    } catch (cause) {
      setSnapshot(null);
      const message = cause instanceof Error ? cause.message : "request_failed";
      setError(message === "feature_disabled"
        ? l(language, "My Time को गणना सेवा अझै सक्रिय गरिएको छैन।", "The My Time calculation service is not enabled yet.")
        : l(language, "गणना लोड हुन सकेन। नेटवर्क र सेटिङ जाँच गरी फेरि प्रयास गर्नुहोस्।", "Could not load calculations. Check the network and settings, then try again."));
    } finally { setLoading(false); }
  }, [date, preferences, language]);

  useEffect(() => { void loadSnapshot(date, preferences); }, []); // Initial load only; edits apply on submit.
  const dateLabel = useMemo(() => localDateLabel(date, preferences.timezone, language), [date, preferences.timezone, language]);
  const localTime = localClock(preferences.timezone, now);
  const tithiName = snapshot ? (ne ? TITHI_NE[snapshot.panchang.tithi_index - 1] : TITHI_EN[snapshot.panchang.tithi_index - 1]) : "—";

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
      <button type="button" className="mt-primary" disabled={loading || !date || !preferences.timezone.trim()} onClick={()=>void loadSnapshot(date,preferences)}><RefreshCw size={16} className={loading?"mt-spinning":""}/>{l(language,"गणना अपडेट","Update calculations")}</button>
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
          <div className="mt-tithi-hero"><div className="mt-moon-mark"><Moon size={28}/></div><div><small>{l(language,"तिथि","Tithi")} {snapshot.panchang.tithi_index}/30</small><strong>{tithiName}</strong><span>{snapshot.panchang.paksha}</span></div><div className="mt-tithi-progress"><b>{fmt(snapshot.panchang.tithi_progress_percent,0)}%</b><span>{l(language,"प्रगति","progress")}</span></div></div>
          <div className="mt-progress-track"><span style={{width:`${snapshot.panchang.tithi_progress_percent}%`}}/></div>
          <div className="mt-metrics"><div><span>{l(language,"चन्द्र उज्यालोपन","Moon illumination")}</span><strong>{fmt(snapshot.sky.moon_illumination_percent,1)}%</strong></div><div><span>{l(language,"सूर्य देशान्तर","Sun longitude")}</span><strong>{fmt(snapshot.sky.sun_longitude_tropical_deg)}°</strong></div><div><span>{l(language,"चन्द्र देशान्तर","Moon longitude")}</span><strong>{fmt(snapshot.sky.moon_longitude_tropical_deg)}°</strong></div></div>
        </> : <div className="mt-empty-snapshot"><Moon size={28}/><strong>{l(language,"तपाईंको समयको गणना तयार हुँदैछ","Your time snapshot is waiting")}</strong><span>{l(language,"स्थान, समय क्षेत्र र मिति अनुसार गणना लोड गर्नुहोस्।","Load calculations for your location, timezone and date.")}</span></div>}
        <div className="mt-method-note"><span>{l(language,"इन्जिन","Engine")}: {snapshot?.methodology.engine || "astronomy-engine"}</span><span>{l(language,"स्थानीय मिति एंकर","Local date anchor")}: {snapshot?.methodology.time_anchor || l(language,"स्थानीय मध्याह्न","Local noon")}</span></div>
      </section>
    </div>

    <section className="mt-section">
      <div className="mt-section-title"><div><span className="mt-section-kicker">{l(language,"एउटै ठाउँमा","ONE CONNECTED EXPERIENCE")}</span><h2>{l(language,"समयका तहहरू","Layers of time")}</h2></div><p>{l(language,"हरेक तह एउटै मिति, स्थान र समय क्षेत्रसँग जोडिन्छ। गणना उपलब्ध नभएका भागलाई स्पष्ट रूपमा चिनाइएको छ।","Every layer shares the same date, location and timezone. Capabilities not yet calculated are explicitly marked.")}</p></div>
      <div className="mt-layer-grid">{UPCOMING.map(([icon,titleNe,titleEn,desc])=><article className="mt-layer-card" key={titleEn}><span className="mt-layer-icon">{icon}</span><div><h3>{l(language,titleNe,titleEn)}</h3><p>{l(language,desc,desc)}</p></div><span className="mt-layer-status">{l(language,"इन्जिन जडान हुँदै","Engine integration pending")}</span></article>)}</div>
    </section>

    <section className="mt-personal">
      <div><span className="mt-section-kicker">{l(language,"व्यक्तिगत सन्दर्भ","PERSONAL CONTEXT")}</span><h2>{l(language,"तपाईंको राशिफल र जन्मपत्रोसँग जोडिने समय","Time connected to your horoscope and birth chart")}</h2><p>{l(language,"तपाईंले घोषणा गर्नुभएको जन्म विवरण र राशिफल प्राथमिकता उपलब्ध हुँदा ताराबल, चन्द्रबल र व्यक्तिगत मुहूर्तका नियमहरू स्पष्ट व्याख्यासहित जोडिनेछन्। जन्म विवरण नदिई सामान्य दैनिक गणना प्रयोग गर्न सकिन्छ।","When your declared birth details and horoscope preferences are available, Tarabalam, Chandrabalam and personalized Muhurta rules can be connected with transparent explanations. General daily calculations will remain available without birth details.")}</p></div>
      <div className="mt-personal-links"><a href="/rashifal"><Moon size={18}/>{l(language,"राशिफल खोल्नुहोस्","Open Rashifal")}<ArrowUpRight size={16}/></a><a href="/janmapatro"><Sun size={18}/>{l(language,"जन्मपत्रो खोल्नुहोस्","Open birth chart")}<ArrowUpRight size={16}/></a></div>
    </section>

    <footer className="mt-disclaimer"><TimerReset size={16}/><span>{l(language,"परिणामहरू प्रयोग गरिएको इन्जिन र गणना विधिसहित देखाइन्छन्। हालको पहिलो चरणको snapshot पूर्ण पञ्चाङ्ग वा व्यक्तिगत शुभाशुभ निर्णय होइन।","Results are shown with their engine and method. This first-stage snapshot is not a complete Panchang or a personalized auspiciousness decision.")}</span></footer>
  </main>;
}
