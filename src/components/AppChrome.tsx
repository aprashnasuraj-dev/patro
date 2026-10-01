import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { UiLanguage } from "../i18n";

type ThemeMode="light"|"dark";
const SITE="https://aafnaipatro.com";

const TOOL_SEO:Record<string,[string,string]>={
 "nepali-typing":["Nepali Typing","Roman Nepali to Unicode typing with local Devanagari suggestions."],
 "preeti-converter":["Preeti Converter","Convert Preeti to Unicode and Unicode to Preeti in one browser tool."],
 bstoad:["BS to AD Converter","Convert Bikram Sambat dates to Gregorian AD dates."],
 adtobs:["AD to BS Converter","Convert Gregorian AD dates to Bikram Sambat dates."],
 convert:["Date Converter","Convert Bikram Sambat and Gregorian dates with Aafnai Patro calendar data."],
 calc:["Date Calculator","Calculate days between dates and add or subtract days."],
 age:["Age Calculator","Calculate exact age, total days and the next birthday."],
 clock:["World Clock","Compare Nepal time with world time zones and plan calls home."],
 forex:["Nepal Forex Rates","View migrated Nepal Rastra Bank foreign-exchange reference rates."],
 gold:["Gold Calculator","Estimate tola and gram jewellery values using a rate you enter."],
 emi:["Loan EMI Calculator","Calculate loan instalments, total interest and repayment schedule."],
 vat:["VAT and Percentage Calculator","Calculate VAT, percentages and percentage change."],
 units:["Nepali Traditional Units","Convert traditional Nepali weight and volume units."],
 words:["Amount in Words","Convert amounts into Nepali and English lakh-crore wording."],
 tax:["Nepal Income Tax Calculator","Estimate FY 2083/84 resident salary tax and deductions."],
 incometax:["Nepal Income Tax Calculator","Estimate FY 2083/84 resident salary tax and deductions."],
 land:["Nepali Land Converter","Convert Ropani-Aana-Paisa-Dam and Bigha-Kattha-Dhur."],
 landconverter:["Nepali Land Converter","Convert Nepali land units and square feet."],
 qr:["Nepali QR Generator","Create private UTF-8 QR codes for Nepali or English text in the browser."],
 nepaliqr:["Nepali QR Generator","Create private UTF-8 QR codes for Nepali or English text in the browser."],
 fuel:["Nepal Fuel Prices","Check Nepal Oil Corporation fuel-price references."],
 fuelprice:["NOC Fuel Price Tracker","Check Nepal Oil Corporation petrol, diesel, kerosene, LPG and aviation-fuel references."],
 "tithi-reminder":["Tithi Reminder","Create tithi-based reminders and calendar feeds for rituals and birthdays."],
 sait:["Sait Finder","Review official and calculated auspicious-date references with clear provenance."],
 "baby-names":["Baby Names by Nakshatra","Explore Nepali baby-name starting sounds, naming and family timeline helpers."],
 "janmadin-akhbar":["Birthday Newspaper","Create a shareable birthday newspaper from calendar and history context."],
 "future-letter":["Future Letter","Write a private letter that opens on a selected date or tithi birthday."],
 "spell-check":["Nepali Spell Check","Check Nepali spelling with local rules and suggestions."],
 "voice-typing":["Nepali Voice Typing","Type Nepali with browser speech recognition and safe fallbacks."],
 ocr:["Nepali OCR","Extract Nepali and English Unicode text from images in the browser."],
 "name-check":["Name Check","Compare a name's starting sound with nakshatra and pada references."],
 "read-aloud":["Nepali Read Aloud","Listen to Nepali text using available browser speech voices."],
 "patro-bot":["Patro Bot","Ask short questions about dates, tithi and calendar context."],
 astro:["Astronomical Calendar","Explore tithi, lunar phases, astronomy and NASA-linked calendar context."],
 api:["Aafnai Patro API","Explore public Aafnai Patro API and developer integration guidance."],
 samudaya:["Community Calendar Suite","Open Nepal Sambat and Nepal's community calendar experiences."],
};

function pathNow(){return window.location.pathname.replace(/\/+$/,"")||"/"}
function useRoute(){const[p,setP]=useState(pathNow);useEffect(()=>{const f=()=>setP(pathNow());window.addEventListener("popstate",f);window.addEventListener("patro:navigation",f);return()=>{window.removeEventListener("popstate",f);window.removeEventListener("patro:navigation",f)}},[]);return p}
function neActive(path:string,target:string){if(target==="/")return path==="/"||path.startsWith("/calendar/");if(target==="/rashifal")return path==="/rashifal"||path==="/jyotish/rashifal";if(target==="/tools")return path==="/tools"||path.startsWith("/tools/");if(target==="/me")return path==="/me"||path.startsWith("/me/");return path===target}

