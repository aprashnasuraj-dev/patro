import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { calculateChart, calculateGuna, type BirthInput, type ChartResult, type GunaResult } from "./jyotishEngine";
import { JANMAPATRO_BIRTH_PLACES as DISTRICTS, createJanmaPatroContext, readJanmaPatroBirthInput, saveJanmaPatroContext } from "./my-time-bridge";
import { calculateNameGuna, type NameGunaResult } from "../../packages/engine/src/name-guna.js";
import { createJanmaPatroShareUrl, readJanmaPatroShareState } from "../../packages/engine/src/share-state.js";
import { adToBs, bsToAd, daysInBsMonth } from "../../packages/core/src/bsDate";
import "./janmapatro.css";
import { DetailedBirthChartReport, DetailedGunaMilanReport } from "./JanmaPatroDetailedReports";

type Language="ne"|"en";
type Tab="chart"|"match";
type MatchMode="birth"|"name";
type ProfileInput=BirthInput&{father?:string};
type SharedState={tab:Tab;matchMode:MatchMode;language:Language;a:ProfileInput;b:ProfileInput;nameA:string;nameB:string};


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
function resolveBsDate(year:number,month:number,day:number){
 return bsToAd({year,month,day});
}
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
 const applyBs=()=>{setBusy(true);setLocalError(null);try{set("date",resolveBsDate(bs.year,bs.month,bs.day));}catch(e){setLocalError(e instanceof Error?e.message:"मिति रूपान्तरण हुन सकेन।");}finally{setBusy(false);}};
 const changeCalendar=(next:"AD"|"BS")=>{setLocalError(null);if(next==="BS"){try{setBs(adToBs(value.date));}catch(e){setLocalError(e instanceof Error?e.message:"AD date is outside supported BS calendar range.");}}setCalendar(next);};
 return <fieldset className="jp-profile"><legend>{prefix}</legend>
  <div className="jp-form-grid">
   <label>{tx(language,"नाम","Name")}<input value={value.name} onChange={(e)=>set("name",e.target.value)} placeholder={tx(language,"नाम","Name")}/></label>
   <label>{tx(language,"पिता / अभिभावक","Father / Guardian")}<input value={value.father||""} onChange={(e)=>set("father",e.target.value)} placeholder={tx(language,"ऐच्छिक","Optional")}/></label>
   <label>{tx(language,"पात्रो","Calendar")}<select value={calendar} onChange={(e)=>changeCalendar(e.target.value as "AD"|"BS")}><option>AD</option><option>BS</option></select></label>
   {calendar==="AD"?<label>{tx(language,"जन्ममिति","Birth date")}<input type="date" value={value.date} onChange={(e)=>set("date",e.target.value)}/></label>:
   <div className="jp-bs-date"><label>BS year<input type="number" value={bs.year} onChange={(e)=>setBs({...bs,year:Number(e.target.value)})}/></label><label>Month<input type="number" min="1" max="12" value={bs.month} onChange={(e)=>setBs({...bs,month:Number(e.target.value)})}/></label><label>Day<input type="number" min="1" max={(()=>{try{return daysInBsMonth(bs.year,bs.month)}catch{return 32}})()} value={bs.day} onChange={(e)=>setBs({...bs,day:Number(e.target.value)})}/></label><button type="button" onClick={applyBs} disabled={busy}>{busy?tx(language,"रूपान्तरण हुँदैछ…","Converting…"):tx(language,"वि.सं. मिति प्रयोग गर्नुहोस्","Use BS date")}</button></div>}
   <label>{tx(language,"जन्म समय","Exact time")}<input type="time" value={value.time} onChange={(e)=>set("time",e.target.value)}/></label>
   <label>{tx(language,"जन्मस्थान / सहर","Birthplace / city")}<select value={DISTRICTS.some((x)=>x[0]===value.location)?value.location:""} onChange={(e)=>chooseDistrict(e.target.value)}><option value="">{tx(language,"अन्य स्थान · Coordinates","Other · Coordinates")}</option>{DISTRICTS.map((x)=><option key={x[0]}>{x[0]}</option>)}</select></label>
   <label>Latitude<input type="number" step=".0001" value={value.lat} onChange={(e)=>set("lat",Number(e.target.value))}/></label>
   <label>Longitude<input type="number" step=".0001" value={value.lng} onChange={(e)=>set("lng",Number(e.target.value))}/></label>
  </div>
  {localError&&<span className="jp-error" role="alert">{localError}</span>}
 </fieldset>;
}

