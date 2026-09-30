import { FormEvent, useEffect, useMemo, useState } from "react";

async function requestJson(path:string,init:RequestInit={}){
  const response=await fetch(path,{...init,credentials:"same-origin",cache:"no-store",headers:{Accept:"application/json",...(init.headers||{})}});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(body?.error||("HTTP "+response.status));
  return body;
}

export function RouteAlias({to}:{to:string}){
  useEffect(()=>{window.location.replace(to)},[to]);
  return <main className="mp-page"><section className="mp-card"><p>Redirecting…</p><a href={to}>Continue</a></section></main>;
}

type FamilyEvent={id:string;title:string;event_date:string};
type Family={id:string;name:string;role:string;members:Array<{user_id:string;role:string;display_name?:string|null}>;events:FamilyEvent[]};
export function FamilyPage(){
  const [families,setFamilies]=useState<Family[]>([]);
  const [status,setStatus]=useState("Loading…");
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
    }catch(e){setStatus((e as Error).message==="authentication_required"?"Google sign-in गरेपछि family data उपलब्ध हुन्छ।":(e as Error).message)}
  }
  useEffect(()=>{void load()},[]);

  async function create(event:FormEvent){
    event.preventDefault();if(!name.trim())return;
    try{await requestJson("/api/family/create",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:name.trim(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"Asia/Kathmandu"})});setName("");await load();}catch(e){setStatus((e as Error).message)}
  }
  async function join(){
    if(!token)return;
    try{await requestJson("/api/family/join",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"Asia/Kathmandu"})});history.replaceState(null,"","/family");await load();}catch(e){setStatus((e as Error).message)}
  }
  async function invite(id:string){
    try{const body=await requestJson("/api/family/invite",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({family_id:id,expires_hours:72,max_uses:1})});const url=new URL(body.path,location.origin).toString();await navigator.clipboard?.writeText(url);setStatus("Invite link copied: "+url);}catch(e){setStatus((e as Error).message)}
  }
  async function addEvent(event:FormEvent){
    event.preventDefault();if(!familyId||!eventTitle.trim()||!eventDate)return;
    try{await requestJson("/api/family/event",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({family_id:familyId,title:eventTitle.trim(),event_date:eventDate})});setEventTitle("");setEventDate("");await load();}catch(e){setStatus((e as Error).message)}
  }

  return <main className="mp-page">
    <section className="mp-page-hero"><p className="eyebrow">Private · Google account</p><h1>परिवार · Family</h1><p>Family membership, shared dates and invites are stored in Cloudflare D1 under your Google account ID.</p></section>
    {token&&<section className="mp-card"><h2>Family invite</h2><p>यो invite स्वीकार गर्न Google sign-in आवश्यक हुन्छ।</p><button onClick={()=>void join()}>Join family</button></section>}
    <section className="mp-card"><h2>Create family</h2><form className="mp-native-form" onSubmit={create}><label>Family name<input value={name} onChange={e=>setName(e.target.value)} required/></label><button>Create</button></form></section>
    {families.map(f=><section className="mp-card" key={f.id}>
      <header className="mp-native-row"><div><p className="eyebrow">{f.role}</p><h2>{f.name}</h2></div><button onClick={()=>void invite(f.id)}>Copy invite</button></header>
      <p>{f.members?.length||0} member(s)</p>
      <div className="mp-native-list">{(f.events||[]).map(ev=><article key={ev.id}><strong>{ev.title}</strong><small>{ev.event_date}</small></article>)}</div>
    </section>)}
    <section className="mp-card"><h2>Add shared date</h2><form className="mp-native-form" onSubmit={addEvent}><label>Family<select value={familyId} onChange={e=>setFamilyId(e.target.value)}>{families.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label><label>Title<input value={eventTitle} onChange={e=>setEventTitle(e.target.value)} required/></label><label>Date<input type="date" value={eventDate} onChange={e=>setEventDate(e.target.value)} required/></label><button disabled={!families.length}>Save</button></form></section>
    {status&&<p className="community-status">{status}</p>}
  </main>;
}

export function MyDataPage(){
  const [data,setData]=useState<any>(null),[status,setStatus]=useState("Loading…");
  async function load(){try{const body=await requestJson("/api/v1/my-data");setData(body);setStatus("");}catch(e){setStatus((e as Error).message==="authentication_required"?"Google sign-in गरेपछि account data यहाँ देखिन्छ।":(e as Error).message)}}
  useEffect(()=>{void load()},[]);
  async function exportData(){if(!data)return;const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="meropatro-my-data.json";a.click();URL.revokeObjectURL(a.href)}
  async function deleteData(){
    if(!confirm("Delete your MeroPatro private account data? This cannot be undone."))return;
    try{await requestJson("/api/v1/my-data",{method:"DELETE"});setData(null);setStatus("Private account data deleted.");window.dispatchEvent(new Event("patro:auth-changed"));}catch(e){setStatus((e as Error).message)}
  }
  return <main className="mp-page"><section className="mp-page-hero"><p className="eyebrow">Privacy · निजी डेटा</p><h1>मेरो डेटा · My Data</h1><p>Only private rows associated with your signed-in MeroPatro account are shown here.</p></section>
    <section className="mp-card"><div className="community-actions"><button className="community-button" onClick={()=>void exportData()} disabled={!data}>Export JSON</button><button className="community-button secondary" onClick={()=>void deleteData()} disabled={!data}>Delete account data</button></div>{status&&<p>{status}</p>}{data&&<pre className="mp-data-preview">{JSON.stringify(data,null,2)}</pre>}</section>
  </main>;
}

