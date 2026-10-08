import { PlaceTimingMount } from './place/PlaceTimingMount';
import { lazy, Suspense, useEffect, useState } from "react";
import { MePage, NotFoundPage, SamacharPage, ToolsPage } from "./AafnaiPages";
import { ReferenceHomePage } from "./ReferenceHomePage";
import { DateDetailPage, OnThisDayPage, TimeMachinePage } from "./AafnaiDetailPages";
import { ConvertPage } from "./ConvertPage";
import { MethodologyPage, CorrectionsPage } from "./SeoAuthorityPages";
import { PATRO_TOOL_SLUGS, PatroToolsShell } from "./patro-tools-integration/PatroToolsShell";
import { CommunityHub } from "./community/CommunityHub";
import { CommunityPreferences } from "./community/CommunityPreferences";
const CommunityChakraPage=lazy(()=>import("./community/CommunityExperience").then(m=>({default:m.CommunityChakraPage})));
const CommunitySuitePage=lazy(()=>import("./community/CommunityExperience").then(m=>({default:m.CommunitySuitePage})));
const NepalSambatPage=lazy(()=>import("./community/CommunityExperience").then(m=>({default:m.NepalSambatPage})));
import { RashifalExperience } from "./rashifal/RashifalExperience";
import { NepaliTools } from "./features/nepali-tools/NepaliTools";
import type { SuiteId } from "./patro-tools/communities/registry";

const BirthdayPage=lazy(()=>import('./birthday/BirthdayPage'));
const PlacePage=lazy(()=>import('./place/PlacePage'));
const AstroPage=lazy(()=>import("./App"));
const MediaSuite=lazy(()=>import("./media/MediaSuite").then(m=>({default:m.MediaSuite})));
const JanmaPatroSuite=lazy(()=>import("./jyotish/JanmaPatroSuite").then(m=>({default:m.JanmaPatroSuite})));
const UtilitySuite=lazy(()=>import("./utilities/UtilitySuite").then(m=>({default:m.UtilitySuite})));
const MyDiary=lazy(()=>import("./components/MyDiary").then(m=>({default:m.MyDiary})));
const TrustPage=lazy(()=>import("./components/TrustPages").then(m=>({default:m.TrustPage})));
const FamilyPage=lazy(()=>import("./components/NativeProtectedPages").then(m=>({default:m.FamilyPage})));
const MyDataPage=lazy(()=>import("./components/NativeProtectedPages").then(m=>({default:m.MyDataPage})));
const NotificationSettingsPage=lazy(()=>import("./components/NativeProtectedPages").then(m=>({default:m.NotificationSettingsPage})));
const HolidaySettingsPage=lazy(()=>import("./components/NativeProtectedPages").then(m=>({default:m.HolidaySettingsPage})));
const DevelopersPage=lazy(()=>import("./components/NativeProtectedPages").then(m=>({default:m.DevelopersPage})));
const OfflinePage=lazy(()=>import("./components/NativeProtectedPages").then(m=>({default:m.OfflinePage})));
const SeoSearchSupport=lazy(()=>import("./SeoSearchSupport").then(m=>({default:m.SeoSearchSupport})));

const GuidePage=lazy(()=>import("./growth/GuidePage").then(m=>({default:m.GuidePage})));
const DiscoveryPanel=lazy(()=>import("./growth/DiscoveryPanel").then(m=>({default:m.DiscoveryPanel})));

