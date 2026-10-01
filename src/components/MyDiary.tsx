import { FormEvent, useEffect, useMemo, useState } from "react";
import { ListChecks, Receipt, Cake, FileClock, Sparkles, Trash2 } from "lucide-react";
import { readLife, syncLifeTools, updateLife, type LifeState } from "../patro-tools-integration/storage";

const TABS=[
  {id:"today",label:"आफ्नै नोट",icon:ListChecks,key:null},
  {id:"due",label:"आफ्नै नियमित म्याद",icon:Receipt,key:"due"},
  {id:"family",label:"आफ्नै परिवार मितिहरू",icon:Cake,key:"family"},
  {id:"documents",label:"आफ्नै कागजात म्याद",icon:FileClock,key:"docs"},
  {id:"festival",label:"आफ्नै चाडपर्व तयारी",icon:Sparkles,key:"festivalPlans"}
] as const;
type TabId=typeof TABS[number]["id"];
type ListKey="due"|"family"|"docs"|"festivalPlans";

function initialTab():TabId{
  const value=new URLSearchParams(location.search).get("tab") as TabId|null;
  return TABS.some(x=>x.id===value)?value!:"today";
}
function rowLabel(row:Record<string,unknown>){
  return String(row.title||row.name||row.label||row.document||row.description||"व्यक्तिगत मिति");
}
function rowDate(row:Record<string,unknown>){
  return String(row.date||row.dueDate||row.due_date||row.expiry||row.eventDate||row.event_date||"");
}

export function MyDiary(){
  const [tab,setTab]=useState<TabId>(initialTab);
  const [life,setLife]=useState<LifeState>(readLife);
  const [sync,setSync]=useState("यो ब्राउजरमा सुरक्षित हुन्छ।");
  const [title,setTitle]=useState("");
  const [date,setDate]=useState("");
  const active=useMemo(()=>TABS.find(x=>x.id===tab)!,[tab]);

  useEffect(()=>{
    const url=new URL(location.href);url.searchParams.set("tab",tab);history.replaceState(null,"",url.pathname+"?"+url.searchParams.toString());
  },[tab]);

  useEffect(()=>{
    let alive=true;
    syncLifeTools().then(({life:next,synced})=>{if(!alive)return;setLife(next);setSync(synced?"Google account सँग sync भयो।":"Local mode · sign in गरेपछि account मा sync हुन्छ।");});
    const refresh=()=>setLife(readLife());
    window.addEventListener("patro:life-updated",refresh);
    window.addEventListener("patro:sync-personal",refresh);
    return()=>{alive=false;window.removeEventListener("patro:life-updated",refresh);window.removeEventListener("patro:sync-personal",refresh);};
  },[]);

  function add(event:FormEvent){
    event.preventDefault();
    if(!active.key||!title.trim())return;
    const key=active.key as ListKey;
    const row={id:crypto.randomUUID(),title:title.trim(),date:date||undefined,updatedAt:Date.now()};
    const next=updateLife(current=>({...current,[key]:[...(current[key] as Array<Record<string,unknown>>),row]}));
    setLife(next);setTitle("");setDate("");void syncLifeTools().then(({life:merged,synced})=>{setLife(merged);if(synced)setSync("Google account सँग sync भयो।");});
  }
  function remove(key:ListKey,id:string){
    const next=updateLife(current=>({...current,[key]:(current[key] as Array<Record<string,unknown>>).filter(row=>String(row.id)!==id)}));
    setLife(next);void syncLifeTools();
  }

  const rows=active.key ? (life[active.key] as Array<Record<string,unknown>>) : [];

  return <main className="mp-page mp-diary">
    <div className="mp-page-hero"><p className="eyebrow">आफ्नै नोट</p><h1>आफ्नै काम, म्याद र व्यक्तिगत मितिहरू</h1><p>डाटा पहिले यस उपकरणमा सुरक्षित हुन्छ; sign-in उपलब्ध हुँदा account sync प्रयोग हुन्छ।</p><small>{sync}</small></div>
    <div className="mp-diary-tabs" role="tablist" aria-label="Aafnai Note sections">{TABS.map(x=>{const Icon=x.icon;return <button key={x.id} role="tab" aria-selected={tab===x.id} onClick={()=>setTab(x.id)}><Icon size={18}/>{x.label}</button>})}</div>

    {tab==="today" ? <section className="mp-card mp-diary-native">
      <h2>आफ्नै आजको सारांश</h2>
      <div className="mp-diary-summary">
        <a href="?tab=due"><strong>{life.due.length}</strong><span>आफ्नै नियमित म्याद</span></a>
        <a href="?tab=family"><strong>{life.family.length}</strong><span>आफ्नै परिवार मिति</span></a>
        <a href="?tab=documents"><strong>{life.docs.length}</strong><span>आफ्नै कागजात म्याद</span></a>
        <a href="?tab=festival"><strong>{life.festivalPlans.length}</strong><span>आफ्नै चाडपर्व तयारी</span></a>
      </div>
      <div className="community-actions"><a className="community-button" href="/tools/tithi-reminder">आफ्नै तिथि रिमाइन्डर</a><a className="community-button secondary" href="/settings/community">आफ्नै समुदाय</a></div>
    </section> : <section className="mp-card mp-diary-native">
      <header><div><p className="eyebrow">Private · व्यक्तिगत</p><h2>{active.label}</h2></div></header>
      <form className="mp-diary-add" onSubmit={add}>
        <label>शीर्षक<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="जस्तै: पासपोर्ट म्याद / आमाको जन्मदिन" required/></label>
        <label>मिति<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
        <button type="submit">थप्नुहोस्</button>
      </form>
      {rows.length ? <div className="mp-diary-list">{rows.map(row=><article key={String(row.id)}>
        <div><strong>{rowLabel(row)}</strong>{rowDate(row)&&<small>{rowDate(row)}</small>}</div>
        <button type="button" aria-label="Delete" onClick={()=>remove(active.key as ListKey,String(row.id))}><Trash2 size={16}/></button>
      </article>)}</div> : <p className="community-note">अहिलेसम्म कुनै entry छैन।</p>}
    </section>}
  </main>;
}
