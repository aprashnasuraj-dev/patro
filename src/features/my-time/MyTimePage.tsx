import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, CircleAlert, Globe2, Moon, RefreshCw, Sun, TimerReset } from "lucide-react";
import { setPageTitle } from "../../title";
import { homeToday } from "../../home-calendar-client";
import { NAKSHATRAS, RASHIS } from "../../patro-tools/core/names";
import { apparentSolarTime } from "../../patro-tools/core/apparent-solar-time";
import { abhijitMuhurta, nepalStandardTime, scorePersonalizedMuhurta, timeScaleCounters } from "../../patro-tools/core/my-time-extended";
import { choghadiyaWindows, horaWindows, inauspiciousDayWindows } from "../../patro-tools/core/temporal-windows";
import { deviceZone, readPlace } from "../../place/place";
import { calculateMyTimeSnapshot, type MyTimeSnapshot } from "../../patro-tools/core/my-time-snapshot";
import { panchangAt } from "../../patro-tools/core/astro";
import { myTimeCacheKey, readMyTimeSnapshot, writeMyTimeSnapshot } from "./my-time-cache";
import { useUiLanguage, l } from "../../useUiLanguage";
import MyTimeTemporalLayers from "./MyTimeTemporalLayers";
import TantraVidyaWidget from "./TantraVidyaWidget";
import MyTimePersonalization from "./MyTimePersonalization";
import { computeTantraTime } from "../../patro-tools/core/tantra/engine";
import "./my-time.css";

type Snapshot = MyTimeSnapshot;
type Preferences = { timezone: string; lat: number; lng: number; label?: string };
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
const NAKSHATRAS_EN = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
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

