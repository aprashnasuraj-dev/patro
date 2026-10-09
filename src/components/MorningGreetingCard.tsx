import { useEffect, useState } from "react";
import { disableLocalMorningGreeting, enableLocalMorningGreeting, getLocalMorningGreeting } from "../localMorning";

function pathNow(){return window.location.pathname.replace(/\/+$/,"")||"/"}
export function MorningGreetingCard(){
 const[visible,setVisible]=useState(()=>["/","/today"].includes(pathNow()));
 const[config,setConfig]=useState(getLocalMorningGreeting);
 const[name,setName]=useState(config.name);
 const[status,setStatus]=useState("");
 useEffect(()=>{const sync=()=>setVisible(["/","/today"].includes(pathNow()));addEventListener("popstate",sync);addEventListener("patro:navigation",sync);return()=>{removeEventListener("popstate",sync);removeEventListener("patro:navigation",sync)}},[]);
 useEffect(()=>{const sync=()=>setConfig(getLocalMorningGreeting());window.addEventListener("patro:morning-config",sync);return()=>window.removeEventListener("patro:morning-config",sync)},[]);
 if(!visible)return null;
 async function enable(){setStatus("Permission जाँच्दै…");const result=await enableLocalMorningGreeting(name);if(result.ok){const next=getLocalMorningGreeting();setConfig(next);setStatus(result.mode==="push"?"बिहान ६ बजे नेपालको पात्रोसहित सूचना सक्रिय भयो।":"स्थानीय morning greeting सक्रिय छ। App खुला हुँदा ६:०० बजे र PWA wake हुँदा catch-up हुन्छ।")}else setStatus(result.reason==="permission"?"Notification permission दिइएन। Browser settings बाट अनुमति दिनुहोस्।":"सूचना अहिले सक्रिय भएन। पछि यही बटनबाट प्रयास गर्नुहोस्।")}
 async function disable(){try{await disableLocalMorningGreeting();setConfig(getLocalMorningGreeting());setStatus("बिहानको सूचना बन्द गरियो।")}catch{setStatus("बन्द गर्न सकिएन। इन्टरनेट जोडेर पुनः प्रयास गर्नुहोस्।")}}
 return <section className="hx-morning" aria-labelledby="hx-morning-title"><div><span className="hx-kicker">०६:०० · नेपाल समय</span><h2 id="hx-morning-title">शुभ प्रभात सूचना</h2><p>आफ्नो नाम, आजको मिति, बार, तिथि र उपलब्ध चाडपर्वसहित बिहानको सूचना पाउनुहोस्। एप इन्स्टल गर्दा बिहानको सूचना सक्रिय हुन्छ। यहाँबाट नाम बदल्न वा सूचना बन्द गर्न सक्नुहुन्छ।</p></div><label>सूचनामा देखाउने नाम<input value={name} onChange={e=>setName(e.target.value.slice(0,80))} placeholder="जस्तै: सुरज दहाल" autoComplete="name"/></label><div className="hx-morning-actions">{config.enabled?<><button type="button" onClick={enable}>नाम सुरक्षित गर्नुहोस्</button><button type="button" onClick={disable}>बन्द गर्नुहोस्</button></>:<button type="button" onClick={enable}>६ बजे सूचना सक्रिय गर्नुहोस्</button>}<small role="status">{status|| (config.enabled?`सक्रिय${config.name?` · ${config.name}`:""}`:"खाता बनाउन आवश्यक छैन")}</small></div></section>
}
