import { tithiAlarmUtc } from "../tithiAlarm";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { EventKind } from "@/patro-tools/tithi-events/events";
import { panchangProvider, primePanchang } from "./panchangAdapter";
import { readLife, syncLifeTools, updateLife, type StoredTithiEvent } from "./storage";
import { ToolPage, ToolResult } from "./ToolPrimitives";

const MONTH_KEYS = ["chaitra","vaishakha","jyestha","ashadha","shravana","bhadrapada","ashwin","kartika","margashirsha","pausha","magha","falguna"];
const KIND_LABEL: Record<EventKind, string> = { shraddha:"श्राद्ध", tithi_birthday:"तिथि जन्मदिन", puja:"पूजा", vrata:"व्रत", custom:"अन्य" };

type NextOccurrence = { adDate:string; bsDate?:{key?:string}; status?:string; explanation?:{ne?:string} };

function todayNepal(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
async function nextForEvent(event:StoredTithiEvent,signal?:AbortSignal):Promise<NextOccurrence[]>{
  const rule=event.rule;
  const query=new URLSearchParams({month:MONTH_KEYS[rule.month]||"chaitra",paksha:rule.paksha,tithi:String(rule.tithi),rule:rule.observance==="pradosh"?"pradosha":rule.observance,system:rule.system||"purnimanta",adhikPolicy:rule.adhik==="adhik"?"adhik_month":rule.adhik==="both"?"both":"nija_month",from:todayNepal(),count:"3"});
  const response=await fetch("/api/v1/tithi/next?"+query.toString(),{signal,headers:{Accept:"application/json"}});
  if(!response.ok)throw new Error("आगामी तिथि निकाल्न सकिएन।");
  const payload=await response.json() as {occurrences?:NextOccurrence[];items?:NextOccurrence[]};
  return payload.occurrences||payload.items||[];
}
function escapeIcs(value:string){return value.replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n")}
function nextDay(value:string){const date=new Date(value+"T00:00:00Z");date.setUTCDate(date.getUTCDate()+1);return date.toISOString().slice(0,10)}
function buildIcs(events:StoredTithiEvent[],occurrences:Record<string,NextOccurrence[]>){
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Aafnai Patro//Tithi Reminder//NE","CALSCALE:GREGORIAN","X-WR-CALNAME:आफ्नै पात्रो · आफ्नै तिथि रिमाइन्डर","X-WR-TIMEZONE:Asia/Kathmandu"];
  for(const event of events)for(const occurrence of occurrences[event.id]||[]){lines.push("BEGIN:VEVENT","DTSTAMP:"+new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z"),"UID:"+escapeIcs(event.id+"-"+occurrence.adDate+"@aafnaipatro"),"DTSTART;VALUE=DATE:"+occurrence.adDate.replace(/-/g,""),"DTEND;VALUE=DATE:"+nextDay(occurrence.adDate).replace(/-/g,""),"SUMMARY:"+escapeIcs(event.title),"DESCRIPTION:"+escapeIcs((occurrence.explanation?.ne||"")+" · आफ्नै पात्रो"));for(const day of event.remindDaysBefore.filter(value=>Number.isInteger(value)&&value>=0&&value<=365))lines.push("BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:"+escapeIcs(event.title),"TRIGGER;VALUE=DATE-TIME:"+tithiAlarmUtc(occurrence.adDate,event.remindAt,day),"END:VALARM");lines.push("END:VEVENT")}
  lines.push("END:VCALENDAR");return lines.join("\r\n")+"\r\n";
}

export function TithiReminderTool(){
  const[events,setEvents]=useState<StoredTithiEvent[]>(()=>readLife().tithiEvents);
  const[title,setTitle]=useState("");const[kind,setKind]=useState<EventKind>("tithi_birthday");const[sourceDate,setSourceDate]=useState(todayNepal());const[remindAt,setRemindAt]=useState("07:00");const[days,setDays]=useState<number[]>([7,1,0]);const[occurrences,setOccurrences]=useState<Record<string,NextOccurrence[]>>({});const[status,setStatus]=useState("");const[feedUrl,setFeedUrl]=useState("");const[busy,setBusy]=useState(false);

  useEffect(()=>{const controller=new AbortController();Promise.all(events.map(async item=>[item.id,await nextForEvent(item,controller.signal)] as const)).then(rows=>setOccurrences(Object.fromEntries(rows))).catch(error=>{if((error as Error)?.name!=="AbortError")setStatus(error instanceof Error?error.message:"तिथि लोड भएन।")});return()=>controller.abort()},[events]);
  const speechText=useMemo(()=>events.map(item=>{const next=occurrences[item.id]?.[0];return next?item.title+" को अर्को मिति "+next.adDate+"।":item.title+" सुरक्षित छ।"}).join(" "),[events,occurrences]);

  async function save(event:FormEvent){
    event.preventDefault();if(!title.trim()||!sourceDate||busy)return;setBusy(true);setStatus("तिथि पत्ता लगाउँदै…");
    try{
      await primePanchang(sourceDate);const p=panchangProvider.day(sourceDate);
      const item:StoredTithiEvent={id:crypto.randomUUID(),kind,title:title.trim(),sourceDate,rule:{month:p.monthIndex,paksha:p.paksha,tithi:p.tithiInPaksha,observance:kind==="shraddha"?"aparahna":"udaya",system:"purnimanta",adhik:"nija"},remindDaysBefore:[...days].sort((a,b)=>b-a),remindAt,updatedAt:Date.now()};
      const life=updateLife(current=>({...current,tithiEvents:[...current.tithiEvents,item]}));setEvents(life.tithiEvents);setTitle("");setStatus("रिमाइन्डर सुरक्षित भयो। खाता सिङ्क जाँचिँदैछ…");
      try{const synced=await syncLifeTools();setEvents(synced.life.tithiEvents);setStatus(synced.synced?"रिमाइन्डर सुरक्षित भयो र खातासँग सिङ्क भयो।":"रिमाइन्डर यो उपकरणमा सुरक्षित भयो। Google खातामा साइन इन गरेपछि सिङ्क गर्न सकिन्छ।")}catch{setStatus("रिमाइन्डर यो उपकरणमा सुरक्षित भयो। खाता सिङ्क अहिले हुन सकेन।")}
    }catch(error){setStatus(error instanceof Error?error.message:"सुरक्षित गर्न सकिएन।")}finally{setBusy(false)}
  }

  async function remove(id:string){
    const previous=events;const life=updateLife(current=>({...current,tithiEvents:current.tithiEvents.filter(event=>event.id!==id)}));setEvents(life.tithiEvents);setStatus("रिमाइन्डर हटाइयो। खाता सिङ्क जाँचिँदैछ…");
    try{const synced=await syncLifeTools();setEvents(synced.life.tithiEvents);setStatus(synced.synced?"रिमाइन्डर हटाइयो र खातासँग सिङ्क भयो।":"रिमाइन्डर यो उपकरणबाट हटाइयो।")}
    catch{setEvents(life.tithiEvents);setStatus(previous.length!==life.tithiEvents.length?"रिमाइन्डर हटाइयो। खाता सिङ्क पछि पुनः प्रयास हुनेछ।":"रिमाइन्डर हटाउन सकिएन।")}
  }

  function downloadIcs(){
    const text=buildIcs(events,occurrences);const url=URL.createObjectURL(new Blob([text],{type:"text/calendar;charset=utf-8"}));const link=document.createElement("a");link.href=url;link.download="aafnai-patro-tithi-reminders.ics";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus("Calendar फाइल तयार भयो।")
  }

  async function createFeed(){
    setStatus("निजी Calendar feed तयार हुँदैछ…");setFeedUrl("");
    try{
      const response=await fetch("/api/v1/tools/tithi-feed-token",{method:"POST",headers:{"content-type":"application/json"},credentials:"same-origin",body:"{}"});
      if(response.status===401){setStatus("Google Calendar feed बनाउन पहिले आफ्नै पात्रोमा Google खाताबाट साइन इन गर्नुहोस्।");return}
      const payload=await response.json() as {path?:string;error?:string};
      if(!response.ok||!payload.path){setStatus("Calendar feed बनाउन सकिएन। फेरि प्रयास गर्नुहोस्।");return}
      const value=location.origin+payload.path;setFeedUrl(value);setStatus("निजी Calendar feed तयार भयो। Google Calendar → Other calendars → From URL मा यो लिंक राख्नुहोस्।")
    }catch{setStatus("Calendar feed अहिले बनाउन सकिएन। ICS डाउनलोड भने प्रयोग गर्न सक्नुहुन्छ।")}
  }
  async function copyFeed(){if(!feedUrl)return;try{await navigator.clipboard.writeText(feedUrl);setStatus("निजी Calendar feed लिंक कपी भयो।")}catch{setStatus("Clipboard अनुमति उपलब्ध छैन। लिंक चयन गरेर कपी गर्नुहोस्।")}}

  return <ToolPage title="आफ्नै तिथि रिमाइन्डर" description="श्राद्ध, तिथि जन्मदिन, पूजा वा व्रतका आगामी तिथि पत्ता लगाएर सम्झना सुरक्षित गर्नुहोस्।">
    <section className="patro-tool-card"><form className="tool-form-grid" onSubmit={save}><label>नाम<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="जस्तै: आमाको श्राद्ध" required maxLength={100}/></label><label>प्रकार<select value={kind} onChange={e=>setKind(e.target.value as EventKind)}>{Object.entries(KIND_LABEL).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><label>मूल AD मिति<input type="date" value={sourceDate} onChange={e=>setSourceDate(e.target.value)} required/></label><label>रिमाइन्डर समय<input type="time" value={remindAt} onChange={e=>setRemindAt(e.target.value)}/></label><fieldset className="tool-checks"><legend>कति दिनअघि सम्झाउने?</legend>{[30,7,1,0].map(day=><label key={day}><input type="checkbox" checked={days.includes(day)} onChange={e=>setDays(old=>e.target.checked?[...new Set([...old,day])]:old.filter(x=>x!==day))}/> {day===0?"सोही दिन":day+" दिनअघि"}</label>)}</fieldset><button className="tool-primary-button" type="submit" disabled={busy}>{busy?"सुरक्षित हुँदैछ…":"तिथि निकालेर सुरक्षित गर्नुहोस्"}</button></form>{status?<p className="tool-status" role="status">{status}</p>:null}</section>
    <ToolResult title="आगामी तिथिहरू" speechText={speechText||"अहिले कुनै तिथि रिमाइन्डर छैन।"}>{events.length===0?<p className="tool-muted">पहिलो श्राद्ध वा तिथि जन्मदिन माथि थप्नुहोस्।</p>:<div className="tool-event-list">{events.map(item=><article className="tool-event" key={item.id}><div><strong>{item.title}</strong><small>{KIND_LABEL[item.kind]} · आधार {item.sourceDate} · {item.rule.paksha==="krishna"?"कृष्ण":"शुक्ल"} {item.rule.tithi}</small></div><div className="tool-occurrences">{(occurrences[item.id]||[]).map(row=><span key={row.adDate}><b>{row.adDate}</b>{row.bsDate?.key?" · "+row.bsDate.key+" BS":""}{row.status==="ambiguous"?" · पुष्टि गर्नुहोस्":""}</span>)}</div><button type="button" className="tool-link-button danger" onClick={()=>void remove(item.id)}>हटाउनुहोस्</button></article>)}</div>}<div className="tool-action-row"><button type="button" className="tool-secondary-button" onClick={downloadIcs} disabled={!events.length||!Object.values(occurrences).some(rows=>rows.length)}>Calendar फाइल डाउनलोड</button><button type="button" className="tool-secondary-button" onClick={()=>void createFeed()} disabled={!events.length}>Google Calendar feed</button></div>{feedUrl?<div className="tool-feed"><input readOnly value={feedUrl} aria-label="Private calendar feed URL"/><button type="button" onClick={()=>void copyFeed()}>कपी</button></div>:null}<p className="tool-muted">सूचना आउन ICS आफ्नो Calendar मा import गर्नुहोस् वा feed जोड्नुहोस्। यो Calendar feed लिंक निजी राख्नुहोस्। Feed उपलब्ध नभए पनि Calendar फाइल डाउनलोड प्रयोग गर्न सक्नुहुन्छ।</p></ToolResult>
  </ToolPage>
}