function urlBase64ToUint8Array(base64String:string){
  const padding="=".repeat((4-base64String.length%4)%4),base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");
  const raw=atob(base64);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}
export function NotificationSettingsPage(){
  const [status,setStatus]=useState(""),[jobs,setJobs]=useState<any[]>([]);
  async function loadJobs(){try{const body=await requestJson("/api/push/jobs");setJobs(Array.isArray(body.jobs)?body.jobs:[]);}catch(e){setStatus((e as Error).message)}}
  useEffect(()=>{void loadJobs()},[]);
  async function enable(){
    try{
      if(!("serviceWorker" in navigator)||!("PushManager" in window))throw new Error("Push is not supported by this browser");
      const permission=await Notification.requestPermission();if(permission!=="granted")throw new Error("Notification permission was not granted");
      const key=await requestJson("/api/push/vapid");
      const reg=await navigator.serviceWorker.register("/sw.js");
      let sub=await reg.pushManager.getSubscription();
      if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(key.publicKey)});
      await requestJson("/api/push/subscribe",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({subscription:sub.toJSON(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"Asia/Kathmandu"})});
      setStatus("Push notifications enabled for this signed-in account.");await loadJobs();
    }catch(e){setStatus((e as Error).message)}
  }
  return <main className="mp-page"><section className="mp-page-hero"><p className="eyebrow">Reminders</p><h1>सूचना · Notifications</h1><p>Push subscriptions and scheduled jobs are stored in Cloudflare D1 and owned by your signed-in account.</p></section><section className="mp-card"><button onClick={()=>void enable()}>Enable push notifications</button>{status&&<p>{status}</p>}<h2>Scheduled jobs</h2><div className="mp-native-list">{jobs.map(j=><article key={j.id}><strong>{j.category}</strong><small>{j.fire_at_utc} · {j.status}</small></article>)}</div></section></main>;
}

export function HolidaySettingsPage(){
  const year=new Date().getFullYear();
  const [items,setItems]=useState<any[]>([]),[status,setStatus]=useState("");
  useEffect(()=>{requestJson("/api/v1/holidays?year="+year).then(body=>setItems(body.items||body.holidays||[])).catch(e=>setStatus((e as Error).message))},[year]);
  return <main className="mp-page"><section className="mp-page-hero"><p className="eyebrow">Official calendar</p><h1>बिदा · Holiday settings</h1><p>Official/migrated holidays and authorized D1 overrides are shown here. Personal display choices stay in your account preferences.</p></section><section className="mp-card"><div className="mp-native-list">{items.map((h:any)=><article key={h.id||h.ad_date+h.name_ne}><strong>{h.name_ne||h.name_en}</strong><small>{h.ad_date} · {h.scope_type||"national"} · {h.status||""}</small></article>)}</div>{status&&<p>{status}</p>}<a href="/admin/community-suites">Authorized calendar admin →</a></section></main>;
}

export function DevelopersPage(){
  const [spec,setSpec]=useState<any>(null),[status,setStatus]=useState("");
  useEffect(()=>{requestJson("/api/v1/openapi.json").then(setSpec).catch(e=>setStatus((e as Error).message))},[]);
  const paths=useMemo(()=>spec?.paths?Object.keys(spec.paths):[],[spec]);
  return <main className="mp-page"><section className="mp-page-hero"><p className="eyebrow">Developers</p><h1>MeroPatro API</h1><p>Cloudflare-native API surface. Browser clients use same-origin routes; private APIs use the HttpOnly Google-session cookie.</p></section><section className="mp-card">{status&&<p>{status}</p>}<div className="mp-native-list">{paths.map(path=><article key={path}><code>{path}</code></article>)}</div><a href="/api/v1/openapi.json">OpenAPI JSON →</a></section></main>;
}

export function OfflinePage(){
  const [online,setOnline]=useState(navigator.onLine);
  useEffect(()=>{const on=()=>setOnline(true),off=()=>setOnline(false);addEventListener("online",on);addEventListener("offline",off);return()=>{removeEventListener("online",on);removeEventListener("offline",off)}},[]);
  return <main className="mp-page"><section className="mp-page-hero"><p className="eyebrow">PWA · Offline</p><h1>अफलाइन प्रयोग</h1><p>Calendar/tool assets cached by the service worker remain available where supported. Live weather, news, radio/TV and account sync require a network.</p></section><section className="mp-card"><h2>{online?"You are online":"You are offline"}</h2><p>Private edits remain local first and sync after sign-in/network recovery.</p><a href="/tools">Open offline-ready tools →</a></section></main>;
}
