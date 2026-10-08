import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./pwa-install.css";

const INSTALL_NOTICE_DELAY_MS=4000;
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
  const noticed=useRef(false);
  const prompting=useRef(false);
  const ios=useMemo(()=>typeof navigator!=="undefined"&&isIos(),[]);

  useEffect(()=>{
    const media=window.matchMedia("(display-mode: standalone)");
    const syncInstalled=()=>{
      const active=isStandalone();
      setInstalled(active);
      if(active){setShowNotice(false);setShowGuide(false);setPromptEvent(null)}
    };
    syncInstalled();
    // Present an unobtrusive invitation once the calendar has rendered.
    const timer=window.setTimeout(()=>{if(!isStandalone()&&!noticed.current){noticed.current=true;setShowNotice(true)}},INSTALL_NOTICE_DELAY_MS);
    setFooter(document.querySelector<HTMLElement>(".ap-footer"));

    const onBeforeInstall=(event:Event)=>{
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
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
    if(installed||prompting.current)return;
    if(promptEvent){
      // The browser only permits a PWA install prompt from a direct user gesture.
      // Keep prompt() in this click handler (never from a timer or effect).
      prompting.current=true;
      try{
        await promptEvent.prompt();
        const choice=await promptEvent.userChoice;
        setPromptEvent(null); // browsers permit only one use of each prompt event
        if(choice.outcome==="accepted"){
          // userChoice is not proof of installation. appinstalled/standalone is.
          setShowNotice(false);
          setShowGuide(false);
        }else{
          setShowNotice(true);
          setShowGuide(true);
        }
        return;
      }catch{
        setPromptEvent(null);
      }finally{
        prompting.current=false;
      }
    }
    // Safari/iOS and browsers without beforeinstallprompt cannot add an icon
    // programmatically. Keep the action clickable and show exact manual steps.
    setShowGuide(true);
    setShowNotice(true);
  };

  useEffect(()=>{const handler=()=>{void install()};window.addEventListener("patro:install",handler);return()=>window.removeEventListener("patro:install",handler)},[installed,promptEvent]);
  const footerAction=<button className={`ap-install-footer${installed?" is-installed":""}`} type="button" onClick={install} disabled={installed} aria-label={installed?"आफ्नै पात्रो इन्स्टल भइसकेको छ":"आफ्नै पात्रो एप इन्स्टल गर्नुहोस्"}>
    <span aria-hidden="true">{installed?"✓":"↓"}</span>{installed?"एप इन्स्टल भयो":"एप इन्स्टल गर्नुहोस्"}
  </button>;

  return <>
    {footer?createPortal(footerAction,footer):null}
    {!installed&&showNotice?<aside className="ap-install-notice" role="status" aria-live="polite">
      {/* The entire card, including title and icon, activates installation.
          Close is an independent sibling button, never nested in the install button. */}
      <button className="ap-install-surface" type="button" onClick={install} aria-label="आफ्नै पात्रो अहिले इन्स्टल गर्नुहोस् · Install Now">
        <span className="ap-install-mark" aria-hidden="true">आ</span>
        <span className="ap-install-copy">
          <strong>आफ्नै पात्रो एप राख्नुहोस्</strong>
          <span className="ap-install-description">छिटो खोल्न, पात्रो र समर्थित सुविधाहरू अफलाइन प्रयोग गर्न एप इन्स्टल गर्नुहोस्।</span>
          {showGuide?<small>{ios?"iPhone/iPad: Safari मा यो पेज खोल्नुहोस् → Share ↑ → Add to Home Screen → Add छान्नुहोस्।":"ब्राउजरको मेनु ⋮ वा Install चिन्हबाट Install app / Add to Home screen छान्नुहोस्। विकल्प नदेखिए Chrome वा Edge मा खोल्नुहोस्।"}</small>:null}
        </span>
        <span className="ap-install-primary">अहिले इन्स्टल गर्नुहोस् <span lang="en">· Install Now</span></span>
      </button>
      <button className="ap-install-close" type="button" onClick={()=>setShowNotice(false)} aria-label="इन्स्टल सूचना बन्द गर्नुहोस्">×</button>
    </aside>:null}
  </>;
}
