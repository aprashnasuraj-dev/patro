import { applyRouteSeo } from "../seo";
import { ITEMS } from "./FeatureLauncher";
import { GoogleAuthButton } from "../auth/GoogleAuthButton";
import { useDetailsMenuDismiss } from "../useDismiss";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { Menu, Search } from "lucide-react";
import { MobileMenu } from "./MobileMenu";
import type { UiLanguage } from "../i18n";

type ThemeMode="light"|"dark";
const FEATURED_EXPERIENCES=[
 ["/tools/astro","☾","खगोलीय पात्रो","चन्द्र अवस्था, तिथि र आकाशीय घटना"],
 ["/time-machine","⏳","समययन्त्र","नेपालको इतिहास समयरेखामा"],
 ["/on-this-day","इत","आज इतिहासमा","मितिअनुसार ऐतिहासिक घटना"],
 ["/samudaya","समु","समुदाय पात्रो","६ सांस्कृतिक पात्रो + समुदाय चक्र"],
 ["/fm","FM","रेडियो","नेपालका FM लाइभ सुन्नुहोस्"],
 ["/tv","TV","लाइभ टिभी","समर्थित लाइभ च्यानल"],
 ["/samachar","सम","समाचार","ताजा नेपाली समाचार"]
] as const;

function pathNow(){return window.location.pathname.replace(/\/+$/,"")||"/"}
function useRoute(){const[p,setP]=useState(pathNow);useEffect(()=>{const f=()=>setP(pathNow());window.addEventListener("popstate",f);window.addEventListener("patro:navigation",f);return()=>{window.removeEventListener("popstate",f);window.removeEventListener("patro:navigation",f)}},[]);return p}
function neActive(path:string,target:string){if(target==="/")return path==="/"||path==="/today"||path.startsWith("/calendar/");if(target==="/rashifal")return path==="/rashifal"||path==="/jyotish/rashifal";if(target==="/convert")return path==="/convert"||path==="/tools/bstoad"||path==="/tools/adtobs";if(target==="/tools")return path==="/tools"||path.startsWith("/tools/");if(target==="/me")return path==="/me"||path.startsWith("/me/");if(target==="/samudaya")return path==="/samudaya"||path.startsWith("/samudaya/")||path==="/nepal-sambat/mandala";return path===target}

