import { RASHIS as NE_SIGNS, NAKSHATRAS as NE_NAKSHATRAS, toNepaliDigits } from "../patro-tools/core/names";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { calculateChart, calculateGuna, type BirthInput, type ChartResult, type GunaResult, SIGNS } from "./jyotishEngine";
import { calculateNameGuna, nameSyllableFromNakshatra, type NameGunaResult } from "../../packages/engine/src/name-guna.js";
import { createJanmaPatroShareUrl, readJanmaPatroShareState } from "../../packages/engine/src/share-state.js";
import "./janmapatro.css";

type Language="ne"|"en";
type Tab="chart"|"match";
type MatchMode="birth"|"name";
type ProfileInput=BirthInput&{father?:string};
type SharedState={tab:Tab;matchMode:MatchMode;language:Language;a:ProfileInput;b:ProfileInput;nameA:string;nameB:string};

const DISTRICTS=[
 ["Kathmandu",27.7172,85.3240],["Lalitpur",27.6644,85.3188],["Bhaktapur",27.6710,85.4298],["Pokhara",28.2096,83.9856],
 ["Biratnagar",26.4525,87.2718],["Janakpur",26.7288,85.9250],["Birgunj",27.0104,84.8774],["Chitwan",27.5291,84.3542],
 ["Butwal",27.7006,83.4484],["Nepalgunj",28.0500,81.6167],["Dhangadhi",28.7017,80.5898],["Charikot",27.6667,86.0333],
 ["Manthali",27.3833,86.0667],["Chautara",27.7744,85.7120],["Melamchi",27.8294,85.5775]
] as const;
const DEFAULT:ProfileInput={name:"",father:"",date:"1995-01-01",time:"12:00",lat:27.7172,lng:85.324,location:"Kathmandu"};
const tx=(language:Language,ne:string,en:string)=>language==="ne"?ne:en;

function routeTab():Tab{
 if(typeof window==="undefined")return"chart";
 return /(?:\/janmapatro\/milan\.html|\/jyotish\/matchmaking)\/?$/.test(window.location.pathname)?"match":"chart";
}
function canonicalFor(tab:Tab){return tab==="match"?"/janmapatro/milan.html":"/janmapatro/";}
function isProfile(value:unknown):value is ProfileInput{
 if(!value||typeof value!=="object")return false;
 const v=value as Partial<ProfileInput>;
 return typeof v.name==="string"&&typeof v.date==="string"&&typeof v.time==="string"&&typeof v.location==="string"&&Number.isFinite(v.lat)&&Number.isFinite(v.lng);
}
async function resolveBsDate(year:number,month:number,day:number){
 const approxYear=year-57,approxMonth=(month+2)%12;
 const center=new Date(Date.UTC(approxYear+(month>=10?1:0),approxMonth,15)),start=new Date(center),end=new Date(center);
 start.setUTCDate(start.getUTCDate()-31);end.setUTCDate(end.getUTCDate()+31);
 const query=new URLSearchParams({start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)});
 const response=await fetch("/api/v1/sync?"+query.toString(),{headers:{Accept:"application/json"}});
 if(!response.ok)throw new Error("वि.सं. जन्ममिति रूपान्तरण अहिले हुन सकेन। फेरि प्रयास गर्नुहोस्।");
 const payload=await response.json() as {days?:Array<{query_date:string;calendars:{bikram_sambat_detail:{year:number;month:number;day:number}}}>};
 const hit=payload.days?.find((x)=>{const b=x.calendars.bikram_sambat_detail;return b.year===year&&b.month===month&&b.day===day;});
 if(!hit)throw new Error("छानिएको वि.सं. मिति उपलब्ध पात्रो दायराभन्दा बाहिर छ।");
 return hit.query_date;
}
function dateText(date:Date){return date.toLocaleDateString("en-CA",{year:"numeric",month:"short",day:"2-digit",timeZone:"UTC"});}
function degreeText(value:number){const d=Math.floor(value),m=Math.floor((value-d)*60);return d+"° "+m+"′";}
function reportSlug(name:string){return (name||"report").trim().replace(/\s+/g,"-").replace(/[^a-zA-Z0-9\u0900-\u097f-]/g,"").toLowerCase()||"report";}
function verdict(total:number,language:Language){
 if(total>=28)return tx(language,"उत्तम मिलान","Excellent match");
 if(total>=24)return tx(language,"राम्रो मिलान","Good match");
 if(total>=18)return tx(language,"मध्यम मिलान","Moderate match");
 return tx(language,"कम मिलान","Low match");
}

