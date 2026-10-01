import { lazy, Suspense, useEffect, useState } from "react";
import { HomePage, MePage, NotFoundPage, RashifalPage, SamacharPage, ToolsPage } from "./AafnaiPages";
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

const EXACT=new Set(["/","/tools","/tools/astro","/me","/convert","/rashifal","/jyotish/rashifal","/samachar","/fm","/tv","/jyotish/china","/jyotish/janma-patro","/jyotish/matchmaking","/privacy","/terms","/about","/sources","/contact","/developers","/offline"]);
function clean(path:string){return path.replace(/\/+$/,"")||"/"}
function isAppPath(path:string){const p=clean(path);return EXACT.has(p)||p.startsWith("/calendar/")||p.startsWith("/me/")||p.startsWith("/tools/")||p.startsWith("/jyotish/")}
function currentPath(){return clean(window.location.pathname)}
function Fallback(){return <main className="ap-page"><div className="ap-state" role="status">लोड हुँदैछ…</div></main>}

export function PatroRouter(){
 const[path,setPath]=useState(currentPath);
 useEffect(()=>{const onPop=()=>setPath(currentPath());const onClick=(event:MouseEvent)=>{if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const a=(event.target as HTMLElement|null)?.closest("a");if(!(a instanceof HTMLAnchorElement)||a.target&&a.target!=="_self")return;const u=new URL(a.href,location.href);if(u.origin!==location.origin||!isAppPath(u.pathname))return;event.preventDefault();history.pushState(null,"",u.pathname+u.search+u.hash);setPath(clean(u.pathname));window.dispatchEvent(new Event("patro:navigation"));scrollTo({top:0,behavior:"smooth"})};addEventListener("popstate",onPop);document.addEventListener("click",onClick);return()=>{removeEventListener("popstate",onPop);document.removeEventListener("click",onClick)}},[]);
 const render=()=>{
   if(path==="/")return <HomePage/>;
   const cal=path.match(/^\/calendar\/(\d{4})\/(\d{1,2})$/);if(cal)return <HomePage calendarYear={Number(cal[1])} calendarMonth={Number(cal[2])}/>;
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
   if(path==="/rashifal"||path==="/jyotish/rashifal")return <RashifalPage/>;
   if(path==="/samachar")return <SamacharPage/>;
   if(path==="/fm")return <MediaSuite kind="radio"/>;
   if(path==="/tv")return <MediaSuite kind="tv"/>;
   if(path==="/jyotish/china"||path==="/jyotish/janma-patro"||path==="/jyotish/matchmaking")return <JanmaPatroSuite/>;
   if(path==="/tools/nepali-typing"||path==="/tools/type")return <NepaliTools mode="typing"/>;
   if(path==="/tools/preeti"||path==="/tools/preeti-converter"||path==="/tools/preeti-to-unicode"||path==="/tools/preetitounicode")return <NepaliTools mode="preeti-to-unicode"/>;
   if(path==="/tools/unicode-to-preeti"||path==="/tools/unicodetopreeti")return <NepaliTools mode="unicode-to-preeti"/>;
   if(path.startsWith("/tools/"))return <UtilitySuite key={path}/>;
   if(path==="/privacy")return <TrustPage page="privacy"/>;if(path==="/terms")return <TrustPage page="terms"/>;if(path==="/about")return <TrustPage page="about"/>;if(path==="/sources")return <TrustPage page="sources"/>;if(path==="/contact")return <TrustPage page="contact"/>;
   if(path==="/developers")return <DevelopersPage/>;
   if(path==="/offline")return <OfflinePage/>;
   return <NotFoundPage/>;
 };
 return <Suspense fallback={<Fallback/>}>{render()}</Suspense>
}
