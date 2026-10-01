import { FormEvent, useEffect, useMemo, useState } from "react";

async function requestJson(path:string,init:RequestInit={}){
  const response=await fetch(path,{...init,credentials:"same-origin",cache:"no-store",headers:{Accept:"application/json",...(init.headers||{})}});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(body?.error||("HTTP "+response.status));
  return body;
}

export function RouteAlias({to}:{to:string}){
  useEffect(()=>{window.location.replace(to)},[to]);
  return <main className="mp-page"><section className="mp-card"><p>नयाँ पृष्ठमा लगिँदैछ…</p><a href={to}>अगाडि जानुहोस्</a></section></main>;
}

type FamilyEvent={id:string;title:string;event_date:string};
type Family={id:string;name:string;role:string;members:Array<{user_id:string;role:string;display_name?:string|null}>;events:FamilyEvent[]};
export function FamilyPage(){
  const [families,setFamilies]=useState<Family[]>([]);
  const [status,setStatus]=useState("लोड हुँदैछ…");
  const [name,setName]=useState("");
  const [eventTitle,setEventTitle]=useState("");
  const [eventDate,setEventDate]=useState("");
  const [familyId,setFamilyId]=useState("");
  const token=new URLSearchParams(location.search).get("token")||"";

  async function load(){
    try{
      const body=await requestJson("/api/family/state");
      const list=Array.isArray(body?.families)?body.families:[];
      setFamilies(list);setFamilyId(current=>current||list[0]?.id||"");setStatus("");
    }catch(e){setStatus((e as Error).message==="authentication_required"?"परिवारको डेटा हेर्न Google खाताबाट साइन इन गर्नुहोस्।":(e as Error).message)}
  }
  useEffect(()=>{void load()},[]);

  async function create(event:FormEvent){event.preventDefault();if(!name.trim())return;try{await requestJson("/api/family/create",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:name.trim(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"Asia/Kathmandu"})});setName("");await load();}catch(e){setStatus((e as Error).message)}}
  async function join(){if(!token)return;try{await requestJson("/api/family/join",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"Asia/Kathmandu"})});history.replaceState(null,"","/me/family");await load();}catch(e){setStatus((e as Error).message)}}
  async function invite(id:string){try{const body=await requestJson("/api/family/invite",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({family_id:id,expires_hours:72,max_uses:1})});const url=new URL(body.path,location.origin).toString();await navigator.clipboard?.writeText(url);setStatus("निमन्त्रणा लिंक प्रतिलिपि भयो: "+url);}catch(e){setStatus((e as Error).message)}}
  async function addEvent(event:FormEvent){event.preventDefault();if(!familyId||!eventTitle.trim()||!eventDate)return;try{await requestJson("/api/family/event",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({family_id:familyId,title:eventTitle.trim(),event_date:eventDate})});setEventTitle("");setEventDate("");await load();}catch(e){setStatus((e as Error).message)}}

  return <main className="mp-page">
    <section className="mp-page-hero"><p className="eyebrow">निजी · Google खाता</p><h1>परिवार</h1><p>परिवारका सदस्य, साझा मिति र निमन्त्रणा तपाईंको खातासँग सुरक्षित रूपमा जोडिन्छन्।</p></section>
    {token&&<section className="mp-card"><h2>परिवारको निमन्त्रणा</h2><p>निमन्त्रणा स्वीकार गर्न Google खाताबाट साइन इन आवश्यक छ।</p><button onClick={()=>void join()}>परिवारमा जोडिनुहोस्</button></section>}
    <section className="mp-card"><h2>परिवार बनाउनुहोस्</h2><form className="mp-native-form" onSubmit={create}><label>परिवारको नाम<input value={name} onChange={e=>setName(e.target.value)} required/></label><button>बनाउनुहोस्</button></form></section>
    {families.map(f=><section className="mp-card" key={f.id}><header className="mp-native-row"><div><p className="eyebrow">{f.role}</p><h2>{f.name}</h2></div><button onClick={()=>void invite(f.id)}>निमन्त्रणा प्रतिलिपि</button></header><p>{f.members?.length||0} सदस्य</p><div className="mp-native-list">{(f.events||[]).map(ev=><article key={ev.id}><strong>{ev.title}</strong><small>{ev.event_date}</small></article>)}</div></section>)}
    <section className="mp-card"><h2>साझा मिति थप्नुहोस्</h2><form className="mp-native-form" onSubmit={addEvent}><label>परिवार<select value={familyId} onChange={e=>setFamilyId(e.target.value)}>{families.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label><label>शीर्षक<input value={eventTitle} onChange={e=>setEventTitle(e.target.value)} required/></label><label>मिति<input type="date" value={eventDate} onChange={e=>setEventDate(e.target.value)} required/></label><button disabled={!families.length}>सुरक्षित गर्नुहोस्</button></form></section>
    {status&&<p className="community-status">{status}</p>}
  </main>;
}