function safeTimeZone(value: string) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date()); return value; }
  catch { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; }
}
function localMinute(value: string, timezone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: safeTimeZone(timezone), hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return Number(parts.hour) * 60 + Number(parts.minute) + Number(parts.second) / 60;
}
function arcPaths(start: number, end: number, radius: number) {
  const segment = (a: number, b: number) => {
    if (b - a < 0.2) return "";
    const angle1 = a / 1440 * Math.PI * 2 - Math.PI / 2;
    const angle2 = b / 1440 * Math.PI * 2 - Math.PI / 2;
    const x1 = 150 + Math.cos(angle1) * radius, y1 = 150 + Math.sin(angle1) * radius;
    const x2 = 150 + Math.cos(angle2) * radius, y2 = 150 + Math.sin(angle2) * radius;
    const large = b - a > 720 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  };
  return end >= start ? [segment(start,end)].filter(Boolean) : [segment(start,1440),segment(0,end)].filter(Boolean);
}
function PolarClock({ timezone, now, language, snapshot, showChoghadiya, showKaal, showHora, showTwilight, showTantra, tantraTime }: { timezone: string; now: Date; language: "ne" | "en"; snapshot: Snapshot | null; showChoghadiya: boolean; showKaal: boolean; showHora: boolean; showTwilight: boolean; showTantra: boolean; tantraTime: ReturnType<typeof computeTantraTime> | null }) {
  const [selectedEvent, setSelectedEvent] = useState("");
  const safeTimezoneValue = safeTimeZone(timezone);
  const hours = Number(new Intl.DateTimeFormat("en-GB", { timeZone: safeTimezoneValue, hour: "2-digit", hourCycle: "h23" }).format(now));
  const minutes = Number(new Intl.DateTimeFormat("en-GB", { timeZone: safeTimezoneValue, minute: "2-digit" }).format(now));
  const seconds = Number(new Intl.DateTimeFormat("en-GB", { timeZone: safeTimezoneValue, second: "2-digit" }).format(now));
  const dayProgress = (hours + minutes / 60 + seconds / 3600) / 24;
  const angle = dayProgress * Math.PI * 2 - Math.PI / 2;
  const x = 150 + Math.cos(angle) * 92, y = 150 + Math.sin(angle) * 92;
  const progressLength = Math.max(0.5, dayProgress * 2 * Math.PI * 100);
  const solarReady = Boolean(snapshot?.panchang.sunrise_utc && snapshot.panchang.sunset_utc && snapshot.panchang.next_sunrise_utc);
  const choghadiya = solarReady ? choghadiyaWindows(snapshot!.weekday,snapshot!.panchang.sunrise_utc,snapshot!.panchang.sunset_utc,snapshot!.panchang.next_sunrise_utc) : {day:[],night:[]};
  const inauspicious = solarReady ? inauspiciousDayWindows(snapshot!.weekday,snapshot!.panchang.sunrise_utc,snapshot!.panchang.sunset_utc) : [];
  const hora = solarReady ? horaWindows(snapshot!.weekday,snapshot!.panchang.sunrise_utc,snapshot!.panchang.sunset_utc,snapshot!.panchang.next_sunrise_utc) : {day:[],night:[]};
  const twilightWindows = snapshot ? [
    {key:"astronomical-dawn",label:l(language,"खगोलीय बिहानी","Astronomical dawn"),start:snapshot.twilight.astronomical_dawn_utc,end:snapshot.panchang.sunrise_utc},
    {key:"nautical-dawn",label:l(language,"नौचालन बिहानी","Nautical dawn"),start:snapshot.twilight.nautical_dawn_utc,end:snapshot.panchang.sunrise_utc},
    {key:"civil-dawn",label:l(language,"नागरिक बिहानी","Civil dawn"),start:snapshot.twilight.civil_dawn_utc,end:snapshot.panchang.sunrise_utc},
    {key:"civil-dusk",label:l(language,"नागरिक साँझ","Civil dusk"),start:snapshot.panchang.sunset_utc,end:snapshot.twilight.civil_dusk_utc},
    {key:"nautical-dusk",label:l(language,"नौचालन साँझ","Nautical dusk"),start:snapshot.panchang.sunset_utc,end:snapshot.twilight.nautical_dusk_utc},
    {key:"astronomical-dusk",label:l(language,"खगोलीय साँझ","Astronomical dusk"),start:snapshot.panchang.sunset_utc,end:snapshot.twilight.astronomical_dusk_utc}
  ].filter((window): window is {key:string;label:string;start:string;end:string} => Boolean(window.start && window.end && Date.parse(window.end)>Date.parse(window.start))) : [];
  const pathsFor = (start: string,end: string,radius: number) => arcPaths(localMinute(start,safeTimezoneValue),localMinute(end,safeTimezoneValue),radius);
  const selectEvent = (label: string,start: string,end: string) => setSelectedEvent(label+" · "+localClock(safeTimezoneValue,new Date(start))+"–"+localClock(safeTimezoneValue,new Date(end)));
  const selectablePath = (key: string,d: string,label: string,start: string,end: string,stroke: string,width: number,opacity: number) => <path key={key} d={d} fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" opacity={opacity} role="button" tabIndex={0} aria-label={label} onClick={()=>selectEvent(label,start,end)} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();selectEvent(label,start,end);}}}><title>{label}: {localClock(safeTimezoneValue,new Date(start))}–{localClock(safeTimezoneValue,new Date(end))}</title></path>;
  return <div className="mt-polar-wrap">
    <svg className="mt-polar" viewBox="0 0 300 300" role="img" aria-label={l(language, "तपाईंको स्थानीय दिनको २४ घण्टे घडी; घेरा छानेर समय विवरण हेर्नुहोस्", "24-hour clock; select a ring segment to inspect its time")}>
      <defs><linearGradient id="mt-ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#e8bd70"/><stop offset="100%" stopColor="#4d9d8b"/></linearGradient></defs>
      <circle className="mt-polar-orbit" cx="150" cy="150" r="126" fill="none" stroke="var(--mt-accent)" strokeWidth="1" strokeDasharray="1 9" strokeLinecap="round"/><circle cx="150" cy="150" r="118" fill="none" stroke="var(--mt-line)" strokeWidth="1"/>
      <circle cx="150" cy="150" r="100" fill="none" stroke="var(--mt-line)" strokeWidth="10" opacity=".55"/>
      <circle className="mt-polar-progress" cx="150" cy="150" r="100" fill="none" stroke="url(#mt-ring)" strokeWidth="10" strokeDasharray={`${progressLength} 628.32`} transform="rotate(-90 150 150)" strokeLinecap="round"/>
      <circle cx="150" cy="150" r="78" fill="none" stroke="var(--mt-line)" strokeDasharray="2 6"/>
      <g className="mt-temporal-orbits" aria-label={l(language,"चयन गरिएको दिनका परम्परागत र खगोलीय समय खण्ड","Traditional and astronomical timing layers")}>
        {showChoghadiya && [...choghadiya.day,...choghadiya.night].map(window=>pathsFor(window.start_utc,window.end_utc,69).map((d,index)=>selectablePath(window.key+"-"+index,d,window.name_en,window.start_utc,window.end_utc,window.favorable?"#69a988":window.key.startsWith("night")?"#8986c5":"#c6a4a0",4,window.favorable?0.88:0.62)))}
        {showKaal && inauspicious.map((window,index)=>pathsFor(window.start_utc,window.end_utc,84+index*5).map((d,part)=>selectablePath(window.key+"-"+part,d,window.name_en,window.start_utc,window.end_utc,["#c58b37","#b96e7b","#8377bb"][index],3.5,0.9)))}
        {showHora && [...hora.day,...hora.night].map(window=>pathsFor(window.start_utc,window.end_utc,57).map((d,index)=>selectablePath(window.key+"-"+index,d,window.name_en,window.start_utc,window.end_utc,"#5795b0",2.3,0.82)))}
        {showTantra && tantraTime && pathsFor(tantraTime.tatwaWindow.start,tantraTime.tatwaWindow.end,122).map((d,index)=>selectablePath("tantra-tatwa-"+index,d,`${tantraTime.activeTatwa.name} Tatwa wave`,tantraTime.tatwaWindow.start,tantraTime.tatwaWindow.end,tantraTime.activeTatwa.color,5,0.95))}
        {showTwilight && twilightWindows.map(window=>pathsFor(window.start,window.end,48).map((d,index)=>selectablePath(window.key+"-"+index,d,window.label,window.start,window.end,"#d4a653",2.2,0.8)))}
      </g>
      {Array.from({ length: 24 }, (_, hour) => {
        const a = (hour / 24) * Math.PI * 2 - Math.PI / 2;
        const major = hour % 6 === 0;
        return <g key={hour}><line x1={150 + Math.cos(a) * (major ? 104 : 109)} y1={150 + Math.sin(a) * (major ? 104 : 109)} x2={150 + Math.cos(a) * 116} y2={150 + Math.sin(a) * 116} stroke="var(--mt-muted)" strokeWidth={major ? 2 : 1}/>{major && <text x={150 + Math.cos(a) * 88} y={154 + Math.sin(a) * 88} textAnchor="middle" fontSize="10" fill="var(--mt-muted)">{String(hour).padStart(2,"0")}</text>}</g>;
      })}
      <line x1="150" y1="150" x2={x} y2={y} stroke="var(--mt-accent)" strokeWidth="2.5" strokeLinecap="round"/>
      <circle className="mt-polar-dot" cx={x} cy={y} r="6" fill="var(--mt-accent)" stroke="var(--mt-card)" strokeWidth="3"/>
      <circle cx="150" cy="150" r="43" fill="var(--mt-card)" stroke="var(--mt-line)"/>
      <text x="150" y="145" textAnchor="middle" fontSize="23" fontWeight="700" fill="var(--mt-ink)">{localClock(timezone, now).slice(0,5)}</text>
      <text x="150" y="164" textAnchor="middle" fontSize="10" fill="var(--mt-muted)">LOCAL TIME</text>
    </svg>
    <div className="mt-polar-legend"><span><i className="mt-legend-time"/> {l(language,"स्थानीय समय","Local time")}</span><span><i className="mt-legend-day"/> {l(language,"२४ घण्टे चक्र","24-hour cycle")}</span>{solarReady&&<>{showChoghadiya&&<span><i className="mt-legend-choghadiya"/> {l(language,"चौघडिया","Choghadiya")}</span>}{showKaal&&<span><i className="mt-legend-kaal"/> {l(language,"राहु / यमगण्ड / गुलिक","Rahu / Yamaganda / Gulika")}</span>}{showHora&&<span><i className="mt-legend-hora"/> {l(language,"होरा","Hora")}</span>}{showTwilight&&<span><i className="mt-legend-twilight"/> {l(language,"सन्ध्याकाल","Twilight")}</span>}{showTantra&&tantraTime&&<span><i className="mt-legend-tatwa" style={{backgroundColor:tantraTime.activeTatwa.color}}/> {l(language,"पञ्चतत्त्व","Pancha Tatwa")}</span>}<span className="mt-legend-note">{l(language,"घेरा छान्नुहोस् · सुई = अहिले · घेरा = चयन गरिएको मिति","Select a ring · hand = now · rings = selected date")}</span></>}</div>
    {selectedEvent && <div className="mt-selected-event" role="status" aria-live="polite"><span>{l(language,"चयन गरिएको समय","Selected time")}</span><strong>{selectedEvent}</strong><button type="button" onClick={()=>setSelectedEvent("")}>{l(language,"बन्द","Clear")}</button></div>}
  </div>;
}

