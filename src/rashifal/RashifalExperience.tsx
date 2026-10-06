import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";
import { setPageTitle } from "../title";
import { l, useUiLanguage } from "../useUiLanguage";
import "./rashifal-experience.css";

type Period = "daily" | "weekly" | "monthly" | "yearly";
type System = "vedic" | "western";
type Calendar = "bs" | "gregorian";
type Mode = "universal" | "personalized";
type Language = "ne" | "en";
type Reading = {
  id?: string | null;
  system?: System;
  sign?: { id?: string; name_ne?: string; name_en?: string; symbol?: string } | string;
  scores?: { overall?: number; domains?: Record<string, number> };
  narrative?: Record<Language, { summary?: string; sections?: Array<{domain?:string;title?:string;text?:string;band?:string;score?:number}>; note?: string }>;
  summary_ne?: string;
  summary_en?: string;
  method?: Record<string, unknown>;
  timeline?: Array<{date?:string;overall?:number}>;
};
type Publication = {
  schema_version?: string;
  period?: Period;
  system?: System;
  calendar?: Calendar;
  window?: { key?:string; start_date?:string; end_date_exclusive?:string; start_bs?:string; last_date_bs?:string };
  readings?: Reading[];
  reading?: Reading;
  broadcast_key?: string;
  publication_strategy?: string;
  generated_at?: string;
  birth_profile?: { precision?:string; note_ne?:string; note_en?:string; anchor_sign?:any };
};

const PERIODS: Period[] = ["daily","weekly","monthly","yearly"];
const SYSTEMS: System[] = ["vedic","western"];
const PREF_KEY = "patro.rashifal.sign.v2";
const CACHE_PREFIX = "patro.rashifal.broadcast.v3.";
const SIGNS = [
  ["aries","मेष","Aries","♈"],["taurus","वृष","Taurus","♉"],["gemini","मिथुन","Gemini","♊"],
  ["cancer","कर्कट","Cancer","♋"],["leo","सिंह","Leo","♌"],["virgo","कन्या","Virgo","♍"],
  ["libra","तुला","Libra","♎"],["scorpio","वृश्चिक","Scorpio","♏"],["sagittarius","धनु","Sagittarius","♐"],
  ["capricorn","मकर","Capricorn","♑"],["aquarius","कुम्भ","Aquarius","♒"],["pisces","मीन","Pisces","♓"],
] as const;
const DOMAIN_LABELS: Record<string,[string,string]> = {
  work:["काम","Work"], resources:["स्रोत र खर्च","Resources"], relationships:["सम्बन्ध","Relationships"], wellbeing:["दैनिक सन्तुलन","Daily balance"], learning:["सिकाइ","Learning"],
};

function todayNepal(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
function periodLabel(period:Period,language:Language){return period==="daily"?l(language,"दैनिक","Daily"):period==="weekly"?l(language,"साप्ताहिक","Weekly"):period==="monthly"?l(language,"मासिक","Monthly"):l(language,"वार्षिक","Yearly");}
function systemLabel(system:System,language:Language){return system==="vedic"?l(language,"वैदिक","Vedic"):l(language,"पाश्चात्य","Western");}
function signId(reading:Reading){return String(typeof reading?.sign==="string"?reading.sign:reading?.sign?.id||"").toLowerCase();}
function signMeta(id:string){return SIGNS.find(item=>item[0]===id)||null;}
function score(value:unknown){const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(100,n)):50;}
function cacheKey(period:Period,system:System,calendar:Calendar,date:string,sign:string){return `${CACHE_PREFIX}${period}.${system}.${calendar}.${date}.${sign||"all"}`;}
function readCache(key:string):Publication|null{try{return JSON.parse(localStorage.getItem(key)||"null")?.data||null}catch{return null}}
function writeCache(key:string,data:Publication){try{localStorage.setItem(key,JSON.stringify({saved_at:new Date().toISOString(),data}))}catch{}}
function summary(reading:Reading,language:Language){return reading?.narrative?.[language]?.summary || (language==="ne"?reading?.summary_ne:reading?.summary_en) || reading?.summary_ne || reading?.summary_en || "";}
function sections(reading:Reading,language:Language){
  const rich=reading?.narrative?.[language]?.sections;
  if(Array.isArray(rich)&&rich.length)return rich;
  return Object.entries(reading?.scores?.domains||{}).map(([domain,value])=>({domain,title:DOMAIN_LABELS[domain]?.[language==="ne"?0:1]||domain,text:"",score:value}));
}
function windowLabel(publication:Publication,language:Language){
  const w=publication?.window;if(!w)return "";
  if(w.start_bs&&w.last_date_bs)return language==="ne"?`वि.सं. ${w.start_bs} → ${w.last_date_bs}`:`BS ${w.start_bs} → ${w.last_date_bs}`;
  return [w.start_date,w.end_date_exclusive].filter(Boolean).join(" → ");
}
async function fetchUniversal(period:Period,system:System,calendar:Calendar,date:string,sign:string,signal:AbortSignal){
  const q=new URLSearchParams({period,system,calendar,date});if(sign)q.set("sign",sign);
  const response=await fetch(`/api/v1/rashifal/universal?${q}`,{signal,credentials:"same-origin",headers:{accept:"application/json"}});
  const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body?.error||`HTTP ${response.status}`);return body as Publication;
}

