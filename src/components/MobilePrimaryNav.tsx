import { useEffect, useState } from "react";
import { COMMUNITY_OPTIONS } from "../community/preferences";

function clean(path:string){return path.replace(/\/+$/,"")||"/"}
function pathNow(){return clean(window.location.pathname)}

export function MobilePrimaryNav(){
  const[path,setPath]=useState(pathNow);
  const[communities,setCommunities]=useState(false);
  useEffect(()=>{
    const sync=()=>{setPath(pathNow());setCommunities(false)};
    addEventListener("popstate",sync);addEventListener("patro:navigation",sync);
    return()=>{removeEventListener("popstate",sync);removeEventListener("patro:navigation",sync)};
  },[]);
  useEffect(()=>{
    if(!communities)return;
    const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setCommunities(false)};
    addEventListener("keydown",close);return()=>removeEventListener("keydown",close);
  },[communities]);

  const active=(href:string)=>href==="/"?(path==="/"||path==="/today"):path===href||path.startsWith(href+"/");
  return <>
    <nav className="mp-primary-mobile-nav" aria-label="मुख्य मोबाइल मेनु">
      <a className={active("/")?"active":""} href="/"><span aria-hidden="true">▦</span><b>पात्रो</b></a>
      <a className={active("/tools/astro")?"active":""} href="/tools/astro"><span aria-hidden="true">☾</span><b>खगोलीय</b></a>
      <a className={active("/time-machine")?"active":""} href="/time-machine"><span aria-hidden="true">⌛</span><b>समययन्त्र</b></a>
      <button type="button" className={communities||path.startsWith("/samudaya/")||path.startsWith("/nepal-sambat/")?"active":""} onClick={()=>setCommunities(v=>!v)} aria-expanded={communities} aria-controls="mp-community-mobile-sheet"><span aria-hidden="true">◎</span><b>समुदाय</b></button>
      <a className={active("/tools")&&!active("/tools/astro")?"active":""} href="/tools"><span aria-hidden="true">✦</span><b>टुल्स</b></a>
    </nav>
    {communities&&<div className="mp-community-mobile-backdrop" role="presentation" onClick={()=>setCommunities(false)}>
      <section id="mp-community-mobile-sheet" className="mp-community-mobile-sheet" role="dialog" aria-modal="true" aria-labelledby="mp-community-sheet-title" onClick={e=>e.stopPropagation()}>
        <header><div><small>COMMUNITY PATRO · 6</small><h2 id="mp-community-sheet-title">समुदाय पात्रो</h2></div><button type="button" onClick={()=>setCommunities(false)} aria-label="बन्द गर्नुहोस्">×</button></header>
        <div>{COMMUNITY_OPTIONS.map((item,index)=><a href={item.href} key={item.id}><i>{String(index+1).padStart(2,"0")}</i><span><b>{item.dev}</b><small>{item.en}</small></span><strong aria-hidden="true">→</strong></a>)}</div>
        <a className="mp-community-all" href="/samudaya">छ वटै पात्रोको हब खोल्नुहोस्</a>
      </section>
    </div>}
  </>;
}
