import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { l } from "../useUiLanguage";
const Weather = lazy(() => import("./HomeWeather").then(module=>({default:module.HomeWeather})));
export function DeferredHomeWeather({language,today}:{language:"ne"|"en";today:string}) {
  const host=useRef<HTMLDivElement>(null);
  const [ready,setReady]=useState(false);
  useEffect(()=>{if(!('IntersectionObserver' in window)){setReady(true);return;}const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setReady(true);observer.disconnect();}},{rootMargin:"200px"});if(host.current)observer.observe(host.current);return()=>observer.disconnect();},[]);
  const placeholder=<p role="status">{l(language,"तपाईंको स्थानको मौसम खोल्दैछ…","Loading weather for your location…")}</p>;
  return <div id="home-weather" className="home-weather-slot" ref={host}>{ready?<Suspense fallback={placeholder}><Weather language={language} today={today}/></Suspense>:placeholder}</div>;
}
