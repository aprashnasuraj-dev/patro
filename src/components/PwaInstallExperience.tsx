import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { l, useUiLanguage } from "../useUiLanguage";
import { MorningInstallationCompletion } from "./MorningNotificationSetup";
import "./pwa-install.css";
const SITE_LINK="https://aafnaipatro.com/";
interface InstallPromptEvent extends Event { prompt():Promise<void>;userChoice:Promise<{outcome:"accepted"|"dismissed"}>; }
type InstallWindow=Window&{__aafnaiInstallPrompt?:InstallPromptEvent|null};
export function PwaInstallExperience(){
  const language=useUiLanguage();
  const [installed,setInstalled]=useState(false),[busy,setBusy]=useState(false),[showGuide,setShowGuide]=useState(false);
  const [status,setStatus]=useState<"accepted"|"dismissed"|"unavailable"|"">("");
  const [copied,setCopied]=useState(false);
  const [footer,setFooter]=useState<HTMLElement|null>(null);
  const dialog=useRef<HTMLElement>(null);
  const inProgress=useRef(false);
  useEffect(()=>{
    const media=window.matchMedia("(display-mode: standalone)");
    const sync=()=>setInstalled(Boolean((navigator as Navigator&{standalone?:boolean}).standalone||media.matches));
    const capture=(event:Event)=>{event.preventDefault();(window as InstallWindow).__aafnaiInstallPrompt=event as InstallPromptEvent;};
    const complete=()=>{setInstalled(true);setShowGuide(false);(window as InstallWindow).__aafnaiInstallPrompt=null;};
    sync();setFooter(document.getElementById("home-install-entry"));
    window.addEventListener("beforeinstallprompt",capture);window.addEventListener("appinstalled",complete);media.addEventListener?.("change",sync);
    return()=>{window.removeEventListener("beforeinstallprompt",capture);window.removeEventListener("appinstalled",complete);media.removeEventListener?.("change",sync);};
  },[]);
  const install=useCallback(async()=>{
    if(installed||inProgress.current)return;
    const candidate=(window as InstallWindow).__aafnaiInstallPrompt;
    if(!candidate){setStatus("unavailable");setShowGuide(true);return;}
    inProgress.current=true;setBusy(true);
    try{await candidate.prompt();const choice=await candidate.userChoice;setStatus(choice.outcome);if(choice.outcome==="dismissed")setShowGuide(true);}
    catch{setStatus("unavailable");setShowGuide(true);}
    finally{(window as InstallWindow).__aafnaiInstallPrompt=null;inProgress.current=false;setBusy(false);}
  },[installed]);
  useEffect(()=>{const handler=()=>{void install();};window.addEventListener("patro:install",handler);return()=>window.removeEventListener("patro:install",handler);},[install]);
  useEffect(()=>{
    if(!showGuide)return;
    const previous=document.activeElement as HTMLElement|null;
    const overflow=document.body.style.overflow;document.body.style.overflow="hidden";
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){event.preventDefault();setShowGuide(false);}
      if(event.key!=="Tab")return;
      const controls=[...(dialog.current?.querySelectorAll<HTMLElement>('button,a[href],input')||[])];
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    };
    document.addEventListener("keydown",key);return()=>{document.removeEventListener("keydown",key);document.body.style.overflow=overflow;previous?.focus();};
  },[showGuide]);
  const footerAction=<><button className="ap-install-footer" type="button" onClick={()=>void install()} disabled={installed||busy}>{installed?l(language,"एप इन्स्टल भइसकेको छ","App installed"):busy?l(language,"इन्स्टल खुल्दैछ…","Opening installation…"):l(language,"एप इन्स्टल गर्नुहोस्","Install app")}</button>{status==="accepted"?<p role="status">{l(language,"स्थापना पुष्टि भयो। एप तयार भएपछि होमस्क्रिनमा देखिनेछ।","Installation confirmed. The app will appear on your home screen when ready.")}</p>:null}</>;
  return <><MorningInstallationCompletion installed={installed}/>{footer?createPortal(footerAction,footer):null}
    {showGuide?<div className="ap-install-overlay" onClick={()=>setShowGuide(false)}><section className="ap-install-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="ap-install-guide-title" onClick={event=>event.stopPropagation()}>
      <button type="button" className="ap-install-dialog-close" aria-label={l(language,"बन्द गर्नुहोस्","Close")} onClick={()=>setShowGuide(false)}>×</button>
      <h2 id="ap-install-guide-title">{l(language,"आफ्नै पात्रो होमस्क्रिनमा राख्नुहोस्","Add Aafnai Patro to your home screen")}</h2>
      <p>{status==="dismissed"?l(language,"स्थापना रद्द भयो। चाहनुहुन्छ भने ब्राउजरको मेनुबाट फेरि प्रयास गर्नुहोस्।","Installation was dismissed. You can retry from your browser menu."):l(language,"यो ब्राउजरमा सीधै स्थापना उपलब्ध छैन। ब्राउजरको मेनु प्रयोग गर्नुहोस्।","Direct installation is unavailable in this browser. Use its menu instead.")}</p>
      {/iphone|ipad|ipod/i.test(navigator.userAgent)?<p>{l(language,"Safari मा Share थिच्नुहोस्, त्यसपछि Add to Home Screen र Add छान्नुहोस्।","In Safari, choose Share, then Add to Home Screen and Add.")}</p>:<p>{l(language,"Chrome वा Edge को मेनुबाट Install app वा Add to Home screen छान्नुहोस्। एपभित्रको ब्राउजर भए यो लिङ्क Chrome वा Safari मा खोल्नुहोस्।","In Chrome or Edge, choose Install app or Add to Home screen from the menu. If you are inside another app’s browser, open this link in Chrome or Safari.")}</p>}
      {/android/i.test(navigator.userAgent)?<a href="intent://aafnaipatro.com/#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2Faafnaipatro.com%2F;end">{l(language,"Chrome मा खोल्नुहोस्","Open in Chrome")}</a>:null}
      <input readOnly value={SITE_LINK} aria-label={l(language,"साइटको लिङ्क","Site link")} onFocus={event=>event.currentTarget.select()}/>
      <button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(SITE_LINK);setCopied(true);}catch{dialog.current?.querySelector<HTMLInputElement>("input")?.select();}}}>{l(language,"साइटको लिङ्क कपी गर्नुहोस्","Copy site link")}</button>
      {copied?<p role="status">{l(language,"लिङ्क कपी भयो","Link copied")}</p>:null}
      <button type="button" className="ap-install-dialog-done" onClick={()=>setShowGuide(false)}>{l(language,"बुझें","Done")}</button>
    </section></div>:null}</>;
}
