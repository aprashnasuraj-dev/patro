import { useEffect, useMemo, useRef, useState } from "react";
import * as Astronomy from "astronomy-engine";
import { calculateChart, calculateSiderealPlanetPositions, type ChartResult } from "../../jyotish/jyotishEngine";
import { readExistingJanmaPatroBirth } from "../read-existing-birth";
import { l } from "../../useUiLanguage";
import { FeatureGlyph } from "../FeatureGlyph";
import { getFeatureById } from "../catalog";
import { NAKSHATRAS, RASHIS } from "../../patro-tools/core/names";
import { NAKSHATRA_EN, RASHI_EN, todayInNepal, validIsoDate } from "./shared";
import "./workspace.css";

type Props = { language: "ne" | "en"; selectedFeatureId?: string | null };
type ExistingChart = { chart: ChartResult | null; error?: string };

const PLANET_NE:Record<string,string>={Sun:"सूर्य",Moon:"चन्द्र",Mars:"मङ्गल",Mercury:"बुध",Jupiter:"बृहस्पति",Venus:"शुक्र",Saturn:"शनि",Rahu:"राहु",Ketu:"केतु"};
const PLANET_ICON:Record<string,"sun"|"moon"|"saturn"|"node-axis"|"planet">={sun:"sun",moon:"moon",mars:"planet",mercury:"planet",jupiter:"planet",venus:"planet",saturn:"saturn",rahu:"node-axis",ketu:"node-axis"};
function planetIcon(key:string){return PLANET_ICON[key]??"planet";}
const DASHAS=["केतु","शुक्र","सूर्य","चन्द्र","मङ्गल","राहु","बृहस्पति","शनि","बुध"];

