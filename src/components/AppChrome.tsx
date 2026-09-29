import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  CalendarDays, MoonStar, ArrowLeftRight, Tv, BookOpenText, MoreHorizontal, Search, Sun, Moon,
  Monitor, UserRound, Newspaper, Radio, Keyboard, Wrench, Hourglass, History, Telescope, Orbit,
  Menu, X, Cloud, ChevronRight, ListChecks
} from "lucide-react";
import { LogoMark } from "./LogoMark";
import { IconButton } from "./ui";
import { t, type UiLanguage } from "../i18n";

type ThemeMode = "system" | "light" | "dark";
type RouteItem = { path:string; key:Parameters<typeof t>[1]; icon:typeof CalendarDays; descriptionNe:string; descriptionEn:string };

const MORE_ITEMS: RouteItem[] = [
  {path:"/samachar",key:"news",icon:Newspaper,descriptionNe:"विश्वसनीय स्रोतका ताजा समाचार",descriptionEn:"Latest news from supported sources"},
  {path:"/fm",key:"radio",icon:Radio,descriptionNe:"नेपाल र विश्वका रेडियो स्टेशन",descriptionEn:"Nepal and global radio stations"},
  {path:"/tv",key:"tv",icon:Tv,descriptionNe:"देश, भाषा र विषय अनुसार लाइभ च्यानल",descriptionEn:"Live channels by country and language"},
  {path:"/tools/nepali-typing",key:"typing",icon:Keyboard,descriptionNe:"Roman बाट नेपाली Unicode टाइपिङ",descriptionEn:"Roman to Nepali Unicode typing"},
  {path:"/tools",key:"tools",icon:Wrench,descriptionNe:"मिति, कर, QR, इन्धन र अन्य उपकरण",descriptionEn:"Date, tax, QR, fuel and more"},
  {path:"/time-machine",key:"timeMachine",icon:Hourglass,descriptionNe:"इतिहासमा समय यात्रा",descriptionEn:"Travel through Nepal history"},
  {path:"/on-this-day",key:"history",icon:History,descriptionNe:"आजको दिन इतिहासमा",descriptionEn:"Events from this day in history"},
  {path:"/astro",key:"astro",icon:Telescope,descriptionNe:"आकाश र खगोलीय डेटा",descriptionEn:"Sky and astronomical data"},
  {path:"/jyotish/janma-patro",key:"birthChart",icon:Orbit,descriptionNe:"जन्म विवरणबाट जन्मपत्रिका",descriptionEn:"Birth chart from birth details"}
];

const COMMAND_ITEMS: RouteItem[] = [
  {path:"/",key:"calendar",icon:CalendarDays,descriptionNe:"आज र महिनाको पात्रो",descriptionEn:"Today and month calendar"},
  {path:"/jyotish/rashifal",key:"rashifal",icon:MoonStar,descriptionNe:"दैनिक, साप्ताहिक र मासिक राशिफल",descriptionEn:"Daily, weekly and monthly horoscope"},
  {path:"/convert",key:"converter",icon:ArrowLeftRight,descriptionNe:"BS ↔ AD रूपान्तरण",descriptionEn:"BS ↔ AD conversion"},
  {path:"/tv",key:"tv",icon:Tv,descriptionNe:"लाइभ टिभी",descriptionEn:"Live television"},
  {path:"/my-diary",key:"diary",icon:BookOpenText,descriptionNe:"रिमाइन्डर र व्यक्तिगत मितिहरू",descriptionEn:"Reminders and personal dates"},
  ...MORE_ITEMS
];

function storedLanguage(): UiLanguage {
  try { return localStorage.getItem("patro.ui.language")==="en" ? "en" : "ne"; } catch { return "ne"; }
}
function storedTheme(): ThemeMode {
  try {
    const v=localStorage.getItem("patro.ui.mode");
    if(v==="dark"||v==="light"||v==="system") return v;
  } catch {}
  return "system";
}

