import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
function hasAll(source,values,label){for(const value of values)assert.ok(source.includes(value),`${label} lost ${value}`)}

test("calendar home, month, date, weather and conversion surfaces remain backed by native APIs",()=>{
 const pages=read("src/AafnaiPages.tsx"),details=read("src/AafnaiDetailPages.tsx"),api=read("worker/public-api.ts"),index=read("worker/index.ts"),enhancer=read("src/components/CalendarCellEnhancer.tsx");
 hasAll(pages,["/api/v1/calendar/","/api/v1/convert?bs=","/api/v1/sync?","/api/v1/festivals?year=","/api/v1/holidays?year="],"calendar UI");
 hasAll(api,["/api/v1/today","/api/v1/convert","/api/v1/festivals","/api/v1/holidays","/api/v1/panchang"],"calendar API");
 assert.ok(index.includes('/api/v1/sync'));
 assert.ok(index.includes('/api/v1/weather/daily'));
 assert.ok(enhancer.includes('/api/v1/weather/daily?days=16'));
 assert.ok(enhancer.includes('englishLabel'));
 assert.ok(details.includes('/api/v1/sync?date=')||details.includes('/api/v1/today?date='));
});

test("calendar year hubs remain Worker-owned while calendar months stay SPA navigable",()=>{
 const router=read("src/PatroRouter.tsx"),year=read("worker/year-page.ts"),gateway=read("worker/agent-gateway.ts"),bridge=read("worker/connected-entry.ts");
 assert.ok(router.includes("CALENDAR_MONTH_ROUTE"),"SPA router must scope interception to calendar month routes");
 assert.equal(router.includes('p.startsWith("/calendar/")'),false,"SPA must not hijack Worker-owned calendar year pages");
 assert.ok(year.includes("const match=path.match(")&&year.includes("const year=Number(match[1])"),"Worker year-page handler must parse a calendar year route");
 assert.ok(gateway.includes('import { yearPageResponse } from "./year-page"')&&gateway.includes("await yearPageResponse(request, env)"),"agent gateway must dispatch Worker year pages");
 assert.ok(bridge.includes("handleAgentSurface")&&bridge.includes("await handleAgentSurface"),"connected Worker must execute agent/year surfaces before SPA fallback");
});

test("Time Machine and On This Day stay visible, native and data-backed",()=>{
 const details=read("src/AafnaiDetailPages.tsx"),index=read("worker/index.ts"),manifest=read("cloudflare/migration-manifest.json"),chrome=read("src/components/AppChrome.tsx");
 hasAll(details,["/api/v1/time-machine","/api/v1/on-this-day"],"history UI");
 hasAll(index,["/api/v1/time-machine","/api/v1/on-this-day","time_machine_moments","on_this_day_events"],"history Worker");
 hasAll(manifest,['"time_machine_moments": 706','"on_this_day_events": 5454'],"history data inventory");
 hasAll(chrome,['href="/time-machine"','href="/on-this-day"'],"history navigation");
});

test("all six community calendars plus Chakra keep routes, generated pages and native community APIs",()=>{
 const router=read("src/PatroRouter.tsx"),emitter=read("scripts/emit-community-suites.mjs"),community=read("worker/community.ts"),chrome=read("src/components/AppChrome.tsx"),mobile=read("src/components/MobilePrimaryNav.tsx");
 const routes=["/nepal-sambat/mandala","/samudaya/lhosar","/samudaya/tharu","/samudaya/mithila","/samudaya/kirat","/samudaya/hijri","/samudaya/chakra"];
 for(const route of routes){assert.ok(emitter.includes(route),`community emitter lost ${route}`);assert.ok(chrome.includes(route)||mobile.includes(route),`community navigation lost ${route}`);}
 hasAll(community,["/api/v1/communities","/api/v1/nepal-sambat","/api/v1/hijri"],"community API");
 assert.ok(router.includes('path==="/samudaya"')||router.includes('path === "/samudaya"'));
});

test("FM preserves native D1 radio plus verified station fallback and stream relay",()=>{
 const media=read("src/media/MediaSuite.tsx"),fm=read("worker/fm.ts"),radio=read("worker/radio.ts"),index=read("worker/index.ts");
 hasAll(media,["/api/v1/radio/catalog?","/fm-v2-stream/","fm/v2/stations"],"FM UI");
 hasAll(fm,["fm_stations","stream_status","verified","/fm-v2-stream/"],"FM native relay");
 assert.ok(index.includes('/api/v1/radio/catalog'));
 assert.ok(radio.includes("radioCatalogResponse"));
});