export function MyDataPage(){
  const [data,setData]=useState<any>(null),[status,setStatus]=useState("लोड हुँदैछ…");
  async function load(){try{const body=await requestJson("/api/v1/my-data");setData(body);setStatus("");}catch(e){setStatus((e as Error).message==="authentication_required"?"खाताको डेटा हेर्न Google खाताबाट साइन इन गर्नुहोस्।":(e as Error).message)}}
  useEffect(()=>{void load()},[]);
  async function exportData(){if(!data)return;const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="aafnai-patro-data.json";a.click();URL.revokeObjectURL(a.href)}
  async function deleteData(){if(!confirm("निजी खाताको सबै डेटा मेटाउने हो? यो कार्य उल्ट्याउन सकिँदैन।"))return;try{await requestJson("/api/v1/my-data",{method:"DELETE"});setData(null);setStatus("निजी खाताको डेटा मेटाइयो।");window.dispatchEvent(new Event("patro:auth-changed"));}catch(e){setStatus((e as Error).message)}}
  return <main className="mp-page"><section className="mp-page-hero"><p className="eyebrow">गोपनीयता · निजी डेटा</p><h1>डेटा</h1><p>साइन इन गरिएको खातासँग सम्बन्धित निजी डेटा मात्र यहाँ देखाइन्छ।</p></section><section className="mp-card"><div className="community-actions"><button className="community-button" onClick={()=>void exportData()} disabled={!data}>JSON निर्यात</button><button className="community-button secondary" onClick={()=>void deleteData()} disabled={!data}>खाताको डेटा मेटाउनुहोस्</button></div>{status&&<p>{status}</p>}{data&&<pre className="mp-data-preview">{JSON.stringify(data,null,2)}</pre>}</section></main>;
}

function urlBase64ToUint8Array(base64String:string){const padding="=".repeat((4-base64String.length%4)%4),base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");const raw=atob(base64);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))}
export function NotificationSettingsPage(){
  const [status,setStatus]=useState(""),[jobs,setJobs]=useState<any[]>([]);
  async function loadJobs(){try{const body=await requestJson("/api/push/jobs");setJobs(Array.isArray(body.jobs)?body.jobs:[])}catch(e){setStatus((e as Error).message)}}
  useEffect(()=>{void loadJobs()},[]);
  async function enable(){try{if(!("serviceWorker" in navigator)||!("PushManager" in window))throw new Error("यो ब्राउजरमा पुश सूचना उपलब्ध छैन।");const permission=await Notification.requestPermission();if(permission!=="granted")throw new Error("सूचनाको अनुमति दिइएन।");const key=await requestJson("/api/push/vapid");const reg=await navigator.serviceWorker.register("/sw.js");let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(key.publicKey)});await requestJson("/api/push/subscribe",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({subscription:sub.toJSON(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"Asia/Kathmandu"})});setStatus("यो खाताका लागि पुश सूचना सक्रिय भयो।");await loadJobs()}catch(e){setStatus((e as Error).message)}}
  return <main className="mp-page"><section className="mp-page-hero"><p className="eyebrow">सम्झना</p><h1>सूचना</h1><p>तपाईंका पुश सदस्यता र निर्धारित सूचनाहरू खातासँग सुरक्षित रूपमा जोडिन्छन्।</p></section><section className="mp-card"><button onClick={()=>void enable()}>पुश सूचना सक्रिय गर्नुहोस्</button>{status&&<p>{status}</p>}<h2>निर्धारित सूचनाहरू</h2><div className="mp-native-list">{jobs.map(j=><article key={j.id}><strong>{j.category}</strong><small>{j.fire_at_utc} · {j.status}</small></article>)}</div></section></main>;
}

