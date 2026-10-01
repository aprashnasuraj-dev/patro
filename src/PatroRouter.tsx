import { lazy, Suspense, useEffect, useState } from "react";
import { HomePage, MePage, NotFoundPage, RashifalPage, SamacharPage, ToolsPage } from "./AafnaiPages";
import { DateDetailPage, OnThisDayPage, TimeMachinePage } from "./AafnaiDetailPages";
import { ConvertPage } from "./ConvertPage";

const AstroPage=lazy(()=>import("./App"));
const MediaSuite=lazy(()=>import("./media/MediaSuite").then(m=>({default:m.MediaSuite})));
const JanmaPatroSuite=lazy(()=>import("./jyotish/JanmaPatroSuite").then(m=>({default:m.JanmaPatroSuite})));
const UtilitySuite=lazy(()=>import("./utilities/UtilitySuite").then(m=>({default:m.UtilitySuite})));
const NepaliTools=lazy(()=>import("./features/nepali-tools/NepaliTools").then(m=>({default:m.NepaliTools})));
const MyDiary=lazy(()=>import("./components/MyDiary").then(m=>({default:m.MyDiary})));
const TrustPage=lazy(()=>import("./components/TrustPages").then(m=>({default:m.TrustPage})));
const FamilyPage=lazy(()=>import("./components/NativeProtectedPages").then(m=>({default:m.FamilyPage})));
const MyDataPage=lazy(()=>import("./components/NativeProtectedPages").then(m=>({default:m.MyDataPage})));
const NotificationSettingsPage=lazy(()=>import("./components/NativeProtectedPages").then(m=>({default:m.NotificationSettingsPage})));
const HolidaySettingsPage=lazy(()=>import("./components/NativeProtectedPages").then(m=>({default:m.HolidaySettingsPage})));
const DevelopersPage=lazy(()=>import("./components/NativeProtectedPages").then(m=>({default:m.DevelopersPage})));
const OfflinePage=lazy(()=>import("./components/NativeProtectedPages").then(m=>({default:m.OfflinePage})));
const PatroToolsShell=lazy(()=>import("./patro-tools-integration/PatroToolsShell").then(m=>({default:m.PatroToolsShell})));

const LEGACY_REDIRECTS:Record<string,string>={
 "/aaja":"/","/astro":"/tools/astro","/my-diary":"/me/diary","/notes":"/me/notes","/planner":"/me/planner","/family":"/me/family","/family/join":"/me/family","/settings":"/me/settings","/settings/notifications":"/me/reminders","/settings/holidays":"/me/settings","/my-data":"/me/data","/card":"/me/cards","/tithi":"/me/reminders","/tools/family":"/me/family","/tools/card":"/me/cards","/tools/tithi":"/me/reminders","/diaspora":"/tools/clock","/nepal-sambat":"/nepal-sambat/mandala","/jyotish/rashifal":"/rashifal","/jyotish/china/rashi":"/rashifal","/jyotish/janma-patro":"/jyotish/china"
};
const ADVANCED_TOOLS=new Set(["tithi-reminder","sait","baby-names","janmadin-akhbar","future-letter","spell-check","voice-typing","ocr","name-check","read-aloud","patro-bot"]);
const UTILITY_TOOLS=new Set(["typingtools","convert","bstoad","adtobs","calc","age","clock","forex","gold","emi","vat","units","words","tax","incometax","land","landconverter","qr","nepaliqr","fuel","fuelprice"]);
const PREETI_TO_UNICODE=new Set(["preeti","preeti-converter","preeti-to-unicode","preetitounicode"]);
const UNICODE_TO_PREETI=new Set(["unicode-to-preeti","unicodetopreeti"]);
const EXACT=new Set(["/","/tools","/tools/astro","/me","/convert","/rashifal","/samachar","/fm","/tv","/time-machine","/on-this-day","/jyotish/china","/jyotish/matchmaking","/privacy","/terms","/about","/sources","/contact","/developers","/offline",...Object.keys(LEGACY_REDIRECTS)]);
function clean(path:string){return path.replace(/\/+$/,"")||"/"}
function isKnownTool(path:string){if(!path.startsWith("/tools/"))return false;const slug=path.slice(7);return slug==="astro"||slug==="api"||slug==="nepali-typing"||slug==="type"||ADVANCED_TOOLS.has(slug)||UTILITY_TOOLS.has(slug)||PREETI_TO_UNICODE.has(slug)||UNICODE_TO_PREETI.has(slug)}
function isAppPath(path:string){const p=clean(path);return EXACT.has(p)||/^\/calendar\/\d{4}\/\d{1,2}$/.test(p)||/^\/date\/\d{4}-\d{2}-\d{2}$/.test(p)||p.startsWith("/me/")||isKnownTool(p)}
function currentPath(){return clean(window.location.pathname)}
function Fallback(){return <main className="ap-page"><div className="ap-state" role="status">लोड हुँदैछ…</div></main>}
function Redirect({to}:{to:string}){useEffect(()=>{window.location.replace(to)},[to]);return <main className="ap-page"><div className="ap-state" role="status">नयाँ ठेगानामा लगिँदैछ…</div></main>}

