import { useEffect, useMemo, useState } from "react";
import { calculateChart, calculateSiderealPlanetPositions, type ChartResult, type SiderealPlanetPosition } from "../../jyotish/jyotishEngine";
import { readExistingJanmaPatroBirth } from "../read-existing-birth";
import { NAKSHATRAS } from "../../patro-tools/core/names";
import { l } from "../../useUiLanguage";
import { addIsoDays, formatLocalDateTime, NAKSHATRA_EN, todayInNepal, validIsoDate } from "./shared";
import { PlanetWheel } from "./PlanetWheel";
import "./workspace.css";

type Props={language:"ne"|"en";selectedFeatureId?:string|null};
const PLANET_NE:Record<string,string>={Sun:"सूर्य",Moon:"चन्द्र",Mars:"मङ्गल",Mercury:"बुध",Jupiter:"बृहस्पति",Venus:"शुक्र",Saturn:"शनि",Rahu:"राहु",Ketu:"केतु"};
const SIGNS_NE=["मेष","वृष","मिथुन","कर्कट","सिंह","कन्या","तुला","वृश्चिक","धनु","मकर","कुम्भ","मीन"];
const SIGNS_EN=["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const ASPECTS=[{angle:0,ne:"युति (०°)",en:"Conjunction (0°)"},{angle:30,ne:"अर्धषडाष्टक कोण (३०°)",en:"Semi-sextile (30°)"},{angle:45,ne:"अर्धचतुर्थ कोण (४५°)",en:"Semi-square (45°)"},{angle:60,ne:"षडाष्टक कोण (६०°)",en:"Sextile (60°)"},{angle:90,ne:"चतुर्थ कोण (९०°)",en:"Square (90°)"},{angle:120,ne:"त्रिकोण (१२०°)",en:"Trine (120°)"},{angle:135,ne:"डेढचतुर्थ कोण (१३५°)",en:"Sesquiquadrate (135°)"},{angle:150,ne:"क्विन्कन्क्स कोण (१५०°)",en:"Quincunx (150°)"},{angle:180,ne:"प्रतियुति (१८०°)",en:"Opposition (180°)"}];
const RETROGRADE_KEYS=new Set(["mercury","venus","mars","jupiter","saturn"]);
function angleDistance(a:number,b:number){const d=Math.abs((a-b+540)%360-180);return Math.min(d,360-d);}
function signedAngle(value:number){return ((value%360)+540)%360-180;}
function instantForNptDate(date:string){return new Date(date+"T06:15:00Z");}
function midnightForNptDate(date:string){return new Date(Date.parse(date+"T00:00:00Z")-345*60_000);}
function nakshatraIndex(position:SiderealPlanetPosition){return Math.floor(position.longitude/(360/27));}
function planetAt(date:Date,key:string){return calculateSiderealPlanetPositions(date).find(item=>item.key===key);}
function localLabel(instant:Date,language:"ne"|"en"){return formatLocalDateTime(instant,language);}
function eventLocalLabel(instant:Date,language:"ne"|"en"){return new Intl.DateTimeFormat(language==="ne"?"ne-NP-u-nu-deva":"en-GB",{timeZone:"Asia/Kathmandu",year:"numeric",month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(instant);}

type IngressEvent={key:string;name:string;fromSign:number;toSign:number;instant:Date};
type StationEvent={key:string;name:string;direction:"direct"|"retrograde";instant:Date};
type NakshatraEvent={key:string;name:string;fromNakshatra:number;toNakshatra:number;instant:Date};

type ScanCancelled = () => boolean;
type PlanetEventScan = {
  ingresses: IngressEvent[];
  nakshatras: NakshatraEvent[];
  stations: StationEvent[];
  seasons: Array<{degree:number;instant:Date}>;
};
const EMPTY_SCAN: PlanetEventScan = {ingresses:[],nakshatras:[],stations:[],seasons:[]};

// Long searches cooperate with rendering/input rather than monopolising the main thread.
function yieldToBrowser():Promise<void>{return new Promise(resolve=>setTimeout(resolve,0));}

async function scanIngresses(startDate:string,days:number,bodyFilter:string,cancelled:ScanCancelled):Promise<IngressEvent[]|null>{
  const output:IngressEvent[]=[];
  let previousDate=midnightForNptDate(startDate);
  let previous=calculateSiderealPlanetPositions(previousDate);
  for(let day=1;day<=days;day++){
    if(cancelled())return null;
    const date=midnightForNptDate(addIsoDays(startDate,day));
    const current=calculateSiderealPlanetPositions(date);
    for(const before of previous){
      if(cancelled())return null;
      if(bodyFilter!=="all"&&before.key!==bodyFilter)continue;
      const after=current.find(item=>item.key===before.key);
      if(!after||after.signIndex===before.signIndex)continue;
      let lo=previousDate.getTime(),hi=date.getTime();
      for(let iteration=0;iteration<26&&hi-lo>60_000;iteration++){
        const mid=new Date((lo+hi)/2);
        const state=planetAt(mid,before.key);
        if(state?.signIndex===before.signIndex)lo=mid.getTime();else hi=mid.getTime();
      }
      output.push({key:before.key,name:before.name,fromSign:before.signIndex,toSign:after.signIndex,instant:new Date(hi)});
    }
    previousDate=date;previous=current;
    if(day%2===0)await yieldToBrowser();
  }
  return output.sort((a,b)=>a.instant.getTime()-b.instant.getTime());
}

async function scanStations(startDate:string,days:number,cancelled:ScanCancelled):Promise<StationEvent[]|null>{
  const output:StationEvent[]=[];
  let previousDate=midnightForNptDate(startDate);
  let previous=calculateSiderealPlanetPositions(previousDate).filter(item=>RETROGRADE_KEYS.has(item.key));
  for(let day=1;day<=days;day++){
    if(cancelled())return null;
    const date=midnightForNptDate(addIsoDays(startDate,day));
    const current=calculateSiderealPlanetPositions(date).filter(item=>RETROGRADE_KEYS.has(item.key));
    for(const before of previous){
      if(cancelled())return null;
      const after=current.find(item=>item.key===before.key);
      if(!after||after.isRetrograde===before.isRetrograde)continue;
      let lo=previousDate.getTime(),hi=date.getTime();
      for(let iteration=0;iteration<26&&hi-lo>60_000;iteration++){
        const mid=new Date((lo+hi)/2);
        const state=planetAt(mid,before.key);
        if(state?.isRetrograde===before.isRetrograde)lo=mid.getTime();else hi=mid.getTime();
      }
      output.push({key:before.key,name:before.name,direction:after.isRetrograde?"retrograde":"direct",instant:new Date(hi)});
    }
    previousDate=date;previous=current;
    if(day%2===0)await yieldToBrowser();
  }
  return output.sort((a,b)=>a.instant.getTime()-b.instant.getTime());
}

async function scanNakshatraIngresses(startDate:string,days:number,bodyFilter:string,cancelled:ScanCancelled):Promise<NakshatraEvent[]|null>{
  const output:NakshatraEvent[]=[];
  const first=midnightForNptDate(startDate);
  const stepMs=6*60*60_000;
  const steps=days*4;
  let previousDate=first;
  let previous=calculateSiderealPlanetPositions(previousDate);
  for(let step=1;step<=steps;step++){
    if(cancelled())return null;
    // The Moon can cross two 13°20′ Nakshatra boundaries within one civil day.
    // Six-hour samples keep each bracket narrow enough to avoid reporting a skipped star.
    const date=new Date(first.getTime()+step*stepMs);
    const current=calculateSiderealPlanetPositions(date);
    for(const before of previous){
      if(cancelled())return null;
      if(bodyFilter!=="all"&&before.key!==bodyFilter)continue;
      const after=current.find(item=>item.key===before.key);
      if(!after||nakshatraIndex(after)===nakshatraIndex(before))continue;
      let lo=previousDate.getTime(),hi=date.getTime();
      for(let iteration=0;iteration<26&&hi-lo>60_000;iteration++){
        const mid=new Date((lo+hi)/2),state=planetAt(mid,before.key);
        if(state&&nakshatraIndex(state)===nakshatraIndex(before))lo=mid.getTime();else hi=mid.getTime();
      }
      const eventTime=new Date(hi);
      if(!output.some(item=>item.key===before.key&&Math.abs(item.instant.getTime()-eventTime.getTime())<60_000)){
        output.push({key:before.key,name:before.name,fromNakshatra:nakshatraIndex(before),toNakshatra:nakshatraIndex(after),instant:eventTime});
      }
    }
    previousDate=date;previous=current;
    if(step%8===0)await yieldToBrowser();
  }
  return output.sort((a,b)=>a.instant.getTime()-b.instant.getTime());
}
async function tropicalSeasonCrossings(startDate:string,days:number,cancelled:ScanCancelled):Promise<Array<{degree:number;instant:Date}>|null>{
  const output:Array<{degree:number;instant:Date}>=[];
  const targets=[0,90,180,270];
  let previousDate=midnightForNptDate(startDate);
  let previous=planetAt(previousDate,"sun");
  for(let day=1;day<=days;day++){
    if(cancelled())return null;
    const date=midnightForNptDate(addIsoDays(startDate,day));
    const current=planetAt(date,"sun");
    if(!previous||!current){previousDate=date;previous=current;if(day%2===0)await yieldToBrowser();continue;}
    for(const target of targets){
      if(cancelled())return null;
      const a=signedAngle(previous.tropicalLongitude-target);
      const b=signedAngle(current.tropicalLongitude-target);
      if((a<=0&&b>0)||(a>0&&b<=0)){
        let lo=previousDate.getTime(),hi=date.getTime();
        const startValue=signedAngle(previous.tropicalLongitude-target);
        for(let iteration=0;iteration<26&&hi-lo>60_000;iteration++){
          const mid=new Date((lo+hi)/2),sun=planetAt(mid,"sun");
          const value=signedAngle((sun?.tropicalLongitude??0)-target);
          if((startValue<=0&&value<=0)||(startValue>0&&value>0))lo=mid.getTime();else hi=mid.getTime();
        }
        if(!output.some(x=>x.degree===target&&Math.abs(x.instant.getTime()-hi)<86_400_000))output.push({degree:target,instant:new Date(hi)});
      }
    }
    previousDate=date;previous=current;
    if(day%2===0)await yieldToBrowser();
  }
  return output;
}

export function PlanetsWorkspace({language,selectedFeatureId}:Props){
  const [date,setDate]=useState(()=>{const value=typeof window!=="undefined"?new URLSearchParams(window.location.search).get("date"):null;return value&&validIsoDate(value)?value:todayInNepal()});
  const [range,setRange]=useState(30);
  const [body,setBody]=useState("all");
  const [searchMode,setSearchMode]=useState<"ingress"|"nakshatra"|"station"|"season">(()=>selectedFeatureId==="F048"?"nakshatra":selectedFeatureId==="F051"||selectedFeatureId==="F078"?"station":selectedFeatureId==="F072"||selectedFeatureId==="F073"||selectedFeatureId==="F074"||selectedFeatureId==="F075"?"season":"ingress");
  const [runScan,setRunScan]=useState(false);
  const [aspectTarget,setAspectTarget]=useState(()=>selectedFeatureId==="F049"?"0":"all");
  const [aspectOrb,setAspectOrb]=useState("2.5");
  const [scanRequest,setScanRequest]=useState(0);
  const [scanState,setScanState]=useState<"idle"|"running"|"done"|"error">("idle");
  const [scanError,setScanError]=useState("");
  const [events,setEvents]=useState<PlanetEventScan>(EMPTY_SCAN);
  useEffect(()=>{if(selectedFeatureId==="F048")setSearchMode("nakshatra");else if(selectedFeatureId==="F051"||selectedFeatureId==="F078")setSearchMode("station");else if(selectedFeatureId==="F072"||selectedFeatureId==="F073"||selectedFeatureId==="F074"||selectedFeatureId==="F075")setSearchMode("season");else if(selectedFeatureId==="F047")setSearchMode("ingress");setRunScan(false);setScanState("idle");setEvents(EMPTY_SCAN);setScanError("");},[selectedFeatureId]);
  useEffect(()=>{if(selectedFeatureId==="F049")setAspectTarget("0");else if(selectedFeatureId==="F050")setAspectTarget("all");},[selectedFeatureId]);
  const [natalChart,setNatalChart]=useState<ChartResult|null>(null);
  const [natalContextChecked,setNatalContextChecked]=useState(false);
  useEffect(()=>{let active=true;try{const birth=readExistingJanmaPatroBirth();if(!birth){if(active)setNatalChart(null);return;}const timezone=birth.timezone||"Asia/Kathmandu";const result=calculateChart({name:birth.name||"",date:birth.date,time:birth.time,lat:birth.lat,lng:birth.lng,location:birth.location,timezone});if(active)setNatalChart(result);}catch{if(active)setNatalChart(null);}finally{if(active)setNatalContextChecked(true);}return()=>{active=false;}},[]);
  const instant=useMemo(()=>instantForNptDate(date),[date]);
  const positions=useMemo(()=>calculateSiderealPlanetPositions(instant),[instant]);
  const sunPosition=positions.find(item=>item.key==="sun");
  const aspects=useMemo(()=>{
    const results:Array<{a:SiderealPlanetPosition;b:SiderealPlanetPosition;target:number;orb:number}>=[];
    const tolerance=Number(aspectOrb);
    for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++){
      const a=positions[i],b=positions[j],separation=angleDistance(a.longitude,b.longitude);
      for(const aspect of ASPECTS){
        if(aspectTarget!=="all"&&String(aspect.angle)!==aspectTarget)continue;
        const orb=Math.abs(separation-aspect.angle);
        if(orb<=tolerance)results.push({a,b,target:aspect.angle,orb});
      }
    }
    return results.sort((a,b)=>a.orb-b.orb).slice(0,50);
  },[positions,aspectTarget,aspectOrb]);
  useEffect(()=>{
    if(!runScan||!validIsoDate(date)){setEvents(EMPTY_SCAN);setScanState("idle");setScanError("");return;}
    let active=true;
    const cancelled=()=>!active;
    setEvents(EMPTY_SCAN);
    setScanError("");
    setScanState("running");
    (async()=>{
      try{
        if(searchMode==="ingress"){
          const rows=await scanIngresses(date,range,body,cancelled);
          if(active&&rows)setEvents({...EMPTY_SCAN,ingresses:rows});
        }else if(searchMode==="nakshatra"){
          const rows=await scanNakshatraIngresses(date,range,body,cancelled);
          if(active&&rows)setEvents({...EMPTY_SCAN,nakshatras:rows});
        }else if(searchMode==="station"){
          const rows=await scanStations(date,range,cancelled);
          if(active&&rows)setEvents({...EMPTY_SCAN,stations:rows});
        }else{
          const rows=await tropicalSeasonCrossings(date,range,cancelled);
          if(active&&rows)setEvents({...EMPTY_SCAN,seasons:rows});
        }
        if(active)setScanState("done");
      }catch{
        if(active){setScanError(l(language,"ग्रह घटना खोज्दा त्रुटि भयो। मिति वा अवधि परिवर्तन गरी पुनः प्रयास गर्नुहोस्।","The planetary event search failed. Change the date or range and try again."));setScanState("error");}
      }
    })();
    return()=>{active=false;};
  },[date,range,body,searchMode,runScan,scanRequest,language]);
  const natalMoonSign=natalChart?.planets.find(item=>item.key==="moon")?.signIndex??null;
  const natalLagnaSign=natalChart?.ascSignIndex??null;
  const transitSummary=useMemo(()=>positions.filter(item=>["Jupiter","Saturn","Mars"].includes(item.name)).map(item=>({planet:item,fromMoon:natalMoonSign===null?null:((item.signIndex-natalMoonSign+12)%12)+1,fromLagna:natalLagnaSign===null?null:((item.signIndex-natalLagnaSign+12)%12)+1})),[positions,natalMoonSign,natalLagnaSign]);
  const focusText=selectedFeatureId==="F052"||selectedFeatureId==="F077";
  const deg=(n:number)=>Number(n).toFixed(2)+"°";

  return <div className="ap-pjw-root">
    <div className="ap-pjw-datebar">
      <label><span>{l(language,"गणना मिति","Evaluation date")}</span><input type="date" value={date} onChange={event=>{setDate(event.target.value);setRunScan(false)}}/></label>
      <button type="button" className="ap-pjw-secondary" onClick={()=>{setDate(todayInNepal());setRunScan(false)}}>{l(language,"आज","Today")}</button>
    </div>
    <section className="ap-pjw-card">
      <div className="ap-pjw-subhead"><h3>{l(language,"निरयण ग्रहस्थिति","Sidereal planetary positions")}</h3><small>{localLabel(instant,language)} · {l(language,"नेपाल समय","NPT")}</small></div>
      <p className="ap-pjw-section-note">{l(language,"ग्रहस्थिति विद्यमान जन्मपत्रो गणकले प्रयोग गर्ने समान दीर्घांश/अयनांश विधिबाट ब्राउजरमै निकालिन्छ। यस तालिकामा भाव/लग्न देखाइएको छैन, किनकि त्यसका लागि अलग स्थान-आधारित कुण्डली आवश्यक हुन्छ।","Positions are calculated locally with the same longitude/ayanamsha functions used by the existing birth-chart engine. Houses/ascendant are not shown here because they require a separate location-based chart.")}</p>
      <p className="ap-pjw-section-note">{l(language,"सूर्यबाट कोणीय दूरी देखाइन्छ; ग्रह अस्त/उदयको निष्कर्ष परम्पराअनुसार फरक सीमामा निर्भर हुने भएकाले स्रोत-पुष्टि भएको सीमा बिना निश्चित निर्णय देखाइँदैन।","Angular distance from the Sun is shown. Combustion/rising interpretation depends on tradition-specific thresholds, so no definitive judgment is made without a reviewed threshold.")}</p>
      <PlanetWheel positions={positions} language={language}/>
      <div className="ap-pjw-position-wrap"><table className="ap-pjw-position-table"><thead><tr><th>{l(language,"ग्रह","Planet")}</th><th>{l(language,"राशि","Sign")}</th><th>{l(language,"राशिमा अंश","Degree in sign")}</th><th>{l(language,"निरयण दीर्घांश","Sidereal longitude")}</th><th>{l(language,"सूर्यबाट कोण","Angular distance from Sun")}</th><th>{l(language,"दैनिक गति","Daily speed")}</th><th>{l(language,"गति","Motion")}</th></tr></thead><tbody>{positions.map(item=><tr key={item.key}><td>{l(language,PLANET_NE[item.name]||item.name,item.name)}</td><td>{l(language,SIGNS_NE[item.signIndex],SIGNS_EN[item.signIndex])}</td><td>{deg(item.degreeInSign)}</td><td>{deg(item.longitude)}</td><td>{sunPosition?deg(angleDistance(item.longitude,sunPosition.longitude)):"—"}</td><td>{deg(item.longitudeSpeedDegPerDay)}</td><td><span className={"ap-pjw-chip"+(item.isRetrograde?" is-warning":"")}>{item.isRetrograde?l(language,"वक्री","Retrograde"):l(language,"मार्गी / सामान्य","Direct")}</span></td></tr>)}</tbody></table></div>
    </section>
    <section className="ap-pjw-card">
      <div className="ap-pjw-subhead"><h3>{l(language,"ग्रह घटना खोजक","Planetary event finder")}</h3><small>{l(language,"स्थानीय गणना · कुनै अनुरोध पठाइँदैन","Local calculation · no request sent")}</small></div>
      <div className="ap-pjw-filter-row">
        <label>{l(language,"घटनाको प्रकार","Event type")}<select className="ap-pjw-select" value={searchMode} onChange={event=>{setSearchMode(event.target.value as typeof searchMode);setRunScan(false)}}><option value="ingress">{l(language,"राशि प्रवेश","Sign ingress")}</option><option value="nakshatra">{l(language,"नक्षत्र प्रवेश","Nakshatra ingress")}</option><option value="station">{l(language,"वक्री / मार्गी स्टेशन","Retrograde/direct station")}</option><option value="season">{l(language,"विषुव / अयनान्त","Equinox / solstice")}</option></select></label>
        <label>{l(language,"खोज अवधि","Search duration")}<select className="ap-pjw-select" value={range} onChange={event=>{setRange(Number(event.target.value));setRunScan(false)}}>{[7,14,30,60,90,180].map(n=><option value={n} key={n}>{l(language,n+" दिन",n+" days")}</option>)}</select></label>
        {(searchMode==="ingress"||searchMode==="nakshatra")&&<label>{l(language,"ग्रह","Planet")}<select className="ap-pjw-select" value={body} onChange={event=>{setBody(event.target.value);setRunScan(false)}}><option value="all">{l(language,"सबै ग्रह","All planets")}</option>{positions.map(item=><option value={item.key} key={item.key}>{l(language,PLANET_NE[item.name]||item.name,item.name)}</option>)}</select></label>}
        <button type="button" className="ap-pjw-primary" disabled={scanState==="running"} onClick={()=>{if(!validIsoDate(date)){setScanError(l(language,"मान्य मिति छान्नुहोस्।","Choose a valid date."));setScanState("error");return;}setRunScan(true);setScanRequest(value=>value+1);}}>{scanState==="running"?l(language,"गणना हुँदैछ…","Scanning…"):l(language,"घटना खोज्नुहोस्","Find events")}</button>
      </div>
      {scanState==="running"?<p className="ap-pjw-section-note" role="status">{l(language,"ग्रहका दिनगत अवस्थाहरू जाँचिँदैछन्। खोज जारी रहँदा पृष्ठ प्रयोग गर्न सक्नुहुन्छ।","Checking daily planetary states. You can continue using the page while the search runs.")}</p>:scanError?<p className="ap-pjw-error" role="alert">{scanError}</p>:!runScan?<p className="ap-pjw-section-note">{l(language,"मिति र अवधि छानेपछि मात्र ब्राउजरले घटना खोज्छ। लामो खोज पृष्ठलाई प्रतिक्रियाशील राख्दै चल्छ।","The browser scans only after you select a date and duration; longer searches yield to keep the page responsive.")}</p>:events.ingresses.length>0?<div className="ap-pjw-position-wrap"><table className="ap-pjw-event-table"><thead><tr><th>{l(language,"ग्रह","Planet")}</th><th>{l(language,"राशिबाट","From sign")}</th><th>{l(language,"राशिमा","Into sign")}</th><th>{l(language,"प्रवेश समय","Ingress time")}</th></tr></thead><tbody>{events.ingresses.map((item,index)=><tr key={item.key+item.instant.toISOString()+index}><td>{l(language,PLANET_NE[item.name]||item.name,item.name)}</td><td>{l(language,SIGNS_NE[item.fromSign],SIGNS_EN[item.fromSign])}</td><td>{l(language,SIGNS_NE[item.toSign],SIGNS_EN[item.toSign])}</td><td>{eventLocalLabel(item.instant,language)}</td></tr>)}</tbody></table></div>:events.nakshatras.length>0?<div className="ap-pjw-position-wrap"><table className="ap-pjw-event-table"><thead><tr><th>{l(language,"ग्रह","Planet")}</th><th>{l(language,"नक्षत्रबाट","From Nakshatra")}</th><th>{l(language,"नक्षत्रमा","Into Nakshatra")}</th><th>{l(language,"प्रवेश समय","Ingress time")}</th></tr></thead><tbody>{events.nakshatras.map((item,index)=><tr key={item.key+item.instant.toISOString()+index}><td>{l(language,PLANET_NE[item.name]||item.name,item.name)}</td><td>{l(language,NAKSHATRAS[item.fromNakshatra]||"नक्षत्र",NAKSHATRA_EN[item.fromNakshatra]||"Nakshatra")}</td><td>{l(language,NAKSHATRAS[item.toNakshatra]||"नक्षत्र",NAKSHATRA_EN[item.toNakshatra]||"Nakshatra")}</td><td>{eventLocalLabel(item.instant,language)}</td></tr>)}</tbody></table></div>:events.stations.length>0?<div className="ap-pjw-position-wrap"><table className="ap-pjw-event-table"><thead><tr><th>{l(language,"ग्रह","Planet")}</th><th>{l(language,"गति परिवर्तन","Motion change")}</th><th>{l(language,"समय","Time")}</th></tr></thead><tbody>{events.stations.map((item,index)=><tr key={item.key+item.instant.toISOString()+index}><td>{l(language,PLANET_NE[item.name]||item.name,item.name)}</td><td>{item.direction==="retrograde"?l(language,"वक्री सुरु","Retrograde station"):l(language,"मार्गी सुरु","Direct station")}</td><td>{eventLocalLabel(item.instant,language)}</td></tr>)}</tbody></table></div>:events.seasons.length>0?<div className="ap-pjw-position-wrap"><table className="ap-pjw-event-table"><thead><tr><th>{l(language,"घटना","Event")}</th><th>{l(language,"समय","Time")}</th></tr></thead><tbody>{events.seasons.map(item=><tr key={item.degree}><td>{l(language,item.degree===0?"वसन्त विषुव":item.degree===90?"ग्रीष्म अयनान्त":item.degree===180?"शरद विषुव":"शीत अयनान्त",item.degree===0?"Vernal equinox":item.degree===90?"Summer solstice":item.degree===180?"Autumnal equinox":"Winter solstice")}</td><td>{eventLocalLabel(item.instant,language)}</td></tr>)}</tbody></table></div>:<div className="ap-pjw-empty">{l(language,"यो खोज अवधिमा घटना फेला परेन।","No event was found in this search window.")}</div>}
    </section>
    <section className="ap-pjw-card">
      <div className="ap-pjw-subhead"><h3>{l(language,"जन्म चन्द्र/लग्नबाट गोचर","Transits from natal Moon/Lagna")}</h3><small>{l(language,"विद्यमान जन्मपत्रो प्रयोग हुन्छ","Uses the existing birth chart")}</small></div>
      {!natalContextChecked?<p className="ap-pjw-section-note">{l(language,"जन्मपत्रो सन्दर्भ जाँचिँदैछ…","Checking the existing birth-chart context…")}</p>:!natalChart?<div className="ap-pjw-empty"><p>{l(language,"गोचर तुलना गर्न विद्यमान जन्मपत्रो आवश्यक छ। नयाँ जन्म विवरण सुरक्षित गरिँदैन।","Transit comparison requires the existing birth chart. No new birth profile is created or saved.")}</p><a className="ap-pjw-secondary" href="/janmapatro">{l(language,"जन्मपत्रो खोल्नुहोस्","Open JanmaPatro")} ↗</a></div>:<>
        <p className="ap-pjw-section-note">{l(language,"यो तालिकाले ग्रहको हालको निरयण राशि जन्म चन्द्र वा जन्म लग्नबाट कति औँ राशिमा पर्छ भनेर देखाउँछ। यसको परम्परागत व्याख्या निश्चित भविष्यवाणी होइन।","This table shows the current sidereal sign of selected planets counted from the natal Moon and natal Lagna. Traditional interpretations are not certain predictions.")}</p>
        <div className="ap-pjw-position-wrap"><table className="ap-pjw-event-table"><thead><tr><th>{l(language,"ग्रह","Planet")}</th><th>{l(language,"राशि","Sign")}</th><th>{l(language,"जन्म चन्द्रबाट","From natal Moon")}</th><th>{l(language,"जन्म लग्नबाट","From natal Lagna")}</th></tr></thead><tbody>{transitSummary.map(item=><tr key={item.planet.key}><td>{l(language,PLANET_NE[item.planet.name]||item.planet.name,item.planet.name)}</td><td>{l(language,SIGNS_NE[item.planet.signIndex],SIGNS_EN[item.planet.signIndex])}</td><td>{item.fromMoon===null?"—":l(language,item.fromMoon+"औँ राशि",item.fromMoon+"th sign")}</td><td>{item.fromLagna===null?"—":l(language,item.fromLagna+"औँ राशि",item.fromLagna+"th sign")}</td></tr>)}</tbody></table></div>
      </>}
    </section>
    <section className="ap-pjw-card">
      <div className="ap-pjw-subhead"><h3>{l(language,"निकट कोणीय सम्बन्ध","Nearby angular aspects")}</h3><small>{l(language,"अधिकतम २.५° ओर्ब","Maximum 2.5° orb")}</small></div>
      <div className="ap-pjw-filter-row">
        <label>{l(language,"कोण छान्नुहोस्","Aspect angle")}
          <select className="ap-pjw-select" value={aspectTarget} onChange={event=>setAspectTarget(event.target.value)}>
            <option value="all">{l(language,"सूचीका सबै कोण","All listed angles")}</option>
            {ASPECTS.map(aspect=><option value={String(aspect.angle)} key={aspect.angle}>{l(language,aspect.ne,aspect.en)}</option>)}
          </select>
        </label>
        <label>{l(language,"सहनशीलता / ओर्ब","Tolerance / orb")}
          <select className="ap-pjw-select" value={aspectOrb} onChange={event=>setAspectOrb(event.target.value)}>
            {[0.5,1,2.5,3,5,8].map(value=><option value={String(value)} key={value}>{l(language,value.toLocaleString("ne-NP")+"°",value+"°")}</option>)}
          </select>
        </label>
      </div>
      <p className="ap-pjw-section-note">{l(language,"यी कोणहरू ज्यामितीय दीर्घांश तुलना हुन्; कुनै कोण आफैंमा शुभ/अशुभ भविष्यवाणी होइन। सीमा र परम्परा फरक हुन सक्छन्।","These are geometric longitude comparisons, not auspicious/inauspicious predictions. Astrological aspect conventions can vary.")}</p>
      {aspects.length?<div className="ap-pjw-position-wrap"><table className="ap-pjw-event-table"><thead><tr><th>{l(language,"पहिलो ग्रह","Planet A")}</th><th>{l(language,"सम्बन्ध","Aspect")}</th><th>{l(language,"दोस्रो ग्रह","Planet B")}</th><th>{l(language,"ओर्ब","Orb")}</th></tr></thead><tbody>{aspects.map((item,index)=><tr key={item.a.key+item.b.key+item.target+index}><td>{l(language,PLANET_NE[item.a.name]||item.a.name,item.a.name)}</td><td>{l(language,ASPECTS.find(aspect=>aspect.angle===item.target)?.ne||"कोण",ASPECTS.find(aspect=>aspect.angle===item.target)?.en||"Aspect")}</td><td>{l(language,PLANET_NE[item.b.name]||item.b.name,item.b.name)}</td><td>{deg(item.orb)}</td></tr>)}</tbody></table></div>:<div className="ap-pjw-empty">{l(language,"यो समयमा २.५° भित्रको मानक कोणीय सम्बन्ध फेला परेन।","No standard aspect within a 2.5° orb was found at this instant.")}</div>}
    </section>
    {focusText&&<p className="ap-pjw-note">{l(language,"ग्रह अस्तको परम्परागत सीमा ग्रहअनुसार फरक हुन्छ। यहाँ सूर्यबाट कोणीय दूरीको आधार उपलब्ध भए पनि कुनै सीमा स्रोत-पुष्टि नगरी निश्चित धार्मिक निर्णयका रूपमा देखाइँदैन।","Traditional combustion limits vary by planet. Angular distances from the Sun can be calculated, but no religious conclusion is presented without a source-reviewed threshold.")}</p>}
    {selectedFeatureId==="F072"||selectedFeatureId==="F073"||selectedFeatureId==="F074"||selectedFeatureId==="F075"?<p className="ap-pjw-note">{l(language,"विषुव र अयनान्त उष्णकटिबन्धीय सूर्य दीर्घांशमा आधारित खगोलीय घटना हुन्; राशिप्रवेशको निरयण प्रणालीसँग एउटै मान्नु हुँदैन।","Equinoxes and solstices use tropical solar longitude and must not be conflated with sidereal sign ingresses.")}</p>:null}
    <div className="ap-pjw-footer-links"><a href="/moon">{l(language,"चन्द्र अवस्था","Moon phases")} ↗</a><a href="/eclipse">{l(language,"ग्रहण विवरण","Eclipse details")} ↗</a><a href="/panchang">{l(language,"दैनिक पञ्चाङ्ग","Daily Panchang")} ↗</a></div>
  </div>;
}