function ScoreRing({value}:{value:number}){const n=Math.round(score(value));return <div className="rx-score-ring" style={{"--score":`${n*3.6}deg`} as CSSProperties}><strong>{n}</strong><span>/100</span></div>}
function ReadingCard({reading,language,featured=false}:{reading:Reading;language:Language;featured?:boolean}){
  const id=signId(reading), meta=signMeta(id), overall=score(reading?.scores?.overall), parts=sections(reading,language);
  const name=language==="ne"?(typeof reading.sign==="object"?reading.sign?.name_ne:"")||meta?.[1]||id:(typeof reading.sign==="object"?reading.sign?.name_en:"")||meta?.[2]||id;
  const glyph=(typeof reading.sign==="object"?reading.sign?.symbol:"")||meta?.[3]||"✦";
  return <article className={`rx-reading ${featured?"is-featured":""}`}>
    <header className="rx-reading-head"><div className="rx-zodiac-orb" aria-hidden="true">{glyph}</div><div><small>{systemLabel((reading.system||"vedic") as System,language)}</small><h2>{name}</h2></div><ScoreRing value={overall}/></header>
    <p className="rx-summary">{summary(reading,language)}</p>
    <div className="rx-domain-grid">{parts.map((part,index)=>{const v=score(part.score??reading?.scores?.domains?.[part.domain||""]);return <section key={part.domain||index} className={`rx-domain band-${part.band||"balanced"}`}><div><b>{part.title||DOMAIN_LABELS[part.domain||""]?.[language==="ne"?0:1]||part.domain}</b><span>{Math.round(v)}</span></div><progress max="100" value={v}/>{part.text?<p>{part.text}</p>:null}</section>})}</div>
    <footer className="rx-reading-note">{reading?.narrative?.[language]?.note||l(language,"यो सम्पादकीय ज्योतिषीय सूचक हो, निश्चित भविष्यवाणी होइन।","This is an editorial astrology index, not a certain prediction.")}</footer>
  </article>;
}

