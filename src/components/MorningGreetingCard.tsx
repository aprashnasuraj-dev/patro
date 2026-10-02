import { useEffect, useState } from "react";
import { disableLocalMorningGreeting, enableLocalMorningGreeting, getLocalMorningGreeting } from "../localMorning";

function pathNow(){return window.location.pathname.replace(/\/+$/,"")||"/"}
export function MorningGreetingCard(){
 const[visible,setVisible]=useState(()=>["/","/today"].includes(pathNow()));
 const[config,setConfig]=useState(getLocalMorningGreeting);
 const[name,setName]=useState(config.name);
 const[status,setStatus]=useState("");
 useEffect(()=>{const sync=()=>setVisible(["/","/today"].includes(pathNow()));addEventListener("popstate",sync);addEventListener("patro:navigation",sync);return()=>{removeEventListener("popstate",sync);removeEventListener("patro:navigation",sync)}},[]);
 if(!visible)return null;
 async function enable(){setStatus("Permission जाँच्दै…");const result=await enableLocalMorningGreeting(name);if(result.ok){const next=getLocalMorningGreeting();setConfig(next);setStatus(result.periodic?"स्थानीय morning greeting सक्रिय छ। Browser ले periodic background sync पनि support गर्छ।":"स्थानीय morning greeting सक्रिय छ। App खुला हुँदा ६:०० बजे र PWA wake हुँदा catch-up हुन्छ।")}else setStatus(result.reason==="permission"?"Notification permission दिइएन। Browser settings बाट अनुमति दिनुहोस्।":"यस browser मा local notifications उपलब्ध छैन।")}
 async function disable(){await disableLocalMorningGreeting();setConfig(getLocalMorningGreeting());setStatus("Morning greeting बन्द गरियो।")}
 return <section className="hx-morning" aria-labelledby="hx-morning-title"><div><span className="hx-kicker">LOCAL · 06:00 NPT</span><h2 id="hx-morning-title">शुभ प्रभात सूचना</h2><p>Cloudflare push बिना, PWA ले cached पात्रोबाट स्थानीय morning greeting बनाउन सक्छ। OS ले app suspend गरेमा exact ६:०० delivery guarantee हुँदैन।</p></div><label>सूचनामा देखाउने नाम<input value={name} onChange={e=>setName(e.target.value.slice(0,80))} placeholder="जस्तै: सुरज दहाल" autoComplete="name"/></label><div className="hx-morning-actions">{config.enabled?<button type="button" onClick={disable}>बन्द गर्नुहोस्</button>:<button type="button" onClick={enable}>६ बजे सूचना सक्रिय गर्नुहोस्</button>}<small role="status">{status|| (config.enabled?`सक्रिय${config.name?` · ${config.name}`:""}`:"यो device मा मात्र")}</small></div></section>
}
