import { useEffect, useState } from "react";
import { Download, CalendarDays, MoonStar, Tv, Radio, Wrench, Info, ShieldCheck, BookOpenText, MessageSquare } from "lucide-react";
import { LogoMark } from "./LogoMark";
import type { UiLanguage } from "../i18n";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function SiteFooter({ language }: { language: UiLanguage }) {
  const [installPrompt,setInstallPrompt]=useState<InstallPromptEvent|null>(null);
  useEffect(()=>{
    const onPrompt=(event:Event)=>{event.preventDefault();setInstallPrompt(event as InstallPromptEvent);};
    window.addEventListener("beforeinstallprompt",onPrompt);
    return()=>window.removeEventListener("beforeinstallprompt",onPrompt);
  },[]);
  async function install(){
    if(!installPrompt)return;
    await installPrompt.prompt();
    await installPrompt.userChoice.catch(()=>null);
    setInstallPrompt(null);
  }
  const ne=language==="ne";
  return <footer className="mp-footer">
    <div className="mp-footer__grid">
      <section className="mp-footer__brand">
        <a href="/" className="mp-footer__lockup"><LogoMark size={42}/><span><strong>मेरो पात्रो</strong><small>Mero Patro</small></span></a>
        <p>{ne?"नेपाली पात्रो, तिथि, चाडपर्व र राशिफल":"Nepali calendar, tithi, festivals and horoscope"}</p>
        <button type="button" onClick={install} disabled={!installPrompt}><Download size={17}/>{ne?"एप इन्स्टल गर्नुहोस्":"Install app"}</button>
      </section>
      <section><h3>{ne?"पात्रो":"Calendar"}</h3>
        <a href="/"><CalendarDays size={15}/>{ne?"आजको पात्रो":"Today"}</a>
        <a href="/jyotish/rashifal"><MoonStar size={15}/>{ne?"राशिफल":"Horoscope"}</a>
        <a href="/convert"><BookOpenText size={15}/>{ne?"मिति रूपान्तरण":"Date Converter"}</a>
      </section>
      <section><h3>{ne?"सुविधाहरू":"Features"}</h3>
        <a href="/tv"><Tv size={15}/>{ne?"लाइभ टिभी":"Live TV"}</a>
        <a href="/fm"><Radio size={15}/>{ne?"रेडियो":"Radio"}</a>
        <a href="/tools"><Wrench size={15}/>{ne?"उपयोगी उपकरण":"Tools"}</a>
      </section>
      <section><h3>{ne?"कम्पनी":"Company"}</h3>
        <a href="/about"><Info size={15}/>{ne?"हाम्रो बारेमा":"About"}</a>
        <a href="/sources"><BookOpenText size={15}/>{ne?"स्रोत र शुद्धता":"Sources & accuracy"}</a>
        <a href="/privacy"><ShieldCheck size={15}/>{ne?"गोपनीयता नीति":"Privacy"}</a>
        <a href="/terms"><BookOpenText size={15}/>{ne?"सेवाका सर्तहरू":"Terms"}</a>
        <a href="/contact"><MessageSquare size={15}/>{ne?"सम्पर्क":"Contact"}</a>
      </section>
    </div>
    <div className="mp-footer__bottom"><span>© २०२६ मेरो पात्रो · सर्वाधिकार सुरक्षित</span><a href="/privacy">{ne?"गोपनीयता":"Privacy"}</a><a href="/terms">{ne?"सर्तहरू":"Terms"}</a></div>
  </footer>;
}