export function AppChrome({ children }: { children:ReactNode }) {
  const [language,setLanguage]=useState<UiLanguage>(storedLanguage);
  const [theme,setTheme]=useState<ThemeMode>(storedTheme);
  const [searchOpen,setSearchOpen]=useState(false);
  const [moreOpen,setMoreOpen]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [query,setQuery]=useState("");
  const [offline,setOffline]=useState(()=>!navigator.onLine);
  const [compact,setCompact]=useState(false);

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    const rows=COMMAND_ITEMS.map(item=>({...item,label:t(language,item.key)}));
    if(!q) return rows.slice(0,8);
    return rows.filter(x=>(x.label+" "+x.descriptionNe+" "+x.descriptionEn).toLowerCase().includes(q)).slice(0,10);
  },[language,query]);

  useEffect(()=>{
    document.documentElement.lang=language;
    try{localStorage.setItem("patro.ui.language",language);}catch{}
  },[language]);

  useEffect(()=>{
    document.documentElement.dataset.theme=theme;
    document.documentElement.dataset.mode=theme==="dark"?"dark":theme==="light"?"light":"system";
    const meta=document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content",theme==="dark"?"#34A765":"#176F3B");
    try{localStorage.setItem("patro.ui.mode",theme);}catch{}
  },[theme]);

  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){event.preventDefault();setSearchOpen(true);}
      if(event.key==="Escape"){setSearchOpen(false);setMoreOpen(false);setMobileOpen(false);}
    };
    const onOnline=()=>setOffline(false), onOffline=()=>setOffline(true), onScroll=()=>setCompact(window.scrollY>24);
    window.addEventListener("keydown",onKey); window.addEventListener("online",onOnline); window.addEventListener("offline",onOffline); window.addEventListener("scroll",onScroll,{passive:true});
    return()=>{window.removeEventListener("keydown",onKey);window.removeEventListener("online",onOnline);window.removeEventListener("offline",onOffline);window.removeEventListener("scroll",onScroll);};
  },[]);

  function submit(event:FormEvent){event.preventDefault();const first=filtered[0];if(first) location.assign(first.path);}
  const nextTheme=()=>setTheme(v=>v==="system"?"light":v==="light"?"dark":"system");
  const ThemeIcon=theme==="dark"?Moon:theme==="light"?Sun:Monitor;
  const desc=(item:RouteItem)=>language==="ne"?item.descriptionNe:item.descriptionEn;

  return <div className="mp-shell">
    <a className="skip-link" href="#main-content">{language==="ne"?"मुख्य सामग्रीमा जानुहोस्":"Skip to content"}</a>
    {offline && <div className="mp-offline" role="status">{t(language,"offline")}</div>}
    <header className={`mp-header ${compact?"is-compact":""}`}>
      <div className="mp-header__inner">
        <a className="mp-brand" href="/" aria-label={language==="ne"?"मेरो पात्रो गृहपृष्ठ":"Mero Patro home"}>
          <LogoMark size={compact?34:40}/><span><strong>मेरो पात्रो</strong><small>Mero Patro</small></span>
        </a>
        <nav className="mp-primary" aria-label="Primary navigation">
          <a href="/"><CalendarDays size={18}/><span>{t(language,"calendar")}</span></a>
          <a href="/jyotish/rashifal"><MoonStar size={18}/><span>{t(language,"rashifal")}</span></a>
          <a href="/convert"><ArrowLeftRight size={18}/><span>{t(language,"converter")}</span></a>
          <a href="/tv"><Tv size={18}/><span>{t(language,"tv")}</span></a>
          <a href="/my-diary"><BookOpenText size={18}/><span>{t(language,"diary")}</span></a>
          <button type="button" onClick={()=>setMoreOpen(v=>!v)} aria-expanded={moreOpen}><MoreHorizontal size={18}/><span>{t(language,"more")}</span></button>
        </nav>
        <div className="mp-actions">
          <IconButton label={t(language,"search")} onClick={()=>setSearchOpen(true)}><Search size={20}/></IconButton>
          <button className="mp-language" onClick={()=>setLanguage(v=>v==="ne"?"en":"ne")} aria-label="Toggle Nepali and English">{language==="ne"?"ने | EN":"EN | ने"}</button>
          <IconButton label={t(language,"theme")} onClick={nextTheme}><ThemeIcon size={20}/></IconButton>
          <a className="mp-signin" href="/settings"><UserRound size={18}/><span>{t(language,"signIn")}</span></a>
          <IconButton className="mp-mobile-menu" label={t(language,"more")} onClick={()=>setMobileOpen(true)}><Menu size={22}/></IconButton>
        </div>
      </div>
      {moreOpen && <div className="mp-mega" role="menu">
        <div className="mp-mega__grid">
          <section><h3>{language==="ne"?"मिडिया":"Media"}</h3>{MORE_ITEMS.filter(x=>["/samachar","/fm","/tv"].includes(x.path)).map(ItemLink)}</section>
          <section><h3>{language==="ne"?"उपकरण र थप":"Tools & more"}</h3>{MORE_ITEMS.filter(x=>!["/samachar","/fm","/tv"].includes(x.path)).map(ItemLink)}</section>
        </div>
        <a className="mp-mega__all" href="/explore">{t(language,"allFeatures")} <ChevronRight size={16}/></a>
      </div>}
    </header>

    <div id="main-content" tabIndex={-1}>{children}</div>

    <nav className="mp-bottom-nav" aria-label="Mobile navigation">
      <a href="/"><CalendarDays size={21}/><span>{t(language,"calendar")}</span></a>
      <a href="/tv"><Tv size={21}/><span>{t(language,"tv")}</span></a>
      <a href="/convert"><ArrowLeftRight size={21}/><span>{language==="ne"?"रूपान्तरण":"Convert"}</span></a>
      <a href="/my-diary"><ListChecks size={21}/><span>{language==="ne"?"डायरी":"Diary"}</span></a>
      <button type="button" onClick={()=>setMobileOpen(true)}><MoreHorizontal size={21}/><span>{t(language,"more")}</span></button>
    </nav>

    {mobileOpen && <div className="mp-sheet-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)setMobileOpen(false)}}>
      <aside className="mp-sheet" role="dialog" aria-modal="true" aria-label={t(language,"more")}>
        <header><strong>{t(language,"allFeatures")}</strong><IconButton label="Close" onClick={()=>setMobileOpen(false)}><X size={20}/></IconButton></header>
        <div className="mp-sheet__links">{COMMAND_ITEMS.map(ItemLink)}</div>
      </aside>
    </div>}

    {searchOpen && <div className="mp-command-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)setSearchOpen(false)}}>
      <section className="mp-command" role="dialog" aria-modal="true" aria-label={t(language,"search")}>
        <form onSubmit={submit}><Search size={20}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder={language==="ne"?"फिचर, मिति वा चाडपर्व खोज्नुहोस्":"Search features, dates or festivals"} /></form>
        <div>{filtered.map(item=><a href={item.path} key={item.path}><item.icon size={20}/><span><strong>{item.label}</strong><small>{desc(item)}</small></span><ChevronRight size={16}/></a>)}</div>
        <footer><kbd>Ctrl/⌘ K</kbd> {language==="ne"?"खोजी खोल्नुहोस्":"opens search"} · <kbd>Esc</kbd> {language==="ne"?"बन्द":"close"}</footer>
      </section>
    </div>}
  </div>;

  function ItemLink(item:RouteItem){
    const Icon=item.icon;
    return <a href={item.path} key={item.path}><Icon size={20}/><span><strong>{t(language,item.key)}</strong><small>{desc(item)}</small></span></a>;
  }
}
