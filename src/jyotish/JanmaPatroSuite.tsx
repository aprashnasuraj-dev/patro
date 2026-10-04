import { FormEvent, useMemo, useRef, useState } from "react";
import { calculateChart, calculateGuna, type BirthInput, type ChartResult, type GunaResult, SIGNS } from "./jyotishEngine";

const DISTRICTS=[
  ["Kathmandu",27.7172,85.3240],["Lalitpur",27.6644,85.3188],["Bhaktapur",27.6710,85.4298],["Pokhara",28.2096,83.9856],
  ["Biratnagar",26.4525,87.2718],["Janakpur",26.7288,85.9250],["Birgunj",27.0104,84.8774],["Chitwan",27.5291,84.3542],
  ["Butwal",27.7006,83.4484],["Nepalgunj",28.0500,81.6167],["Dhangadhi",28.7017,80.5898],["Charikot",27.6667,86.0333],
  ["Manthali",27.3833,86.0667],["Chautara",27.7744,85.7120],["Melamchi",27.8294,85.5775]
] as const;
const DEFAULT:BirthInput={name:"",date:"1995-01-01",time:"12:00",lat:27.7172,lng:85.324,location:"Kathmandu"};

async function resolveBsDate(year:number,month:number,day:number){
  const approxYear=year-57, approxMonth=(month+2)%12;
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

function ProfileForm({value,onChange,prefix}:{value:BirthInput;onChange:(x:BirthInput)=>void;prefix:string}){
  const [calendar,setCalendar]=useState<"AD"|"BS">("AD"),[bs,setBs]=useState({year:2051,month:9,day:17}),[busy,setBusy]=useState(false),[localError,setLocalError]=useState<string|null>(null);
  const set=<K extends keyof BirthInput>(key:K,val:BirthInput[K])=>onChange({...value,[key]:val});
  const chooseDistrict=(name:string)=>{const row=DISTRICTS.find((x)=>x[0]===name);if(row)onChange({...value,location:row[0],lat:row[1],lng:row[2]});};
  const applyBs=async()=>{setBusy(true);setLocalError(null);try{set("date",await resolveBsDate(bs.year,bs.month,bs.day));}catch(e){setLocalError(e instanceof Error?e.message:"मिति रूपान्तरण हुन सकेन।");}finally{setBusy(false);}};
  return <fieldset className="birth-form"><legend>{prefix}</legend>
    <label>नाम · Name<input value={value.name} onChange={(e)=>set("name",e.target.value)} placeholder="नाम / Name"/></label>
    <div className="form-row"><label>पात्रो · Calendar<select value={calendar} onChange={(e)=>setCalendar(e.target.value as "AD"|"BS")}><option>AD</option><option>BS</option></select></label>
      {calendar==="AD"?<label>जन्ममिति · Birth date<input type="date" value={value.date} onChange={(e)=>set("date",e.target.value)}/></label>:<div className="bs-date-fields"><label>BS year<input type="number" value={bs.year} onChange={(e)=>setBs({...bs,year:Number(e.target.value)})}/></label><label>Month<input type="number" min="1" max="12" value={bs.month} onChange={(e)=>setBs({...bs,month:Number(e.target.value)})}/></label><label>Day<input type="number" min="1" max="32" value={bs.day} onChange={(e)=>setBs({...bs,day:Number(e.target.value)})}/></label><button type="button" onClick={applyBs} disabled={busy}>{busy?"रूपान्तरण हुँदैछ…":"वि.सं. मिति प्रयोग गर्नुहोस्"}</button></div>}
      <label>जन्म समय · Exact time<input type="time" value={value.time} onChange={(e)=>set("time",e.target.value)}/></label></div>
    {localError&&<span className="form-error" role="alert">{localError}</span>}
    <div className="form-row"><label>जन्मस्थान · District<select value={DISTRICTS.some((x)=>x[0]===value.location)?value.location:""} onChange={(e)=>chooseDistrict(e.target.value)}><option value="">अन्य स्थान · Coordinates</option>{DISTRICTS.map((x)=><option key={x[0]}>{x[0]}</option>)}</select></label>
      <label>Latitude<input type="number" step=".0001" value={value.lat} onChange={(e)=>set("lat",Number(e.target.value))}/></label><label>Longitude<input type="number" step=".0001" value={value.lng} onChange={(e)=>set("lng",Number(e.target.value))}/></label></div>
  </fieldset>;
}

function NorthIndianChart({chart}:{chart:ChartResult}){
  const houses=Array.from({length:12},(_,i)=>chart.planets.filter((p)=>p.house===i+1).map((p)=>p.name.slice(0,2)).join(" "));
  const labels:[[number,number],[number,number],[number,number],[number,number],[number,number],[number,number],[number,number],[number,number],[number,number],[number,number],[number,number],[number,number]]=[[150,38],[235,62],[264,150],[235,238],[150,264],[65,238],[36,150],[65,62],[150,96],[204,150],[150,204],[96,150]];
  return <svg className="kundali-svg" viewBox="0 0 300 300" role="img" aria-label="North Indian style birth chart">
    <rect x="8" y="8" width="284" height="284" rx="4"/><path d="M8 8L292 292M292 8L8 292M150 8L292 150L150 292L8 150Z"/>
    {labels.map(([x,y],i)=><g key={i}><text x={x} y={y-8} className="house-number">{i+1}</text><text x={x} y={y+8}>{houses[i]||"·"}</text></g>)}
    <text x="150" y="142" className="lagna-label">Lagna</text><text x="150" y="160" className="lagna-value">{SIGNS[chart.ascSignIndex].split(" · ")[0]}</text>
  </svg>;
}

function ChartReport({chart}:{chart:ChartResult}){
  return <section className="patro-report">
    <div className="report-head"><div><p className="eyebrow">आफ्नै चिना · जन्मपत्रो</p><h2>{chart.input.name||"Birth Chart"}</h2><p>{chart.input.date} · {chart.input.time} · {chart.input.location} ({chart.input.lat.toFixed(4)}, {chart.input.lng.toFixed(4)})</p></div><div className="lagna-badge"><small>Lagna</small><strong>{SIGNS[chart.ascSignIndex]}</strong><span>{degreeText(chart.ascendant%30)}</span></div></div>
    <div className="kundali-layout"><NorthIndianChart chart={chart}/><div className="chart-summary"><article><small>Moon Nakshatra</small><strong>{chart.moonNakshatra}</strong><span>Pada {chart.moonPada}</span></article><article><small>Ayanamsa</small><strong>{chart.ayanamsa.toFixed(4)}°</strong><span>Lahiri-style</span></article><article><small>Manglik</small><strong>{chart.manglik.severity}</strong><span>Mars H{chart.manglik.fromLagna} from Lagna · H{chart.manglik.fromMoon} from Moon</span></article></div></div>
    <h3>Planetary positions</h3><div className="table-wrap"><table><thead><tr><th>Graha</th><th>Sidereal longitude</th><th>Rashi</th><th>House</th></tr></thead><tbody>{chart.planets.map((p)=><tr key={p.key}><td>{p.name}</td><td>{p.longitude.toFixed(3)}° · {degreeText(p.degreeInSign)}</td><td>{p.sign}</td><td>{p.house}</td></tr>)}</tbody></table></div>
    <h3>Vimshottari Mahadasha</h3><div className="table-wrap"><table><thead><tr><th>Lord</th><th>Start</th><th>End</th><th>Years</th></tr></thead><tbody>{chart.dashas.map((d,i)=><tr key={i}><td>{d.lord}</td><td>{dateText(d.start)}</td><td>{dateText(d.end)}</td><td>{d.years.toFixed(2)}</td></tr>)}</tbody></table></div>
    <div className="manglik-card"><div><small>Kuja / Manglik Dosha</small><strong>{chart.manglik.severity}</strong></div><p>{chart.manglik.explanation}</p><p className="tradition-note">Traditional remedy guidance varies by lineage and should not be treated as a substitute for relationship, health, legal or financial decisions. Common traditions discuss Mangal prayer, charity and matching cancellation rules with a qualified practitioner.</p></div>
    <details className="methodology"><summary>गणना पद्धति र सीमाहरू · Methodology</summary><ul>{chart.methodology.map((x)=><li key={x}>{x}</li>)}</ul></details>
  </section>;
}

function GunaReport({result}:{result:GunaResult}){
  return <section className="guna-report"><div className="guna-score"><span>Ashtakoota</span><strong>{result.total}<small>/36</small></strong><p>यो परम्परागत मिलान स्कोर हो; सम्बन्धको सफलता भविष्यवाणी गर्ने मापन होइन।</p></div>
    <div className="guna-grid">{result.items.map((x)=><article key={x.key}><div><strong>{x.label}</strong><span>{x.score}/{x.max}</span></div><meter min="0" max={x.max} value={x.score}/><p>{x.detail}</p></article>)}</div>
    <div className="manglik-pair"><article><span>{result.profileA.input.name||"Profile A"}</span><strong>Manglik: {result.profileA.manglik.severity}</strong><small>{result.profileA.manglik.explanation}</small></article><article><span>{result.profileB.input.name||"Profile B"}</span><strong>Manglik: {result.profileB.manglik.severity}</strong><small>{result.profileB.manglik.explanation}</small></article></div>
  </section>;
}

export function JanmaPatroSuite(){
  const [tab,setTabState]=useState<"chart"|"match">(()=>typeof window!=="undefined"&&window.location.pathname.startsWith("/jyotish/matchmaking")?"match":"chart"),[a,setA]=useState<BirthInput>({...DEFAULT}),[b,setB]=useState<BirthInput>({...DEFAULT,name:"",time:"12:00"});
  const setTab=(next:"chart"|"match")=>{setTabState(next);if(typeof window!=="undefined"){const path=next==="match"?"/jyotish/matchmaking":"/jyotish/china";if(window.location.pathname!==path)window.history.replaceState(window.history.state,"",path);}};
  const [chart,setChart]=useState<ChartResult|null>(null),[guna,setGuna]=useState<GunaResult|null>(null),[error,setError]=useState<string|null>(null),[pdfBusy,setPdfBusy]=useState(false),[jpgBusy,setJpgBusy]=useState(false);
  const reportRef=useRef<HTMLDivElement|null>(null);
  const canMatch=useMemo(()=>Boolean(a.date&&a.time&&b.date&&b.time),[a,b]);
  const generate=(e:FormEvent)=>{e.preventDefault();try{setError(null);const ca=calculateChart(a);setChart(ca);if(tab==="match"){const cb=calculateChart(b);setGuna(calculateGuna(ca,cb));}else setGuna(null);}catch(err){setError(err instanceof Error?err.message:"चिना गणना हुन सकेन। विवरण जाँचेर फेरि प्रयास गर्नुहोस्।");}};
  const exportPdf=async()=>{if(!reportRef.current)return;setPdfBusy(true);try{const mod=await import("html2pdf.js");const html2pdf=mod.default;await html2pdf().set({margin:8,filename:"aafnai-china-"+reportSlug(a.name)+".pdf",image:{type:"jpeg",quality:.96},html2canvas:{scale:2,useCORS:true,backgroundColor:"#ffffff"},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"}}).from(reportRef.current).save();}finally{setPdfBusy(false);}};
  const exportJpg=async()=>{if(!reportRef.current)return;setJpgBusy(true);try{const {toJpeg}=await import("html-to-image");const dataUrl=await toJpeg(reportRef.current,{quality:.95,pixelRatio:2,backgroundColor:"#ffffff",cacheBust:true});const link=document.createElement("a");link.href=dataUrl;link.download="aafnai-china-"+reportSlug(a.name)+".jpg";document.body.appendChild(link);link.click();link.remove();}catch{setError("JPG तयार हुन सकेन। फेरि प्रयास गर्नुहोस्।");}finally{setJpgBusy(false);}};
  return <main className="jyotish-suite"><header className="jyotish-hero"><div><p className="eyebrow">आफ्नै ज्योतिष</p><h1>{tab==="match"?"३६ गुण मिलान · कुण्डली मिलान":"आफ्नै चिना · जन्मपत्रो"}</h1><p>{tab==="match"?"दुई व्यक्तिको जन्म विवरणबाट अष्टकूट (३६ गुण) र मांगलिक दोष परम्परागत विधिअनुसार मिलाउनुहोस्।":"जन्ममिति, सही समय र स्थानका आधारमा लग्न, ग्रहस्थिति, नक्षत्र, दशा र परम्परागत ज्योतिषीय सन्दर्भ हेर्नुहोस्।"}</p></div><div className="segmented-control"><button type="button" className={tab==="chart"?"active":""} onClick={()=>setTab("chart")}>चिना टिपन</button><button type="button" className={tab==="match"?"active":""} onClick={()=>setTab("match")}>३६ गुण मिलान</button><a className="rashifal-tab" href="/jyotish/rashifal">☾ आफ्नै राशिफल</a></div></header>
    <form onSubmit={generate} className="jyotish-input-panel"><ProfileForm value={a} onChange={setA} prefix={tab==="match"?"पहिलो व्यक्ति · Profile A":"जन्म विवरण · Birth details"}/>{tab==="match"&&<ProfileForm value={b} onChange={setB} prefix="दोस्रो व्यक्ति · Profile B"/>}<button className="calculate-button" type="submit" disabled={tab==="match"&&!canMatch}>{tab==="match"?"३६ गुण मिलाउनुहोस्":"आफ्नै चिना बनाउनुहोस्"}</button></form>
    {error&&<div className="inline-error" role="alert">{error}</div>}
    <div ref={reportRef} className="pdf-report-surface">{chart&&<ChartReport chart={chart}/>} {tab==="match"&&guna&&<GunaReport result={guna}/>}</div>
    {chart&&<div className="report-actions"><button type="button" onClick={exportPdf} disabled={pdfBusy||jpgBusy}>{pdfBusy?"PDF तयार हुँदैछ…":"PDF डाउनलोड"}</button><button type="button" onClick={exportJpg} disabled={jpgBusy||pdfBusy}>{jpgBusy?"JPG तयार हुँदैछ…":"JPG डाउनलोड"}</button></div>}
  </main>;
}