function ProfileForm({value,onChange,prefix,language}:{value:ProfileInput;onChange:(x:ProfileInput)=>void;prefix:string;language:Language}){
 const[calendar,setCalendar]=useState<"AD"|"BS">("AD"),[bs,setBs]=useState({year:2051,month:9,day:17}),[busy,setBusy]=useState(false),[localError,setLocalError]=useState<string|null>(null);
 const set=<K extends keyof ProfileInput>(key:K,val:ProfileInput[K])=>onChange({...value,[key]:val});
 const chooseDistrict=(name:string)=>{const row=DISTRICTS.find((x)=>x[0]===name);if(row)onChange({...value,location:row[0],lat:row[1],lng:row[2]});};
 const applyBs=async()=>{setBusy(true);setLocalError(null);try{set("date",await resolveBsDate(bs.year,bs.month,bs.day));}catch(e){setLocalError(e instanceof Error?e.message:"मिति रूपान्तरण हुन सकेन।");}finally{setBusy(false);}};
 return <fieldset className="jp-profile"><legend>{prefix}</legend>
  <div className="jp-form-grid">
   <label>{tx(language,"नाम","Name")}<input value={value.name} onChange={(e)=>set("name",e.target.value)} placeholder={tx(language,"नाम","Name")}/></label>
   <label>{tx(language,"पिता / अभिभावक","Father / Guardian")}<input value={value.father||""} onChange={(e)=>set("father",e.target.value)} placeholder={tx(language,"ऐच्छिक","Optional")}/></label>
   <label>{tx(language,"पात्रो","Calendar")}<select value={calendar} onChange={(e)=>setCalendar(e.target.value as "AD"|"BS")}><option>AD</option><option>BS</option></select></label>
   {calendar==="AD"?<label>{tx(language,"जन्ममिति","Birth date")}<input type="date" value={value.date} onChange={(e)=>set("date",e.target.value)}/></label>:
   <div className="jp-bs-date"><label>BS year<input type="number" value={bs.year} onChange={(e)=>setBs({...bs,year:Number(e.target.value)})}/></label><label>Month<input type="number" min="1" max="12" value={bs.month} onChange={(e)=>setBs({...bs,month:Number(e.target.value)})}/></label><label>Day<input type="number" min="1" max="32" value={bs.day} onChange={(e)=>setBs({...bs,day:Number(e.target.value)})}/></label><button type="button" onClick={applyBs} disabled={busy}>{busy?tx(language,"रूपान्तरण हुँदैछ…","Converting…"):tx(language,"वि.सं. मिति प्रयोग गर्नुहोस्","Use BS date")}</button></div>}
   <label>{tx(language,"जन्म समय","Exact time")}<input type="time" value={value.time} onChange={(e)=>set("time",e.target.value)}/></label>
   <label>{tx(language,"जन्मस्थान","District")}<select value={DISTRICTS.some((x)=>x[0]===value.location)?value.location:""} onChange={(e)=>chooseDistrict(e.target.value)}><option value="">{tx(language,"अन्य स्थान · Coordinates","Other · Coordinates")}</option>{DISTRICTS.map((x)=><option key={x[0]}>{x[0]}</option>)}</select></label>
   <label>Latitude<input type="number" step=".0001" value={value.lat} onChange={(e)=>set("lat",Number(e.target.value))}/></label>
   <label>Longitude<input type="number" step=".0001" value={value.lng} onChange={(e)=>set("lng",Number(e.target.value))}/></label>
  </div>
  {localError&&<span className="jp-error" role="alert">{localError}</span>}
 </fieldset>;
}