const UPCOMING = [
  ["☼","सूर्योदय र सूर्यास्त","Sunrise & sunset","स्थानअनुसार सौर घटना गणना","Location-specific solar events","solar"],
  ["◐","सन्ध्याकाल","Twilight","नागरिक, नौचालन र खगोलीय सन्ध्या","Civil, nautical and astronomical twilight","ready"],
  ["◌","नक्षत्र, पाद र योग","Nakshatra, Pada & Yoga","साइडेरियल चन्द्र र सूर्य गणना","Sidereal lunar and solar combinations","ready"],
  ["◷","चौघडिया, राहुकाल र होरा","Choghadiya, Rahu Kaal & Hora","स्थानीय सूर्योदय/सूर्यास्तमा आधारित समय","Local sunrise/sunset-based timing","solar"],
  ["☼","अभिजित मुहूर्त","Abhijit Muhurta","दिनको उज्यालो अवधिमा आधारित परम्परागत समय","Traditional window derived from the daylight span","abhijit"],
  ["✦","शुभ मुहूर्त","Smart Muhurta","परम्परागत समय नियममा आधारित व्याख्यायोग्य सिफारिस","Explainable recommendations from traditional timing rules","muhurta"],
  ["☾","ताराबल र चन्द्रबल","Tarabalam & Chandrabalam","घोषित जन्मपत्रो सन्दर्भ प्रयोग गर्छ","Uses declared birth-chart context","personal"],
  ["◎","ग्रहण र आकाशीय घटना","Eclipses & sky events","ग्रहण सम्पर्क समय र दृश्यता","Event contacts and visibility context","sky"]
] as const;