test("TV preserves catalog, health probes and resilient relay compatibility",()=>{
 const media=read("src/media/MediaSuite.tsx"),bridge=read("worker/connected-entry.ts");
 hasAll(media,["tv/catalog","tv/relay","tv/health","Hls.Events.ERROR","recoverMediaError","Reconnect","Fullscreen","PiP"],"TV experience");
 assert.ok(bridge.includes('new Set(["tv", "fm", "samachar"])'));
 assert.ok(bridge.includes('response.status !== 404'));
});

test("Samachar keeps source-linked UI and the selective feed bridge",()=>{
 const pages=read("src/AafnaiPages.tsx"),bridge=read("worker/connected-entry.ts"),router=read("src/PatroRouter.tsx");
 assert.ok(pages.includes('/api/v1/news?limit=30'));
 assert.ok(pages.includes("source_url")||pages.includes("url"));
 assert.ok(bridge.includes('pathname === "/api/v1/news"'));
 assert.ok(bridge.includes('/compat-api/samachar/feed'));
 assert.ok(router.includes('"/samachar"'));
});

test("Rashifal and Jyotish retain native APIs and public routes",()=>{
 const router=read("src/PatroRouter.tsx"),index=read("worker/index.ts"),jyotish=read("worker/jyotish.ts"),api=read("worker/public-api.ts");
 hasAll(router,["/rashifal","/jyotish/china","/jyotish/matchmaking"],"Jyotish routes");
 hasAll(index,["/api/v1/rashifal/universal","/api/v1/jyotish-chat"],"Jyotish Worker");
 hasAll(api,["/api/v1/rashifal/metadata","/api/v1/rashifal/personalized"],"Rashifal APIs");
 assert.ok(jyotish.includes("handleJyotishChat"));
});

test("My Space keeps Google/session-owned native private features and private indexing",()=>{
 const router=read("src/PatroRouter.tsx"),auth=read("worker/auth.ts"),priv=read("worker/private.ts"),seo=read("worker/connected-seo.ts"),chrome=read("src/components/AppChrome.tsx");
 hasAll(router,["/me","/me/diary","/me/notes","/me/planner","/me/family","/me/reminders","/me/cards","/me/settings","/me/data"],"My Space routes");
 hasAll(auth,["/api/v1/auth/google","/api/v1/auth/me","/api/v1/auth/logout","/api/v1/me/state"],"auth APIs");
 hasAll(priv,["/api/family/state","/api/family/create","/api/ics/token"],"private APIs");
 assert.ok(seo.includes('index:false'));
 assert.ok(chrome.includes("isPrivatePath"));
});

test("PWA release warms flagship shells, complete Community Suite and local language tools",()=>{
 const sw=read("public/sw.js");
 assert.match(sw,/const VERSION = "aafnai-pwa-v\d+";/,"service worker cache version must be explicit and versioned");
 hasAll(sw,[
  '"/tools"','"/convert"','"/rashifal"','"/time-machine"','"/on-this-day"','"/tools/astro"','"/tools/nepali-typing"','"/tools/preeti-converter"','"/samudaya"','"/fm"','"/tv"','"/samachar"',
  '"/nepal-sambat/mandala"','"/samudaya/lhosar"','"/samudaya/tharu"','"/samudaya/mithila"','"/samudaya/kirat"','"/samudaya/hijri"','"/samudaya/chakra"','WARM_LANGUAGE_TOOLS','/nepali-tools/worker.mjs'
 ],"service worker");
 assert.ok(sw.includes("skipWaiting"));
 assert.ok(sw.includes("clients.claim"));
 assert.ok(sw.includes("aafnai-pwa-"));
});

test("edge SEO covers flagship public routes before React hydration",()=>{
 const seo=read("worker/connected-seo.ts");
 for(const route of ["/tools","/convert","/rashifal","/samachar","/fm","/tv","/time-machine","/on-this-day","/samudaya","/nepal-sambat/mandala"]){assert.ok(seo.includes(`"${route}"`),`edge SEO lost ${route}`);}
 assert.ok(seo.includes('application/ld+json'));
 assert.ok(seo.includes('hreflang="ne"'));
 assert.ok(seo.includes('hreflang="en"'));
 assert.ok(seo.includes('og:image'));
 assert.ok(seo.includes('twitter:image'));
});
