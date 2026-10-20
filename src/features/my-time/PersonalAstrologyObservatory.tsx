import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CircleAlert, Clock3, Fingerprint, Moon, Sparkles, X } from "lucide-react";
import type { UiLanguage } from "../../i18n";
import { l } from "../../useUiLanguage";
import type { SavedJanmaPatroContext } from "./personal-time-engine";
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
  luckyTime: { start: string; end: string; score: number; confidence: string; activity: string; reasons: string[] } | null;
  onEdit: () => void;
};
function clock(value: string, timezone: string, language: UiLanguage) {
  try { return new Intl.DateTimeFormat(language === "ne" ? "ne-NP" : "en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value)); }
  catch { return "—"; }
}
function Wave({ active, label }: { active: boolean; label: string }) {
  return <svg className={"mt-astro-wave" + (active ? " is-live" : "")} viewBox="0 0 420 100" role="img" aria-label={label} preserveAspectRatio="none">
    <defs><linearGradient id="mt-astro-wave-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".23"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs>
    <path d="M0 55 C24 55 24 24 48 24 S72 80 96 80 S120 31 144 31 S168 68 192 68 S216 18 240 18 S264 76 288 76 S312 39 336 39 S360 61 384 61 S408 45 420 45 L420 100 L0 100Z" fill="url(#mt-astro-wave-fill)"/>
    <path d="M0 55 C24 55 24 24 48 24 S72 80 96 80 S120 31 144 31 S168 68 192 68 S216 18 240 18 S264 76 288 76 S312 39 336 39 S360 61 384 61 S408 45 420 45" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>;
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
    <div className="mt-astro-status" role="status"><span className={"mt-astro-dot"+(available?" is-connected":"")}/>{available?l(lang,"जन्मपत्रो जोडिएको छ","Janmapatro connected"):l(lang,"सामान्य दृश्य · जन्म विवरण आवश्यक","General view · birth profile needed")}<span>{p.selectedDate} · {currentDay}</span></div>
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
        <h3 id="mt-astro-lucky-title">{p.luckyTime ? clock(p.luckyTime.start,timezone,lang)+" – "+clock(p.luckyTime.end,timezone,lang) : l(lang,"व्यक्तिगत समय गणना आवश्यक","Personal timing calculation needed")}</h3>
        <p>{p.luckyTime
          ? l(lang,"जन्मपत्रो, आजको पञ्चाङ्ग र उपलब्ध व्यक्तिगत सङ्केतबाट छानिएको उत्तम समय झ्याल।","Highest-ranked available window from your natal profile, the selected Panchang and available personal signals.")
          : l(lang,"जन्म विवरण सुरक्षित गरी पञ्चाङ्ग गणना लोड गर्नुहोस्। सामान्य समय झ्याललाई व्यक्तिगत शुभ समय भनेर देखाइँदैन।","Save your birth profile and load the Panchang. General timing windows are not presented as your personal lucky time.")}</p>
        {p.luckyTime && <div className="mt-astro-lucky-meta"><strong>{p.luckyTime.score}/100</strong><span>{l(lang,"रुचि","Activity")}: {p.luckyTime.activity}</span><span>{p.luckyTime.confidence==="personalized"?l(lang,"पूर्ण व्यक्तिगत सङ्केत","Personalized signals"):l(lang,"आंशिक व्यक्तिगत सङ्केत","Partially personalized signals")}</span></div>}
        {p.luckyTime?.reasons?.length ? <details className="mt-astro-lucky-reasons"><summary>{l(lang,"यो समय किन छानियो?","Why this time?")}</summary><ul>{p.luckyTime.reasons.slice(0,5).map((reason,index)=><li key={index}>{reason}</li>)}</ul></details> : null}
        <small>{l(lang,"परम्परागत ज्योतिषीय सन्दर्भ मात्र; सफलता वा परिणामको ग्यारेन्टी होइन।","Traditional astrological guidance only; not a guarantee of success or outcomes.")}</small>
      </div>
    </article>
    {ashtama && <div className="mt-astro-alert" role="status"><CircleAlert size={20}/><div><strong>{l(lang,"अष्टम चन्द्र सचेतना","Ashtama Chandra indication")}</strong><p>{l(lang,"परम्परागत रूपमा सावधानीको संकेत; यो निश्चित हानि वा परिणामको भविष्यवाणी होइन।","A traditional caution indication, not a prediction of harm or a definite outcome.")}</p></div></div>}
    <div className="mt-astro-window-head"><div><span className="mt-astro-overline"><Clock3 size={14}/>{l(lang,"व्यक्तिगत समयको नक्सा","PERSONAL TIMING MAP")}</span><h3>{l(lang,"उपलब्ध समय झ्यालहरू","Available timing windows")}</h3></div><span>{l(lang,"छानिएको मिति","Selected date")}: {p.selectedDate}</span></div>
    {ordered.length ? <><div className="mt-astro-timeline" role="group" aria-label={l(lang,"समय झ्याल छान्नुहोस्","Select a timing window")}>{ordered.map(w=><button type="button" key={w.key} onClick={()=>setSelectedKey(w.key)} aria-pressed={chosen?.key===w.key} className={"mt-astro-window is-"+w.label+(current?.key===w.key?" is-current":"")}><span>{clock(w.start,timezone,lang)}–{clock(w.end,timezone,lang)}</span><strong>{w.score}/100</strong><small>{l(lang,w.label==="supportive"?"अनुकूल":w.label==="caution"?"सावधानी":"मिश्रित",w.label)}</small></button>)}</div><div className="mt-astro-window-detail" aria-live="polite"><div><b>{chosen?clock(chosen.start,timezone,lang)+"–"+clock(chosen.end,timezone,lang):"—"}</b><span>{chosen?.confidence==="personalized"?l(lang,"व्यक्तिगत","Personalized"):chosen?.confidence==="partially-personalized"?l(lang,"आंशिक व्यक्तिगत","Partially personalized"):l(lang,"सामान्य सङ्केत","General guidance")}</span></div><p>{chosen?.reasons.length?chosen.reasons.join(" · "):l(lang,"उपलब्ध समय गणनामा आधारित सङ्केत।","Guidance based on available timing calculations.")}</p>{Boolean(chosen?.cautions.length)&&<p className="mt-astro-window-caution"><CircleAlert size={15}/>{chosen?.cautions.join(" · ")}</p>}</div></> : <p className="mt-astro-empty">{l(lang,"यस मिति वा स्थानका लागि पर्याप्त समय गणना उपलब्ध छैन।","Insufficient timing calculations for this date or location.")}</p>}
    <p className="mt-astro-method">{l(lang,"खगोलीय गणना र परम्परागत ज्योतिष व्याख्या फरक कुरा हुन्। केवल विद्यमान गणना उपलब्ध हुँदा मात्र व्यक्तिगत सङ्केत देखाइन्छ।","Astronomical calculations and traditional astrological interpretations are distinct. Personalized indicators appear only when their source data is available.")}</p>
    {profileOpen && <div className="mt-astro-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setProfileOpen(false);}}><aside className="mt-astro-drawer" role="dialog" aria-modal="true" aria-labelledby="mt-astro-drawer-title"><header><div><span className="mt-astro-overline">{l(lang,"स्थानीय जन्म विवरण","LOCAL BIRTH PROFILE")}</span><h3 id="mt-astro-drawer-title">{l(lang,"मेरो व्यक्तिगत सन्दर्भ","My personal context")}</h3></div><button type="button" ref={closeRef} aria-label={l(lang,"बन्द गर्नुहोस्","Close")} onClick={()=>setProfileOpen(false)}><X size={21}/></button></header><p>{l(lang,"जन्म विवरण यस ब्राउजरमा मात्र सुरक्षित गरिन्छ।","Birth details are stored in this browser only.")}</p><dl>{([[l(lang,"नाम","Name"),birth?.birth?.name],[l(lang,"AD जन्म मिति","AD date of birth"),birth?.birth?.date],[l(lang,"जन्म समय (नेपाल समय)","Birth time (Nepal time)"),birth?.birth?.time],[l(lang,"जन्मस्थान","Birthplace"),birth?.birth?.location],[l(lang,"अक्षांश / देशान्तर","Coordinates"),birth?.birth?.lat != null && birth?.birth?.lng != null ? birth.birth.lat+", "+birth.birth.lng:null],[l(lang,"राशि / लग्न","Rashi / Lagna"),birth?.rashi && birth?.lagna?birth.rashi+" / "+birth.lagna:null]] as Array<[string,string|null|undefined]>).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value || "—"}</dd></div>)}</dl><button type="button" className="mt-astro-edit" onClick={()=>{setProfileOpen(false);p.onEdit();}}>{l(lang,"जन्म विवरण सम्पादन गर्नुहोस्","Edit birth details")} <ArrowUpRight size={16}/></button><a href="/janmapatro">{l(lang,"पूरा जन्मपत्रो खोल्नुहोस्","Open full Janmapatro")} <ArrowUpRight size={15}/></a></aside></div>}
  </section>;
}
