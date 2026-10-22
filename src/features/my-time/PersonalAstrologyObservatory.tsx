import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CircleAlert, Clock3, Fingerprint, Moon, Sparkles, X } from "lucide-react";
import type { UiLanguage } from "../../i18n";
import { l } from "../../useUiLanguage";
import { choghadiyaWindows, type TemporalWindow } from "../../patro-tools/core/temporal-windows";
import "./choghadiya-summary.css";
import type { PersonalTimeComponent, SavedJanmaPatroContext } from "./personal-time-engine";
import "./personal-astrology-observatory.css";

export type AstrologyWindow = {
  key: string; start: string; end: string; score: number;
  label: "supportive" | "mixed" | "caution";
  reasons: string[]; cautions: string[]; confidence: string;
};
type Props = {
  language: UiLanguage; timezone: string; selectedDate: string; now: Date;
  birth: SavedJanmaPatroContext | null; nakshatra: string; pada: number | null;
  tara: { distance: number; taraIndex: number } | null; taraName: string;
  chandraHouse: number | null; luckyNumber: number | null; dashaLord: string | null;
  tatwa: string | null; nitya: string | null; windows: AstrologyWindow[];
  luckyTime: { start: string; end: string; score: number; confidence: string; activity: string; components: PersonalTimeComponent[]; reasons: string[]; cautions: string[] } | null;
  choghadiyaSource: { weekday: number; sunrise: string | null; sunset: string | null; nextSunrise: string | null } | null;
  onEdit: () => void;
};
function clock(value: string, timezone: string, language: UiLanguage) {
  try { return new Intl.DateTimeFormat(language === "ne" ? "ne-NP" : "en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value)); }
  catch { return "—"; }
}
function personalComponentLabel(key: string, language: UiLanguage) {
  const labels: Record<string, [string, string]> = {
    panchang: ["पञ्चाङ्ग", "Panchang"],
    rashifal: ["राशिफल", "Rashifal"],
    "dasha-hora": ["दशा–होरा सम्बन्ध", "Dasha–Hora relationship"],
    "chart-lords": ["लग्न तथा भावेश", "Lagna and house lords"],
    "activity-hora": ["गतिविधि–होरा मेल", "Activity–Hora fit"],
    "activity-tatwa": ["गतिविधि–तत्त्व मेल", "Activity–Tatwa fit"],
    gochara: ["गुरु/शनि गोचर", "Jupiter/Saturn transit"]
  };
  const pair = labels[key] || ["व्यक्तिगत समय घटक", key];
  return l(language, pair[0], pair[1]);
}
function personalComponentExplanation(component: PersonalTimeComponent, language: UiLanguage) {
  const nepali: Record<string, string> = {
    panchang: "चौघडिया, राहुकाल/यमगण्ड/गुलिक तथा उपलब्ध ताराबल र चन्द्रबलबाट पञ्चाङ्ग स्कोर निकालिएको छ।",
    rashifal: "छानिएको गतिविधिसँग मिल्ने दैनिक राशिफल डोमेनको उपलब्ध स्कोर समावेश छ।",
    "dasha-hora": "सक्रिय विम्शोत्तरी दशा स्वामी र प्रस्तावित समयमा चल्ने होरा स्वामीको सम्बन्ध तथा उपलब्ध जन्मकुण्डलीय अवस्था मूल्याङ्कन गरिएको छ।",
    "chart-lords": "जन्मपत्रो र प्रस्तावित समयको लग्नेश तथा सम्बन्धित दशौँ/एघारौँ भावेशको राशि-गरिमा र उपलब्ध युति-सङ्केत समावेश छन्।",
    "activity-hora": "छानिएको गतिविधिका लागि ग्रह होराको परम्परागत उपयुक्तता मूल्याङ्कन गरिएको छ।",
    "activity-tatwa": "छानिएको गतिविधिसँग पञ्चतत्त्वको परम्परागत मेल मूल्याङ्कन गरिएको छ; नमिल्नु निषेध होइन।",
    gochara: "गोचर गुरु र शनिको स्थिति जन्म चन्द्र राशि तथा लग्नबाट परम्परागत भाव सम्बन्धअनुसार मूल्याङ्कन गरिएको छ।"
  };
  return l(language, component.explanationNe || nepali[component.key] || "उपलब्ध व्यक्तिगत सङ्केतबाट यो घटकको अङ्क निकालिएको छ।", component.explanation);
}
function personalReasonLabel(reason: string, language: UiLanguage) {
  if (reason === "supportive_panchang_indications") return l(language, "पञ्चाङ्गका केही अनुकूल सङ्केत उपलब्ध छन्।", "Supportive Panchang indications are present.");
  if (reason === "supportive_chandrabalam") return l(language, "चन्द्रबलको अनुकूल सङ्केत समावेश छ।", "A supportive Chandrabalam indication is included.");
  if (reason === "activity_specific_choghadiya_fit") return l(language, "चौघडिया चयन गरिएको गतिविधिसँग मिलाइएको छ।", "Choghadiya preference is adjusted for the selected activity.");
  if (reason.startsWith("tara:")) return l(language, "जन्म नक्षत्रअनुसारको ताराबल स्कोरमा समावेश छ।", "Natal-to-transit Tarabalam is included in the score.");
  if (reason === "traditional_caution_caps_overall_rank") return l(language, "सावधानीको नियमले समग्र अङ्कको अधिकतम सीमा लागू गरेको छ।", "A traditional caution rule has capped the overall ranking score.");
  if (reason === "rahu_kaal") return l(language, "राहुकाल: परम्परागत सावधानी लागू गरिएको छ।", "Rahu Kaal: a traditional caution cap applies.");
  if (reason === "yamaganda") return l(language, "यमगण्ड: परम्परागत सावधानी लागू गरिएको छ।", "Yamaganda: a traditional caution cap applies.");
  if (reason === "gulika") return l(language, "गुलिक काल: परम्परागत सावधानी लागू गरिएको छ।", "Gulika Kaal: a traditional caution cap applies.");
  if (reason === "traditional_chandrabalam_caution") return l(language, "चन्द्रबलको परम्परागत सावधानी सङ्केत।", "Traditional Chandrabalam caution indication.");
  if (reason.startsWith("Daily Rashifal")) return l(language, "छानिएको गतिविधिसँग मिल्ने राशिफल डोमेन जोडिएको छ।", "The matching daily Rashifal domain is included.");
  if (reason.startsWith("Dasha lord")) return l(language, "दशा स्वामी र होरा स्वामीको सम्बन्ध, तथा उपलब्ध जन्मकुण्डलीय अवस्था समावेश छ।", "Dasha–Hora relationship and available natal condition are included.");
  if (reason.startsWith("Natal Lagna") || reason.startsWith("Combines natal")) return l(language, "जन्मपत्रो र प्रस्तावित मुहूर्तका लग्न तथा सम्बन्धित भावेश मूल्याङ्कन गरिएका छन्।", "Natal and candidate-time Lagna and relevant house lords are evaluated.");
  if (reason.startsWith("Jupiter and Saturn")) return l(language, "गोचर गुरु र शनिको जन्म राशि तथा लग्नबाटको सम्बन्ध समावेश छ।", "Jupiter and Saturn transits relative to the natal Moon sign and Lagna are included.");
  if (reason.includes("Hora matches") || reason.includes("Hora is not")) return l(language, "गतिविधि–होरा मेल स्कोरमा समावेश छ।", "Activity–Hora fit is included in the score.");
  if (reason.includes("Tatwa matches") || reason.includes("Tatwa does not")) return l(language, "गतिविधि–तत्त्व मेल स्कोरमा समावेश छ।", "Activity–Tatwa fit is included in the score.");
  return l(language, "उपलब्ध व्यक्तिगत सङ्केत स्कोरमा समावेश छन्।", "Available personal indicators are included in the score.");
}

function Wave({ active, label }: { active: boolean; label: string }) {
  return <svg className={"mt-astro-wave" + (active ? " is-live" : "")} viewBox="0 0 420 100" role="img" aria-label={label} preserveAspectRatio="none">
    <defs><linearGradient id="mt-astro-wave-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".23"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs>
    <path d="M0 55 C24 55 24 24 48 24 S72 80 96 80 S120 31 144 31 S168 68 192 68 S216 18 240 18 S264 76 288 76 S312 39 336 39 S360 61 384 61 S408 45 420 45 L420 100 L0 100Z" fill="url(#mt-astro-wave-fill)"/>
    <path d="M0 55 C24 55 24 24 48 24 S72 80 96 80 S120 31 144 31 S168 68 192 68 S216 18 240 18 S264 76 288 76 S312 39 336 39 S360 61 384 61 S408 45 420 45" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>;
}

const CHOGHADIYA_TYPES = [
  { ne: "अमृत", en: "Amrit", lordNe: "चन्द्र", lordEn: "Moon", tone: "good", hintNe: "उत्तम शुभ", hintEn: "Highly favorable" },
  { ne: "शुभ", en: "Shubh", lordNe: "बृहस्पति", lordEn: "Jupiter", tone: "good", hintNe: "शुभ · वृद्धि", hintEn: "Growth · auspicious" },
  { ne: "लाभ", en: "Labh", lordNe: "बुध", lordEn: "Mercury", tone: "good", hintNe: "लाभ · व्यापार", hintEn: "Gain · commerce" },
  { ne: "चल", en: "Char", lordNe: "शुक्र", lordEn: "Venus", tone: "neutral", hintNe: "यात्रा · चलायमान", hintEn: "Travel · movement" },
  { ne: "रोग", en: "Rog", lordNe: "मङ्गल", lordEn: "Mars", tone: "caution", hintNe: "विवाद · अवरोध", hintEn: "Conflict · obstacles" },
  { ne: "काल", en: "Kaal", lordNe: "शनि", lordEn: "Saturn", tone: "caution", hintNe: "ढिलाइ · बाधा", hintEn: "Delays · barriers" },
  { ne: "उद्वेग", en: "Udveg", lordNe: "सूर्य", lordEn: "Sun", tone: "caution", hintNe: "चिन्ता · प्रशासन", hintEn: "Stress · administration" }
] as const;
function SevenChoghadiyaSummary({ source, timezone, language }: { source: Props["choghadiyaSource"]; timezone: string; language: UiLanguage }) {
  const spans = source ? choghadiyaWindows(source.weekday, source.sunrise, source.sunset, source.nextSunrise) : { day: [], night: [] };
  const windows = [...spans.day, ...spans.night];
  const display = (w: TemporalWindow) => clock(w.start_utc, timezone, language) + "–" + clock(w.end_utc, timezone, language);
  return <section className="mt-seven" aria-labelledby="mt-seven-title">
    <div className="mt-seven-heading"><h3 id="mt-seven-title">{l(language,"सात चौघडिया · दिन र रात","Seven Choghadiya · day & night")}</h3><small>{l(language,"चयन गरिएको स्थानको वास्तविक सूर्योदयदेखि अर्को सूर्योदयसम्म","Actual local sunrise to next sunrise")}</small></div>
    {windows.length ? <div className="mt-seven-rows">{CHOGHADIYA_TYPES.map(type => {
      const matches = windows.filter(w => w.name_ne === type.ne);
      return <div className={"mt-seven-row is-" + type.tone} key={type.en}>
        <span className="mt-seven-name"><strong>{l(language,type.ne,type.en)}</strong><small>{l(language,type.lordNe,type.lordEn)} · {l(language,type.hintNe,type.hintEn)}</small></span>
        <span className="mt-seven-times">{matches.length ? matches.map(w => <span key={w.key} title={w.key.startsWith("day") ? l(language,"दिन","Day") : l(language,"रात","Night")}><b>{w.key.startsWith("day") ? l(language,"दिन","Day") : l(language,"रात","Night")}</b> {display(w)}</span>) : "—"}</span>
      </div>;
    })}</div> : <p className="mt-astro-empty">{l(language,"सूर्योदय, सूर्यास्त र भोलिको सूर्योदय उपलब्ध भएपछि सात समयखण्ड देखाइन्छन्।","Seven timing rows require sunrise, sunset and next sunrise for the selected location.")}</p>}
    <small className="mt-seven-note">{l(language,"परम्परागत चौघडिया वर्गीकरण हो, व्यक्तिगत शुभ समयको स्कोर होइन। रातका खण्ड अर्को स्थानीय मितिसम्म जान सक्छन्।","Traditional Choghadiya categories, not personalized lucky-time scores. Night windows may extend into the next local date.")}</small>
  </section>;
}

export default function PersonalAstrologyObservatory(p: Props) {
  const { language: lang, birth, now, timezone } = p;
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (!profileOpen) return; closeRef.current?.focus(); const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setProfileOpen(false); }; window.addEventListener("keydown", onKey); return () => { window.removeEventListener("keydown", onKey); openerRef.current?.focus(); }; }, [profileOpen]);
  const ordered = [...p.windows].sort((a,b) => Date.parse(a.start)-Date.parse(b.start));
  const chosen = ordered.find(w => w.key === selectedKey) || ordered[0] || null;
  const current = ordered.find(w => Date.parse(w.start) <= now.getTime() && Date.parse(w.end) > now.getTime());
  const ashtama = p.chandraHouse === 8;
  const available = Boolean(birth);
  const currentDay = clock(now.toISOString(), timezone, lang);
  return <section id="mt-personal-observatory" className="mt-astro" aria-labelledby="mt-astro-title">
    <div className="mt-astro-glow" aria-hidden="true"/>
    <header className="mt-astro-head">
      <div><span className="mt-astro-overline"><Sparkles size={14}/>{l(lang,"जीवित व्यक्तिगत समय","LIVE PERSONAL TIME")}</span>
        <h2 id="mt-astro-title">{l(lang,"तपाईंको ब्रह्माण्डीय समय","Your personal time observatory")}</h2>
        <p>{l(lang,"जन्मपत्रो, गोचर र छनोट गरिएको मितिबाट बनेको व्याख्यायोग्य समय-सङ्केत।","An explainable view of birth context, transit and the selected date.")}</p>
      </div>
      <button className="mt-astro-profile-trigger" type="button" ref={openerRef} onClick={() => setProfileOpen(true)} aria-haspopup="dialog" aria-expanded={profileOpen}><Fingerprint size={18}/>{available ? (birth?.birth?.name || l(lang,"मेरो जन्म विवरण","My birth profile")) : l(lang,"जन्म विवरण जोड्नुहोस्","Connect birth profile")}<ArrowUpRight size={15}/></button>
    </header>
    <SevenChoghadiyaSummary source={p.choghadiyaSource} timezone={timezone} language={lang}/>
    <div className="mt-astro-status" role="status"><span className={"mt-astro-dot"+(available?" is-connected":"")}/>{available?l(lang,"जन्मपत्रो जोडिएको छ","Janmapatro connected"):l(lang,"सामान्य दृश्य · जन्म विवरण आवश्यक","General view · birth profile needed")}<span>{p.selectedDate} · {currentDay}</span></div>
    {available && birth?.birth && <div className="mt-astro-profile-evidence" role="note" aria-label={l(lang,"गणनामा प्रयोग गरिएको सुरक्षित जन्म विवरण","Saved birth profile used for calculations")}>
      <span>{l(lang,"सक्रिय जन्म विवरण","APPLIED BIRTH PROFILE")}</span>
      <strong>{birth.birth.date} · {birth.birth.time || "—"} NPT · {birth.birth.location || "—"}</strong>
      <small>{l(lang,"चन्द्र राशि","Moon sign")}: {birth.rashi || "—"} · {l(lang,"नक्षत्र","Nakshatra")}: {p.nakshatra || birth.nakshatra || "—"}{p.pada ? " · "+l(lang,"पाद","Pada")+" "+p.pada : ""} · {l(lang,"लग्न","Ascendant")}: {birth.lagna || "—"}</small>
    </div>}
    <div className="mt-astro-stage">
      <article className="mt-astro-element">
        <small>{l(lang,"तन्त्र कालगणनाको तत्व","TRADITIONAL ELEMENTAL RHYTHM")}</small>
        <strong>{p.tatwa || "—"}</strong>
        <Wave active={Boolean(p.tatwa)} label={p.tatwa?l(lang,"सक्रिय तत्वको सजावटी तरङ्ग दृश्य","Decorative wave for the reported active element"):l(lang,"तत्व डेटा उपलब्ध छैन","Elemental data unavailable")}/>
        <p>{p.tatwa?l(lang,"अवस्थित इन्जिनले गणना गरेको तत्व; तरङ्ग चित्रण प्रतीकात्मक हो।","Element from the existing engine; the animated waveform is illustrative, not a measured signal."):l(lang,"चयन गरिएको समयका लागि सौर तथा तन्त्र डेटा उपलब्ध भएपछि यहाँ देखिन्छ।","Shown when solar and Tantra data are available for the selected time.")}</p>
        <div className="mt-astro-element-foot"><span>{l(lang,"नित्य देवी","Nitya Devi")}: <b>{p.nitya || "—"}</b></span><span>{l(lang,"महादशा","Mahadasha")}: <b>{p.dashaLord || "—"}</b></span></div>
      </article>
      <div className="mt-astro-metrics" aria-label={l(lang,"व्यक्तिगत मापनहरू","Personal metrics")}>
        <article><span>{l(lang,"जन्म नक्षत्र / पाद","Birth Nakshatra / Pada")}</span><strong>{available?p.nakshatra || "—":"—"}{available && p.pada ? " · "+p.pada : ""}</strong><small>{l(lang,"जन्मपत्रो सन्दर्भ","Birth-chart context")}</small></article>
        <article><span>{l(lang,"ताराबलम्","Tarabalam")}</span><strong>{p.tara?p.taraName:"—"}</strong><small>{p.tara?l(lang,"समावेशी दूरी "+p.tara.distance+" · तारा "+p.tara.taraIndex,"Inclusive distance "+p.tara.distance+" · Tara "+p.tara.taraIndex):l(lang,"जन्म नक्षत्र आवश्यक","Natal Nakshatra required")}</small></article>
        <article className={ashtama?"is-alert":""}><span>{l(lang,"चन्द्रबलम्","Chandrabalam")}</span><strong>{p.chandraHouse===null?"—":ashtama?l(lang,"अष्टम चन्द्र","Ashtama Chandra"):l(lang,p.chandraHouse+"औँ भाव","House "+p.chandraHouse)}</strong><small>{l(lang,"जन्म राशि र गोचरबाट","Natal and transit Moon signs")}</small></article>
        <article><span>{l(lang,"परम्परागत शुभ अङ्क","Traditional lucky number")}</span><strong>{p.luckyNumber ?? "—"}</strong><small>{l(lang,"नतिजाको ग्यारेन्टी होइन","Not a prediction or guarantee")}</small></article>
      </div>
    </div>
    <article className="mt-astro-lucky-time" aria-labelledby="mt-astro-lucky-title">
      <div className="mt-astro-lucky-orbit" aria-hidden="true"><Clock3 size={28}/></div>
      <div className="mt-astro-lucky-copy">
        <span className="mt-astro-overline"><Sparkles size={14}/>{l(lang,"तपाईंको व्यक्तिगत शुभ समय","YOUR PERSONAL LUCKY TIME")}</span>
        <h3 id="mt-astro-lucky-title">{p.luckyTime ? clock(p.luckyTime.start,timezone,lang)+" – "+clock(p.luckyTime.end,timezone,lang) : available ? l(lang,"तपाईंको व्यक्तिगत समय मिलाइँदैछ","Updating your personal timing") : l(lang,"जन्मपत्रो जोड्नुहोस्","Connect your birth chart")}</h3>
        <p>{p.luckyTime
          ? l(lang,"जन्मपत्रो, प्रस्तावित समयको कुण्डली, चयन गरिएको गतिविधि र आजको पञ्चाङ्ग जोडेर छानिएको व्यक्तिगत समय।","Ranked using your saved natal chart, the candidate-time chart, selected activity and the chosen date's Panchang.")
          : available
            ? l(lang,"तपाईंको जन्मपत्रो जोडिएको छ। चयन गरिएको मिति र स्थानका समयखण्डसँग व्यक्तिगत गणना मिलाइँदैछ।","Your birth chart is connected. The personalized result is being synchronized with the selected date, location and timing windows.")
            : l(lang,"पहिले जन्मपत्रो जोड्नुहोस्। त्यसपछि यही समय अवलोकनमा व्यक्तिगत अङ्क र यसको विस्तृत कारण देखाइनेछ।","Connect your birth chart to show a personalized score and its detailed breakdown in this observatory.")}</p>
        {p.luckyTime && <div className="mt-astro-lucky-meta"><strong>{p.luckyTime.score}/100</strong><span>{l(lang,"रुचि","Activity")}: {p.luckyTime.activity}</span><span>{l(lang,"व्यक्तिगत जन्मपत्रो","Personal birth chart")}: {l(lang,"जोडिएको","Connected")}</span></div>}
        {p.luckyTime && <details className="mt-astro-lucky-reasons" open>
          <summary>{l(lang,"स्कोर विवरण र यो समय किन छानियो?","Score breakdown · why this time")}</summary>
          <div className="mt-astro-lucky-breakdown">
            {p.luckyTime.components.map(component=><article className="mt-astro-lucky-component" key={component.key}>
              <div className="mt-astro-lucky-component-head"><strong>{personalComponentLabel(component.key,lang)}</strong><span>{component.score}/100 · {component.weight.toFixed(1)}%</span></div>
              <div className="mt-astro-lucky-track" aria-hidden="true"><span style={{width:`${Math.max(0,Math.min(100,component.score))}%`}} /></div>
              <p>{personalComponentExplanation(component,lang)}</p>
            </article>)}
          </div>
          <p className="mt-astro-lucky-formula">{l(lang,"अङ्क उपलब्ध घटकको भारयुक्त औसत हो; राहुकाल, यमगण्ड वा गुलिकका सावधानी नियमले अन्तिम अङ्कमा अधिकतम सीमा लगाउन सक्छ।","The score is the weighted average of available components; Rahu Kaal, Yamaganda or Gulika caution rules may cap the final score.")}</p>
          {p.luckyTime.reasons.length>0 && <ul>{p.luckyTime.reasons.slice(0,5).map((reason,index)=><li key={index}>{personalReasonLabel(reason,lang)}</li>)}</ul>}
          {p.luckyTime.cautions.length>0 && <p className="mt-astro-window-caution"><CircleAlert size={15}/>{p.luckyTime.cautions.map(reason=>personalReasonLabel(reason,lang)).join(" · ")}</p>}
        </details>}
        <small>{l(lang,"यो परम्परागत नियममा आधारित तुलनात्मक अङ्क हो, सफलताको सम्भाव्यता वा ग्यारेन्टी होइन।","This is a relative traditional ranking score, not a probability of success or a guarantee.")}</small>
      </div>
    </article>
    {ashtama && <div className="mt-astro-alert" role="status"><CircleAlert size={20}/><div><strong>{l(lang,"अष्टम चन्द्र सचेतना","Ashtama Chandra indication")}</strong><p>{l(lang,"परम्परागत रूपमा सावधानीको संकेत; यो निश्चित हानि वा परिणामको भविष्यवाणी होइन।","A traditional caution indication, not a prediction of harm or a definite outcome.")}</p></div></div>}
    <div className="mt-astro-window-head"><div><span className="mt-astro-overline"><Clock3 size={14}/>{l(lang,"व्यक्तिगत समयको नक्सा","PERSONAL TIMING MAP")}</span><h3>{l(lang,"उपलब्ध समय झ्यालहरू","Available timing windows")}</h3></div><span>{l(lang,"छानिएको मिति","Selected date")}: {p.selectedDate}</span></div>
    {ordered.length ? <><div className="mt-astro-timeline" role="group" aria-label={l(lang,"समय झ्याल छान्नुहोस्","Select a timing window")}>{ordered.map(w=><button type="button" key={w.key} onClick={()=>setSelectedKey(w.key)} aria-pressed={chosen?.key===w.key} className={"mt-astro-window is-"+w.label+(current?.key===w.key?" is-current":"")}><span>{clock(w.start,timezone,lang)}–{clock(w.end,timezone,lang)}</span><strong>{w.score}/100</strong><small>{l(lang,w.label==="supportive"?"अनुकूल":w.label==="caution"?"सावधानी":"मिश्रित",w.label)}</small></button>)}</div><div className="mt-astro-window-detail" aria-live="polite"><div><b>{chosen?clock(chosen.start,timezone,lang)+"–"+clock(chosen.end,timezone,lang):"—"}</b><span>{chosen?.confidence==="personalized"?l(lang,"व्यक्तिगत","Personalized"):chosen?.confidence==="partially-personalized"?l(lang,"आंशिक व्यक्तिगत","Partially personalized"):l(lang,"सामान्य सङ्केत","General guidance")}</span></div><p>{chosen?.reasons.length?chosen.reasons.slice(0,5).map(reason=>personalReasonLabel(reason,lang)).join(" · "):l(lang,"उपलब्ध समय गणनामा आधारित सङ्केत।","Guidance based on available timing calculations.")}</p>{Boolean(chosen?.cautions.length)&&<p className="mt-astro-window-caution"><CircleAlert size={15}/>{chosen?.cautions.join(" · ")}</p>}</div></> : <p className="mt-astro-empty">{l(lang,"यस मिति वा स्थानका लागि पर्याप्त समय गणना उपलब्ध छैन।","Insufficient timing calculations for this date or location.")}</p>}
    <p className="mt-astro-method">{l(lang,"खगोलीय गणना र परम्परागत ज्योतिष व्याख्या फरक कुरा हुन्। केवल विद्यमान गणना उपलब्ध हुँदा मात्र व्यक्तिगत सङ्केत देखाइन्छ।","Astronomical calculations and traditional astrological interpretations are distinct. Personalized indicators appear only when their source data is available.")}</p>
    {profileOpen && <div className="mt-astro-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setProfileOpen(false);}}><aside className="mt-astro-drawer" role="dialog" aria-modal="true" aria-labelledby="mt-astro-drawer-title"><header><div><span className="mt-astro-overline">{l(lang,"स्थानीय जन्म विवरण","LOCAL BIRTH PROFILE")}</span><h3 id="mt-astro-drawer-title">{l(lang,"मेरो व्यक्तिगत सन्दर्भ","My personal context")}</h3></div><button type="button" ref={closeRef} aria-label={l(lang,"बन्द गर्नुहोस्","Close")} onClick={()=>setProfileOpen(false)}><X size={21}/></button></header><p>{l(lang,"जन्म विवरण यस ब्राउजरमा मात्र सुरक्षित गरिन्छ।","Birth details are stored in this browser only.")}</p><dl>{([[l(lang,"नाम","Name"),birth?.birth?.name],[l(lang,"AD जन्म मिति","AD date of birth"),birth?.birth?.date],[l(lang,"जन्म समय (नेपाल समय)","Birth time (Nepal time)"),birth?.birth?.time],[l(lang,"जन्मस्थान","Birthplace"),birth?.birth?.location],[l(lang,"अक्षांश / देशान्तर","Coordinates"),birth?.birth?.lat != null && birth?.birth?.lng != null ? birth.birth.lat+", "+birth.birth.lng:null],[l(lang,"राशि / लग्न","Rashi / Lagna"),birth?.rashi && birth?.lagna?birth.rashi+" / "+birth.lagna:null]] as Array<[string,string|null|undefined]>).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value || "—"}</dd></div>)}</dl><button type="button" className="mt-astro-edit" onClick={()=>{setProfileOpen(false);p.onEdit();}}>{l(lang,"जन्म विवरण सम्पादन गर्नुहोस्","Edit birth details")} <ArrowUpRight size={16}/></button><a href="/janmapatro">{l(lang,"पूरा जन्मपत्रो खोल्नुहोस्","Open full Janmapatro")} <ArrowUpRight size={15}/></a></aside></div>}
  </section>;
}