function NorthIndianChart({chart,anchorSign=chart.ascSignIndex,title}:{chart:ChartResult;anchorSign?:number;title:string}){
 const graha:Record<string,string>={sun:"सू",moon:"चं",mars:"मं",mercury:"बु",jupiter:"गु",venus:"शु",saturn:"श",rahu:"रा",ketu:"के"};
 const houses=Array.from({length:12},(_,i)=>chart.planets.filter((p)=>((p.signIndex-anchorSign+12)%12)+1===i+1).map((p)=>graha[p.key]||p.name.slice(0,2)).join(" "));
 const labels:[number,number][]=[[150,75],[75,32],[32,75],[75,150],[32,225],[75,268],[150,225],[225,268],[268,225],[225,150],[268,75],[225,32]];
 return <figure className="jp-chart"><svg viewBox="0 0 300 300" role="img" aria-label={title}>
  <rect x="8" y="8" width="284" height="284"/><path d="M8 8L292 292M292 8L8 292M150 8L292 150L150 292L8 150Z"/>
  {labels.map(([x,y],i)=><g key={i}><text x={x} y={y-8} className="jp-house-number">{toNepaliDigits(((anchorSign+i)%12)+1)}</text><text x={x} y={y+8}>{houses[i]||"·"}</text></g>)}
  <text x="150" y="142" className="jp-lagna-label">{anchorSign===chart.ascSignIndex?"लग्न":"चन्द्र"}</text><text x="150" y="160" className="jp-lagna-value">{NE_SIGNS[anchorSign]}</text>
 </svg><figcaption>{title}</figcaption></figure>;
}