const DATE_ROUTE_PREFIX="/date/";
const CALENDAR_MONTH_ROUTE=/^\/calendar\/\d{4}\/\d{1,2}$/;
const HISTORY_DAY_ROUTE=/^\/on-this-day\/(\d{2}-\d{2})$/;
const COMMUNITY_SUITE_ROUTE=/^\/samudaya\/(lhosar|tharu|mithila|kirat|hijri)$/;
const STANDALONE_COMMUNITY_ROUTES=new Set([
 "/nepal-sambat/mandala","/samudaya/lhosar","/samudaya/tharu","/samudaya/mithila",
 "/samudaya/kirat","/samudaya/hijri","/samudaya/chakra"
]);
const LEGACY_REDIRECTS:Record<string,string>={
 "/aaja":"/",
 "/astro":"/tools/astro",
 "/my-diary":"/me/diary",
 "/notes":"/me/notes",
 "/planner":"/me/planner",
 "/family":"/me/family",
 "/family/join":"/me/family",
 "/settings":"/me/settings",
 "/settings/notifications":"/me/reminders",
 "/settings/holidays":"/me/settings",
 "/my-data":"/me/data",
 "/card":"/me/cards",
 "/tithi":"/me/reminders",
 "/tools/family":"/me/family",
 "/tools/card":"/me/cards",
 "/tools/tithi":"/me/reminders",
 "/tools/my-data":"/me/data",
 "/tools/diaspora":"/tools/clock",
 "/diaspora":"/tools/clock",
 "/jyotish/rashifal":"/rashifal",
 "/jyotish/china/rashi":"/rashifal",
 "/jyotish/janma-patro":"/jyotish/china",
 "/nepal-sambat":"/nepal-sambat/mandala"
};
const EXACT=new Set(["/janmadin","/","/today","/methodology","/corrections","/samudaya","/samudaya/chakra","/nepal-sambat/mandala","/settings/community","/tools","/tools/astro","/me","/convert","/rashifal","/samachar","/fm","/tv","/time-machine","/on-this-day","/janmapatro","/janmapatro/milan.html","/jyotish/china","/jyotish/matchmaking","/privacy","/terms","/about","/sources","/contact","/developers","/offline",...Object.keys(LEGACY_REDIRECTS)]);
function clean(path:string){return path.replace(/\/+$/,"")||"/"}
function isAppPath(path:string){const p=clean(path);if(STANDALONE_COMMUNITY_ROUTES.has(p))return false;return p==="/guides"||p.startsWith("/guides/")||EXACT.has(p)||CALENDAR_MONTH_ROUTE.test(p)||HISTORY_DAY_ROUTE.test(p)||COMMUNITY_SUITE_ROUTE.test(p)||p.startsWith(DATE_ROUTE_PREFIX)||p.startsWith("/me/")||p.startsWith("/tools/")||p.startsWith("/jyotish/")||p.startsWith("/janmapatro")||p.startsWith("/samudaya/")||p.startsWith("/nepal-sambat/")}
function currentPath(){return clean(window.location.pathname)}
function Fallback(){return <main className="ap-page"><div className="ap-state" role="status">लोड हुँदैछ…</div></main>}
function Redirect({to}:{to:string}){useEffect(()=>{window.location.replace(to)},[to]);return <main className="ap-page"><div className="ap-state" role="status">नयाँ ठेगानामा लगिँदैछ…</div></main>}