export default function MyTimePage() {
  const language = useUiLanguage();
  const [preferences, setPreferences] = useState<Preferences>(readPreferences);
  const [date, setDate] = useState(() => localDate(readPreferences().timezone));
  const [now, setNow] = useState(() => new Date());
  const observedLocalDay = useRef(localDate(readPreferences().timezone));
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [offlineSnapshot, setOfflineSnapshot] = useState(false);
  const [calendarReference, setCalendarReference] = useState<CalendarReference | null>(null);
  const [nepalCalendarReference, setNepalCalendarReference] = useState<CalendarReference | null>(null);
  const [personalContext, setPersonalContext] = useState<PersonalContext>(readPersonalContext);
  const [rashifalSummary, setRashifalSummary] = useState("");
  const [rashifalLoading, setRashifalLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [observatoryLayers, setObservatoryLayers] = useState<{ clocks: boolean; scales: boolean; muhurta: boolean; choghadiya: boolean; kaal: boolean; hora: boolean; twilight: boolean; tantra: boolean }>(() => {
    try { const saved = JSON.parse(localStorage.getItem("aafnaipatro.mytime.layers.v1") || "null"); return { clocks: saved?.clocks !== false, scales: saved?.scales !== false, muhurta: saved?.muhurta !== false, choghadiya: saved?.choghadiya !== false, kaal: saved?.kaal !== false, hora: saved?.hora !== false, twilight: saved?.twilight !== false, tantra: saved?.tantra === true }; }
    catch { return { clocks: true, scales: true, muhurta: true, choghadiya: true, kaal: true, hora: true, twilight: true, tantra: false }; }
  });
  const ne = language === "ne";
  const tantraEvaluation = useMemo(() => {
    if (!snapshot) return null;
    return localDate(preferences.timezone, now) === snapshot.date ? now : new Date(snapshot.evaluated_at_utc);
  }, [snapshot, now, preferences.timezone]);
  const evaluationPanchang = useMemo(() => {
    if (!snapshot || !tantraEvaluation) return null;
    try { return panchangAt(tantraEvaluation); } catch { return null; }
  }, [snapshot, tantraEvaluation]);
  const currentPanchang = useMemo(() => {
    if (snapshot && snapshot.date === localDate(preferences.timezone, now) && evaluationPanchang) return evaluationPanchang;
    try { return panchangAt(now); } catch { return null; }
  }, [snapshot, preferences.timezone, now, evaluationPanchang]);
  const tantraTime = useMemo(() => {
    if (!snapshot || !tantraEvaluation) return null;
    const { sunrise_utc, sunset_utc, next_sunrise_utc } = snapshot.panchang;
    if (!sunrise_utc || !sunset_utc || !next_sunrise_utc) return null;
    try {
      const evaluatedTithi = evaluationPanchang?.tithi ?? snapshot.panchang.tithi_index;
      return computeTantraTime(evaluatedTithi, tantraEvaluation, new Date(sunrise_utc), new Date(sunset_utc), new Date(next_sunrise_utc));
    } catch { return snapshot.tantraVidya ?? null; }
  }, [snapshot, tantraEvaluation, evaluationPanchang]);
  const timeScales = useMemo(() => timeScaleCounters(now), [now]);
  const nepalTime = useMemo(() => nepalStandardTime(now), [now]);
  const abhijit = useMemo(() => snapshot ? abhijitMuhurta(snapshot.panchang.sunrise_utc, snapshot.panchang.sunset_utc) : null, [snapshot]);
  const currentChoghadiya = useMemo(() => {
    if (!snapshot) return undefined;
    const windows = choghadiyaWindows(snapshot.weekday, snapshot.panchang.sunrise_utc, snapshot.panchang.sunset_utc, snapshot.panchang.next_sunrise_utc);
    return [...windows.day, ...windows.night].find(window => now.getTime() >= Date.parse(window.start_utc) && now.getTime() < Date.parse(window.end_utc));
  }, [snapshot, now]);
  const currentKaal = useMemo(() => {
    if (!snapshot || localDate(preferences.timezone, now) !== snapshot.date) return undefined;
    return inauspiciousDayWindows(snapshot.weekday, snapshot.panchang.sunrise_utc, snapshot.panchang.sunset_utc).find(window => now.getTime() >= Date.parse(window.start_utc) && now.getTime() < Date.parse(window.end_utc));
  }, [snapshot, now, preferences.timezone]);
  useEffect(() => { setPageTitle(ne ? "मेरो समय · आफ्नै पात्रो" : "My Time · Aafnai Patro"); }, [ne]);
  useEffect(() => { try { localStorage.setItem("aafnaipatro.mytime.layers.v1", JSON.stringify(observatoryLayers)); } catch {} }, [observatoryLayers]);
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(id); }, []);
  useEffect(() => { const sync = () => setPersonalContext(readPersonalContext()); window.addEventListener("storage", sync); window.addEventListener("patro:china-updated", sync as EventListener); return () => { window.removeEventListener("storage", sync); window.removeEventListener("patro:china-updated", sync as EventListener); }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    homeToday(nepalTime.date, controller.signal).then((body: any) => {
      if (controller.signal.aborted) return;
      const bs = body?.calendars?.bikram_sambat_detail || body?.bs || {};
      const bsLabel = bs?.formatted || [bs?.day, bs?.month_ne, bs?.year].filter(Boolean).join(" ");
      const p = body?.archive_panchang || body?.panchang || {};
      const ns = body?.calendars?.nepal_sambat_detail || body?.calendars?.nepal_sambat || body?.nepal_sambat || "";
      const nsLabel = typeof ns === "string" ? ns : ns?.formatted_ne || ns?.formatted || [ns?.year, ns?.month?.dev || ns?.month?.roman].filter(Boolean).join(" ");
      const t = body?.tithi || p?.tithi || {};
      setNepalCalendarReference({ date: nepalTime.date, bs: bsLabel || "—", ns: nsLabel || "—", tithi: t?.ne || t?.name_ne || t?.tithi_name_ne || "—", sunrise: p?.sunrise || "—", sunset: p?.sunset || "—", source: body?.source || "AafnaiPatro calendar archive / D1 fallback" });
    }).catch(() => { if (!controller.signal.aborted) setNepalCalendarReference(null); });
    return () => controller.abort();
  }, [nepalTime.date]);
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
    observedLocalDay.current = localDate(nextPreferences.timezone, new Date());
    const controller = new AbortController();
    const cacheKey = myTimeCacheKey(nextDate,nextPreferences.timezone,nextPreferences.lat,nextPreferences.lng);
    const cached = await readMyTimeSnapshot(cacheKey);
    if (cached) { setSnapshot(cached); setOfflineSnapshot(true); }
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
      setOfflineSnapshot(false);
      void writeMyTimeSnapshot(cacheKey,body.data as Snapshot).catch(()=>{});
      if (persistPreferences) try { localStorage.setItem(PREF_KEY, JSON.stringify(nextPreferences)); } catch {}
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "request_failed";
      try {
        const local = calculateMyTimeSnapshot({ date: nextDate, timezone: nextPreferences.timezone, lat: nextPreferences.lat, lng: nextPreferences.lng });
        setSnapshot(local);
        setOfflineSnapshot(true);
        void writeMyTimeSnapshot(cacheKey,local).catch(()=>{});
        setError(l(language,"सर्भर उपलब्ध नभएकाले साझा खगोलीय इन्जिनबाट स्थानीय गणना प्रयोग भइरहेको छ।","Server calculation is unavailable; the shared local astronomy engine is being used."));
      } catch {
        if (cached) {
          setSnapshot(cached); setOfflineSnapshot(true);
          setError(l(language,"सञ्जाल उपलब्ध छैन; पछिल्लो सुरक्षित गणना प्रयोग भइरहेको छ।","Offline: showing the last cached calculation."));
        } else {
          setSnapshot(null); setOfflineSnapshot(false);
          setError(message === "feature_disabled"
            ? l(language, "स्थानीय गणना पनि उपलब्ध भएन। सेवा सक्रिय भएपछि Worker गणना प्रयोग हुनेछ।", "Local calculation failed too. Worker calculations will be used when the service is enabled.")
            : l(language, "गणना लोड हुन सकेन। नेटवर्क र सेटिङ जाँच गरी फेरि प्रयास गर्नुहोस्।", "Could not calculate locally or load a cached result. Check the network and settings."));
        }
      }
    } finally {
      const reference = await referencePromise;
      if (reference) setCalendarReference(reference);
      setLoading(false);
    }
  }, [date, preferences, language]);

  useEffect(() => { void loadSnapshot(date, preferences); }, []); // Initial load only; edits apply on submit.
  useEffect(() => {
    const today = localDate(preferences.timezone, now);
    if (today !== observedLocalDay.current) {
      observedLocalDay.current = today;
      setDate(today);
      void loadSnapshot(today, preferences);
    }
  }, [now, preferences, loadSnapshot]); // Refresh the briefing after the selected timezone crosses midnight.
  const dateLabel = useMemo(() => localDateLabel(date, preferences.timezone, language), [date, preferences.timezone, language]);
  const localTime = localClock(preferences.timezone, now);
  const savedPlace = readPlace();
  const locationLabel = preferences.label || (savedPlace && savedPlace.tz === preferences.timezone && Math.abs(savedPlace.lat - preferences.lat) < 0.01 && Math.abs(savedPlace.lon - preferences.lng) < 0.01 ? savedPlace.name : preferences.timezone);
  const solarTime = apparentSolarTime(now, preferences.lng);
  const liveTithiIndex = evaluationPanchang?.tithi ?? snapshot?.panchang.tithi_index ?? null;
  const tithiName = liveTithiIndex ? (ne ? TITHI_NE[liveTithiIndex - 1] : TITHI_EN[liveTithiIndex - 1]) : "—";
  const briefingUsesCurrentDate = !!snapshot && snapshot.date === localDate(preferences.timezone, now);
  const briefingWindowSet = useMemo(() => snapshot ? choghadiyaWindows(snapshot.weekday, snapshot.panchang.sunrise_utc, snapshot.panchang.sunset_utc, snapshot.panchang.next_sunrise_utc) : null, [snapshot]);
  const nextBriefingWindow = briefingUsesCurrentDate && briefingWindowSet ? ([...briefingWindowSet.day, ...briefingWindowSet.night].filter(window => Date.parse(window.start_utc) > now.getTime()).sort((a, b) => Date.parse(a.start_utc) - Date.parse(b.start_utc))[0] || null) : null;
  const briefingTithiIndex = currentPanchang?.tithi ?? null;
  const briefingNakshatraIndex = currentPanchang ? currentPanchang.nakshatra + 1 : null;
  const briefingTithiName = briefingTithiIndex ? (ne ? TITHI_NE[briefingTithiIndex - 1] : TITHI_EN[briefingTithiIndex - 1]) : "—";
  const briefingNakshatraName = briefingNakshatraIndex ? String((ne ? NAKSHATRAS[briefingNakshatraIndex - 1] : NAKSHATRAS_EN[briefingNakshatraIndex - 1]) || "—") : "—";
  const applyPersonalLocation = useCallback((place: { timezone: string; lat: number; lng: number; label: string }) => {
    const next = { timezone: place.timezone, lat: place.lat, lng: place.lng, label: place.label };
    const nextDate = localDate(next.timezone, new Date());
    setPreferences(next);
    setDate(nextDate);
    void loadSnapshot(nextDate, next, true);
  }, [loadSnapshot]);
  const applyTimeLens = useCallback((lens: "universal" | "scientific" | "panchang" | "jyotish" | "tantra" | "combined") => {
    const presets = {
      universal: { clocks: true, scales: false, muhurta: true, choghadiya: true, kaal: false, hora: false, twilight: false, tantra: false },
      scientific: { clocks: true, scales: true, muhurta: false, choghadiya: false, kaal: false, hora: false, twilight: true, tantra: false },
      panchang: { clocks: true, scales: false, muhurta: true, choghadiya: true, kaal: true, hora: true, twilight: false, tantra: false },
      jyotish: { clocks: true, scales: false, muhurta: true, choghadiya: true, kaal: true, hora: false, twilight: false, tantra: false },
      tantra: { clocks: true, scales: false, muhurta: false, choghadiya: false, kaal: false, hora: false, twilight: false, tantra: true },
      combined: { clocks: true, scales: true, muhurta: true, choghadiya: true, kaal: true, hora: true, twilight: true, tantra: true }
    };
    setObservatoryLayers(presets[lens]);
  }, []);
  const natalStarIndex = personalContext.birthChart ? NAKSHATRAS.indexOf(personalContext.birthChart.nakshatra as typeof NAKSHATRAS[number]) : -1;
  const natalMoonSignIndex = personalContext.birthChart ? RASHIS.indexOf(personalContext.birthChart.rashi as typeof RASHIS[number]) : -1;
  const transitStarIndex = snapshot ? snapshot.panchang.nakshatra_index - 1 : -1;
  const taraCount = natalStarIndex >= 0 && transitStarIndex >= 0 ? ((transitStarIndex - natalStarIndex + 27) % 27) + 1 : null;
  const taraIndex = taraCount ? (taraCount - 1) % 9 : -1;
  const chandraHouse = snapshot && natalMoonSignIndex >= 0 ? ((snapshot.panchang.moon_rashi_index - natalMoonSignIndex + 12) % 12) + 1 : null;
  const chandraScore = chandraHouse === null ? null : [1,3,6,7,10,11].includes(chandraHouse) ? 100 : [4,8,12].includes(chandraHouse) ? 0 : 50;
  const declaredSign = SIGNS.find(sign => sign.id === personalContext.effectiveSign);
  const personalizedMuhurta = useMemo(() => {
    if (!snapshot) return null;
    try { return scorePersonalizedMuhurta({ startUtc: now.toISOString(), endUtc: new Date(now.getTime()+60*60*1000).toISOString(), favorableChoghadiya: currentChoghadiya?.favorable, rahuKaal: currentKaal?.key === "rahu", yamaganda: currentKaal?.key === "yamaganda", gulika: currentKaal?.key === "gulika", taraIndex: taraIndex >= 0 ? taraIndex : null, chandraHouse }); }
    catch { return null; }
  }, [snapshot, now, currentChoghadiya, currentKaal, personalContext.birthChart, taraIndex, chandraHouse]);
  const recommendedMuhurtaWindows = useMemo(() => {
    if (!snapshot) return [];
    const windows = choghadiyaWindows(snapshot.weekday, snapshot.panchang.sunrise_utc, snapshot.panchang.sunset_utc, snapshot.panchang.next_sunrise_utc);
    const kaal = inauspiciousDayWindows(snapshot.weekday, snapshot.panchang.sunrise_utc, snapshot.panchang.sunset_utc);
    const todaySelected = localDate(preferences.timezone, now) === snapshot.date;
    return [...windows.day, ...windows.night]
      .filter(window => !todaySelected || Date.parse(window.end_utc) > now.getTime())
      .map(window => {
        const overlaps = kaal.filter(period => Date.parse(window.start_utc) < Date.parse(period.end_utc) && Date.parse(window.end_utc) > Date.parse(period.start_utc));
        const result = scorePersonalizedMuhurta({
          startUtc: window.start_utc, endUtc: window.end_utc, favorableChoghadiya: window.favorable,
          rahuKaal: overlaps.some(period => period.key === "rahu"),
          yamaganda: overlaps.some(period => period.key === "yamaganda"),
          gulika: overlaps.some(period => period.key === "gulika"),
          taraIndex: taraIndex >= 0 ? taraIndex : null, chandraHouse
        });
        return { ...window, score: result.score, label: result.label, cautions: result.cautions };
      })
      .sort((a, b) => b.score - a.score || Date.parse(a.start_utc) - Date.parse(b.start_utc))
      .slice(0, 3);
  }, [snapshot, now, preferences.timezone, taraIndex, chandraHouse]);


  return <main className="mt-page">
    <header className="mt-heading">
      <div className="mt-eyebrow"><span className="mt-pulse"/> {l(language,"समयलाई आफ्नै दृष्टिले अनुभव गर्नुहोस्","Experience time through your own lens")}</div>
      <div className="mt-heading-row"><div><h1>{l(language,"मेरो समय","My Time")}</h1><p>{l(language,"पात्रो, आकाश, स्थानीय समय र व्यक्तिगत सन्दर्भलाई एउटै जीवित ड्यासबोर्डमा।","A living dashboard for calendars, sky, local time and personal context.")}</p></div><div className="mt-now"><span>{l(language,"तपाईंको स्थानीय समय","Your local time")}</span><strong>{localTime}</strong><small>{dateLabel}</small><div className="mt-apparent-time"><span>{l(language,"स्थानीय सौर समय · अनुमानित","Apparent solar time · approximate")}</span><strong>{solarTime.time}</strong><small>{l(language,"समय समीकरण","Equation of time")}: {solarTime.equationOfTimeMinutes >= 0 ? "+" : ""}{solarTime.equationOfTimeMinutes.toFixed(1)} min</small></div></div></div>
    </header>

    <MyTimePersonalization language={language} date={localDate(preferences.timezone, now)} now={now} timezone={preferences.timezone} locationLabel={locationLabel} lat={preferences.lat} lng={preferences.lng} tithiIndex={briefingTithiIndex} nakshatraIndex={briefingNakshatraIndex} tithiName={briefingTithiName} nakshatraName={briefingNakshatraName} currentWindow={briefingUsesCurrentDate && currentChoghadiya ? { key: currentChoghadiya.key, name: ne ? currentChoghadiya.name_ne : currentChoghadiya.name_en, start_utc: currentChoghadiya.start_utc, end_utc: currentChoghadiya.end_utc, favorable: currentChoghadiya.favorable } : null} nextWindow={nextBriefingWindow ? { key: nextBriefingWindow.key, name: ne ? nextBriefingWindow.name_ne : nextBriefingWindow.name_en, start_utc: nextBriefingWindow.start_utc, end_utc: nextBriefingWindow.end_utc } : null} onLocationChange={applyPersonalLocation} onLensChange={applyTimeLens} />

    <section className="mt-control-bar" aria-label={l(language,"समय र स्थान सेटिङ","Time and location settings")}>
      <label><span>{l(language,"मिति","Date")}</span><input type="date" value={date} onChange={event=>setDate(event.target.value)} /></label>
      <label><span>{l(language,"समय क्षेत्र (IANA)","Timezone (IANA)")}</span><input value={preferences.timezone} onChange={event=>setPreferences(old=>({...old,timezone:event.target.value}))} placeholder="Asia/Kathmandu" autoComplete="off"/></label>
      <label><span>{l(language,"अक्षांश","Latitude")}</span><input type="number" min="-90" max="90" step="0.0001" value={preferences.lat} onChange={event=>setPreferences(old=>({...old,lat:Number(event.target.value)}))}/></label>
      <label><span>{l(language,"देशान्तर","Longitude")}</span><input type="number" min="-180" max="180" step="0.0001" value={preferences.lng} onChange={event=>setPreferences(old=>({...old,lng:Number(event.target.value)}))}/></label>
      <button type="button" className="mt-primary" disabled={loading || !date || !preferences.timezone.trim()} onClick={()=>void loadSnapshot(date,preferences,true)}><RefreshCw size={16} className={loading?"mt-spinning":""}/>{l(language,"गणना अपडेट","Update calculations")}</button>
    </section>

    <section className="mt-observatory-controls" aria-label={l(language,"समय तह अनुकूलन","Customize time layers")}>
      <div><span className="mt-section-kicker">{l(language,"आफ्नो दृश्य बनाउनुहोस्","MAKE THIS VIEW YOURS")}</span><strong>{l(language,"देखाउने समय तहहरू","Visible time layers")}</strong></div>
      <label><input type="checkbox" checked={observatoryLayers.clocks} onChange={event=>setObservatoryLayers(old=>({...old,clocks:event.target.checked}))}/>{l(language,"नेपाल/स्थानीय घडी","Nepal + local clocks")}</label>
      <label><input type="checkbox" checked={observatoryLayers.scales} onChange={event=>setObservatoryLayers(old=>({...old,scales:event.target.checked}))}/>{l(language,"JD / MJD / Unix","JD / MJD / Unix")}</label>
      <label><input type="checkbox" checked={observatoryLayers.muhurta} onChange={event=>setObservatoryLayers(old=>({...old,muhurta:event.target.checked}))}/>{l(language,"शुभ समय तह","Muhurta layer")}</label>
      <label><input type="checkbox" checked={observatoryLayers.choghadiya} onChange={event=>setObservatoryLayers(old=>({...old,choghadiya:event.target.checked}))}/>{l(language,"चौघडिया घेरा","Choghadiya ring")}</label>
      <label><input type="checkbox" checked={observatoryLayers.kaal} onChange={event=>setObservatoryLayers(old=>({...old,kaal:event.target.checked}))}/>{l(language,"काल घेरा","Inauspicious-time rings")}</label>
      <label><input type="checkbox" checked={observatoryLayers.hora} onChange={event=>setObservatoryLayers(old=>({...old,hora:event.target.checked}))}/>{l(language,"होरा घेरा","Hora ring")}</label>
      <label><input type="checkbox" checked={observatoryLayers.twilight} onChange={event=>setObservatoryLayers(old=>({...old,twilight:event.target.checked}))}/>{l(language,"सन्ध्याकाल घेरा","Twilight ring")}</label>
      <label className="mt-tantra-toggle"><input type="checkbox" checked={observatoryLayers.tantra} onChange={event=>setObservatoryLayers(old=>({...old,tantra:event.target.checked}))}/>{l(language,"तन्त्रविद्या कालगणना","Tantra Vidya")}</label>
    </section>
    {observatoryLayers.clocks && <section className="mt-extra-grid" aria-label={l(language,"नेपाल र स्थानीय समय","Nepal and local time")}>
      <article className="mt-extra-card"><small>{l(language,"नेपाल मानक समय · UTC+05:45","Nepal Standard Time · UTC+05:45")}</small><strong>{nepalTime.time}</strong><span>{nepalTime.date} · NPT</span></article>
      <article className="mt-extra-card"><small>{l(language,"तपाईंको चयन गरिएको समय क्षेत्र","Your selected timezone")}</small><strong>{localTime}</strong><span>{preferences.timezone}</span></article>
      <article className="mt-extra-card"><small>{l(language,"विक्रम संवत् · नेपालको आजको मिति","Bikram Sambat · today in Nepal")}</small><strong>{nepalCalendarReference?.bs || "—"}</strong><span>{nepalTime.date} · {l(language,"नेपालको वर्तमान मितिको अभिलेख","Archive for Nepal’s current date")}</span></article>
    </section>}
    {observatoryLayers.scales && <section className="mt-extra-card mt-scales-panel" aria-label={l(language,"समय मापन","Time scales")}>
      <div><span className="mt-section-kicker">{l(language,"एकै क्षणका विभिन्न मापन","ONE INSTANT, MULTIPLE TIME SCALES")}</span><h2>{l(language,"समयका वैज्ञानिक काउन्टरहरू","Time-scale counters")}</h2></div>
      <div className="mt-extra-grid mt-scale-grid"><article><small>Julian Day (JD)</small><strong>{timeScales.julian_day.toFixed(6)}</strong></article><article><small>Modified Julian Day (MJD)</small><strong>{timeScales.modified_julian_day.toFixed(6)}</strong></article><article><small>Unix seconds</small><strong>{timeScales.unix_seconds}</strong></article><article><small>Unix milliseconds</small><strong>{timeScales.unix_milliseconds}</strong></article></div>
      <p>{timeScales.utc_iso} UTC · {l(language,"JD/MJD UTC instant बाट निकालिएका हुन्; Unix काउन्टर epoch-based हुन्।","JD/MJD are derived from the UTC instant; Unix counters are epoch-based.")}</p>
    </section>}
    {observatoryLayers.muhurta && <section className="mt-extra-grid" aria-label={l(language,"मुहूर्त र व्यक्तिगत समय","Muhurta and personalized timing")}>
      <article className="mt-extra-card"><small>{l(language,"अभिजित मुहूर्त","Abhijit Muhurta")}</small><strong>{abhijit ? formatInstant(abhijit.start_utc,preferences.timezone,language)+" – "+formatInstant(abhijit.end_utc,preferences.timezone,language) : "—"}</strong><span>{abhijit ? l(language,"स्थानीय दिनको उज्यालो अवधि र मध्यबिन्दुबाट परम्परागत रूपमा निकालिएको।","Derived traditionally from the daylight span and its midpoint.") : l(language,"सूर्योदय र सूर्यास्त उपलब्ध भएपछि देखाइन्छ।","Shown when sunrise and sunset are available.")}</span></article>
      <article className="mt-extra-card"><small>{l(language,"व्यक्तिगत समय सङ्केत · अर्को ६० मिनेट","Personalized timing · next 60 minutes")}</small><strong>{personalizedMuhurta ? l(language,personalizedMuhurta.label==="supportive"?"अनुकूल सङ्केत":personalizedMuhurta.label==="mixed"?"मिश्रित सङ्केत":"सावधानी सङ्केत",personalizedMuhurta.label==="supportive"?"Supportive indications":personalizedMuhurta.label==="mixed"?"Mixed indications":"Caution indicated") : l(language,"व्यक्तिगत आधार प्रतीक्षामा","Awaiting personal context")}</strong><span>{personalizedMuhurta ? l(language,"पारदर्शी नियम-आधारित स्कोर: "+personalizedMuhurta.score+"/100 · ग्यारेन्टी होइन","Transparent rule-based score: "+personalizedMuhurta.score+"/100 · not a guarantee") : l(language,"जन्म नक्षत्र/राशि उपलब्ध भएमा ताराबल र चन्द्रबल जोडिन्छ।","Tarabalam and Chandrabalam are included when natal Nakshatra/sign are available.")}</span>{recommendedMuhurtaWindows.length>0 && <div className="mt-recommended-windows"><b>{l(language,"अर्को सुझाइएका समय","Next suggested windows")}</b>{recommendedMuhurtaWindows.map(window=><div key={window.key}><span>{window.name_ne} · {formatInstant(window.start_utc,preferences.timezone,language)}–{formatInstant(window.end_utc,preferences.timezone,language)}</span><strong>{window.score}/100</strong></div>)}</div>}</article>
    </section>}

    {error && <div className="mt-notice" role="status"><CircleAlert size={19}/><div><strong>{l(language,"गणना सेवा","Calculation service")}</strong><p>{error}</p>{error.includes("not enabled") || error.includes("सक्रिय") ? <small>{l(language,"यो पृष्ठ र API feature flag सक्रिय भएपछि परिणाम देखिनेछ।","Results appear when the page and API rollout are enabled.")}</small> : null}</div></div>}

    <div className="mt-dashboard-grid">
      <section className="mt-panel mt-polar-panel">
        <div className="mt-panel-head"><div><span className="mt-section-kicker">{l(language,"बहुआयामिक समय","MULTIDIMENSIONAL TIME")}</span><h2>{l(language,"२४ घण्टे समय चक्र","24-hour temporal dial")}</h2></div><span className="mt-live"><i/> LIVE</span></div>
        <PolarClock timezone={preferences.timezone} now={now} language={language} snapshot={snapshot} showChoghadiya={observatoryLayers.choghadiya} showKaal={observatoryLayers.kaal} showHora={observatoryLayers.hora} showTwilight={observatoryLayers.twilight} showTantra={observatoryLayers.tantra} tantraTime={tantraTime}/>
        <div className="mt-polar-foot"><Globe2 size={16}/><span>{preferences.timezone}</span><span className="mt-dot-sep">·</span><span>{fmt(preferences.lat,4)}, {fmt(preferences.lng,4)}</span></div>
      </section>

      <section className="mt-panel mt-panchang-panel">
        <div className="mt-panel-head"><div><span className="mt-section-kicker">{l(language,"आजको खगोलीय आधार","ASTRONOMICAL SNAPSHOT")}</span><h2>{l(language,"पञ्चाङ्ग र चन्द्र अवस्था","Panchang & lunar phase")}</h2></div><Moon size={21}/></div>
        {snapshot ? <>
          <div className="mt-tithi-hero"><div className="mt-moon-mark"><Moon size={28}/></div><div><small>{l(language,"तिथि","Tithi")} {(evaluationPanchang?.tithi ?? snapshot.panchang.tithi_index)}/30</small><strong>{ne ? (TITHI_NE[(evaluationPanchang?.tithi ?? snapshot.panchang.tithi_index)-1] || tithiName) : (TITHI_EN[(evaluationPanchang?.tithi ?? snapshot.panchang.tithi_index)-1] || tithiName)}</strong><span>{((evaluationPanchang?.tithi ?? snapshot.panchang.tithi_index) <= 15) ? l(language,"शुक्ल पक्ष","Shukla Paksha") : l(language,"कृष्ण पक्ष","Krishna Paksha")}</span></div><div className="mt-tithi-progress"><b>{fmt(evaluationPanchang ? ((evaluationPanchang.moonPhaseAngle % 12) / 12) * 100 : snapshot.panchang.tithi_progress_percent,0)}%</b><span>{l(language,"प्रगति","progress")}</span></div></div>
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
        <div className="mt-method-note"><span>{l(language,"इन्जिन","Engine")}: {snapshot?.methodology.engine || "astronomy-engine"}</span><span>{l(language,"पञ्चाङ्ग एंकर","Panchang anchor")}: {snapshot?.methodology.time_anchor || l(language,"स्थानीय मध्याह्न","Local noon")}</span><span>{offlineSnapshot ? l(language,"स्थानीय/क्यास गणना","Local / cached calculation") : l(language,"Worker गणना","Worker calculation")}</span></div>
      </section>
    </div>

    <section className="mt-reference-panel">
      <div className="mt-reference-title"><div><span className="mt-section-kicker">{l(language,"आफ्नै पात्रोको विद्यमान स्रोत","EXISTING AAFNAIPATRO SOURCE")}</span><h2>{l(language,"नेपाल पात्रो सन्दर्भ","Nepal calendar reference")}</h2></div><span>{l(language,"स्थिर पात्रो / D1","Archive / D1")}</span></div>
      {calendarReference ? <><div className="mt-reference-grid"><div><small>{l(language,"विक्रम संवत्","Bikram Sambat")}</small><strong>{calendarReference.bs}</strong></div><div><small>{l(language,"नेपाल संवत्","Nepal Sambat")}</small><strong>{calendarReference.ns}</strong></div><div><small>{l(language,"संग्रहित तिथि","Archived Tithi")}</small><strong>{calendarReference.tithi}</strong></div><div><small>{l(language,"सूर्योदय / सूर्यास्त","Sunrise / sunset")}</small><strong>{calendarReference.sunrise} / {calendarReference.sunset}</strong></div></div><p>{l(language,"यो AafnaiPatro को विद्यमान पात्रो अभिलेख हो; यसलाई तपाईंको चयन गरिएको स्थानका सौर समयसँग नझुक्याउनुहोस्।","This is AafnaiPatro's existing calendar archive reference; it is not a substitute for solar event times at your selected location.")}</p></> : <p className="mt-reference-empty">{l(language,"अभिलेख सन्दर्भ अहिले उपलब्ध छैन।","The archive reference is not available right now.")}</p>}
    </section>

    {observatoryLayers.tantra && tantraTime && <TantraVidyaWidget data={tantraTime} language={language} timezone={preferences.timezone} />}
    {observatoryLayers.tantra && !tantraTime && <div className="mt-tantra-unavailable" role="status">{l(language,"चयन गरिएको स्थानमा सूर्योदय/सूर्यास्त उपलब्ध नभएकाले तन्त्रविद्या समय तह देखाउन सकिएन।","Tantra Vidya timing is unavailable because solar events could not be calculated for this location and date.")}</div>}
    {snapshot && <MyTimeTemporalLayers snapshot={snapshot} timezone={preferences.timezone} language={language} now={now} />}

    <section className="mt-section">
      <div className="mt-section-title"><div><span className="mt-section-kicker">{l(language,"एउटै ठाउँमा","ONE CONNECTED EXPERIENCE")}</span><h2>{l(language,"समयका तहहरू","Layers of time")}</h2></div><p>{l(language,"हरेक तह एउटै मिति, स्थान र समय क्षेत्रसँग जोडिन्छ। गणना उपलब्ध नभएका भागलाई स्पष्ट रूपमा चिनाइएको छ।","Every layer shares the same date, location and timezone. Capabilities not yet calculated are explicitly marked.")}</p></div>
      <div className="mt-layer-grid">{UPCOMING.map(([icon,titleNe,titleEn,descNe,descEn,status])=>{const ready=status==="ready"||(status==="solar"&&Boolean(snapshot?.panchang.sunrise_utc&&snapshot.panchang.sunset_utc&&snapshot.panchang.next_sunrise_utc))||(status==="abhijit"&&Boolean(snapshot?.panchang.sunrise_utc&&snapshot.panchang.sunset_utc))||(status==="muhurta"&&Boolean(snapshot))||(status==="personal"&&Boolean(snapshot&&personalContext.birthChart))||(status==="sky"&&Boolean(snapshot));const waiting=status==="personal"&&!personalContext.birthChart?l(language,"जन्मपत्रो जोड्नुहोस्","Connect birth chart"):status==="muhurta"&&!snapshot?l(language,"पहिले समय गणना लोड गर्नुहोस्","Load a time snapshot first"):(status==="solar"||status==="abhijit")&&snapshot&&!snapshot.panchang.sunrise_utc?l(language,"यस दिन सौर घटना उपलब्ध छैन","Solar events unavailable for this day"):l(language,"इन्जिन जडान हुँदै","Engine integration pending");return <article className="mt-layer-card" key={titleEn}><span className="mt-layer-icon">{icon}</span><div><h3>{l(language,titleNe,titleEn)}</h3><p>{l(language,descNe,descEn)}</p></div><span className={"mt-layer-status "+(ready?"is-ready":"")}>{ready?l(language,"गणना उपलब्ध","Calculation available"):waiting}</span></article>})}</div>
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