function ProfileSummary({name,nakshatra,pada,sign,language}:{name:string;nakshatra:string;pada:number;sign:string;language:Language}) {
 return <article className="jp-person-card"><small>{name}</small><strong>{nakshatra}</strong><span>{tx(language,"चरण","Pada")} {language==="ne"?toLocalDigits(pada):pada}</span><span>{sign}</span></article>;
}
function toLocalDigits(value:number){return String(value).replace(/[0-9]/g,d=>"०१२३४५६७८९"[Number(d)]);}
function GunaTable({items,language}:{items:Array<{key:string;label:string;score:number;max:number;detail:string}>;language:Language}) {
 const labelsNe:Record<string,string>={varna:"वर्ण",vashya:"वश्य",tara:"तारा",yoni:"योनि",maitri:"ग्रह मैत्री",gana:"गण",bhakoot:"भकूट",nadi:"नाडी"};
 const labelsEn:Record<string,string>={varna:"Varna",vashya:"Vashya",tara:"Tara",yoni:"Yoni",maitri:"Graha Maitri",gana:"Gana",bhakoot:"Bhakoot",nadi:"Nadi"};
 const detailNe:Record<string,string>={
  varna:"चन्द्र राशिमा आधारित परम्परागत वर्ण-वर्गीकरण।",
  vashya:"राशिगत समूहको आधारमा पारस्परिक प्रभावको परम्परागत सूचक।",
  tara:"जन्म नक्षत्रबीचको नवतारा दूरीको तुलना।",
  yoni:"नक्षत्रसँग सम्बन्धित प्रतीकात्मक योनि-वर्गको तुलना।",
  maitri:"चन्द्र राशिका स्वामी ग्रहबीचको परम्परागत मैत्री।",
  gana:"देव, मनुष्य वा राक्षस नक्षत्र-समूहको परम्परागत वर्गीकरण।",
  bhakoot:"दुई चन्द्र राशिबीचको परम्परागत दूरी-आधारित मिलान।",
  nadi:"जन्म नक्षत्रका तीन नाडी समूहको तुलना।"
 };
 const detailEn:Record<string,string>={
  varna:"Traditional Varna classification based on Moon signs.",
  vashya:"Traditional sign-group affinity and influence indicator.",
  tara:"Comparison of the birth Nakshatra distance in the Tara cycle.",
  yoni:"Comparison of the symbolic Yoni category associated with each Nakshatra.",
  maitri:"Traditional friendship between the lords of the Moon signs.",
  gana:"Traditional Deva, Manushya or Rakshasa Nakshatra grouping.",
  bhakoot:"Traditional distance-based comparison between the Moon signs.",
  nadi:"Comparison of the three Nadi groups assigned to the birth Nakshatras."
 };
 return <><h3>{tx(language,"अष्टकूट गुण तालिका","Ashtakoota score table")}</h3><div className="jp-table-wrap"><table><thead><tr><th>{tx(language,"कूट","Koota")}</th><th>{tx(language,"पूर्णाङ्क","Max")}</th><th>{tx(language,"प्राप्त","Score")}</th><th>{tx(language,"परम्परागत अर्थ","Traditional meaning")}</th></tr></thead><tbody>{items.map(x=><tr key={x.key}><td><strong>{(language==="ne"?labelsNe:labelsEn)[x.key]||x.label}</strong></td><td>{language==="ne"?toLocalDigits(x.max):x.max}</td><td>{language==="ne"?toLocalDigits(x.score):x.score}</td><td>{(language==="ne"?detailNe:detailEn)[x.key]||x.detail}</td></tr>)}</tbody></table></div></>;
}
function NameGunaReport({result,language}:{result:NameGunaResult;language:Language}){
 return <section className="jp-paper jp-milan">
  <div className="jp-invocation">॥ श्री गणेशाय नमः ॥</div><h2>{tx(language,"नामबाट गुण मिलान","Name-based Guna Milan")}</h2><div className="jp-rule"/>
  <p className="jp-intro">{tx(language,"जन्म समय उपलब्ध नभएको अवस्थामा नामको प्रारम्भिक नक्षत्र-अक्षरबाट सीमित अष्टकूट सन्दर्भ। लग्न, भाव वा दशा देखाइँदैन।","A limited Ashtakoota reference from the starting nakshatra syllable when birth time is unavailable. Lagna, houses and dasha are intentionally not shown.")}</p>
  <div className="jp-match-head"><ProfileSummary name={result.profileA.name} nakshatra={result.profileA.nakshatraNe} pada={result.profileA.pada} sign={language==="ne"?result.profileA.signNe:["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"][result.profileA.signIndex]} language={language}/><div className="jp-score"><strong>{result.total}<small>/36</small></strong><span>{language==="ne"?result.verdict:verdict(result.total,"en")}</span></div><ProfileSummary name={result.profileB.name} nakshatra={result.profileB.nakshatraNe} pada={result.profileB.pada} sign={language==="ne"?result.profileB.signNe:["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"][result.profileB.signIndex]} language={language}/></div>
  <p className="jp-name-evidence">{result.profileA.name}: <strong>{result.profileA.syllable}</strong> → {result.profileA.nakshatraNe} · {tx(language,"चरण ","Pada ")}{result.profileA.pada} &nbsp;|&nbsp; {result.profileB.name}: <strong>{result.profileB.syllable}</strong> → {result.profileB.nakshatraNe} · {tx(language,"चरण ","Pada ")}{result.profileB.pada}</p>
  <GunaTable items={result.items} language={language}/>
 </section>;
}