export function PatroRouter(){
 const[path,setPath]=useState(currentPath);
 useEffect(()=>{const onPop=()=>setPath(currentPath());const onClick=(event:MouseEvent)=>{if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const a=(event.target as HTMLElement|null)?.closest("a");if(!(a instanceof HTMLAnchorElement)||a.hasAttribute("download")||a.target&&a.target!=="_self")return;const u=new URL(a.href,location.href);if(u.origin!==location.origin||!isAppPath(u.pathname))return;event.preventDefault();history.pushState(null,"",u.pathname+u.search+u.hash);setPath(clean(u.pathname));window.dispatchEvent(new Event("patro:navigation"));scrollTo({top:0,behavior:"smooth"})};addEventListener("popstate",onPop);document.addEventListener("click",onClick);return()=>{removeEventListener("popstate",onPop);document.removeEventListener("click",onClick)}},[]);
 const render=()=>{
   if(path==="/guides"||path.startsWith("/guides/"))return <GuidePage path={path}/>;
   const legacy=LEGACY_REDIRECTS[path];if(legacy)return <Redirect to={legacy}/>;
   if(path==="/"||path==="/today")return <ReferenceHomePage/>;
   if(path==="/methodology")return <MethodologyPage/>;
   if(path==="/corrections")return <CorrectionsPage/>;
   if(path==="/samudaya")return <CommunityHub/>;
   if(path==="/samudaya/chakra")return <CommunityChakraPage/>;
   if(path==="/nepal-sambat/mandala")return <NepalSambatPage/>;
   const community=path.match(COMMUNITY_SUITE_ROUTE);if(community)return <CommunitySuitePage suiteId={community[1] as SuiteId}/>;
   if(path==="/settings/community")return <CommunityPreferences/>;
   const cal=path.match(/^\/calendar\/(\d{4})\/(\d{1,2})$/);if(cal)return <ReferenceHomePage calendarYear={Number(cal[1])} calendarMonth={Number(cal[2])}/>;
   const date=path.startsWith(DATE_ROUTE_PREFIX)?path.match(/^\/date\/(\d{4}-\d{2}-\d{2})$/):null;if(date)return <DateDetailPage date={date[1]}/>;
   if(path==="/tools")return <ToolsPage/>;
   if(path==="/janmadin")return <BirthdayPage/>;
   if(path==="/tools/janmadin-akhbar"&&new URLSearchParams(location.search).get("birthday")==="1")return <><PatroToolsShell slug="janmadin-akhbar"/><BirthdayPage/></>;
   if(path==="/tools/my-place")return <PlacePage/>;
   if(path==="/tools/astro")return <AstroPage/>;
   if(path==="/me")return <MePage/>;
   if(path==="/me/diary"||path==="/me/notes"||path==="/me/planner")return <MyDiary/>;
   if(path==="/me/family")return <FamilyPage/>;
   if(path==="/me/reminders")return <NotificationSettingsPage/>;
   if(path==="/me/settings")return <HolidaySettingsPage/>;
   if(path==="/me/data")return <MyDataPage/>;
   if(path==="/me/cards")return <PatroToolsShell slug="janmadin-akhbar"/>;
   if(path==="/convert")return <ConvertPage/>;
   if(path==="/rashifal")return <RashifalExperience/>;
   if(path==="/samachar")return <SamacharPage/>;
   if(path==="/time-machine")return <TimeMachinePage/>;
   if(path==="/on-this-day")return <OnThisDayPage/>;
   const historyDay=path.match(HISTORY_DAY_ROUTE);if(historyDay)return <OnThisDayPage monthDay={historyDay[1]}/>;
   if(path==="/fm")return <MediaSuite kind="radio"/>;
   if(path==="/tv")return <MediaSuite kind="tv"/>;
   if(path==="/janmapatro"||path==="/janmapatro/milan.html"||path==="/jyotish/china"||path==="/jyotish/matchmaking")return <JanmaPatroSuite/>;
   if(path==="/tools/nepali-typing"||path==="/tools/type")return <NepaliTools mode="typing"/>;
   if(path==="/tools/preeti"||path==="/tools/preeti-converter"||path==="/tools/preeti-to-unicode"||path==="/tools/preetitounicode")return <NepaliTools mode="preeti-to-unicode"/>;
   if(path==="/tools/unicode-to-preeti"||path==="/tools/unicodetopreeti")return <NepaliTools mode="unicode-to-preeti"/>;
   if(path==="/tools/api")return <DevelopersPage/>;
   const tool=path.match(/^\/tools\/([^/]+)$/);if(tool&&PATRO_TOOL_SLUGS.has(tool[1]))return <PatroToolsShell slug={tool[1]}/>;
   if(path.startsWith("/tools/"))return <UtilitySuite key={path}/>;
   if(path==="/privacy")return <TrustPage page="privacy"/>;if(path==="/terms")return <TrustPage page="terms"/>;if(path==="/about")return <TrustPage page="about"/>;if(path==="/sources")return <TrustPage page="sources"/>;if(path==="/contact")return <TrustPage page="contact"/>;
   if(path==="/developers")return <DevelopersPage/>;
   if(path==="/offline")return <OfflinePage/>;
   return <NotFoundPage/>;
 };
 return <><Suspense fallback={<Fallback/>}>{render()}</Suspense><PlaceTimingMount path={path}/><Suspense fallback={null}><SeoSearchSupport path={path}/><DiscoveryPanel path={path}/></Suspense></>
}