function signName(index:number,language:"ne"|"en"){return language==="ne"?RASHIS[index]??"—":RASHI_EN[index]??"—";}
function degree(value:number){return value.toFixed(2)+"°";}
function angleForward(from:number,to:number){return (to-from+360)%360;}
function currentNptTime(){return new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kathmandu",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date());}
function showNptDateTime(value:Date,language:"ne"|"en"){return new Intl.DateTimeFormat(language==="ne"?"ne-NP-u-nu-deva":"en-GB",{timeZone:"Asia/Kathmandu",dateStyle:"medium",hour:"2-digit",minute:"2-digit"}).format(value);}
function yieldToBrowser(){return new Promise<void>(resolve=>setTimeout(resolve,0));}

export function JyotishWorkspace({language,selectedFeatureId}:Props){
  const [saved,setSaved]=useState<ExistingChart|null>(null);
  const [loading,setLoading]=useState(true);
  const [currentInstant,setCurrentInstant]=useState(()=>new Date());
  const [vedicGhati,setVedicGhati]=useState("1");
  const [vedicPala,setVedicPala]=useState("0");
  const [prashnaDate,setPrashnaDate]=useState(()=>todayInNepal());
  const [prashnaTime,setPrashnaTime]=useState(()=>currentNptTime());
  const [prashnaTimezone,setPrashnaTimezone]=useState("Asia/Kathmandu");
  const [prashnaLat,setPrashnaLat]=useState("27.7172");
  const [prashnaLng,setPrashnaLng]=useState("85.3240");
  const [prashnaResult,setPrashnaResult]=useState<ChartResult|null>(null);
  const [prashnaError,setPrashnaError]=useState("");
  const [fullMoonStart,setFullMoonStart]=useState(()=>todayInNepal());
  const [fullMoonDates,setFullMoonDates]=useState<Date[]>([]);
  const [fullMoonCount,setFullMoonCount]=useState(0);
  const [fullMoonRunning,setFullMoonRunning]=useState(false);
  const [fullMoonError,setFullMoonError]=useState("");
  const focus=selectedFeatureId?getFeatureById(selectedFeatureId):null;
  const fullMoonRunRef=useRef(0);
  useEffect(()=>()=>{fullMoonRunRef.current+=1;},[]);
  useEffect(()=>{
    if(selectedFeatureId!=="F041"&&fullMoonRunning){
      fullMoonRunRef.current+=1;
      setFullMoonRunning(false);
      setFullMoonCount(0);
    }
  },[selectedFeatureId,fullMoonRunning]);

  useEffect(()=>{
    let active=true;
    try{
      const birth=readExistingJanmaPatroBirth();
      if(!birth){if(active){setSaved(null);setLoading(false);}return;}
      const timezone=birth.timezone||"Asia/Kathmandu";
      const chart=calculateChart({name:birth.name||"",date:birth.date,time:birth.time,lat:birth.lat,lng:birth.lng,location:birth.location,timezone});
      if(active)setSaved({chart});
    }catch(error){
      if(active)setSaved({chart:null,error:String((error as Error)?.message||error)});
    }finally{if(active)setLoading(false);}
    return()=>{active=false;};
  },[]);

  useEffect(()=>{
    const refresh=()=>setCurrentInstant(new Date());
    const timer=window.setInterval(refresh,60_000);
    window.addEventListener("focus",refresh);
    return()=>{window.clearInterval(timer);window.removeEventListener("focus",refresh);};
  },[]);

  const chart=saved?.chart;
  const moon=chart?.planets.find((item)=>item.key==="moon");
  const rahu=chart?.planets.find((item)=>item.key==="rahu");
  const ketu=chart?.planets.find((item)=>item.key==="ketu");
  const currentSaturn=useMemo(()=>calculateSiderealPlanetPositions(currentInstant).find((item)=>item.key==="saturn")||null,[currentInstant]);
  const sadesatiOffset=moon&&currentSaturn?(currentSaturn.signIndex-moon.signIndex+12)%12:null;
  const sadesatiActive=sadesatiOffset!==null&&[11,0,1].includes(sadesatiOffset);
  const axisSummary=useMemo(()=>{
    if(!chart||!rahu||!ketu)return null;
    const core=chart.planets.filter(item=>!["rahu","ketu"].includes(item.key));
    const offsets=core.map(item=>angleForward(rahu.longitude,item.longitude));
    const allFirst=offsets.every(item=>item<=180),allSecond=offsets.every(item=>item>=180);
    return {candidate:allFirst||allSecond,offsets};
  },[chart,rahu,ketu]);
  const ghatiMinutes=useMemo(()=>Math.max(0,Number(vedicGhati)||0)*24+Math.max(0,Number(vedicPala)||0)*0.4,[vedicGhati,vedicPala]);

  async function runFullMoonCalculation(){
    if(!validIsoDate(fullMoonStart)){
      setFullMoonError(l(language,"मिति जाँच्नुहोस्।","Check the date."));
      return;
    }
    const runId=++fullMoonRunRef.current;
    setFullMoonRunning(true);
    setFullMoonError("");
    setFullMoonDates([]);
    setFullMoonCount(0);
    try{
      let cursor=new Date(fullMoonStart+"T06:15:00Z");
      const rows:Date[]=[];
      let hit=Astronomy.SearchMoonPhase(180,cursor,36);
      for(let i=0;i<1000&&hit;i++){
        if(runId!==fullMoonRunRef.current)return;
        rows.push(hit.date);
        if((i+1)%20===0){
          setFullMoonCount(i+1);
          await yieldToBrowser();
          if(runId!==fullMoonRunRef.current)return;
        }
        cursor=new Date(hit.date.getTime()+60_000);
        hit=Astronomy.SearchMoonPhase(180,cursor,35);
      }
      if(runId!==fullMoonRunRef.current)return;
      setFullMoonDates(rows);
      setFullMoonCount(rows.length);
      if(rows.length!==1000)setFullMoonError(l(language,"उपलब्ध खोज सीमाभित्र १००० पूर्णिमा फेला परेनन्।","The search did not return 1000 full moons within the available calculation range."));
    }catch{
      if(runId===fullMoonRunRef.current)setFullMoonError(l(language,"पूर्णिमा गणना सफल भएन। अर्को सुरु मिति छान्नुहोस्।","The full-moon calculation did not complete. Choose another start date."));
    }finally{
      if(runId===fullMoonRunRef.current)setFullMoonRunning(false);
    }
  }

  return <div className="ap-pjw-root">
    <section className="ap-pjw-card">
      <div className="ap-pjw-subhead"><h3>{l(language,"जन्मपत्रोको सारांश","Birth chart summary")}</h3><small>{l(language,"तपाईंले तयार गर्नुभएको चिना","Your saved birth chart")}</small></div>
      {loading?<div className="ap-pjw-empty" role="status">{l(language,"जन्मपत्रो लोड हुँदैछ…","Loading birth chart…")}</div>:!chart?<div className="ap-pjw-empty"><p>{l(language,"यस पृष्ठमा जन्मपत्रो उपलब्ध छैन। व्यक्तिगत विवरण हेर्न पहिले जन्मपत्रो पृष्ठमा गएर आफ्नो चिना तयार गर्नुहोस्।","Your birth chart is not available on this page. Open JanmaPatro first to create your chart and see personal details.")}</p><a className="ap-pjw-primary" href="/janmapatro">{l(language,"जन्मपत्रो खोल्नुहोस्","Open JanmaPatro")} ↗</a>{saved?.error&&<p className="ap-pjw-inline-error">{l(language,"जन्मपत्रो गणना पूरा हुन सकेन। जन्म समय, स्थान र समयक्षेत्र जाँच्नुहोस्।","The chart could not be calculated. Check the birth time, location and timezone.")}</p>}</div>:<>
        <div className="ap-pjw-date-heading"><div><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F034" symbol="moon" size="inline"/>{l(language,"चन्द्र राशि","Moon sign")}</span><h3>{signName(moon?.signIndex??-1,language)}</h3></div><div className="ap-pjw-meta"><strong>{chart.input.location}</strong><small>{chart.input.date} · {chart.input.time} · {chart.input.timezone||"Asia/Kathmandu"}</small></div></div>
        <div className="ap-pjw-stats">
          <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F035" symbol="nakshatra" size="inline"/>{l(language,"जन्म नक्षत्र","Birth Nakshatra")}</span><strong>{l(language,NAKSHATRAS[chart.moonNakshatraIndex]??"—",NAKSHATRA_EN[chart.moonNakshatraIndex]??"—")}</strong><small>{l(language,"पाद","Pada")} {chart.moonPada}</small></article>
          <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F036" symbol="ascendant" size="inline"/>{l(language,"जन्म लग्न","Ascendant")}</span><strong>{signName(chart.ascSignIndex,language)}</strong><small>{degree(chart.ascendant)}</small></article>
          <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F038" symbol="shield" size="inline"/>{l(language,"मङ्गल दोष","Mangal Dosha")}</span><strong>{l(language,chart.manglik.severity==="None"?"प्रमुख सङ्केत छैन":chart.manglik.severity==="Mild"?"सामान्य":chart.manglik.severity==="Moderate"?"मध्यम":"प्रबल",chart.manglik.severity)}</strong><small>{l(language,"परम्परागत घर-आधारित नियम","Traditional house-based rule")}</small></article>
          <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F044" symbol="orbit" size="inline"/>{l(language,"अयनांश","Ayanamsha")}</span><strong>{degree(chart.ayanamsa)}</strong><small>{l(language,"चिना गणनामा प्रयोग गरिएको","Used for the birth chart")}</small></article>
          <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F037" symbol="sun" size="inline"/>{l(language,"जन्म सूर्य राशि","Natal Sun sign")}</span><strong>{signName(chart.planets.find(p=>p.key==="sun")?.signIndex??-1,language)}</strong><small>{l(language,"जन्म क्षण","Birth instant")}</small></article>
          <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F042" symbol="clock" size="inline"/>{l(language,"गणना समय","Evaluated time")}</span><strong>{new Intl.DateTimeFormat(language==="ne"?"ne-NP-u-nu-deva":"en-GB",{timeZone:chart.input.timezone||"Asia/Kathmandu",hour:"2-digit",minute:"2-digit"}).format(chart.instant)}</strong><small>{l(language,"स्थानीय जन्म समय","Local birth time")}</small></article>
        </div>
        <p className="ap-pjw-section-note">{l(language,"यो सारांश जन्म समय र स्थानका आधारमा तयार गरिएको हो। जन्म विवरण सही नभए लग्न, भाव र सम्बन्धित व्याख्या फरक हुन सक्छ।","This summary is based on your birth time and place. If those details are inaccurate, the ascendant, houses and related interpretations may differ.")}</p>
      </>}
    </section>

    {chart&&<section className="ap-pjw-card">
      <div className="ap-pjw-subhead"><h3 className="ap-pjw-icon-label"><FeatureGlyph featureId="F044" symbol="planet" size="inline"/>{l(language,"जन्मपत्रो ग्रहस्थिति","Natal planetary positions")}</h3><small>{l(language,"राशि, अंश र भाव","Sign, degree and house")}</small></div>
      <div className="ap-pjw-position-wrap"><table className="ap-pjw-position-table"><thead><tr><th scope="col">{l(language,"ग्रह","Graha")}</th><th scope="col">{l(language,"राशि","Sign")}</th><th scope="col">{l(language,"अंश","Degree")}</th><th scope="col">{l(language,"भाव","House")}</th></tr></thead><tbody>{chart.planets.map((planet)=><tr key={planet.key}><td><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F044" symbol={planetIcon(planet.key)} size="inline"/>{l(language,PLANET_NE[planet.name]||planet.name,planet.name)}</span></td><td>{signName(planet.signIndex,language)}</td><td>{degree(planet.degreeInSign)}</td><td>{planet.house===0?"—":l(language,planet.house+"औँ",String(planet.house))}</td></tr>)}</tbody></table></div>
    </section>}

    {selectedFeatureId==="F028"&&<section className="ap-pjw-card">
      <div className="ap-pjw-subhead"><h3>{l(language,"प्रश्न कुण्डली","Prashna Kundali")}</h3><small>{l(language,"अहिलेको प्रश्नका लागि मात्र","For this question only")}</small></div>
      <p className="ap-pjw-section-note" id="ap-pjw-prashna-timezone-description">{l(language,"प्रश्नको मिति, समय र स्थान छान्नुहोस्। समयक्षेत्रको ठाउँमा Asia/Kathmandu जस्तो मान्य नाम राख्नुहोस्; अक्षांश र देशान्तर लग्न गणनाका लागि प्रयोग हुन्छन्। यो गणना प्रश्नको समयका लागि मात्र हो, जन्मपत्रो सुरक्षित गरिँदैन।","Choose the question date, time and place. Enter a valid time-zone name such as Asia/Kathmandu; latitude and longitude are used to calculate the ascendant. This chart is for the selected question time only; it does not save a birth chart.")}</p>
      <div className="ap-pjw-filter-row">
        <label>{l(language,"प्रश्न मिति","Question date")}<input className="ap-pjw-textinput" type="date" value={prashnaDate} onChange={event=>{setPrashnaDate(event.target.value);setPrashnaError("");setPrashnaResult(null)}}/></label>
        <label>{l(language,"समय","Clock time")}<input className="ap-pjw-textinput" type="time" value={prashnaTime} onChange={event=>{setPrashnaTime(event.target.value);setPrashnaError("");setPrashnaResult(null)}}/></label>
        <label>{l(language,"समयक्षेत्र","Time zone")}<input className="ap-pjw-textinput" type="text" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="Asia/Kathmandu" aria-describedby="ap-pjw-prashna-timezone-description" value={prashnaTimezone} onChange={event=>{setPrashnaTimezone(event.target.value);setPrashnaError("");setPrashnaResult(null)}}/></label>
        <label>{l(language,"अक्षांश","Latitude")}<input className="ap-pjw-textinput" inputMode="decimal" type="number" value={prashnaLat} onChange={event=>{setPrashnaLat(event.target.value);setPrashnaError("");setPrashnaResult(null)}} min="-66.5" max="66.5" step="any"/></label>
        <label>{l(language,"देशान्तर","Longitude")}<input className="ap-pjw-textinput" inputMode="decimal" type="number" value={prashnaLng} onChange={event=>{setPrashnaLng(event.target.value);setPrashnaError("");setPrashnaResult(null)}} min="-180" max="180" step="any"/></label>
      </div>
      <div className="ap-pjw-action-row"><button className="ap-pjw-primary" type="button" onClick={()=>{try{if(!validIsoDate(prashnaDate))throw new Error("invalid_date");if(!prashnaTimezone.trim()||!prashnaLat.trim()||!prashnaLng.trim())throw new Error("invalid_birth_location");const latitude=Number(prashnaLat),longitude=Number(prashnaLng);if(!Number.isFinite(latitude)||Math.abs(latitude)>66.5||!Number.isFinite(longitude)||Math.abs(longitude)>180)throw new Error("invalid_birth_location");const chart=calculateChart({name:"Prashna",date:prashnaDate,time:prashnaTime,lat:latitude,lng:longitude,location:"Selected question location",timezone:prashnaTimezone.trim()});setPrashnaResult(chart);setPrashnaError("");}catch{setPrashnaResult(null);setPrashnaError(l(language,"मिति, समय, समयक्षेत्र (IANA), अक्षांश र देशान्तर जाँच्नुहोस्।","Check the date, time, IANA time zone, latitude and longitude."));}}}>{l(language,"प्रश्न कुण्डली गणना गर्नुहोस्","Calculate question chart")}</button><button className="ap-pjw-secondary" type="button" onClick={()=>{setPrashnaDate(todayInNepal());setPrashnaTime(currentNptTime());setPrashnaTimezone("Asia/Kathmandu");setPrashnaLat("27.7172");setPrashnaLng("85.3240");setPrashnaResult(null);setPrashnaError("");}}>{l(language,"काठमाडौंमा रिसेट","Reset to Kathmandu")}</button></div>
      {prashnaError&&<p className="ap-pjw-error" role="alert">{prashnaError}</p>}
      {prashnaResult&&<div className="ap-pjw-feature-focus"><h3>{l(language,"प्रश्न क्षणको सारांश","Question-time summary")}</h3><div className="ap-pjw-stats"><article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F036" symbol="ascendant" size="inline"/>{l(language,"लग्न","Ascendant")}</span><strong>{signName(prashnaResult.ascSignIndex,language)}</strong><small>{degree(prashnaResult.ascendant)}</small></article><article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F034" symbol="moon" size="inline"/>{l(language,"चन्द्र राशि","Moon sign")}</span><strong>{signName(prashnaResult.planets.find(p=>p.key==="moon")?.signIndex??-1,language)}</strong></article><article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F035" symbol="nakshatra" size="inline"/>{l(language,"नक्षत्र","Nakshatra")}</span><strong>{l(language,NAKSHATRAS[prashnaResult.moonNakshatraIndex]??"—",NAKSHATRA_EN[prashnaResult.moonNakshatraIndex]??"—")}</strong><small>{l(language,"पाद","Pada")} {prashnaResult.moonPada}</small></article></div><p className="ap-pjw-section-note">{l(language,"यो नतिजा प्रश्नको छानिएको मिति र समयका लागि हो; जन्मपत्रो वा व्यक्तिगत फलादेश होइन।","This result applies to the selected question date and time; it is not a birth chart or personalized reading.")}</p></div>}
    </section>}

    {chart&&selectedFeatureId==="F032"&&<section className="ap-pjw-feature-focus"><h3>{l(language,"कालसर्प योगका सामान्य मापदण्ड","Basic Kalasarpa Yoga check")}</h3><strong>{axisSummary?.candidate?l(language,"राहु–केतु अक्षभित्र ग्रहहरू पर्ने सम्भावित ढाँचा","A possible Rahu–Ketu axis pattern"):l(language,"यो सरल अक्ष-जाँचमा सबै ग्रह एउटै अर्धवृत्तमा परेनन्","The simple axis check did not place all planets in the same half-circle")}</strong><p>{l(language,"यो राहु–केतु अक्षमा ग्रहहरूको स्थान हेर्ने सामान्य संकेत हो। यसको परम्परागत व्याख्या चलनअनुसार फरक हुन सक्छ।","This is a general indication of planetary positions around the Rahu–Ketu axis. Traditional interpretations may vary.")}</p></section>}

    {chart&&selectedFeatureId==="F033"&&<section className="ap-pjw-feature-focus"><h3>{l(language,"शनि साढेसाती","Shani Sadesati")}</h3><strong>{sadesatiOffset===null?l(language,"जन्म चन्द्र राशि उपलब्ध छैन","Natal Moon sign is unavailable"):sadesatiActive?l(language,"परम्परागत साढेसाती राशिक्षेत्रभित्र","Within the traditional Sadesati sign range"):l(language,"हालको राशि तुलना अनुसार साढेसाती दायरा बाहिर","Outside the traditional Sadesati sign range")}</strong><p>{sadesatiOffset===null?l(language,"पहिले आफ्नो जन्मपत्रो तयार गर्नुहोस्।","Create your birth chart first."):l(language,"जन्म चन्द्र राशिको अघिल्लो, उही वा पछिल्लो राशिमा हालको शनिको निरयण अवस्थालाई तुलना गरिएको छ। राशि सीमा नजिकको प्रवेश/निष्क्रमणको ठ्याक्कै क्षण फरक हुन सक्छ।","This compares the current Saturn sidereal sign with the sign before, the same sign as, or the sign after the natal Moon. Exact ingress/exit instants near sign boundaries may differ.")}</p><p className="ap-pjw-section-note">{l(language,"हालको शनि राशि","Current Saturn sign")}: {currentSaturn?signName(currentSaturn.signIndex,language):"—"} · {l(language,"जन्म चन्द्र राशि","Natal Moon sign")}: {moon?signName(moon.signIndex,language):"—"}</p><a className="ap-pjw-secondary" href="/planets">{l(language,"ग्रह गोचर हेर्नुहोस्","Explore planetary transits")} ↗</a></section>}

    {chart&&<section className="ap-pjw-card">
      <div className="ap-pjw-subhead"><h3 className="ap-pjw-icon-label"><FeatureGlyph featureId="F045" symbol="orbit" size="inline"/>{l(language,"विंशोत्तरी दशा","Vimshottari Dasha")}</h3><small>{l(language,"जन्मपत्रोबाट","From your birth chart")}</small></div>
      <div className="ap-pjw-position-wrap"><table className="ap-pjw-event-table"><thead><tr><th scope="col">{l(language,"दशा स्वामी","Lord")}</th><th scope="col">{l(language,"सुरु","Start")}</th><th scope="col">{l(language,"समाप्त","End")}</th><th scope="col">{l(language,"वर्ष","Years")}</th></tr></thead><tbody>{chart.dashas.map((item,index)=><tr key={item.lord+"-"+index}><td>{l(language,DASHAS[["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"].indexOf(item.lord)]||item.lord,item.lord)}</td><td>{new Intl.DateTimeFormat(language==="ne"?"ne-NP-u-nu-deva":"en-GB",{timeZone:"Asia/Kathmandu",dateStyle:"medium"}).format(item.start)}</td><td>{new Intl.DateTimeFormat(language==="ne"?"ne-NP-u-nu-deva":"en-GB",{timeZone:"Asia/Kathmandu",dateStyle:"medium"}).format(item.end)}</td><td>{item.years.toFixed(2)}</td></tr>)}</tbody></table></div>
    </section>}

    {selectedFeatureId==="F041"&&<section className="ap-pjw-card">
      <div className="ap-pjw-subhead"><h3>{l(language,"१००० पूर्णिमा गणक","1000 Full Moons Calculator")}</h3><small>{l(language,"खगोलीय पूर्णिमा क्षण","Astronomical full-moon instants")}</small></div>
      <p className="ap-pjw-section-note">{l(language,"छानिएको मितिपछि आउने पूर्णिमाका मिति र समय यहाँ हेर्नुहोस्।","View full moon dates and times after the date you select.")}</p>
      <div className="ap-pjw-filter-row"><label>{l(language,"सुरु मिति","Start date")}<input className="ap-pjw-textinput" type="date" value={fullMoonStart} disabled={fullMoonRunning} onChange={event=>{setFullMoonStart(event.target.value);setFullMoonDates([]);setFullMoonError("")}}/></label><button className="ap-pjw-primary" type="button" disabled={fullMoonRunning} aria-live="polite" aria-busy={fullMoonRunning} onClick={runFullMoonCalculation}>{fullMoonRunning?l(language,"गणना हुँदैछ… "+fullMoonCount+"/1000","Calculating… "+fullMoonCount+"/1000"):l(language,"१००० पूर्णिमा गणना","Calculate 1000 full moons")}</button></div>
      {fullMoonError&&<p className="ap-pjw-error" role="alert">{fullMoonError}</p>}
      {fullMoonDates.length>0&&<><p className="ap-pjw-note">{l(language,"कुल प्राप्त पूर्णिमा: ","Full moons found: ")}{fullMoonDates.length}</p><div className="ap-pjw-position-wrap"><table className="ap-pjw-event-table"><thead><tr><th scope="col">#</th><th scope="col">{l(language,"पूर्णिमा (नेपाल समय)","Full moon (Nepal time)")}</th></tr></thead><tbody>{fullMoonDates.slice(0,20).map((item,index)=><tr key={item.toISOString()}><td>{index+1}</td><td>{showNptDateTime(item,language)}</td></tr>)}</tbody></table></div>{fullMoonDates.length>20&&<p className="ap-pjw-section-note">{l(language,"यहाँ पहिलो २० पूर्णिमाका समय देखाइएका छन्।","The first 20 full moon times are shown here.")}</p>}</>}
    </section>}

    {selectedFeatureId==="F042"&&<section className="ap-pjw-card">
      <div className="ap-pjw-subhead"><h3>{l(language,"घटी र पला रूपान्तरण","Ghati and Pala converter")}</h3></div>
      <div className="ap-pjw-filter-row"><label>{l(language,"घटी","Ghati")}<input className="ap-pjw-textinput" inputMode="decimal" type="number" min="0" step="any" value={vedicGhati} onChange={(event)=>setVedicGhati(event.target.value)}/></label><label>{l(language,"पला","Pala")}<input className="ap-pjw-textinput" inputMode="decimal" type="number" min="0" step="any" value={vedicPala} onChange={(event)=>setVedicPala(event.target.value)}/></label></div>
      <div className="ap-pjw-feature-focus"><h3>{l(language,"आधुनिक समयमा","Modern duration")}</h3><strong>{l(language,Math.floor(ghatiMinutes/60)+" घण्टा "+Math.round(ghatiMinutes%60)+" मिनेट",Math.floor(ghatiMinutes/60)+" h "+Math.round(ghatiMinutes%60)+" min")}</strong><p>{l(language,"यहाँ १ घटी = २४ मिनेट र १ पला = २४ सेकेन्डको परम्परागत अनुपात प्रयोग हुन्छ। कुनै स्थानीय घटीका फरक प्रयोगलाई अलग नियमका रूपमा चिनाउनुपर्छ।","This converter uses the traditional ratio of 1 Ghati = 24 minutes and 1 Pala = 24 seconds. Local variants should be treated as separate rules.")}</p></div>
    </section>}

    <section className="ap-pjw-card">
      <div className="ap-pjw-subhead"><h3>{l(language,"ज्योतिषका अन्य उपकरण","More Jyotish tools")}</h3></div>
      <div className="ap-pjw-link-grid">
        <a className="ap-pjw-link-card" href="/janmapatro/milan.html"><strong>{l(language,"गुण मिलान","Guna Milan")}</strong><small>{l(language,"विवाह वा जन्मपत्रो मिलानका लागि गणक।","Compare birth charts for marriage or horoscope matching.")}</small><span>{l(language,"खोल्नुहोस्","Open")} ↗</span></a>
        <a className="ap-pjw-link-card" href="/rashifal"><strong>{l(language,"राशिफल","Rashifal")}</strong><small>{l(language,"दैनिक वैदिक राशिफल।","Daily Vedic horoscope.")}</small><span>{l(language,"खोल्नुहोस्","Open")} ↗</span></a>
        <a className="ap-pjw-link-card" href="/tools/baby-names"><strong>{l(language,"नक्षत्र अनुसार नाम","Nakshatra baby names")}</strong><small>{l(language,"जन्म नक्षत्र तथा अक्षरका आधारमा नाम।","Names from birth Nakshatra and syllables.")}</small><span>{l(language,"खोल्नुहोस्","Open")} ↗</span></a>
        <a className="ap-pjw-link-card" href="/panchang"><strong>{l(language,"दैनिक पञ्चाङ्ग","Daily Panchang")}</strong><small>{l(language,"तिथि, नक्षत्र र दिनका समयखण्ड।","Tithi, Nakshatra and daily windows.")}</small><span>{l(language,"खोल्नुहोस्","Open")} ↗</span></a>
      </div>
    </section>
    {focus?.disposition==="source-review"&&<p className="ap-pjw-method">{l(language,"यो परम्परागत ज्योतिषीय व्याख्या हो; महत्त्वपूर्ण व्यक्तिगत निर्णयका लागि स्थानीय जानकारको सल्लाह पनि लिनुहोस्।","This is a traditional astrological interpretation; consider advice from a trusted local practitioner before making important personal decisions.")}</p>}
  </div>;
}