function ChartReport({chart,language}:{chart:ChartResult;language:Language}){
 const moon=chart.planets.find((p)=>p.key==="moon");
 const syllable=nameSyllableFromNakshatra(chart.moonNakshatraIndex,chart.moonPada);
 return <section className="jp-paper" aria-label={tx(language,"जन्मपत्रिका","Birth chart report")}>
  <div className="jp-invocation">॥ श्री गणेशाय नमः ॥</div>
  <p className="jp-shloka">आदित्याद्या ग्रहाः सर्वे नक्षत्राणि च राशयः ।<br/>देहिमनुः प्रकुर्वन्तु यस्यैषा जन्मपत्रिका ॥</p>
  <h2>{tx(language,"जन्मपत्रिका","Birth Chart")}</h2><div className="jp-rule"/>
  <p className="jp-intro">{tx(language,"जन्म मिति, समय र स्थानका आधारमा गणना गरिएको ग्रहस्थिति, लग्न, नक्षत्र र दशा विवरण।","Planetary positions, ascendant, nakshatra and dasha calculated from the supplied birth date, exact time and location.")}</p>
  <dl className="jp-facts">
   <dt>{tx(language,"नाम","Name")}</dt><dd><strong>{chart.input.name||"—"}</strong></dd>
   <dt>{tx(language,"पिता / अभिभावक","Father / Guardian")}</dt><dd>{(chart.input as ProfileInput).father||"—"}</dd>
   <dt>{tx(language,"जन्म मिति","Birth date")}</dt><dd>{chart.input.date}</dd>
   <dt>{tx(language,"जन्म समय","Birth time")}</dt><dd>{chart.input.time} (UTC+05:45)</dd>
   <dt>{tx(language,"जन्म स्थान","Birth place")}</dt><dd>{chart.input.location} ({chart.input.lat.toFixed(4)}, {chart.input.lng.toFixed(4)})</dd>
   <dt>{tx(language,"लग्न","Ascendant")}</dt><dd>{language==="ne"?NE_SIGNS[chart.ascSignIndex]:SIGNS[chart.ascSignIndex]} · {degreeText(chart.ascendant%30)}</dd>
   <dt>{tx(language,"नक्षत्र","Nakshatra")}</dt><dd>{language==="ne"?NE_NAKSHATRAS[chart.moonNakshatraIndex]:chart.moonNakshatra} · {tx(language,"चरण","Pada")} {chart.moonPada}{syllable?" · "+tx(language,"नामाक्षर","Name syllable")+" "+syllable:""}</dd>
   <dt>{tx(language,"चन्द्र राशि","Moon sign")}</dt><dd>{moon?.sign||"—"}</dd>
  </dl>
  <div className="jp-chart-pair"><NorthIndianChart chart={chart} title={tx(language,"लग्न कुण्डली","Lagna chart")}/><NorthIndianChart chart={chart} anchorSign={moon?.signIndex??chart.ascSignIndex} title={tx(language,"चन्द्र कुण्डली","Moon chart")}/></div>
  <h3>{tx(language,"ग्रह स्थिति","Planetary positions")}</h3>
  <div className="jp-table-wrap"><table><thead><tr><th>{tx(language,"ग्रह","Graha")}</th><th>{tx(language,"निरायण अंश","Sidereal longitude")}</th><th>{tx(language,"राशि","Rashi")}</th><th>{tx(language,"भाव","House")}</th></tr></thead><tbody>{chart.planets.map((p)=><tr key={p.key}><td>{p.name}</td><td>{p.longitude.toFixed(3)}°</td><td>{p.sign}</td><td>{p.house}</td></tr>)}</tbody></table></div>
  <h3>{tx(language,"विंशोत्तरी महादशा","Vimshottari Mahadasha")}</h3>
  <div className="jp-table-wrap"><table><thead><tr><th>{tx(language,"स्वामी","Lord")}</th><th>{tx(language,"सुरु","Start")}</th><th>{tx(language,"अन्त्य","End")}</th><th>{tx(language,"वर्ष","Years")}</th></tr></thead><tbody>{chart.dashas.map((d,i)=><tr key={i}><td>{d.lord}</td><td>{dateText(d.start)}</td><td>{dateText(d.end)}</td><td>{d.years.toFixed(2)}</td></tr>)}</tbody></table></div>
  <div className="jp-note"><strong>Kuja / Manglik: {chart.manglik.severity}</strong><p>{chart.manglik.explanation}</p></div>
  <details className="jp-method"><summary>{tx(language,"गणना पद्धति र सीमाहरू","Methodology and limitations")}</summary><ul>{chart.methodology.map((x)=><li key={x}>{x}</li>)}</ul></details>
 </section>;
}

function ProfileSummary({name,nakshatra,pada,sign}:{name:string;nakshatra:string;pada:number;sign:string}){return <article className="jp-person-card"><small>{name}</small><strong>{nakshatra}</strong><span>Pada {pada}</span><span>{sign}</span></article>;}
function GunaTable({items,language}:{items:Array<{key:string;label:string;score:number;max:number;detail:string}>;language:Language}){return <><h3>{tx(language,"अष्टकूट गुण तालिका","Ashtakoota score table")}</h3><div className="jp-table-wrap"><table><thead><tr><th>{tx(language,"कूट","Koota")}</th><th>{tx(language,"पूर्णाङ्क","Max")}</th><th>{tx(language,"प्राप्त","Score")}</th><th>{tx(language,"महत्व","Meaning")}</th></tr></thead><tbody>{items.map((x)=><tr key={x.key}><td><strong>{x.label}</strong></td><td>{x.max}</td><td>{x.score}</td><td>{x.detail}</td></tr>)}</tbody></table></div></>;}