export function JanmaPatroSuite(){
 const[language,setLanguage]=useState<Language>("ne"),[tab,setTabState]=useState<Tab>(routeTab),[matchMode,setMatchMode]=useState<MatchMode>("birth");
 const[a,setA]=useState<ProfileInput>(()=>({...DEFAULT,...(readJanmaPatroBirthInput()||{})})),[b,setB]=useState<ProfileInput>({...DEFAULT,name:"",father:""}),[nameA,setNameA]=useState("राम"),[nameB,setNameB]=useState("सीता");
 const[chart,setChart]=useState<ChartResult|null>(null),[guna,setGuna]=useState<GunaResult|null>(null),[nameGuna,setNameGuna]=useState<NameGunaResult|null>(null);
 const[error,setError]=useState<string|null>(null),[notice,setNotice]=useState(""),[shareUrl,setShareUrl]=useState(""),[pdfBusy,setPdfBusy]=useState(false),[jpgBusy,setJpgBusy]=useState(false);
 const reportRef=useRef<HTMLDivElement|null>(null);
 const canMatch=useMemo(()=>matchMode==="name"?Boolean(nameA.trim()&&nameB.trim()):Boolean(a.date&&a.time&&b.date&&b.time),[a,b,matchMode,nameA,nameB]);
 const hasEditedBirthDetails=a.name!==DEFAULT.name||a.date!==DEFAULT.date||a.time!==DEFAULT.time||a.location!==DEFAULT.location||a.lat!==DEFAULT.lat||a.lng!==DEFAULT.lng;
 useEffect(()=>{
  const sync=()=>{const saved=readJanmaPatroBirthInput();if(saved)setA(old=>({...old,...saved}));};
  window.addEventListener("patro:china-updated",sync);
  window.addEventListener("storage",sync);
  window.addEventListener("patro:navigation",sync);
  return ()=>{window.removeEventListener("patro:china-updated",sync);window.removeEventListener("storage",sync);window.removeEventListener("patro:navigation",sync);};
 },[]);


 const calculate=(state?:Partial<SharedState>)=>{
  const activeTab=state?.tab??tab,activeMode=state?.matchMode??matchMode,aa=state?.a??a,bb=state?.b??b,nA=state?.nameA??nameA,nB=state?.nameB??nameB;
  setError(null);setNotice("");setNameGuna(null);
  try{
   if(activeTab==="match"&&activeMode==="name"){setChart(null);setGuna(null);setNameGuna(calculateNameGuna(nA,nB));return;}
   const ca=calculateChart(aa);setChart(ca);
   if(activeTab==="chart"){
    const context=createJanmaPatroContext(ca);
    if(!saveJanmaPatroContext(context))setNotice(tx(language,"जन्म विवरण स्थानीय रूपमा सुरक्षित हुन सकेन।","Birth chart calculated, but local profile storage failed."));
   }
   if(activeTab==="match"){const cb=calculateChart(bb);setGuna(calculateGuna(ca,cb));}else setGuna(null);
  }catch(err){setChart(null);setGuna(null);setNameGuna(null);setError(err instanceof Error?err.message:tx(language,"गणना हुन सकेन। विवरण जाँचेर फेरि प्रयास गर्नुहोस्।","Calculation failed. Check the details and try again."));}
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
 const connectToMyTime=()=>{
  setError(null);setNotice("");
  if(!hasEditedBirthDetails){setError(tx(language,"पहिले जन्म मिति, समय वा स्थान आफ्नो विवरणअनुसार भर्नुहोस्।","Enter your birth date, time or birthplace before connecting."));return;}
  try{
   const calculated=calculateChart(a);
   const context=createJanmaPatroContext(calculated);
   setChart(calculated);setGuna(null);setNameGuna(null);
   if(!saveJanmaPatroContext(context)){setError(tx(language,"जन्म विवरण सुरक्षित गर्न सकिएन। कृपया फेरि प्रयास गर्नुहोस्।","Your birth details could not be saved. Please try again."));return;}
   window.history.pushState(window.history.state,"","/mytime");
   window.dispatchEvent(new Event("patro:navigation"));
  }catch(err){setChart(null);setGuna(null);setNameGuna(null);setError(err instanceof Error?err.message:tx(language,"मेरो समयसँग जोड्न सकिएन। जन्म विवरण जाँच्नुहोस्।","Could not connect to My Time. Check the birth details."));}
 };
 const buildShare=async()=>{
  try{
   const url=createJanmaPatroShareUrl(new URL(canonicalFor(tab),window.location.origin).toString(),{tab,matchMode,language,a,b,nameA,nameB});
   setShareUrl(url);
   if(navigator.share){await navigator.share({title:tab==="match"?"Aafnai Patro · Guna Milan":"Aafnai Patro · Janma Patro",url});setNotice(tx(language,"शेयर भयो।","Shared."));}
   else if(navigator.clipboard){await navigator.clipboard.writeText(url);setNotice(tx(language,"शेयर लिंक कपी भयो।","Share link copied."));}
   else setNotice(tx(language,"शेयर लिंक तयार भयो।","Share link is ready."));
  }catch(err){if((err as Error)?.name!=="AbortError")setError(tx(language,"शेयर लिंक बनाउन सकिएन।","Could not create a share link."));}
 };
 const exportPdf=async()=>{const target=reportRef.current;if(!target)return;setPdfBusy(true);target.classList.add("jpr-pdf-export");try{const mod=await import("html2pdf.js");const options={margin:5,filename:"aafnai-patro-"+reportSlug(a.name||nameA)+".pdf",image:{type:"jpeg",quality:.98},html2canvas:{scale:2,useCORS:true,backgroundColor:"#fffaf0"},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},pagebreak:{mode:["css","legacy"]}} as any;await mod.default().set(options).from(target).save();}finally{target.classList.remove("jpr-pdf-export");setPdfBusy(false);}};
 const exportJpg=async()=>{if(!reportRef.current)return;setJpgBusy(true);try{const{toJpeg}=await import("html-to-image");const target=reportRef.current.querySelector(".jpr-page--cover") as HTMLElement|null;if(!target)throw new Error("report_cover_not_found");const dataUrl=await toJpeg(target,{quality:.96,pixelRatio:2,backgroundColor:"#fffaf0",cacheBust:true});const link=document.createElement("a");link.href=dataUrl;link.download="aafnai-patro-"+reportSlug(a.name||nameA)+".jpg";document.body.appendChild(link);link.click();link.remove();}catch{setError(tx(language,"JPG तयार हुन सकेन।","Could not create JPG."));}finally{setJpgBusy(false);}};

 const hasReport=Boolean(chart||guna||nameGuna);
 return <main className="jyotish-suite jp-page" id="main-content">
  <header className="jp-hero"><div><p className="jp-eyebrow">आफ्नै ज्योतिष · Aafnai Jyotish</p><h1>{tab==="match"?tx(language,"३६ गुण मिलान · कुण्डली मिलान","36 Guna Milan · Matchmaking"):tx(language,"आफ्नै चिना · जन्मपत्रो","Janma Patro · Birth Chart")}</h1><p>{tab==="match"?tx(language,"जन्म विवरण वा नाम-नक्षत्र अक्षरबाट परम्परागत अष्टकूट मिलान हेर्नुहोस्।","Explore traditional Ashtakoota matching from birth details or mapped name syllables."):tx(language,"जन्ममिति, सही समय र स्थानका आधारमा लग्न, ग्रहस्थिति, नक्षत्र, दशा र चन्द्र कुण्डली हेर्नुहोस्।","See ascendant, planetary positions, nakshatra, dasha and Moon chart from birth date, exact time and place.")}</p></div><div className="jp-language"><button type="button" className={language==="ne"?"is-active":""} onClick={()=>setLanguage("ne")}>नेपाली</button><button type="button" className={language==="en"?"is-active":""} onClick={()=>setLanguage("en")}>English</button></div></header>
  <nav className="jp-tabs" aria-label="Jyotish"><button type="button" className={tab==="chart"?"is-active":""} onClick={()=>setTab("chart")}>{tx(language,"चिना टिपन","Birth chart")}</button><button type="button" className={tab==="match"?"is-active":""} onClick={()=>setTab("match")}>{tx(language,"३६ गुण मिलान","Guna Milan")}</button><a href="/rashifal">☾ {tx(language,"राशिफल","Rashifal")}</a></nav>

  <form onSubmit={generate} className="jp-input-panel">
   {tab==="match"?<div className="jp-mode"><button type="button" className={matchMode==="birth"?"is-active":""} onClick={()=>{setMatchMode("birth");setNameGuna(null)}}>{tx(language,"जन्म विवरणबाट","Birth details")}</button><button type="button" className={matchMode==="name"?"is-active":""} onClick={()=>{setMatchMode("name");setChart(null);setGuna(null)}}>{tx(language,"नामबाट","By name")}</button></div>:null}
   {tab==="chart"||matchMode==="birth"?<><ProfileForm value={a} onChange={setA} language={language} prefix={tab==="match"?tx(language,"पहिलो व्यक्ति · Profile A","Profile A"):tx(language,"जन्म विवरण","Birth details")}/>{tab==="match"?<ProfileForm value={b} onChange={setB} language={language} prefix={tx(language,"दोस्रो व्यक्ति · Profile B","Profile B")}/>:null}</>:<div className="jp-name-mode"><label>{tx(language,"पहिलो नाम","First name")}<input value={nameA} onChange={(e)=>setNameA(e.target.value)} placeholder="राम"/></label><span>×</span><label>{tx(language,"दोस्रो नाम","Second name")}<input value={nameB} onChange={(e)=>setNameB(e.target.value)} placeholder="सीता"/></label><p>{tx(language,"नामको पहिलो नक्षत्र-अक्षरबाट सीमित मिलान हुन्छ। जन्म समय नभएकाले लग्न/भाव/दशा देखाइँदैन।","This limited mode maps the starting name syllable to a nakshatra. It never invents lagna, houses or dasha without a birth time.")}</p></div>}
   <button className="jp-primary" type="submit" disabled={tab==="match"&&!canMatch}>{tab==="match"?tx(language,"गुण मिलाउनुहोस्","Calculate match"):tx(language,"जन्मपत्रिका बनाउनुहोस्","Generate birth chart")}</button>
   {tab==="chart"&&<button type="button" className="jp-connect-mytime" onClick={connectToMyTime} disabled={!hasEditedBirthDetails}>↗ {tx(language,"मेरो समयसँग जोड्नुहोस्","Connect to My Time")}</button>}
  </form>

  {error&&<div className="jp-status is-error" role="alert">{error}</div>}
  {notice&&<div className="jp-status is-success" role="status">{notice}</div>}
  {shareUrl?<div className="jp-share-url"><input readOnly value={shareUrl} aria-label="Share URL"/></div>:null}

  <div ref={reportRef} className="jp-report-surface">{tab==="chart"&&chart?<DetailedBirthChartReport chart={chart} language={language}/>:null}{tab==="match"&&matchMode==="birth"&&guna?<DetailedGunaMilanReport result={guna} language={language}/>:null}{tab==="match"&&matchMode==="name"&&nameGuna?<NameGunaReport result={nameGuna} language={language}/>:null}</div>

  {hasReport?<div className="jp-actions"><button type="button" onClick={buildShare}>↗ {tx(language,"शेयर गर्नुहोस्","Share")}</button><button type="button" onClick={exportPdf} disabled={pdfBusy||jpgBusy}>{pdfBusy?tx(language,"PDF तयार हुँदैछ…","Preparing PDF…"):"PDF"}</button><button type="button" onClick={exportJpg} disabled={jpgBusy||pdfBusy}>{jpgBusy?tx(language,"JPG तयार हुँदैछ…","Preparing JPG…"):"JPG"}</button><button type="button" onClick={()=>window.print()}>⎙ {tx(language,"प्रिन्ट","Print")}</button></div>:null}

  <footer className="jp-disclaimer">{tx(language,"ज्योतिषीय गणना परम्परागत सन्दर्भका लागि हो। स्वास्थ्य, कानुनी, आर्थिक वा सम्बन्धसम्बन्धी निर्णयको निश्चित भविष्यवाणी होइन।","Astrological calculations are traditional references, not certain predictions or substitutes for health, legal, financial or relationship decisions.")}</footer>
 </main>;
}