function routeSeo(path:string):{title:string;description:string;index:boolean}{
 const tool=path.match(/^\/tools\/([^/]+)$/)?.[1];
 if(tool){const meta=TOOL_SEO[tool];if(meta)return{title:meta[0],description:meta[1],index:true};}
 if(path==="/")return{title:"आजको नेपाली पात्रो",description:"आजको नेपाली मिति, तिथि, चाडपर्व, बिदा, नेपाल संवत् र दैनिक पात्रो जानकारी।",index:true};
 if(path==="/tools")return{title:"Nepali Tools · नेपाली उपकरण",description:"Date, language, finance, calendar, sharing and Nepali utility tools in one place.",index:true};
 if(path==="/convert")return{title:"BS AD Date Converter · मिति रूपान्तरण",description:"Convert Bikram Sambat and Gregorian dates both ways using Aafnai Patro calendar data.",index:true};
 if(path==="/rashifal")return{title:"Rashifal · राशिफल",description:"Daily, weekly and monthly Rashifal with transparent calendar context.",index:true};
 if(path==="/samachar")return{title:"Nepali Samachar · समाचार",description:"Discover categorized Nepali news with links back to original sources.",index:true};
 if(path==="/fm")return{title:"Nepali FM Radio",description:"Discover and play verified Nepali FM and internet radio streams.",index:true};
 if(path==="/tv")return{title:"Live TV Explorer",description:"Browse playable public live TV channels with health checks and resilient playback.",index:true};
 if(path==="/time-machine")return{title:"Nepal Time Machine",description:"Travel through notable moments in Nepal and world history by year.",index:true};
 if(path==="/on-this-day")return{title:"On This Day · आज इतिहासमा",description:"Explore historical events associated with today's calendar date.",index:true};
 if(path==="/samudaya")return{title:"Community Calendars · समुदाय पात्रो",description:"Explore Nepal Sambat, Lhosar, Tharu, Mithila, Kirat, Hijri and Samudaya Chakra calendars.",index:true};
 if(path==="/nepal-sambat/mandala")return{title:"Nepal Sambat Mandala",description:"Explore Nepal Sambat dates, observances and festival context.",index:true};
 if(path.startsWith("/samudaya/")){const label=path.split("/").filter(Boolean).at(-1)?.replace(/-/g," ")||"Community";return{title:`${label} calendar`,description:"A community calendar experience within Aafnai Patro's Nepal calendar suite.",index:true};}
 if(path.startsWith("/calendar/")){const bits=path.split("/");return{title:`Nepali Calendar ${bits[2]||""}/${bits[3]||""}`,description:"Monthly Bikram Sambat calendar with tithi, festivals and holidays.",index:true};}
 if(path.startsWith("/date/"))return{title:"Nepali Date Details",description:"Bikram Sambat, tithi, Nepal Sambat and festival details for the selected date.",index:true};
 if(path.startsWith("/me")||path.startsWith("/admin"))return{title:"My Space",description:"Private Aafnai Patro account and personal calendar space.",index:false};
 return{title:"Aafnai Patro · आफ्नै पात्रो",description:"Nepali calendar, Bikram Sambat dates, tithi, community calendars, tools, radio, TV and news.",index:true};
}