function BirthGunaReport({result,language}:{result:GunaResult;language:Language}){
 const aMoon=result.profileA.planets.find((p)=>p.key==="moon"),bMoon=result.profileB.planets.find((p)=>p.key==="moon");
 return <section className="jp-paper jp-milan">
  <div className="jp-invocation">॥ श्री गणेशाय नमः ॥</div><h2>{tx(language,"गुण मिलान — विवाह मिलान","Guna Milan — Matchmaking")}</h2><div className="jp-rule"/>
  <div className="jp-match-head"><ProfileSummary name={result.profileA.input.name||"Profile A"} nakshatra={result.profileA.moonNakshatra} pada={result.profileA.moonPada} sign={aMoon?.sign||""}/><div className="jp-score"><strong>{result.total}<small>/36</small></strong><span>{verdict(result.total,language)}</span></div><ProfileSummary name={result.profileB.input.name||"Profile B"} nakshatra={result.profileB.moonNakshatra} pada={result.profileB.moonPada} sign={bMoon?.sign||""}/></div>
  <div className="jp-chart-pair"><NorthIndianChart chart={result.profileA} title={tx(language,"पहिलो व्यक्ति · लग्न कुण्डली","Profile A · Lagna chart")}/><NorthIndianChart chart={result.profileB} title={tx(language,"दोस्रो व्यक्ति · लग्न कुण्डली","Profile B · Lagna chart")}/></div>
  <GunaTable items={result.items} language={language}/>
  <div className="jp-note"><p>{tx(language,"यो परम्परागत अष्टकूट स्कोर हो; सम्बन्धको सफलता निश्चित गर्ने मापन होइन।","This is a traditional Ashtakoota score, not a prediction of relationship success.")}</p></div>
 </section>;
}
function NameGunaReport({result,language}:{result:NameGunaResult;language:Language}){
 return <section className="jp-paper jp-milan">
  <div className="jp-invocation">॥ श्री गणेशाय नमः ॥</div><h2>{tx(language,"नामबाट गुण मिलान","Name-based Guna Milan")}</h2><div className="jp-rule"/>
  <p className="jp-intro">{tx(language,"जन्म समय उपलब्ध नभएको अवस्थामा नामको प्रारम्भिक नक्षत्र-अक्षरबाट सीमित अष्टकूट सन्दर्भ। लग्न, भाव वा दशा देखाइँदैन।","A limited Ashtakoota reference from the starting nakshatra syllable when birth time is unavailable. Lagna, houses and dasha are intentionally not shown.")}</p>
  <div className="jp-match-head"><ProfileSummary name={result.profileA.name} nakshatra={result.profileA.nakshatraNe} pada={result.profileA.pada} sign={result.profileA.signNe}/><div className="jp-score"><strong>{result.total}<small>/36</small></strong><span>{language==="ne"?result.verdict:verdict(result.total,"en")}</span></div><ProfileSummary name={result.profileB.name} nakshatra={result.profileB.nakshatraNe} pada={result.profileB.pada} sign={result.profileB.signNe}/></div>
  <p className="jp-name-evidence">{result.profileA.name}: <strong>{result.profileA.syllable}</strong> → {result.profileA.nakshatraNe} · Pada {result.profileA.pada} &nbsp;|&nbsp; {result.profileB.name}: <strong>{result.profileB.syllable}</strong> → {result.profileB.nakshatraNe} · Pada {result.profileB.pada}</p>
  <GunaTable items={result.items} language={language}/>
 </section>;
}