export function PatroRouter(){
 const[path,setPath]=useState(currentPath);
 useEffect(()=>{const onPop=()=>setPath(currentPath());const onClick=(event:MouseEvent)=>{if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const a=(event.target as HTMLElement|null)?.closest("a");if(!(a instanceof HTMLAnchorElement)||(a.target&&a.target!=="_self"))return;const u=new URL(a.href,location.href);if(u.origin!==location.origin||!isAppPath(u.pathname))return;event.preventDefault();history.pushState(null,"",u.pathname+u.search+u.hash);setPath(clean(u.pathname));window.dispatchEvent(new Event("patro:navigation"));scrollTo({top:0,behavior:"smooth"})};addEventListener("popstate",onPop);document.addEventListener("click",onClick);return()=>{removeEventListener("popstate",onPop);document.removeEventListener("click",onClick)}},[]);
 const render=()=>{
   const legacy=LEGACY_REDIRECTS[path];if(legacy)return <Redirect to={legacy}/>;
   if(path==="/")return <HomePage/>;
   const cal=path.match(/^\/calendar\/(\d{4})\/(\d{1,2})$/);if(cal)return <HomePage calendarYear={Number(cal[1])} calendarMonth={Number(cal[2])}/>;
   const date=path.match(/^\/date\/(\d{4}-\d{2}-\d{2})$/);if(date)return <DateDetailPage date={date[1]}/>;
   if(path==="/tools")return <ToolsPage/>;
   if(path==="/tools/astro")return <AstroPage/>;
   if(path==="/me")return <MePage/>;
   if(path==="/me/diary"||path==="/me/notes"||path==="/me/planner")return <MyDiary/>;
   if(path==="/me/family")return <FamilyPage/>;
   if(path==="/me/reminders")return <NotificationSettingsPage/>;
   if(path==="/me/settings")return <HolidaySettingsPage/>;
   if(path==="/me/data")return <MyDataPage/>;
   if(path==="/me/cards")return <PatroToolsShell slug="janmadin-akhbar"/>;
   if(path==="/convert")return <ConvertPage/>;
   if(path==="/rashifal")return <RashifalPage/>;
   if(path==="/samachar")return <SamacharPage/>;
   if(path==="/time-machine")return <TimeMachinePage/>;
   if(path==="/on-this-day")return <OnThisDayPage/>;
   if(path==="/fm")return <MediaSuite kind="radio"/>;
   if(path==="/tv")return <MediaSuite kind="tv"/>;
   if(path==="/jyotish/china"||path==="/jyotish/matchmaking")return <JanmaPatroSuite/>;
   if(path==="/tools/nepali-typing"||path==="/tools/type")return <NepaliTools mode="typing"/>;
   const slug=path.startsWith("/tools/")?path.slice(7):"";
   if(PREETI_TO_UNICODE.has(slug))return <NepaliTools mode="preeti-to-unicode"/>;
   if(UNICODE_TO_PREETI.has(slug))return <NepaliTools mode="unicode-to-preeti"/>;
   if(ADVANCED_TOOLS.has(slug))return <PatroToolsShell slug={slug}/>;
   if(UTILITY_TOOLS.has(slug))return <UtilitySuite key={path}/>;
   if(path==="/tools/api")return <DevelopersPage/>;
   if(path==="/privacy")return <TrustPage page="privacy"/>;
   if(path==="/terms")return <TrustPage page="terms"/>;
   if(path==="/about")return <TrustPage page="about"/>;
   if(path==="/sources")return <TrustPage page="sources"/>;
   if(path==="/contact")return <TrustPage page="contact"/>;
   if(path==="/developers")return <DevelopersPage/>;
   if(path==="/offline")return <OfflinePage/>;
   return <NotFoundPage/>;
 };
 return <Suspense fallback={<Fallback/>}>{render()}</Suspense>
}
