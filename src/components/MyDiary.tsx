import { useEffect, useMemo, useRef, useState } from "react";
import { ListChecks, Receipt, Cake, FileClock, Sparkles } from "lucide-react";

const TABS=[
  {id:"today",label:"मेरो आज",icon:ListChecks,target:"lifeTodaySummary"},
  {id:"due",label:"नियमित म्याद",icon:Receipt,target:"dueList"},
  {id:"family",label:"परिवारका मितिहरू",icon:Cake,target:"familyList"},
  {id:"documents",label:"कागजात म्याद",icon:FileClock,target:"docList"},
  {id:"festival",label:"चाडपर्व तयारी",icon:Sparkles,target:"festivalPlans"}
] as const;
type TabId=typeof TABS[number]["id"];

function initialTab():TabId{
  const value=new URLSearchParams(location.search).get("tab") as TabId|null;
  return TABS.some(x=>x.id===value)?value!:"today";
}

export function MyDiary(){
  const [tab,setTab]=useState<TabId>(initialTab);
  const frame=useRef<HTMLIFrameElement>(null);
  const active=useMemo(()=>TABS.find(x=>x.id===tab)!,[tab]);
  useEffect(()=>{
    const url=new URL(location.href);url.searchParams.set("tab",tab);history.replaceState(null,"",url.pathname+"?"+url.searchParams.toString());
    const doc=frame.current?.contentDocument;const node=doc?.getElementById(active.target);node?.scrollIntoView({behavior:"smooth",block:"start"});
  },[tab,active.target]);
  function focusInner(){
    try{
      const doc=frame.current?.contentDocument;
      const header=doc?.querySelector("header.top") as HTMLElement|null;if(header) header.style.display="none";
      const node=doc?.getElementById(active.target);node?.scrollIntoView({block:"start"});
    }catch{}
  }
  return <main className="mp-page mp-diary">
    <div className="mp-page-hero"><p className="eyebrow">मेरो डायरी</p><h1>काम, म्याद र व्यक्तिगत मितिहरू</h1><p>तपाईंको डाटा पहिले यही उपकरणमा सुरक्षित हुन्छ; साइन इन गरेपछि मात्र सिङ्क हुन्छ।</p></div>
    <div className="mp-diary-tabs" role="tablist" aria-label="My Diary sections">{TABS.map(x=>{const Icon=x.icon;return <button key={x.id} role="tab" aria-selected={tab===x.id} onClick={()=>setTab(x.id)}><Icon size={18}/>{x.label}</button>})}</div>
    <section className="mp-diary-frame"><iframe ref={frame} title={active.label} src="/api/v1/compat/page?path=%2Ftools" onLoad={focusInner}/></section>
  </main>;
}
