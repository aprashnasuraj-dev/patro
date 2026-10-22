import { useMemo, useState } from "react";
import { calculateSiderealPlanetPositions, type SiderealPlanetPosition } from "../../jyotish/jyotishEngine";
import { useUiLanguage, l } from "../../useUiLanguage";
import { addIsoDays, formatLocalDateTime, todayInNepal, validIsoDate } from "./shared";
import "./workspace.css";

type Props={language:"ne"|"en";selectedFeatureId?:string|null};
const PLANET_NE:Record<string,string>={Sun:"सूर्य",Moon:"चन्द्र",Mars:"मङ्गल",Mercury:"बुध",Jupiter:"बृहस्पति",Venus:"शुक्र",Saturn:"शनि",Rahu:"राहु",Ketu:"केतु"};
const SIGNS_NE=["मेष","वृष","मिथुन","कर्कट","सिंह","कन्या","तुला","वृश्चिक","धनु","मकर","कुम्भ","मीन"];
const SIGNS_EN=["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const ASPECTS=[{angle:0,ne:"युति",en:"Conjunction"},{angle:60,ne:"षडाष्टक कोण (६०°)",en:"Sextile"},{angle:90,ne:"चतुर्थ कोण (९०°)",en:"Square"},{angle:120,ne:"त्रिकोण (१२०°)",en:"Trine"},{angle:180,ne:"प्रतियुति (१८०°)",en:"Opposition"}];
const RETROGRADE_KEYS=new Set(["Mercury","Venus","Mars","Jupiter","Saturn"]);
function angleDistance(a:number,b:number){const d=Math.abs((a-b+540)%360-180);return Math.min(d,360-d);}
function signedAngle(value:number){return ((value%360)+540)%360-180;}
function instantForNptDate(date:string){return new Date(date+"T06:15:00Z");}
function planetAt(date:Date,key:string){return calculateSiderealPlanetPositions(date).find(item=>item.key===key);}
function localLabel(instant:Date,language:"ne"|"en"){return formatLocalDateTime(instant,language);}

type IngressEvent={key:string;name:string;fromSign:number;toSign:number;instant:Date};
type StationEvent={key:string;name:string;direction:"direct"|"retrograde";instant:Date};

function scanIngresses(startDate:string,days:number,bodyFilter:string):IngressEvent[]{
  const output:IngressEvent[]=[];
  let previousDate=instantForNptDate(startDate);
  let previous=calculateSiderealPlanetPositions(previousDate);
  for(let day=1;day<=days;day++){
    const date=instantForNptDate(addIsoDays(startDate,day));
    const current=calculateSiderealPlanetPositions(date);
    for(const before of previous){
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
  }
  return output;
}

function scanStations(startDate:string,days:number):StationEvent[]{
  const output:StationEvent[]=[];
  let previousDate=instantForNptDate(startDate);
  let previous=calculateSiderealPlanetPositions(previousDate).filter(item=>RETROGRADE_KEYS.has(item.key));
  for(let day=1;day<=days;day++){
    const date=instantForNptDate(addIsoDays(startDate,day));
    const current=calculateSiderealPlanetPositions(date).filter(item=>RETROGRADE_KEYS.has(item.key));
    for(const before of previous){
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
  }
  return output;
}

function tropicalSeasonCrossings(startDate:string,days:number):Array<{degree:number;instant:Date}>{
  const output:Array<{degree:number;instant:Date}>=[];
  const targets=[0,90,180,270];
  const unwrap=(a:number,b:number)=>((b-a+540)%360)-180;
  let previousDate=instantForNptDate(startDate);
  let previous=planetAt(previousDate,"Sun");
  for(let day=1;day<=days;day++){
    const date=instantForNptDate(addIsoDays(startDate,day));
    const current=planetAt(date,"Sun");
    if(!previous||!current){previousDate=date;previous=current;continue;}
    for(const target of targets){
      const a=signedAngle(previous.tropicalLongitude-target);
      const b=signedAngle(current.tropicalLongitude-target);
      if((a<=0&&b>0)||(a>0&&b<=0)||Math.abs(unwrap(previous.tropicalLongitude,current.tropicalLongitude))>180){
        let lo=previousDate.getTime(),hi=date.getTime();
        const startValue=signedAngle(previous.tropicalLongitude-target);
        for(let iteration=0;iteration<26&&hi-lo>60_000;iteration++){
          const mid=new Date((lo+hi)/2),sun=planetAt(mid,"Sun");
          const value=signedAngle((sun?.tropicalLongitude??0)-target);
          if((startValue<=0&&value<=0)||(startValue>0&&value>0))lo=mid.getTime();else hi=mid.getTime();
        }
        if(!output.some(x=>x.degree===target&&Math.abs(x.instant.getTime()-hi)<86_400_000))output.push({degree:target,instant:new Date(hi)});
      }
    }
    previousDate=date;previous=current;
  }
  return output;
}

export function PlanetsWorkspace({language,selectedFeatureId}:Props){
  const [date,setDate]=useState(()=>{const value=typeof window!=="undefined"?new URLSearchParams(window.location.search).get("date"):null;return value&&validIsoDate(value)?value:todayInNepal()});
  const [range,setRange]=useState(30);
  const [body,setBody]=useState("all");
  const [searchMode,setSearchMode]=useState<"ingress"|"station"|"season">("ingress");
  const [runScan,setRunScan]=useState(false);
  const instant=useMemo(()=>instantForNptDate(date),[date]);
  const positions=useMemo(()=>calculateSiderealPlanetPositions(instant),[instant]);
  const aspects=useMemo(()=>{
    const results:Array<{a:SiderealPlanetPosition;b:SiderealPlanetPosition;target:number;orb:number}>=[];
    for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++){
      const a=positions[i],b=positions[j],separation=angleDistance(a.longitude,b.longitude);
      for(const aspect of ASPECTS){const orb=Math.abs(separation-aspect.angle);if(orb<=2.5)results.push({a,b,target:aspect.angle,orb});}
    }
    return results.sort((a,b)=>a.orb-b.orb).slice(0,20);
  },[positions]);
  const events=useMemo(()=>{
    if(!runScan||!validIsoDate(date))return {ingresses:[] as IngressEvent[],stations:[] as StationEvent[],seasons:[] as Array<{degree:number;instant:Date}>};
    if(searchMode==="ingress")return {ingresses:scanIngresses(date,range,body),stations:[] as StationEvent[],seasons:[] as Array<{degree:number;instant:Date}>};
    if(searchMode==="station")return {ingresses:[] as IngressEvent[],stations:scanStations(date,range),seasons:[] as Array<{degree:number;instant:Date}>};
    return {ingresses:[] as IngressEvent[],stations:[] as StationEvent[],seasons:tropicalSeasonCrossings(date,range)};
  },[date,range,body,searchMode,runScan]);
  const focusText=selectedFeatureId==="F052"||selectedFeatureId==="F077";
  const deg=n=>Number(n).toFixed(2)+"°";

  return <div className="ap-pjw-root">
    <div className="ap-pjw-datebar">
      <label><span>{l(language,"गणना मिति","Evaluation date")}</span><input type="date" value={date} onChange={event=>{setDate(event.target.value);setRunScan(false)}}/></label>
      <button type="button" className="ap-pjw-secondary" onClick={()=>{setDate(todayInNepal());setRunScan(false)}}>{l(language,"आज","Today")}</button>
    </div>
    <section className="ap-pjw-card">
      <div className="ap-pjw-subhead"><h3>{l(language,"निरयण ग्रहस्थिति","Sidereal planetary positions")}</h3><small>{localLabel(instant,language)} · {l(language,"नेपाल समय","NPT")}</small></div>
      <p className="ap-pjw-section-note">{l(language,"ग्रहस्थिति विद्यमान जन्मपत्रो गणकले प्रयोग गर्ने समान दीर्घांश/अयनांश विधिबाट ब्राउजरमै निकालिन्छ। यस तालिकामा भाव/लग्न देखाइएको छैन, किनकि त्यसका लागि अलग स्थान-आधारित कुण्डली आवश्यक हुन्छ।","Positions are calculated locally with the same longitude/ayanamsha functions used by the existing birth-chart engine. Houses/ascendant are not shown here because they require a separate location-based chart.")}</p>
      <div className="ap-pjw-position-wrap"><table className="ap-pjw-position-table"><thead><tr><th>{l(language,"ग्रह","Planet")}</th><th>{l(language,"राशि","Sign")}</th><th>{l(language,"राशिमा अंश","Degree in sign")}</th><th>{l(language,"निरयण दीर्घांश","Sidereal longitude")}</th><th>{l(language,"दैनिक गति","Daily speed")}</th><th>{l(language,"गति","Motion")}</th></tr></thead><tbody>{positions.map(item=><tr key={item.key}><td>{l(language,PLANET_NE[item.name]||item.name,item.name)}</td><td>{l(language,SIGNS_NE[item.signIndex],SIGNS_EN[item.signIndex])}</td><td>{deg(item.degreeInSign)}</td><td>{deg(item.longitude)}</td><td>{deg(item.longitudeSpeedDegPerDay)}</td><td><span className={"ap-pjw-chip"+(item.isRetrograde?" is-warning":"")}>{item.isRetrograde?l(language,"वक्री","Retrograde"):l(language,"मार्गी / सामान्य","Direct")}</span></td></tr>)}</tbody></table></div>
    </section>
    <section className="ap-pjw-card">
      <div className="ap-pjw-subhead"><h3>{l(language,"ग्रह घटना खोजक","Planetary event finder")}</h3><small>{l(language,"स्थानीय गणना · कुनै अनुरोध पठाइँदैन","Local calculation · no request sent")}</small></div>
      <div className="ap-pjw-filter-row">
        <label>{l(language,"घटनाको प्रकार","Event type")}<select className="ap-pjw-select" value={searchMode} onChange={event=>{setSearchMode(event.target.value as typeof searchMode);setRunScan(false)}}><option value="ingress">{l(language,"राशि प्रवेश","Sign ingress")}</option><option value="station">{l(language,"वक्री / मार्गी स्टेशन","Retrograde/direct station")}</option><option value="season">{l(language,"विषुव / अयनान्त","Equinox / solstice")}</option></select></label>
        <label>{l(language,"खोज अवधि","Search duration")}<select className="ap-pjw-select" value={range} onChange={event=>{setRange(Number(event.target.value));setRunScan(false)}}>{[7,14,30,60,90,180].map(n=><option value={n} key={n}>{l(language,n+" दिन",n+" days")}</option>)}</select></label>
        {searchMode==="ingress"&&<label>{l(language,"ग्रह","Planet")}<select className="ap-pjw-select" value={body} onChange={event=>{setBody(event.target.value);setRunScan(false)}}><option value="all">{l(language,"सबै ग्रह","All planets")}</option>{positions.map(item=><option value={item.key} key={item.key}>{l(language,PLANET_NE[item.name]||item.name,item.name)}</option>)}</select></label>}
        <button type="button" className="ap-pjw-primary" onClick={()=>setRunScan(true)}>{l(language,"घटना खोज्नुहोस्","Find events")}</button>
      </div>
      {!runScan?<p className="ap-pjw-section-note">{l(language,"मिति र अवधि छानेपछि मात्र ब्राउजरले घटना खोज्छ। ठूलो अवधि खोज्दा उपकरण केही समय गणना गर्न सक्छ।","The browser scans only after you select a date and duration. Longer windows may take a little time to calculate.")}</p>:events.ingresses.length>0?<div className="ap-pjw-position-wrap"><table className="ap-pjw-event-table"><thead><tr><th>{l(language,"ग्रह","Planet")}</th><th>{l(language,"राशिबाट","From sign")}</th><th>{l(language,"राशिमा","Into sign")}</th><th>{l(language,"प्रवेश समय","Ingress time")}</th></tr></thead><tbody>{events.ingresses.map((item,index)=><tr key={item.key+item.instant.toISOString()+index}><td>{l(language,PLANET_NE[item.name]||item.name,item.name)}</td><td>{l(language,SIGNS_NE[item.fromSign],SIGNS_EN[item.fromSign])}</td><td>{l(language,SIGNS_NE[item.toSign],SIGNS_EN[item.toSign])}</td><td>{localLabel(item.instant,language)}</td></tr>)}</tbody></table></div>:events.stations.length>0?<div className="ap-pjw-position-wrap"><table className="ap-pjw-event-table"><thead><tr><th>{l(language,"ग्रह","Planet")}</th><th>{l(language,"गति परिवर्तन","Motion change")}</th><th>{l(language,"समय","Time")}</th></tr></thead><tbody>{events.stations.map((item,index)=><tr key={item.key+item.instant.toISOString()+index}><td>{l(language,PLANET_NE[item.name]||item.name,item.name)}</td><td>{item.direction==="retrograde"?l(language,"वक्री सुरु","Retrograde station"):l(language,"मार्गी सुरु","Direct station")}</td><td>{localLabel(item.instant,language)}</td></tr>)}</tbody></table></div>:events.seasons.length>0?<div className="ap-pjw-position-wrap"><table className="ap-pjw-event-table"><thead><tr><th>{l(language,"घटना","Event")}</th><th>{l(language,"समय","Time")}</th></tr></thead><tbody>{events.seasons.map(item=><tr key={item.degree}><td>{l(language,item.degree===0?"वसन्त विषुव":item.degree===90?"ग्रीष्म अयनान्त":item.degree===180?"शरद विषुव":"शीत अयनान्त",item.degree===0?"Vernal equinox":item.degree===90?"Summer solstice":item.degree===180?"Autumnal equinox":"Winter solstice")}</td><td>{localLabel(item.instant,language)}</td></tr>)}</tbody></table></div>:<div className="ap-pjw-empty">{l(language,"यो खोज अवधिमा घटना फेला परेन।","No event was found in this search window.")}</div>}
    </section>
    <section className="ap-pjw-card">
      <div className="ap-pjw-subhead"><h3>{l(language,"निकट कोणीय सम्बन्ध","Nearby angular aspects")}</h3><small>{l(language,"अधिकतम २.५° ओर्ब","Maximum 2.5° orb")}</small></div>
      {aspects.length?<div className="ap-pjw-position-wrap"><table className="ap-pjw-event-table"><thead><tr><th>{l(language,"पहिलो ग्रह","Planet A")}</th><th>{l(language,"सम्बन्ध","Aspect")}</th><th>{l(language,"दोस्रो ग्रह","Planet B")}</th><th>{l(language,"ओर्ब","Orb")}</th></tr></thead><tbody>{aspects.map((item,index)=><tr key={item.a.key+item.b.key+item.target+index}><td>{l(language,PLANET_NE[item.a.name]||item.a.name,item.a.name)}</td><td>{l(language,ASPECTS.find(aspect=>aspect.angle===item.target)?.ne||"कोण",ASPECTS.find(aspect=>aspect.angle===item.target)?.en||"Aspect")}</td><td>{l(language,PLANET_NE[item.b.name]||item.b.name,item.b.name)}</td><td>{deg(item.orb)}</td></tr>)}</tbody></table></div>:<div className="ap-pjw-empty">{l(language,"यो समयमा २.५° भित्रको मानक कोणीय सम्बन्ध फेला परेन।","No standard aspect within a 2.5° orb was found at this instant.")}</div>}
    </section>
    {focusText&&<p className="ap-pjw-note">{l(language,"ग्रह अस्तको परम्परागत सीमा ग्रहअनुसार फरक हुन्छ। यहाँ सूर्यबाट कोणीय दूरीको आधार उपलब्ध भए पनि कुनै सीमा स्रोत-पुष्टि नगरी निश्चित धार्मिक निर्णयका रूपमा देखाइँदैन।","Traditional combustion limits vary by planet. Angular distances from the Sun can be calculated, but no religious conclusion is presented without a source-reviewed threshold.")}</p>}
    {selectedFeatureId==="F072"||selectedFeatureId==="F073"||selectedFeatureId==="F074"||selectedFeatureId==="F075"?<p className="ap-pjw-note">{l(language,"विषुव र अयनान्त उष्णकटिबन्धीय सूर्य दीर्घांशमा आधारित खगोलीय घटना हुन्; राशिप्रवेशको निरयण प्रणालीसँग एउटै मान्नु हुँदैन।","Equinoxes and solstices use tropical solar longitude and must not be conflated with sidereal sign ingresses.")}</p>:null}
    <div className="ap-pjw-footer-links"><a href="/moon">{l(language,"चन्द्र अवस्था","Moon phases")} ↗</a><a href="/eclipse">{l(language,"ग्रहण विवरण","Eclipse details")} ↗</a><a href="/panchang">{l(language,"दैनिक पञ्चाङ्ग","Daily Panchang")} ↗</a></div>
  </div>;
}