export function RashifalExperience(){
  const siteLanguage=useUiLanguage();
  const [language,setLanguage]=useState<Language>(siteLanguage);
  const [mode,setMode]=useState<Mode>("universal");
  const [period,setPeriod]=useState<Period>("daily");
  const [system,setSystem]=useState<System>("vedic");
  const [calendar,setCalendar]=useState<Calendar>("bs");
  const [date,setDate]=useState(todayNepal);
  const [selectedSign,setSelectedSign]=useState(()=>{try{return localStorage.getItem(PREF_KEY)||""}catch{return ""}});
  const [remember,setRemember]=useState(()=>{try{return Boolean(localStorage.getItem(PREF_KEY))}catch{return false}});
  const [publication,setPublication]=useState<Publication|null>(null);
  const [personal,setPersonal]=useState<Publication|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [personalError,setPersonalError]=useState("");

  useEffect(()=>setLanguage(siteLanguage),[siteLanguage]);
  useEffect(()=>setPageTitle(language==="ne"?"राशिफल":"Rashifal"),[language]);

  const currentKey=useMemo(()=>cacheKey(period,system,calendar,date,selectedSign),[period,system,calendar,date,selectedSign]);
  useEffect(()=>{
    if(mode!=="universal")return;
    const controller=new AbortController();setLoading(true);setError("");
    const cached=readCache(currentKey);if(cached)setPublication(cached);
    fetchUniversal(period,system,calendar,date,selectedSign,controller.signal).then(data=>{setPublication(data);writeCache(currentKey,data);}).catch(cause=>{if(!cached&&cause?.name!=="AbortError")setError(l(language,"राशिफल प्रकाशन अहिले उपलब्ध छैन।","Rashifal publication is currently unavailable."));}).finally(()=>setLoading(false));
    return()=>controller.abort();
  },[mode,period,system,calendar,date,selectedSign,currentKey,language]);

  const chooseSign=(id:string)=>{setSelectedSign(id);if(remember)try{localStorage.setItem(PREF_KEY,id)}catch{}};
  const toggleRemember=(value:boolean)=>{setRemember(value);try{if(value&&selectedSign)localStorage.setItem(PREF_KEY,selectedSign);else if(!value)localStorage.removeItem(PREF_KEY)}catch{}};

  async function calculatePersonal(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setPersonalError("");setPersonal(null);setLoading(true);
    const form=new FormData(event.currentTarget),local_date=String(form.get("birth_date")||""),local_time=String(form.get("birth_time")||"");
    try{
      const response=await fetch("/api/v1/rashifal/personalized",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify({period,system,calendar,date,consent:form.get("consent")==="on",birth:{local_date,...(local_time?{local_time}:{})}})});
      const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body?.error||`HTTP ${response.status}`);setPersonal(body);
    }catch{setPersonalError(l(language,"व्यक्तिगत राशिफल बनाउन सकिएन। जन्ममिति जाँचेर फेरि प्रयास गर्नुहोस्।","Could not create the personal Rashifal. Check the birth date and try again."));}
    finally{setLoading(false)}
  }

  const readings=(mode==="universal"?publication?.readings:personal?.readings)||[];
  const personalNote=personal?.birth_profile?.[language==="ne"?"note_ne":"note_en"]||"";

  return <main className="rx-page" id="main-content">
    <section className="rx-hero">
      <div className="rx-cosmos" aria-hidden="true"><i/><i/><i/></div>
      <div className="rx-hero-copy"><span className="rx-eyebrow">{l(language,"आफ्नै ज्योतिष · नेपाल समय","Aafnai Jyotish · Nepal time")}</span><h1>{l(language,"राशिफल","Rashifal")}</h1><p>{l(language,"एक पटक अवधिअनुसार तयार हुने साझा राशिफल — दैनिक, साप्ताहिक, मासिक र वार्षिक। जन्ममिति दिएपछि निजी दृश्य यही ब्राउजर अनुरोधमा गणना हुन्छ; जन्म विवरण भण्डारण हुँदैन।","One period-keyed broadcast for everyone — daily, weekly, monthly and yearly. Add a birthday for a private view calculated in that request; birth details are not stored.")}</p><div className="rx-hero-badges"><span>☾ Lahiri</span><span>☊ {l(language,"Mean Rahu","Mean Rahu")}</span><span>◇ {l(language,"Whole-sign","Whole-sign")}</span><span>⚡ Edge broadcast</span></div></div>
      <div className="rx-hero-actions"><button type="button" onClick={()=>setLanguage(language==="ne"?"en":"ne")}>{language==="ne"?"English":"नेपाली"}</button><a href="/jyotish/china">{l(language,"जन्मपत्रो खोल्नुहोस्","Open Janma Patro")}</a></div>
    </section>

    <section className="rx-control-deck">
      <div className="rx-mode-switch" aria-label={l(language,"दृश्य","View mode")}><button className={mode==="universal"?"is-active":""} onClick={()=>setMode("universal")}>{l(language,"सार्वभौमिक","Universal")}</button><button className={mode==="personalized"?"is-active":""} onClick={()=>setMode("personalized")}>{l(language,"मेरो जन्ममिति","My birthday")}</button></div>
      <nav className="rx-tabs" aria-label={l(language,"अवधि","Period")}>{PERIODS.map(item=><button key={item} type="button" className={period===item?"is-active":""} onClick={()=>setPeriod(item)}>{periodLabel(item,language)}</button>)}</nav>
      <div className="rx-selectors">
        <label><span>{l(language,"परम्परा","System")}</span><select value={system} onChange={e=>setSystem(e.target.value as System)}>{SYSTEMS.map(item=><option key={item} value={item}>{systemLabel(item,language)}</option>)}</select></label>
        {(period==="monthly"||period==="yearly")?<label><span>{l(language,"अवधि पात्रो","Period calendar")}</span><select value={calendar} onChange={e=>setCalendar(e.target.value as Calendar)}><option value="bs">{l(language,"विक्रम संवत्","Bikram Sambat")}</option><option value="gregorian">Gregorian</option></select></label>:null}
        <label><span>{l(language,"सन्दर्भ मिति","Reference date")}</span><input type="date" value={date} onChange={e=>setDate(e.target.value)} /></label>
      </div>
      <div className="rx-broadcast-strip"><span className="rx-live-dot"/>{l(language,"एउटै अवधि key बाट बनेको प्रकाशन सबैलाई प्रसारण हुन्छ; D1/R2 publication read आवश्यक छैन।","The same period-keyed publication is broadcast to everyone; no D1/R2 publication read is required.")} {publication?.window?<b>{windowLabel(publication,language)}</b>:null}</div>
    </section>

    {mode==="universal"?<section className="rx-universal">
      <div className="rx-section-head"><div><span>{l(language,"राशि छान्नुहोस्","Choose a sign")}</span><h2>{l(language,"सबै १२ राशि वा आफ्नो राशि","All 12 signs or yours")}</h2></div><label className="rx-remember"><input type="checkbox" checked={remember} onChange={e=>toggleRemember(e.target.checked)}/>{l(language,"यस यन्त्रमा सम्झनुहोस्","Remember on this device")}</label></div>
      <div className="rx-sign-picker"><button className={!selectedSign?"is-selected":""} onClick={()=>chooseSign("")}><span>✦</span>{l(language,"सबै","All")}</button>{SIGNS.map(([id,ne,en,glyph])=><button key={id} className={selectedSign===id?"is-selected":""} onClick={()=>chooseSign(id)}><span>{glyph}</span>{language==="ne"?ne:en}</button>)}</div>
    </section>:<section className="rx-personal-panel">
      <div className="rx-section-head"><div><span>{l(language,"निजी · no-store","Private · no-store")}</span><h2>{l(language,"जन्ममिति-आधारित राशिफल","Birthday-based Rashifal")}</h2><p>{l(language,"जन्मसमय थाहा भए दिनुहोस्। समय नदिए दिउँसो १२ बजे नेपाल समयलाई अस्थायी एङ्कर मानिन्छ। ठीक चन्द्र राशि र पूर्ण जन्मविश्लेषणका लागि जन्मपत्रो प्रयोग गर्नुहोस्।","Add a birth time when known. Without it, noon Nepal time is used as a temporary anchor. Use Janma Patro for an exact Moon-sign and full birth analysis.")}</p></div><a href="/jyotish/china">{l(language,"जन्मपत्रो →","Janma Patro →")}</a></div>
      <form onSubmit={calculatePersonal} className="rx-birth-form" autoComplete="off"><label><span>{l(language,"जन्ममिति","Birth date")}</span><input required name="birth_date" type="date" max={todayNepal()}/></label><label><span>{l(language,"जन्मसमय (वैकल्पिक)","Birth time (optional)")}</span><input name="birth_time" type="time" step="60"/></label><label className="rx-consent"><input required name="consent" type="checkbox"/> <span>{l(language,"यो विवरण यही गणनाका लागि मात्र प्रयोग गर्न सहमत छु; यसलाई भण्डारण नगरियोस्।","I consent to using these details only for this calculation; do not store them.")}</span></label><button type="submit" disabled={loading}>{l(language,"मेरो राशिफल बनाउनुहोस्","Create my Rashifal")}</button></form>
      {personalNote?<p className="rx-precision-note">{personalNote}</p>:null}
    </section>}

    {loading?<div className="rx-status"><span className="rx-spinner"/>{l(language,"राशिफल गणना हुँदैछ…","Calculating Rashifal…")}</div>:null}
    {error?<div className="rx-status is-error">{error}</div>:null}{personalError?<div className="rx-status is-error">{personalError}</div>:null}

    {readings.length?<section className={`rx-readings ${readings.length===1?"is-single":""}`}>{readings.map((reading,index)=><ReadingCard key={String(reading.id||signId(reading)||index)} reading={reading} language={language} featured={readings.length===1}/>)}</section>:!loading&&!error&&!personalError?<div className="rx-empty">{mode==="personalized"?l(language,"जन्ममिति राखेर निजी राशिफल बनाउनुहोस्।","Enter your birthday to create a personal Rashifal."):l(language,"यो अवधिको प्रकाशन उपलब्ध छैन।","This period is not available.")}</div>:null}

    <section className="rx-method-card"><div><b>{l(language,"कसरी काम गर्छ?","How it works")}</b><p>{l(language,"दैनिक ४ नमुना, साप्ताहिक २/दिन, मासिक १/दिन र वार्षिक २४ नमुनाबाट सम्पादकीय सूचक बनाइन्छ। वैदिक दृश्यमा Lahiri sidereal, mean Rahu र whole-sign house प्रयोग हुन्छ।","Editorial indices use 4 daily samples, 2/day weekly, 1/day monthly and 24 yearly samples. The Vedic view uses Lahiri sidereal context, mean Rahu and whole-sign houses.")}</p></div><div><b>{l(language,"महत्त्वपूर्ण","Important")}</b><p>{l(language,"राशिफल परम्परागत ज्योतिषीय व्याख्या हो; वैज्ञानिक निश्चितता वा स्वास्थ्य, कानुनी वा आर्थिक निर्णयको विकल्प होइन।","Rashifal is a traditional astrological interpretation, not scientific certainty or a substitute for health, legal or financial decisions.")}</p></div></section>
  </main>;
}