export function JanmaPatroSuite(){
 const[language,setLanguage]=useState<Language>("ne"),[tab,setTabState]=useState<Tab>(routeTab),[matchMode,setMatchMode]=useState<MatchMode>("birth");
 const[a,setA]=useState<ProfileInput>({...DEFAULT}),[b,setB]=useState<ProfileInput>({...DEFAULT,name:"",father:""}),[nameA,setNameA]=useState("राम"),[nameB,setNameB]=useState("सीता");
 const[chart,setChart]=useState<ChartResult|null>(null),[guna,setGuna]=useState<GunaResult|null>(null),[nameGuna,setNameGuna]=useState<NameGunaResult|null>(null);
 const[error,setError]=useState<string|null>(null),[notice,setNotice]=useState(""),[shareUrl,setShareUrl]=useState(""),[pdfBusy,setPdfBusy]=useState(false),[jpgBusy,setJpgBusy]=useState(false);
 const reportRef=useRef<HTMLDivElement|null>(null);
 const canMatch=useMemo(()=>matchMode==="name"?Boolean(nameA.trim()&&nameB.trim()):Boolean(a.date&&a.time&&b.date&&b.time),[a,b,matchMode,nameA,nameB]);

 const calculate=(state?:Partial<SharedState>)=>{
  const activeTab=state?.tab??tab,activeMode=state?.matchMode??matchMode,aa=state?.a??a,bb=state?.b??b,nA=state?.nameA??nameA,nB=state?.nameB??nameB;
  setError(null);setNotice("");setNameGuna(null);
  try{
   if(activeTab==="match"&&activeMode==="name"){setChart(null);setGuna(null);setNameGuna(calculateNameGuna(nA,nB));return;}
   const ca=calculateChart(aa);setChart(ca);
   if(activeTab==="chart"){
    const context={time_known:true,lagna:{name:NE_SIGNS[ca.ascSignIndex],degree:ca.ascendant},rashi:{name:NE_SIGNS[ca.planets.find(p=>p.key==="moon")!.signIndex]},nakshatra:{name:NE_NAKSHATRAS[ca.moonNakshatraIndex],pada:ca.moonPada},birth:{...ca.input},planets:ca.planets.map(p=>({planet_en:p.name,rashi:{name:NE_SIGNS[p.signIndex]},house:p.house,degree:p.longitude})),dasha:{periods:ca.dashas.map(d=>({...d,start:d.start.toISOString(),end:d.end.toISOString()}))},other_important_points:{manglik:ca.manglik},data_quality:{source:"janmapatro-engine",methodology:ca.methodology}};
    try{localStorage.setItem("aafnai.jyotish.china.context.v1",JSON.stringify(context));window.dispatchEvent(new CustomEvent("patro:china-updated",{detail:context}));}catch{}
   }
   if(activeTab==="match"){const cb=calculateChart(bb);setGuna(calculateGuna(ca,cb));}else setGuna(null);
  }catch(err){setError(err instanceof Error?err.message:tx(language,"गणना हुन सकेन। विवरण जाँचेर फेरि प्रयास गर्नुहोस्।","Calculation failed. Check the details and try again."));}
 };

 useEffect(()=>{
  try{
   const restored=readJanmaPatroShareState(window.location.hash) as Partial<SharedState>|null;
   if(!restored)return;
   const nextTab=restored.tab==="match"?"match":"chart",nextMode=restored.matchMode==="name"?"name":"birth";
   const nextA=isProfile(restored.a)?restored.a:a,nextB=isProfile(restored.b)?restored.b:b;
   const nextLanguage=restored.language==="en"?"en":"ne",nextNameA=typeof restored.nameA==="string"?restored.nameA:nameA,nextNameB=typeof restored.nameB==="string"?restored.nameB:nameB;
   setTabState(nextTab);setMatchMode(nextMode);setA(nextA);setB(nextB);setLanguage(nextLanguage);setNameA(nextNameA);setNameB(nextNameB);
   calculate({tab:nextTab,matchMode:nextMode,a:nextA,b:nextB,language:nextLanguage,nameA:nextNameA,nameB:nextNameB});
   setNotice(tx(nextLanguage,"शेयर गरिएको विवरण यस यन्त्रमा पुनः गणना गरियो।","Shared details were restored and recalculated on this device."));
  }catch{setError(tx(language,"शेयर लिंक पढ्न सकिएन।","The shared link could not be read."));}
 },[]);

 const setTab=(next:Tab)=>{setTabState(next);setChart(null);setGuna(null);setNameGuna(null);setError(null);setNotice("");if(typeof window!=="undefined")window.history.replaceState(window.history.state,"",canonicalFor(next));};
 const generate=(e:FormEvent)=>{e.preventDefault();calculate();};
 const buildShare=async()=>{
  try{
   const url=createJanmaPatroShareUrl(new URL(canonicalFor(tab),window.location.origin).toString(),{tab,matchMode,language,a,b,nameA,nameB});
   setShareUrl(url);
   if(navigator.share){await navigator.share({title:tab==="match"?"Aafnai Patro · Guna Milan":"Aafnai Patro · Janma Patro",url});setNotice(tx(language,"शेयर भयो।","Shared."));}
   else if(navigator.clipboard){await navigator.clipboard.writeText(url);setNotice(tx(language,"शेयर लिंक कपी भयो।","Share link copied."));}
   else setNotice(tx(language,"शेयर लिंक तयार भयो।","Share link is ready."));
  }catch(err){if((err as Error)?.name!=="AbortError")setError(tx(language,"शेयर लिंक बनाउन सकिएन।","Could not create a share link."));}
 };
 const exportPdf=async()=>{if(!reportRef.current)return;setPdfBusy(true);try{const mod=await import("html2pdf.js");await mod.default().set({margin:5,filename:"aafnai-patro-"+reportSlug(a.name||nameA)+".pdf",image:{type:"jpeg",quality:.98},html2canvas:{scale:2,useCORS:true,backgroundColor:"#fffaf0"},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"}}).from(reportRef.current).save();}finally{setPdfBusy(false);}};
 const exportJpg=async()=>{if(!reportRef.current)return;setJpgBusy(true);try{const{toJpeg}=await import("html-to-image");const dataUrl=await toJpeg(reportRef.current,{quality:.96,pixelRatio:2,backgroundColor:"#fffaf0",cacheBust:true});const link=document.createElement("a");link.href=dataUrl;link.download="aafnai-patro-"+reportSlug(a.name||nameA)+".jpg";document.body.appendChild(link);link.click();link.remove();}catch{setError(tx(language,"JPG तयार हुन सकेन।","Could not create JPG."));}finally{setJpgBusy(false);}};

 const hasReport=Boolean(chart||guna||nameGuna);
 return <main className="jyotish-suite jp-page" id="main-content">
  <header className="jp-hero"><div><p className="jp-eyebrow">आफ्नै ज्योतिष · Aafnai Jyotish</p><h1>{tab==="match"?tx(language,"३६ गुण मिलान · कुण्डली मिलान","36 Guna Milan · Matchmaking"):tx(language,"आफ्नै चिना · जन्मपत्रो","Janma Patro · Birth Chart")}</h1><p>{tab==="match"?tx(language,"जन्म विवरण वा नाम-नक्षत्र अक्षरबाट परम्परागत अष्टकूट मिलान हेर्नुहोस्।","Explore traditional Ashtakoota matching from birth details or mapped name syllables."):tx(language,"जन्ममिति, सही समय र स्थानका आधारमा लग्न, ग्रहस्थिति, नक्षत्र, दशा र चन्द्र कुण्डली हेर्नुहोस्।","See ascendant, planetary positions, nakshatra, dasha and Moon chart from birth date, exact time and place.")}</p></div><div className="jp-language"><button type="button" className={language==="ne"?"is-active":""} onClick={()=>setLanguage("ne")}>नेपाली</button><button type="button" className={language==="en"?"is-active":""} onClick={()=>setLanguage("en")}>English</button></div></header>
  <nav className="jp-tabs" aria-label="Jyotish"><button type="button" className={tab==="chart"?"is-active":""} onClick={()=>setTab("chart")}>{tx(language,"चिना टिपन","Birth chart")}</button><button type="button" className={tab==="match"?"is-active":""} onClick={()=>setTab("match")}>{tx(language,"३६ गुण मिलान","Guna Milan")}</button><a href="/rashifal">☾ {tx(language,"राशिफल","Rashifal")}</a></nav>

  <form onSubmit={generate} className="jp-input-panel">
   {tab==="match"?<div className="jp-mode"><button type="button" className={matchMode==="birth"?"is-active":""} onClick={()=>{setMatchMode("birth");setNameGuna(null)}}>{tx(language,"जन्म विवरणबाट","Birth details")}</button><button type="button" className={matchMode==="name"?"is-active":""} onClick={()=>{setMatchMode("name");setChart(null);setGuna(null)}}>{tx(language,"नामबाट","By name")}</button></div>:null}
   {tab==="chart"||matchMode==="birth"?<><ProfileForm value={a} onChange={setA} language={language} prefix={tab==="match"?tx(language,"पहिलो व्यक्ति · Profile A","Profile A"):tx(language,"जन्म विवरण","Birth details")}/>{tab==="match"?<ProfileForm value={b} onChange={setB} language={language} prefix={tx(language,"दोस्रो व्यक्ति · Profile B","Profile B")}/>:null}</>:<div className="jp-name-mode"><label>{tx(language,"पहिलो नाम","First name")}<input value={nameA} onChange={(e)=>setNameA(e.target.value)} placeholder="राम"/></label><span>×</span><label>{tx(language,"दोस्रो नाम","Second name")}<input value={nameB} onChange={(e)=>setNameB(e.target.value)} placeholder="सीता"/></label><p>{tx(language,"नामको पहिलो नक्षत्र-अक्षरबाट सीमित मिलान हुन्छ। जन्म समय नभएकाले लग्न/भाव/दशा देखाइँदैन।","This limited mode maps the starting name syllable to a nakshatra. It never invents lagna, houses or dasha without a birth time.")}</p></div>}
   <button className="jp-primary" type="submit" disabled={tab==="match"&&!canMatch}>{tab==="match"?tx(language,"गुण मिलाउनुहोस्","Calculate match"):tx(language,"जन्मपत्रिका बनाउनुहोस्","Generate birth chart")}</button>
  </form>

  {error&&<div className="jp-status is-error" role="alert">{error}</div>}
  {notice&&<div className="jp-status is-success" role="status">{notice}</div>}
  {shareUrl?<div className="jp-share-url"><input readOnly value={shareUrl} aria-label="Share URL"/></div>:null}

  <div ref={reportRef} className="jp-report-surface">{tab==="chart"&&chart?<ChartReport chart={chart} language={language}/>:null}{tab==="match"&&matchMode==="birth"&&guna?<BirthGunaReport result={guna} language={language}/>:null}{tab==="match"&&matchMode==="name"&&nameGuna?<NameGunaReport result={nameGuna} language={language}/>:null}</div>

  {hasReport?<div className="jp-actions"><button type="button" onClick={buildShare}>↗ {tx(language,"शेयर गर्नुहोस्","Share")}</button><button type="button" onClick={exportPdf} disabled={pdfBusy||jpgBusy}>{pdfBusy?tx(language,"PDF तयार हुँदैछ…","Preparing PDF…"):"PDF"}</button><button type="button" onClick={exportJpg} disabled={jpgBusy||pdfBusy}>{jpgBusy?tx(language,"JPG तयार हुँदैछ…","Preparing JPG…"):"JPG"}</button><button type="button" onClick={()=>window.print()}>⎙ {tx(language,"प्रिन्ट","Print")}</button></div>:null}

  <footer className="jp-disclaimer">{tx(language,"ज्योतिषीय गणना परम्परागत सन्दर्भका लागि हो। स्वास्थ्य, कानुनी, आर्थिक वा सम्बन्धसम्बन्धी निर्णयको निश्चित भविष्यवाणी होइन।","Astrological calculations are traditional references, not certain predictions or substitutes for health, legal, financial or relationship decisions.")}</footer>
 </main>;
}