export function AppChrome({children}:{children:ReactNode}){
 const path=useRoute();
 const [menuOpen,setMenuOpen]=useState(false);
 const closeMenu=useCallback(()=>setMenuOpen(false),[]);
 const[language,setLanguage]=useState<UiLanguage>(()=>{try{return localStorage.getItem("patro.ui.language")==="en"?"en":"ne"}catch{return"ne"}});
 const[theme,setTheme]=useState<ThemeMode>(()=>{try{return localStorage.getItem("patro.ui.mode")==="dark"?"dark":"light"}catch{return"light"}});
 useEffect(()=>{document.documentElement.lang=language;try{localStorage.setItem("patro.ui.language",language)}catch{}},[language]);
 useEffect(()=>{document.documentElement.dataset.theme=theme;document.documentElement.dataset.mode=theme;try{localStorage.setItem("patro.ui.mode",theme)}catch{}},[theme]);
 useEffect(()=>{applyRouteSeo(path)},[path]);
  useDetailsMenuDismiss("details.ap-more");
 const ne=language==="ne";
 const nav=[["/",ne?"पात्रो":"Calendar"],["/tools/astro",ne?"खगोलीय पात्रो":"Astronomy"],["/rashifal",ne?"राशिफल":"Horoscope"],["/jyotish/china",ne?"ज्योतिष":"Jyotish"],["/tools",ne?"नेपाली उपकरण":"Nepali tools"]];
 return <div className="ap-shell"><a className="skip-link" href="#main-content">{ne?"मुख्य सामग्रीमा जानुहोस्":"Skip to content"}</a><header className="ap-header"><div className="ap-header__in"><button className="hp-menu-trigger" type="button" aria-label={ne?"मेनु खोल्नुहोस्":"Open menu"} aria-haspopup="dialog" aria-expanded={menuOpen} aria-controls="hp-mobile-menu" onClick={()=>setMenuOpen(true)}><Menu size={23}/></button><a className="ap-brand" href="/" aria-label={ne?"आफ्नै पात्रो गृहपृष्ठ":"Aafnai Patro home"}><span className="ap-brand-mark" aria-hidden="true">आ</span><span className="ap-wordmark">{ne?"आफ्नै पात्रो":"Aafnai Patro"}{!ne&&<small>आफ्नै पात्रो</small>}</span></a><nav className="ap-nav" aria-label={ne?"मुख्य मेनु":"Primary navigation"}>{nav.map(([href,label])=><a key={href} href={href} aria-current={neActive(path,href)?"page":undefined}>{label}</a>)}<details className="ap-more"><summary>{ne?"थप":"More"}</summary><div className="ap-more-menu">{ITEMS.filter(item=>item.href.startsWith("/tools/")||item.href==="/convert").map(item=><a key={item.href} href={item.href}>{ne?item.ne:item.en}</a>)}<a href="/samachar">{ne?"समाचार":"News"}</a><a href="/fm">{ne?"रेडियो":"Radio"}</a><a href="/tv">{ne?"लाइभ टिभी":"Live TV"}</a><a href="/time-machine">{ne?"समययन्त्र":"Time Machine"}</a><a href="/on-this-day">{ne?"आज इतिहासमा":"On this day"}</a><a href="/samudaya">{ne?"समुदाय पात्रो":"Community calendars"}</a><a href="/nepal-sambat/mandala">{ne?"नेपाल संवत्":"Nepal Sambat"}</a><a href="/samudaya/lhosar">{ne?"ल्होसार":"Lhosar"}</a><a href="/samudaya/tharu">{ne?"थारु पात्रो":"Tharu calendar"}</a><a href="/samudaya/mithila">{ne?"मिथिला पात्रो":"Mithila calendar"}</a><a href="/samudaya/kirat">{ne?"किरात पात्रो":"Kirat calendar"}</a><a href="/samudaya/hijri">{ne?"हिजरी पात्रो":"Hijri calendar"}</a><a href="/samudaya/chakra">{ne?"समुदाय चक्र":"Community chakra"}</a></div></details></nav><div className="ap-actions"><button className="hp-header-search" type="button" aria-label={ne?"सुविधा खोज्नुहोस्":"Search features"} aria-haspopup="dialog" onClick={()=>window.dispatchEvent(new Event("patro:open-search"))}><Search size={22}/></button><button className="ap-round" type="button" onClick={()=>setTheme(value=>value==="dark"?"light":"dark")} aria-label={ne?"थिम परिवर्तन":"Change theme"}>{theme==="dark"?"☀":"☾"}</button><button className="ap-lang" type="button" onClick={()=>setLanguage(value=>value==="ne"?"en":"ne")} aria-label="Nepali English">{ne?"EN":"ने"}</button><GoogleAuthButton language={language} compact/><a className="ap-me-button" href="/me"><span aria-hidden="true">●</span>&nbsp;<span className="ap-me-label">{ne?"आफ्नै ठाउँ":"My space"}</span></a></div></div></header>{menuOpen?<MobileMenu language={language} theme={theme} path={path} onClose={closeMenu} onLanguage={()=>setLanguage(value=>value==="ne"?"en":"ne")} onTheme={()=>setTheme(value=>value==="dark"?"light":"dark")}/>:null}{path==="/tools"&&<nav className="ap-explore-rail" aria-label={ne?"विशेष अनुभव":"Featured experiences"}>{FEATURED_EXPERIENCES.map(([href,icon,title,desc])=><a href={href} key={href}><b aria-hidden="true">{icon}</b><span><strong>{title}</strong><small>{desc}</small></span><i aria-hidden="true">→</i></a>)}</nav>}<div id="main-content" tabIndex={-1}>{children}</div><footer className="ap-footer"><a className="ap-footer-brand" href="/">{ne?"आफ्नै पात्रो":"Aafnai Patro"}</a><span>© २०२६</span><a href="/tools">{ne?"उपकरण":"Tools"}</a><a href="/guides">{ne?"प्रयोग निर्देशिका":"Guides"}</a><a href="/time-machine">{ne?"समययन्त्र":"Time Machine"}</a><a href="/samudaya">{ne?"समुदाय पात्रो":"Community"}</a><a href="/about">{ne?"हाम्रो बारेमा":"About"}</a><a href="/sources">{ne?"स्रोत":"Sources"}</a><a href="/privacy">{ne?"गोपनीयता":"Privacy"}</a><a href="/terms">{ne?"सर्तहरू":"Terms"}</a><a href="/contact">{ne?"सम्पर्क":"Contact"}</a></footer><nav className="ap-tabbar" aria-label={ne?"मोबाइल मेनु":"Mobile navigation"}><a href="/" aria-current={neActive(path,"/")?"page":undefined}><b>▦</b><span>{ne?"पात्रो":"Calendar"}</span></a><a href="/rashifal" aria-current={neActive(path,"/rashifal")?"page":undefined}><b>♈</b><span>{ne?"राशिफल":"Horoscope"}</span></a><a href="/convert" aria-current={neActive(path,"/convert")?"page":undefined}><b>↔</b><span>{ne?"रूपान्तरण":"Convert"}</span></a><a href="/me" aria-current={neActive(path,"/me")?"page":undefined}><b>●</b><span>{ne?"आफ्नै ठाउँ":"My space"}</span></a><a href="/tools" aria-current={neActive(path,"/tools")?"page":undefined}><b>⋯</b><span>{ne?"थप":"More"}</span></a></nav></div>
}