export function HolidaySettingsPage(){
  const year=new Date().getFullYear();const [items,setItems]=useState<any[]>([]),[status,setStatus]=useState("");
  useEffect(()=>{requestJson("/api/v1/holidays?year="+year).then(body=>setItems(body.items||body.holidays||[])).catch(e=>setStatus((e as Error).message))},[year]);
  return <main className="mp-page"><section className="mp-page-hero"><p className="eyebrow">आधिकारिक पात्रो</p><h1>बिदा सेटिङ</h1><p>आधिकारिक वा प्रमाणित बिदा र अधिकृत परिवर्तनहरू यहाँ देखाइन्छन्। व्यक्तिगत प्राथमिकता खातामा सुरक्षित हुन्छ।</p></section><section className="mp-card"><div className="mp-native-list">{items.map((h:any)=><article key={h.id||h.ad_date+h.name_ne}><strong>{h.name_ne||h.name_en}</strong><small>{h.ad_date} · {h.scope_type||"राष्ट्रिय"} · {h.status||""}</small></article>)}</div>{status&&<p>{status}</p>}<a href="/admin/community-suites">अधिकृत पात्रो व्यवस्थापन →</a></section></main>;
}

export function DevelopersPage(){
  const [spec,setSpec]=useState<any>(null),[status,setStatus]=useState("");
  useEffect(()=>{requestJson("/api/v1/openapi.json").then(setSpec).catch(e=>setStatus((e as Error).message))},[]);
  const paths=useMemo(()=>spec?.paths?Object.keys(spec.paths):[],[spec]);
  return <main className="mp-page"><section className="mp-page-hero"><p className="eyebrow">विकासकर्ता</p><h1>आफ्नै पात्रो API</h1><p>Cloudflare मा चल्ने API सतह। ब्राउजरले यही डोमेनका रुट प्रयोग गर्छ र निजी API ले सुरक्षित सत्र कुकी प्रयोग गर्छ।</p></section><section className="mp-card">{status&&<p>{status}</p>}<div className="mp-native-list">{paths.map(path=><article key={path}><code>{path}</code></article>)}</div><a href="/api/v1/openapi.json">OpenAPI JSON →</a></section></main>;
}

export function OfflinePage(){
  const [online,setOnline]=useState(navigator.onLine);useEffect(()=>{const on=()=>setOnline(true),off=()=>setOnline(false);addEventListener("online",on);addEventListener("offline",off);return()=>{removeEventListener("online",on);removeEventListener("offline",off)}},[]);
  return <main className="mp-page"><section className="mp-page-hero"><p className="eyebrow">अफलाइन प्रयोग</p><h1>अफलाइन प्रयोग</h1><p>क्यास भएका पात्रो र उपकरणका फाइलहरू नेटवर्क नभएको बेला पनि उपलब्ध हुन सक्छन्। मौसम, समाचार, रेडियो/टिभी र खाता समक्रमणका लागि नेटवर्क चाहिन्छ।</p></section><section className="mp-card"><h2>{online?"इन्टरनेट जडान छ":"इन्टरनेट जडान छैन"}</h2><p>निजी परिवर्तनहरू सम्भव भएसम्म स्थानीय रूपमा सुरक्षित हुन्छन् र जडान फर्किएपछि समक्रमण हुन्छ।</p><a href="/tools">अफलाइन चल्न सक्ने उपकरण खोल्नुहोस् →</a></section></main>;
}
