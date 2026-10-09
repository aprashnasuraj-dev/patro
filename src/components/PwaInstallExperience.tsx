import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./pwa-install.css";
import { MorningInstallationCompletion } from "./MorningNotificationSetup";

const INSTALL_NOTICE_DELAY_MS=4000;
const SITE_LINK="https://aafnaipatro.com/";
const CHROME_INTENT="intent://aafnaipatro.com/#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2Faafnaipatro.com%2F;end";
type InstallChoice={outcome:"accepted"|"dismissed";platform:string};
interface InstallPromptEvent extends Event{
  prompt():Promise<void>;
  userChoice:Promise<InstallChoice>;
}
type InstallWindow=Window&{__aafnaiInstallPrompt?:InstallPromptEvent|null};
type NavigatorWithStandalone=Navigator&{standalone?:boolean};

function isStandalone(){
  const nav=navigator as NavigatorWithStandalone;
  return Boolean(nav.standalone||window.matchMedia("(display-mode: standalone)").matches);
}
function detectBrowser(){
  const ua=navigator.userAgent;
  const ios=/iphone|ipad|ipod/i.test(ua);
  const android=/android/i.test(ua);
  const embedded=/(?:;\s*wv\b|\bChatGPT\/|FBAN|FBAV|Instagram|TikTok|MicroMessenger|Twitter|Line\/|Snapchat)/i.test(ua);
  return {ios,android,embedded};
}

