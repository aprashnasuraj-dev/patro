import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "./pwa-install.css";

const SNOOZE_KEY="ap-install-snoozed-until";
// Let the calendar paint first; the release gate expects the phone notice within 10 s.
const INSTALL_NOTICE_DELAY_MS=4000;
function snoozed(){try{return Number(localStorage.getItem(SNOOZE_KEY)||0)>Date.now()}catch{return false}}
function snooze(days=14){try{localStorage.setItem(SNOOZE_KEY,String(Date.now()+days*86400000))}catch{/* private mode */}}
function isDesktop(){return window.matchMedia("(pointer: fine) and (min-width: 900px)").matches}
type InstallChoice={outcome:"accepted"|"dismissed";platform:string};
interface InstallPromptEvent extends Event{
  prompt():Promise<void>;
  userChoice:Promise<InstallChoice>;
}
type NavigatorWithStandalone=Navigator&{standalone?:boolean};

function isStandalone(){
  const nav=navigator as NavigatorWithStandalone;
  return Boolean(nav.standalone||window.matchMedia("(display-mode: standalone)").matches);
}
function isIos(){return /iphone|ipad|ipod/i.test(navigator.userAgent)}

export function PwaInstallExperience(){
  const[installed,setInstalled]=useState(false);
  const[promptEvent,setPromptEvent]=useState<InstallPromptEvent|null>(null);
  const[showNotice,setShowNotice]=useState(false);
  const[showGuide,setShowGuide]=useState(false);
  const[footer,setFooter]=useState<HTMLElement|null>(null);
  const ios=useMemo(()=>typeof navigator!=="undefined"&&isIos(),[]);

  useEffect(()=>{
    const media=window.matchMedia("(display-mode: standalone)");
    const syncInstalled=()=>{
      const active=isStandalone();
      setInstalled(active);
      if(active){setShowNotice(false);setShowGuide(false);setPromptEvent(null)}
    };
    syncInstalled();
    // Don't greet visitors with a pop-up over the calendar: wait, respect a recent dismissal,
    // and on desktop only offer it when the browser can actually install.
    const timer=window.setTimeout(()=>{if(!isStandalone()&&!snoozed()&&!isDesktop())setShowNotice(true)},INSTALL_NOTICE_DELAY_MS);
    setFooter(document.querySelector<HTMLElement>(".ap-footer"));

    const onBeforeInstall=(event:Event)=>{
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      if(!isStandalone()&&!snoozed())window.setTimeout(()=>setShowNotice(true),INSTALL_NOTICE_DELAY_MS);
    };
    const onInstalled=()=>{
      setInstalled(true);
      setShowNotice(false);
      setShowGuide(false);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt",onBeforeInstall);
    window.addEventListener("appinstalled",onInstalled);
    media.addEventListener?.("change",syncInstalled);
    return()=>{
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt",onBeforeInstall);
      window.removeEventListener("appinstalled",onInstalled);
      media.removeEventListener?.("change",syncInstalled);
    };
  },[]);

  const install=async()=>{
    if(installed)return;
    if(promptEvent){
      try{
        await promptEvent.prompt();
        const choice=await promptEvent.userChoice;
        if(choice.outcome==="accepted"){
          setInstalled(true);
          setShowNotice(false);
          setShowGuide(false);
        }
        setPromptEvent(null);
        return;
      }catch{}
    }
    setShowGuide(true);
    setShowNotice(true);
  };

  const footerAction=<button className={`ap-install-footer${installed?" is-installed":""}`} type="button" onClick={install} disabled={installed} aria-label={installed?"आफ्नै पात्रो इन्स्टल भइसकेको छ":"आफ्नै पात्रो एप इन्स्टल गर्नुहोस्"}>
    <span aria-hidden="true">{installed?"✓":"↓"}</span>{installed?"App installed":"Install app"}
  </button>;

  return <>
    {footer?createPortal(footerAction,footer):null}
    {!installed&&showNotice?<aside className="ap-install-notice" role="status" aria-live="polite">
      <button className="ap-install-close" type="button" onClick={()=>{snooze();setShowNotice(false)}} aria-label="इन्स्टल सूचना बन्द गर्नुहोस्">×</button>
      <span className="ap-install-mark" aria-hidden="true">आ</span>
      <div className="ap-install-copy">
        <strong>आफ्नै पात्रो फोनमा राख्नुहोस्</strong>
        <p>छिटो खोल्न, पात्रो र समर्थित सुविधाहरू अफलाइन प्रयोग गर्न app install गर्नुहोस्।</p>
        {showGuide?<small>{ios?"iPhone/iPad: Safari को Share ↑ खोल्नुहोस् → Add to Home Screen छान्नुहोस्।":"ब्राउजरको ⋮ मेनु खोल्नुहोस् → Install app वा Add to Home screen छान्नुहोस्।"}</small>:null}
      </div>
      <button className="ap-install-primary" type="button" onClick={install}>{promptEvent?"Install":"कसरी Install गर्ने?"}</button>
    </aside>:null}
  </>;
}
