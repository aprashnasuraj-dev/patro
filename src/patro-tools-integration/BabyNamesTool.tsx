import { useMemo, useState } from "react";
import { namesForSyllables, PADA_SYLLABLES, type Gender } from "@/patro-tools/baby/nakshatra-names";
import { NAKSHATRAS, RASHIS } from "@/patro-tools/core/names";
import { bsAdapter } from "./bsAdapter";
import { panchangProvider, primePanchang } from "./panchangAdapter";
import { NEPAL_VACCINE_SCHEDULE, NEPAL_VACCINE_SCHEDULE_SOURCE } from "./data/vaccine-schedule";
import { syncLifeTools, updateLife } from "./storage";
import { ToolPage, ToolResult } from "./ToolPrimitives";

function addDays(iso:string,days:number){const d=new Date(iso+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
function addMonths(iso:string,months:number){const[y,m,d]=iso.split("-").map(Number);const target=new Date(Date.UTC(y,m-1+months,1));const last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();target.setUTCDate(Math.min(d,last));return target.toISOString().slice(0,10)}
function todayNepal(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
function bsLabel(ad:string){const[year,month,day]=ad.split("-").map(Number);const b=bsAdapter.toBS({year,month,day});return b.year+"-"+String(b.month).padStart(2,"0")+"-"+String(b.day).padStart(2,"0")}
type Result={nak:number;pada:number;rashi:number;syllables:string[];timeline:Array<{title:string;date:string;note?:string}>};

export function BabyNamesTool(){
 const[birthDate,setBirthDate]=useState("2026-09-29");const[gender,setGender]=useState<Gender>("u");const[babyName,setBabyName]=useState("");const[result,setResult]=useState<Result|null>(null);const[status,setStatus]=useState("");const[busy,setBusy]=useState(false);
 async function calculate(){
  if(!birthDate||birthDate>todayNepal()){setStatus("जन्म मिति आज वा विगतको हुनुपर्छ।");return}
  setBusy(true);setResult(null);setStatus("जन्म नक्षत्र जाँचिँदैछ…");
  try{await primePanchang(birthDate);const p=panchangProvider.day(birthDate);const timeline=[{title:"न्वारन (परम्परागत ११ औं दिन)",date:addDays(birthDate,10),note:"कुल/परम्परा अनुसार फरक हुन सक्छ"},{title:gender==="f"?"पास्नी (परम्परागत पाँचौं महिना)":"पास्नी (परम्परागत छैटौं महिना)",date:addMonths(birthDate,gender==="f"?5:6),note:"ठ्याक्कै साइतका लागि साइत उपकरण प्रयोग गर्नुहोस्"},...NEPAL_VACCINE_SCHEDULE.map(v=>({title:"खोप: "+v.label,date:addDays(birthDate,v.days),note:v.note}))];setResult({nak:p.nakshatra,pada:p.nakshatraPada,rashi:p.moonRashi,syllables:PADA_SYLLABLES[p.nakshatra]||[],timeline});setStatus("तयार भयो।")}
  catch(error){setStatus(error instanceof Error?error.message:"जन्म नक्षत्र निकाल्न सकिएन।")}finally{setBusy(false)}
 }
 const suggestions=useMemo(()=>result?namesForSyllables(result.syllables,{gender,lenient:true}).flatMap(x=>x.names.map(n=>({...n,syllable:x.syllable}))):[],[result,gender]);
 async function saveFamily(){
  if(!result||!babyName.trim()){setStatus("Family Dates मा राख्न नाम लेख्नुहोस्।");return}
  const life=updateLife(current=>({...current,family:[...current.family,{id:crypto.randomUUID(),name:babyName.trim(),relation:"baby",date:birthDate,birthTithi:{nakshatra:result.nak,pada:result.pada},updatedAt:Date.now()}]}));
  setStatus("Family Dates मा स्थानीय रूपमा सुरक्षित भयो। Cloud sync जाँचिँदैछ…");setBabyName("");
  try{const synced=await syncLifeTools();setStatus(synced.synced?"Family Dates मा सुरक्षित भयो · Google sync भयो।":"Family Dates मा स्थानीय रूपमा सुरक्षित भयो। Google login भएमा sync हुन्छ।")}
  catch{setStatus(life.family.length?"Family Dates मा स्थानीय रूपमा सुरक्षित भयो। Cloud sync अहिले उपलब्ध छैन।":"सुरक्षित गर्न सकिएन।")}
 }
 const speech=result?NAKSHATRAS[result.nak]+" नक्षत्र, चरण "+result.pada+"। सुझाव अक्षर "+result.syllables.join(", ")+"।":"";
 return <ToolPage title="आफ्नै बेबी नेम" description="आफ्नै पात्रोको पञ्चाङ्गबाट जन्म नक्षत्र र चरण निकालेर नामका अक्षर, न्वारन, पास्नी र खोप समयरेखा बनाउँछ।"><section className="patro-tool-card"><div className="tool-form-grid"><label>जन्म AD मिति<input type="date" max={todayNepal()} value={birthDate} onChange={e=>setBirthDate(e.target.value)}/></label><label>लिङ्ग<select value={gender} onChange={e=>setGender(e.target.value as Gender)}><option value="u">नखुलाउने</option><option value="m">छोरा</option><option value="f">छोरी</option></select></label></div><button className="tool-primary-button" type="button" onClick={()=>void calculate()} disabled={busy}>{busy?"नक्षत्र जाँचिँदैछ…":"नाम र समयरेखा निकाल्नुहोस्"}</button>{status?<p className="tool-status" role="status">{status}</p>:null}</section>{result?<ToolResult title="जन्म नक्षत्र र नाम" speechText={speech}><div className="tool-verdict"><strong>{NAKSHATRAS[result.nak]} · चरण {result.pada}</strong><small>चन्द्र राशि: {RASHIS[result.rashi]} · अक्षर: {result.syllables.join(" · ")}</small></div><div className="name-grid">{suggestions.slice(0,24).map((n,index)=><article key={n.name+"-"+index}><strong>{n.name}</strong><small>{n.roman} · {n.syllable}</small><p>{n.meaning}</p></article>)}</div><h3>न्वारन, पास्नी र खोप समयरेखा</h3><div className="tool-event-list">{result.timeline.map((item,index)=><article className="tool-event" key={item.title+index}><div><strong>{item.title}</strong><small>{item.date} AD · {bsLabel(item.date)} BS</small></div><small>{item.note||""}</small></article>)}</div><p className="tool-muted">खोप स्रोत: {NEPAL_VACCINE_SCHEDULE_SOURCE.authority}. तालिका बदलिन सक्छ; बच्चाको खोप कार्ड वा स्वास्थ्यकर्मीसँग पक्का गर्नुहोस्।</p><div className="tool-action-row"><input value={babyName} maxLength={80} onChange={e=>setBabyName(e.target.value)} placeholder="Family Dates मा राख्ने नाम"/><button type="button" className="tool-secondary-button" onClick={()=>void saveFamily()}>Family Dates मा सुरक्षित</button><a className="tool-link-button" href="/tools/sait">आफ्नै साइत हेर्नुहोस्</a></div></ToolResult>:null}</ToolPage>
}