function setMeta(selector:string,attribute:string,value:string,content:string){let node=document.head.querySelector<HTMLMetaElement>(selector);if(!node){node=document.createElement("meta");node.setAttribute(attribute,value);document.head.appendChild(node)}node.setAttribute("content",content)}
function applySeo(path:string){const meta=routeSeo(path);const fullTitle=`${meta.title} | आफ्नै पात्रो`;document.title=fullTitle;setMeta('meta[name="description"]',"name","description",meta.description);setMeta('meta[property="og:title"]',"property","og:title",fullTitle);setMeta('meta[property="og:description"]',"property","og:description",meta.description);setMeta('meta[property="og:url"]',"property","og:url",SITE+path);setMeta('meta[name="twitter:title"]',"name","twitter:title",fullTitle);setMeta('meta[name="twitter:description"]',"name","twitter:description",meta.description);setMeta('meta[name="robots"]',"name","robots",meta.index?"index,follow,max-image-preview:large":"noindex,nofollow");let canonical=document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');if(!canonical){canonical=document.createElement("link");canonical.rel="canonical";document.head.appendChild(canonical)}canonical.href=SITE+path;}

export function AppChrome({children}:{children:ReactNode}){
 const path=useRoute();
 const[language,setLanguage]=useState<UiLanguage>(()=>{try{return localStorage.getItem("patro.ui.language")==="en"?"en":"ne"}catch{return"ne"}});
 const[theme,setTheme]=useState<ThemeMode>(()=>{try{return localStorage.getItem("patro.ui.mode")==="dark"?"dark":"light"}catch{return"light"}});
 useEffect(()=>{document.documentElement.lang=language;try{localStorage.setItem("patro.ui.language",language)}catch{}},[language]);
 useEffect(()=>{document.documentElement.dataset.theme=theme;document.documentElement.dataset.mode=theme;try{localStorage.setItem("patro.ui.mode",theme)}catch{}},[theme]);
 useEffect(()=>{applySeo(path)},[path]);
 const ne=language==="ne";
 const nav=[["/",ne?"पात्रो":"Calendar"],["/rashifal",ne?"राशिफल":"Horoscope"],["/convert",ne?"मिति रूपान्तरण":"Date conversion"],["/tools",ne?"उपकरण":"Tools"]];
 return <div className="ap-shell"><a className="skip-link" href="#main-content">{ne?"मुख्य सामग्रीमा जानुहोस्":"Skip to content"}</a><header className="ap-header"><div className="ap-header__in"><a className="ap-brand" href="/" aria-label={ne?"आफ्नै पात्रो गृहपृष्ठ":"Aafnai Patro home"}><span className="ap-brand-mark" aria-hidden="true">आ</span><span className="ap-wordmark">{ne?"आफ्नै पात्रो":"Aafnai Patro"}{!ne&&<small>Aafnai Patro</small>}</span></a><nav className="ap-nav" aria-label={ne?"मुख्य मेनु":"Primary navigation"}>{nav.map(([href,label])=><a key={href} href={href} aria-current={neActive(path,href)?"page":undefined}>{label}</a>)}<details className="ap-more"><summary>{ne?"थप":"More"}</summary><div className="ap-more-menu"><a href="/samachar">{ne?"समाचार":"News"}</a><a href="/fm">{ne?"रेडियो":"Radio"}</a><a href="/tv">{ne?"लाइभ टिभी":"Live TV"}</a><a href="/time-machine">{ne?"समययन्त्र":"Time Machine"}</a><a href="/on-this-day">{ne?"आज इतिहासमा":"On this day"}</a><a href="/samudaya">{ne?"समुदाय पात्रो":"Community calendars"}</a><a href="/nepal-sambat/mandala">{ne?"नेपाल संवत्":"Nepal Sambat"}</a><a href="/samudaya/lhosar">{ne?"ल्होसार":"Lhosar"}</a><a href="/samudaya/tharu">{ne?"थारु पात्रो":"Tharu calendar"}</a><a href="/samudaya/mithila">{ne?"मिथिला पात्रो":"Mithila calendar"}</a><a href="/samudaya/kirat">{ne?"किरात पात्रो":"Kirat calendar"}</a><a href="/samudaya/hijri">{ne?"हिजरी पात्रो":"Hijri calendar"}</a><a href="/samudaya/chakra">{ne?"समुदाय चक्र":"Community chakra"}</a></div></details></nav><div className="ap-actions"><button className="ap-round" type="button" onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} aria-label={ne?"थिम परिवर्तन":"Change theme"}>{theme==="dark"?"☀":"☾"}</button><button className="ap-lang" type="button" onClick={()=>setLanguage(v=>v==="ne"?"en":"ne")} aria-label="Nepali English">{ne?"EN":"ने"}</button><a className="ap-me-button" href="/me"><span aria-hidden="true">●</span>&nbsp;<span className="ap-me-label">{ne?"आफ्नै ठाउँ":"My space"}</span></a></div></div></header><div id="main-content" tabIndex={-1}>{children}</div><footer className="ap-footer"><a className="ap-footer-brand" href="/">{ne?"आफ्नै पात्रो":"Aafnai Patro"}</a><span>© २०२६</span><a href="/tools">{ne?"उपकरण":"Tools"}</a><a href="/time-machine">{ne?"समययन्त्र":"Time Machine"}</a><a href="/samudaya">{ne?"समुदाय पात्रो":"Community"}</a><a href="/about">{ne?"हाम्रो बारेमा":"About"}</a><a href="/sources">{ne?"स्रोत":"Sources"}</a><a href="/privacy">{ne?"गोपनीयता":"Privacy"}</a><a href="/terms">{ne?"सर्तहरू":"Terms"}</a><a href="/contact">{ne?"सम्पर्क":"Contact"}</a></footer><nav className="ap-tabbar" aria-label={ne?"मोबाइल मेनु":"Mobile navigation"}><a href="/" aria-current={neActive(path,"/")?"page":undefined}><b>▦</b><span>{ne?"पात्रो":"Calendar"}</span></a><a href="/rashifal" aria-current={neActive(path,"/rashifal")?"page":undefined}><b>☾</b><span>{ne?"राशिफल":"Horoscope"}</span></a><a href="/convert" aria-current={neActive(path,"/convert")?"page":undefined}><b>↔</b><span>{ne?"रूपान्तरण":"Convert"}</span></a><a href="/me" aria-current={neActive(path,"/me")?"page":undefined}><b>●</b><span>{ne?"आफ्नै ठाउँ":"My space"}</span></a><a href="/tools" aria-current={neActive(path,"/tools")?"page":undefined}><b>•••</b><span>{ne?"थप":"More"}</span></a></nav></div>
}
