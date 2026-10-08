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
  const[installStatus,setInstallStatus]=useState("");
  const[footer,setFooter]=useState<HTMLElement|null>(null);
  const noticed=useRef(false);
  const ios=useMemo(()=>typeof navigator!=="undefined"&&isIos(),[]);

  useEffect(()=>{
    const media=window.matchMedia("(display-mode: standalone)");
    const syncInstalled=()=>{
      const active=isStandalone();
      setInstalled(active);
      if(active){setShowNotice(false);setShowGuide(false);setPromptEvent(null);setInstallStatus("")}
    };
    syncInstalled();
    // Don't greet visitors with a pop-up over the calendar: wait, respect a recent dismissal,
    // and on desktop only offer it when the browser can actually install.
    const timer=window.setTimeout(()=>{if(!isStandalone()&&!noticed.current){noticed.current=true;setShowNotice(true)}},INSTALL_NOTICE_DELAY_MS);
    setFooter(document.querySelector<HTMLElement>(".ap-footer"));

    const onBeforeInstall=(event:Event)=>{
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setShowGuide(false);
      setInstallStatus("");
    };
    const onInstalled=()=>{
      setInstalled(true);
      setShowNotice(false);
      setShowGuide(false);
      setPromptEvent(null);
      setInstallStatus("");
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
        // Native installation can only start from a real user click. The
        // browser, not the website, decides whether to add the home icon.
        await promptEvent.prompt();
        const choice=await promptEvent.userChoice;
        setPromptEvent(null);
        if(choice.outcome==="accepted"){
          // Acceptance is not installation. Wait for appinstalled/standalone
          // before declaring success or suppressing the install affordance.
          setInstallStatus("स्थापना पुष्टि भयो। एप तयार भएपछि होमस्क्रिनमा देखिनेछ।");
          setShowGuide(false);
          setShowNotice(true);
        }else{
          setInstallStatus("स्थापना रद्द भयो। ब्राउजर मेनुबाट पनि इन्स्टल गर्न सक्नुहुन्छ।");
          setShowGuide(true);
          setShowNotice(true);
        }
        return;
      }catch{
        // Some browsers expose but then revoke an install prompt.
        setPromptEvent(null);
      }
    }
    // Safari/iOS and browsers with no beforeinstallprompt need a user
    // action in browser UI. Never falsely claim automatic installation.
    setInstallStatus("");
    setShowGuide(true);
    setShowNotice(true);
  };

  useEffect(()=>{const handler=()=>{void install()};window.addEventListener("patro:install",handler);return()=>window.removeEventListener("patro:install",handler)},[installed,promptEvent]);
  const footerAction=<button className={`ap-install-footer${installed?" is-installed":""}`} type="button" onClick={()=>{void install()}} disabled={installed} aria-label={installed?"आफ्नै पात्रो इन्स्टल भइसकेको छ":"आफ्नै पात्रो अहिले इन्स्टल गर्नुहोस्"}>
    <span aria-hidden="true">{installed?"✓":"↓"}</span>{installed?"एप इन्स्टल भयो":"अहिले इन्स्टल गर्नुहोस्"}
  </button>;

  return <>
    {footer?createPortal(footerAction,footer):null}
    {!installed&&showNotice?<aside className="ap-install-notice" role="status" aria-live="polite" onClick={(event)=>{
      // Make blank space in the card clickable too. The close button and
      // other interactive controls must not accidentally start installation.
      if(!(event.target as Element).closest("button,a,input,select,textarea"))void install();
    }}>
      <button className="ap-install-close" type="button" onClick={()=>{setShowNotice(false)}} aria-label="इन्स्टल सूचना बन्द गर्नुहोस्">×</button>
      <button className="ap-install-content" type="button" onClick={()=>{void install()}} aria-label="आफ्नै पात्रो अहिले इन्स्टल गर्नुहोस्">
        <span className="ap-install-mark" aria-hidden="true">आ</span>
        <span className="ap-install-copy">
          <strong>आफ्नै पात्रो एप राख्नुहोस्</strong>
          <span className="ap-install-description">छिटो खोल्न, पात्रो र समर्थित सुविधाहरू अफलाइन प्रयोग गर्न अहिले इन्स्टल गर्नुहोस्।</span>
          {showGuide?<small>{ios?"iPhone/iPad: Safari मा Share ↑ → Add to Home Screen → Add थिच्नुहोस्।":"Chrome/Edge: ⋮ मेनु → Install app वा Add to Home screen छान्नुहोस्। विकल्प नदेखिए समर्थित ब्राउजरमा खोल्नुहोस्।"}</small>:null}
          {installStatus?<small className="ap-install-feedback">{installStatus}</small>:null}
        </span>
      </button>
      <button className="ap-install-primary" type="button" onClick={()=>{void install()}}>अहिले इन्स्टल गर्नुहोस्</button>
    </aside>:null}
  </>;
}