export function PwaInstallExperience(){
  const[installed,setInstalled]=useState(false);
  const[promptEvent,setPromptEvent]=useState<InstallPromptEvent|null>(null);
  const[showNotice,setShowNotice]=useState(false);
  const[showGuide,setShowGuide]=useState(false);
  const[installStatus,setInstallStatus]=useState("");
  const[copyStatus,setCopyStatus]=useState("");
  const[busy,setBusy]=useState(false);
  const[footer,setFooter]=useState<HTMLElement|null>(null);
  const noticed=useRef(false);
  const promptInProgress=useRef(false);
  const browser=useMemo(()=>detectBrowser(),[]);

  useEffect(()=>{
    const media=window.matchMedia("(display-mode: standalone)");
    const w=window as InstallWindow;
    const syncInstalled=()=>{
      const active=isStandalone();
      setInstalled(active);
      if(active){setShowNotice(false);setShowGuide(false);setPromptEvent(null);setInstallStatus("");w.__aafnaiInstallPrompt=null}
    };
    const syncPrompt=()=>{
      const candidate=w.__aafnaiInstallPrompt;
      if(candidate&&typeof candidate.prompt==="function"){
        setPromptEvent(candidate);
        setInstallStatus("");
      }
    };
    const onBeforeInstall=(event:Event)=>{
      event.preventDefault();
      w.__aafnaiInstallPrompt=event as InstallPromptEvent;
      syncPrompt();
    };
    const onInstalled=()=>{
      setInstalled(true);
      setShowNotice(false);
      setShowGuide(false);
      setPromptEvent(null);
      setBusy(false);
      promptInProgress.current=false;
      w.__aafnaiInstallPrompt=null;
    };
    syncInstalled();
    syncPrompt(); // May have been fired BEFORE the React JS loaded.
    const timer=window.setTimeout(()=>{
      if(!isStandalone()&&!noticed.current){noticed.current=true;setShowNotice(true)}
    },INSTALL_NOTICE_DELAY_MS);
    setFooter(document.querySelector<HTMLElement>(".ap-footer"));
    window.addEventListener("beforeinstallprompt",onBeforeInstall);
    window.addEventListener("patro:install-prompt-ready",syncPrompt);
    window.addEventListener("appinstalled",onInstalled);
    media.addEventListener?.("change",syncInstalled);
    return()=>{
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt",onBeforeInstall);
      window.removeEventListener("patro:install-prompt-ready",syncPrompt);
      window.removeEventListener("appinstalled",onInstalled);
      media.removeEventListener?.("change",syncInstalled);
    };
  },[]);

  useEffect(()=>{
    if(!showGuide)return;
    const onEscape=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){setShowGuide(false);document.querySelector<HTMLButtonElement>(".ap-install-primary")?.focus()}
    };
    window.addEventListener("keydown",onEscape);
    return()=>window.removeEventListener("keydown",onEscape);
  },[showGuide]);

  const fallback=(reason:string)=>{
    setInstallStatus(reason);
    setShowNotice(true);
    setShowGuide(true); // FULLY VISIBLE DIALOG instead of a tiny line in the card
  };
  const install=async()=>{
    if(installed||promptInProgress.current)return;
    const w=window as InstallWindow;
    // Calling prompt() must happen synchronously inside the actual tap handler.
    const candidate=promptEvent||w.__aafnaiInstallPrompt;
    if(candidate&&typeof candidate.prompt==="function"){
      promptInProgress.current=true;
      setBusy(true);
      setShowNotice(true);
      setShowGuide(false);
      setInstallStatus("ब्राउजरको Install पुष्टि पर्खँदैछ…");
      try{
        // Do not await any unrelated tasks BEFORE the browser-controlled prompt.
        const prompted=candidate.prompt();
        await prompted;
        const choice=await candidate.userChoice;
        if(w.__aafnaiInstallPrompt===candidate)w.__aafnaiInstallPrompt=null;
        setPromptEvent(null);
        if(choice?.outcome==="accepted"){
          setInstallStatus("स्थापना पुष्टि भयो। एप तयार भएपछि होमस्क्रिनमा देखिनेछ।");
        }else{
          fallback("स्थापना रद्द भयो। तलको विकल्पबाट पुनः प्रयास गर्नुहोस्।");
        }
      }catch{
        if(w.__aafnaiInstallPrompt===candidate)w.__aafnaiInstallPrompt=null;
        setPromptEvent(null);
        fallback("यो ब्राउजरले इन्स्टल पपअप खोल्न सकेन। तलको विकल्प प्रयोग गर्नुहोस्।");
      }finally{
        promptInProgress.current=false;
        setBusy(false);
      }
      return;
    }
    // iOS, WebViews and browsers without beforeinstallprompt cannot be
    // silently installed by websites. Always provide visible next actions.
    fallback("यो ब्राउजरले स्वतः Install पपअप उपलब्ध गराएको छैन।");
  };

  useEffect(()=>{
    const handler=()=>{void install()};
    window.addEventListener("patro:install",handler);
    return()=>window.removeEventListener("patro:install",handler);
  },[installed,promptEvent]);

  const copyLink=async()=>{
    try{
      await navigator.clipboard.writeText(SITE_LINK);
      setCopyStatus("लिङ्क कपी भयो। Chrome वा Safari मा खोल्नुहोस्।");
    }catch{
      setCopyStatus("लिङ्क छान्नुहोस् र कपी गरेर Chrome वा Safari मा खोल्नुहोस्।");
    }
  };

  const footerAction=<button className={`ap-install-footer${installed?" is-installed":""}`} type="button" onClick={()=>{void install()}} disabled={installed||busy} aria-label={installed?"आफ्नै पात्रो इन्स्टल भइसकेको छ":"आफ्नै पात्रो अहिले इन्स्टल गर्नुहोस्"}>
    <span aria-hidden="true">{installed?"✓":"↓"}</span>{installed?"एप इन्स्टल भयो":"अहिले इन्स्टल गर्नुहोस्"}
  </button>;

  return <>
    <MorningInstallationCompletion installed={installed}/>
    {footer?createPortal(footerAction,footer):null}
    {!installed&&showNotice?<aside className="ap-install-notice" role="status" aria-live="polite" onClick={(event)=>{
      if(!(event.target as Element).closest("button,a,input,select,textarea"))void install();
    }}>
      <button className="ap-install-close" type="button" onClick={()=>setShowNotice(false)} aria-label="इन्स्टल सूचना बन्द गर्नुहोस्">×</button>
      <button className="ap-install-content" type="button" onClick={()=>{void install()}} aria-label="आफ्नै पात्रो अहिले इन्स्टल गर्नुहोस्" disabled={busy}>
        <span className="ap-install-mark" aria-hidden="true">आ</span>
        <span className="ap-install-copy">
          <strong>आफ्नै पात्रो एप राख्नुहोस्</strong>
          <span className="ap-install-description">अफलाइन पात्रो र उपयोगी उपकरणका लागि इन्स्टल गर्नुहोस्।</span>
          {installStatus?<small className="ap-install-feedback">{installStatus}</small>:null}
        </span>
      </button>
      <button className="ap-install-primary" type="button" onClick={()=>{void install()}} disabled={busy}>{busy?"इन्स्टल खुल्दैछ…":"अहिले इन्स्टल गर्नुहोस्"}</button>
    </aside>:null}
    {!installed&&showGuide?<div className="ap-install-overlay" onClick={()=>setShowGuide(false)}>
      <section className="ap-install-dialog" role="dialog" aria-modal="true" aria-labelledby="ap-install-guide-title" onClick={event=>event.stopPropagation()}>
        <button type="button" className="ap-install-dialog-close" aria-label="इन्स्टल निर्देशन बन्द गर्नुहोस्" onClick={()=>setShowGuide(false)}>×</button>
        <h2 id="ap-install-guide-title">आफ्नै पात्रो होमस्क्रिनमा राख्नुहोस्</h2>
        <p className="ap-install-dialog-reason">{installStatus||"ब्राउजरको Install विकल्प प्रयोग गर्नुहोस्।"}</p>
        {browser.ios?<>
          <p>iPhone/iPad: Safari मा Share ↑ → Add to Home Screen → Add थिच्नुहोस्।</p>
          <ol><li>यो पेज Safari मा खोल्नुहोस्।</li><li>Share ↑ थिचेर Add to Home Screen छान्नुहोस्।</li><li>Add थिचेपछि आइकन होमस्क्रिनमा आउँछ।</li></ol>
        </>:browser.android&&browser.embedded?<>
          <p>तपाईं अहिले एपभित्रको ब्राउजरमा हुनुहुन्छ। यसले सीधै Install पपअप नदिन सक्छ। Chrome मा खोल्नुहोस्, त्यसपछि ⋮ → Install app वा Add to Home screen छान्नुहोस्।</p>
          <a className="ap-install-open-chrome" href={CHROME_INTENT}>Chrome मा खोल्नुहोस् <span aria-hidden="true">↗</span></a>
        </>:browser.android?<>
          <p>Chrome/Edge: ⋮ मेनु → Install app वा Add to Home screen छान्नुहोस्। विकल्प नदेखिए Chrome मा पेज पुनः खोल्नुहोस्।</p>
          <ol><li>ब्राउजरको ⋮ मेनु खोल्नुहोस्।</li><li>Install app वा Add to Home screen छान्नुहोस्।</li><li>Install / Add पुष्टि गर्नुहोस्।</li></ol>
        </>:<>
          <p>ब्राउजरको ठेगाना पट्टिको Install चिन्ह प्रयोग गर्नुहोस्, वा मेनुबाट Install app / Add to Home Screen छान्नुहोस्।</p>
        </>}
        <button type="button" className="ap-install-copy-link" onClick={()=>{void copyLink()}}>साइटको लिङ्क कपी गर्नुहोस्</button>
        <input className="ap-install-site-link" readOnly aria-label="कपी गर्न मिल्ने साइट लिङ्क" onFocus={event=>event.currentTarget.select()} value={SITE_LINK}/>
        {copyStatus?<p className="ap-install-copy-result" role="status">{copyStatus}</p>:null}
        <button type="button" className="ap-install-dialog-done" onClick={()=>setShowGuide(false)}>बुझें</button>
      </section>
    </div>:null}
  </>;
}
