import { lazy, Suspense, useEffect, useRef, useState } from "react";
const SkyFact = lazy(() => import("./HomeSkyFact"));
type IdleWindow = Window & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
export function DeferredHomeSkyFact({language}:{language:"ne"|"en"}) {
  const host=useRef<HTMLDivElement>(null);
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    const idleWindow=window as IdleWindow;
    let idle:number|undefined;
    const timer=window.setTimeout(()=>{if(idleWindow.requestIdleCallback)idle=idleWindow.requestIdleCallback(()=>setReady(true),{timeout:6000});else setReady(true)},2500);
    const observer=typeof IntersectionObserver!=="undefined"?new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setReady(true);observer?.disconnect()}}):null;
    if(host.current)observer?.observe(host.current);
    return()=>{window.clearTimeout(timer);if(idle!==undefined)idleWindow.cancelIdleCallback?.(idle);observer?.disconnect()};
  },[]);
  const placeholder=<section className="rh-card sx-card" style={{minHeight:240}} aria-busy="true" aria-label={language==="en"?"In the sky":"आकाशमा आज"}><header className="rh-card-head"><div><span className="rh-kicker">{language==="en"?"In the sky":"आकाशमा आज"}</span><h2>{language==="en"?"Today's sky":"आजको आकाश"}</h2></div><span className="sx-sun" aria-hidden="true">☉</span></header><p className="sx-title">{language==="en"?"Loading sky facts…":"आकाशका तथ्य लोड हुँदैछन्…"}</p><div style={{height:60}}/><footer className="hx-foot"><a href="/tools/astro">{language==="en"?"Astronomy":"खगोलीय पात्रो"} →</a></footer></section>;
  return <div ref={host}>{ready?<Suspense fallback={placeholder}><SkyFact language={language}/></Suspense>:placeholder}</div>;
}
