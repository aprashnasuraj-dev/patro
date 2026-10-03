import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const unique=(values)=>[...new Set(values)];
const CANONICAL_TOOL_ROUTES=[
  "/tools/astro","/tools/nepali-typing","/tools/preeti-converter","/tools/bstoad","/tools/adtobs","/tools/calc","/tools/age","/tools/clock","/tools/forex","/tools/gold","/tools/emi","/tools/vat","/tools/incometax","/tools/landconverter","/tools/units","/tools/fuelprice","/tools/nepaliqr","/tools/words","/tools/tithi-reminder","/tools/sait","/tools/baby-names","/tools/janmadin-akhbar","/tools/future-letter","/tools/spell-check","/tools/voice-typing","/tools/ocr","/tools/name-check","/tools/read-aloud","/tools/patro-bot"
];

function toolDirectoryHrefs(source){
  const start=source.indexOf("const toolGroups");
  const end=source.indexOf("export function ToolsPage");
  assert.ok(start>=0&&end>start,"Aafnai tool directory must exist");
  return unique([...source.slice(start,end).matchAll(/href:\s*"([^"]+)"/g)].map((m)=>m[1])).filter((href)=>href!=="/tools/api");
}
function setStringEntries(source){return unique([...source.matchAll(/"([a-z0-9-]+)"/g)].map((m)=>m[1]));}

test("new Aafnai UI preserves all 29 canonical public tools without advertising developer API",()=>{
  const pages=read("src/AafnaiPages.tsx");
  const router=read("src/PatroRouter.tsx");
  const utilities=read("src/utilities/UtilitySuite.tsx");
  const slugs=setStringEntries(read("src/patro-tools-integration/toolSlugs.ts"));
  const hrefs=toolDirectoryHrefs(pages);
  const surface=read("src/fresh-build-surface.css");

  assert.ok(hrefs.length>=28,`expected at least 28 grouped tools plus Astronomy, found ${hrefs.length}`);
  assert.equal(hrefs.some((href)=>!href||href==="#"),false,"tool directory must not contain placeholder hrefs");
  assert.ok(pages.includes('href="/tools/astro"'),"Astronomy flagship tool must remain visible");
  assert.ok(surface.includes('.ap-tool-card[href="/tools/api"]'),"legacy API card must be suppressed from the user-facing tool grid");

  const specialized=new Set(["astro","nepali-typing","preeti-converter"]);
  for(const href of hrefs){
    if(!href.startsWith("/tools/")){
      assert.ok(router.includes(`"${href}"`)||router.includes(`path==="${href}"`),`new UI route is not wired: ${href}`);
      continue;
    }
    const slug=href.slice("/tools/".length);
    const wired=specialized.has(slug)||slugs.includes(slug)||utilities.includes(`id: "${slug}"`);
    assert.ok(wired,`tool card has no implementation route: ${href}`);
  }
});

test("29 canonical public tools stay SEO-discoverable while equivalent converter jobs stay consolidated in launcher",()=>{
  const launcher=read("src/components/FeatureLauncher.tsx");
  const seo=read("scripts/seo-config.mjs");
  assert.equal(CANONICAL_TOOL_ROUTES.length,29);
  const consolidated=new Set(["/tools/bstoad","/tools/adtobs"]);
  for(const route of CANONICAL_TOOL_ROUTES){
    assert.ok(seo.includes(`"${route}"`),`tool sitemap config lost ${route}`);
    if(consolidated.has(route)) continue;
    assert.ok(launcher.includes(`href:\"${route}\"`)||launcher.includes(`href:"${route}"`),`feature launcher lost ${route}`);
  }
  assert.ok(launcher.includes('href:"/convert"'),"combined BS ↔ AD converter must be visible in launcher");
  assert.ok(launcher.includes("bs to ad")&&launcher.includes("ad to bs"),"combined converter must answer both directional launcher searches");
  assert.ok(seo.includes('"/tools/bstoad"')&&seo.includes('"/tools/adtobs"'),"legacy directional URLs must remain indexable/backward-compatible");
  assert.equal(launcher.includes('href:"/developers"'),false,"developer API must not be advertised in launcher");
});

test("critical product surfaces and all Community Suite calendars are visible from the authoritative shell",()=>{
  const pages=read("src/AafnaiPages.tsx");
  const chrome=read("src/components/AppChrome.tsx");
  const launcher=read("src/components/FeatureLauncher.tsx");
  const router=read("src/PatroRouter.tsx");
  for(const route of ["/time-machine","/on-this-day","/tools/astro"]){
    assert.ok(pages.includes(route),`Tools UI lost ${route}`);
    assert.ok(router.includes(route),`router lost ${route}`);
  }
  for(const route of ["/time-machine","/on-this-day","/samachar","/fm","/tv","/samudaya","/nepal-sambat/mandala","/samudaya/lhosar","/samudaya/tharu","/samudaya/mithila","/samudaya/kirat","/samudaya/hijri","/samudaya/chakra"]){
    assert.ok(chrome.includes(route),`authoritative app shell lost ${route}`);
    assert.ok(launcher.includes(`href:\"${route}\"`)||launcher.includes(`href:"${route}"`),`launcher lost ${route}`);
  }
  for(const route of ["/samachar","/fm","/tv"])assert.ok(router.includes(`"${route}"`),`router lost ${route}`);
  assert.ok(chrome.includes("FEATURED_EXPERIENCES"),"Tools hub lost premium featured-experience rail");
  assert.equal((chrome.match(/className="ap-tabbar"/g)||[]).length,1,"authoritative shell must expose exactly one mobile navigation bar");
});

test("every registered Patro tool slug resolves to a real component and no coming-soon placeholder remains",()=>{
  const shell=read("src/patro-tools-integration/PatroToolsShell.tsx");
  const slugs=setStringEntries(read("src/patro-tools-integration/toolSlugs.ts"));
  assert.ok(slugs.length>=11,"Patro tool registry unexpectedly shrank");
  for(const slug of slugs)assert.ok(shell.includes(`slug==="${slug}"`),`registered tool can hit unavailable fallback: ${slug}`);
  assert.equal(/integration phase|coming soon|coming-soon/i.test(shell),false,"registered tool shell must not ship placeholder language");
});

test("premium experience layers load after base UI and keep reduced-motion support",()=>{
  const main=read("src/main.tsx");
  const premium=read("src/premium-experience.css");
  const primitives=read("src/premium-tool-primitives.css");
  const launcherCss=read("src/feature-launcher.css");
  const exploreCss=read("src/explore-rail.css");
  const safeCss=read("src/mobile-safe-area.css");
  const baseIndex=main.indexOf('"./aafnai-enhancements.css"');
  const premiumIndex=main.indexOf('"./premium-experience.css"');
  const primitiveIndex=main.indexOf('"./premium-tool-primitives.css"');
  const launcherIndex=main.indexOf('"./feature-launcher.css"');
  const exploreIndex=main.indexOf('"./explore-rail.css"');
  const safeIndex=main.indexOf('"./mobile-safe-area.css"');
  assert.ok(baseIndex>=0&&premiumIndex>baseIndex&&primitiveIndex>premiumIndex&&launcherIndex>primitiveIndex&&exploreIndex>launcherIndex&&safeIndex>exploreIndex,"premium layers must load in deterministic override order");
  for(const surface of [".ap-tool-card",".utility-directory-card",".patro-tool-hero",".station-card",".community-control-card"])assert.ok(premium.includes(surface),`premium layer lost ${surface}`);
  for(const css of [premium,primitives,launcherCss,exploreCss,safeCss])assert.ok(css.includes("prefers-reduced-motion"),"premium motion must remain accessible");
  assert.ok(primitives.includes(".tool-breadcrumbs"));
  assert.ok(primitives.includes(".tool-trust-row"));
  assert.ok(safeCss.includes(".global-media-player")&&safeCss.includes(".ap-feature-launcher-button"),"mobile player/launcher safe-area stack regressed");
});

test("route-aware metadata covers public discovery and protects private pages",()=>{
  const chrome=read("src/components/AppChrome.tsx");
  for(const token of ["TOOL_SEO","link[rel=\"canonical\"]","og:title","twitter:title","max-image-preview:large","noindex,nofollow"])assert.ok(chrome.includes(token),`route SEO lost ${token}`);
  for(const route of ["/time-machine","/on-this-day","/samachar","/fm","/tv","/samudaya"])assert.ok(chrome.includes(route),`route metadata lost ${route}`);
  assert.ok(chrome.includes("ALIAS_CANONICAL"),"duplicate utility aliases must retain canonical consolidation");
});

test("calendar, Time Machine, Samachar and media UI point to backed API contracts",()=>{
  const pages=read("src/AafnaiPages.tsx");
  const details=read("src/AafnaiDetailPages.tsx");
  const media=read("src/media/MediaSuite.tsx");
  const provider=read("src/media/MediaProvider.tsx");
  const player=read("src/media/GlobalMediaPlayer.tsx");
  const worker=read("worker/index.ts");
  const publicApi=read("worker/public-api.ts");
  const bridge=read("worker/connected-entry.ts");
  const weather=read("src/components/CalendarCellEnhancer.tsx");

  for(const endpoint of ["/api/v1/calendar/","/api/v1/convert?bs=","/api/v1/sync?","/api/v1/festivals?year=","/api/v1/holidays?"])assert.ok(pages.includes(endpoint)||publicApi.includes(endpoint)||worker.includes(endpoint),endpoint);
  for(const endpoint of ["/api/v1/time-machine","/api/v1/on-this-day"]){assert.ok(details.includes(endpoint),`frontend lost ${endpoint}`);assert.ok(worker.includes(endpoint)||publicApi.includes(endpoint),`Worker lost ${endpoint}`);}
  assert.ok(weather.includes('/api/v1/weather/daily?days=16'),"calendar weather enhancer lost native forecast endpoint");
  assert.ok(worker.includes('/api/v1/weather/daily'),"Worker lost weather endpoint");
  assert.ok(pages.includes('"/api/v1/news?limit=30"'));
  assert.ok(bridge.includes('pathname === "/api/v1/news"'));
  assert.ok(media.includes('"/api/v1/radio/catalog?"'));
  assert.ok(worker.includes("radioCatalogResponse"));
  for(const endpoint of ["tv/catalog","tv/relay","tv/health"])assert.ok(media.includes(endpoint),`TV UI lost ${endpoint}`);
  for(const root of ['"tv"','"fm"','"samachar"'])assert.ok(bridge.includes(root),`compat bridge lost ${root}`);
  assert.ok(provider.includes("stop: () => void")&&provider.includes("hlsRef.current?.destroy()"),"persistent media must support clean stop and HLS teardown");
  assert.ok(player.includes("Stop & close")&&player.includes("Retry now"),"persistent player recovery controls regressed");
});

test("service worker prewarms critical new UI surfaces and offline language bundle",()=>{
  const sw=read("public/sw.js");
  for(const route of ["/tools","/time-machine","/on-this-day","/samachar","/fm","/tv","/tools/astro","/tools/nepali-typing","/tools/preeti-converter","/samudaya","/nepal-sambat/mandala","/samudaya/lhosar","/samudaya/tharu","/samudaya/mithila","/samudaya/kirat","/samudaya/hijri","/samudaya/chakra"]){
    assert.ok(sw.includes(`\"${route}\"`)||sw.includes(`"${route}"`),`offline shell lost ${route}`);
  }
  assert.ok(sw.includes('key.startsWith("aafnai-pwa-")'),"old Aafnai cache generations must be purged");
  assert.ok(sw.includes("networkFirstShell(event.request"),"navigation must stay network-first while falling back to the cached shell offline");
  assert.ok(sw.includes("WARM_LANGUAGE_TOOLS")&&sw.includes("/nepali-tools/worker.mjs"),"local language bundle must be explicitly warmable");
});

test("production entry serves exact prerenders then canonical root SPA fallback",()=>{
  const bridge=read("worker/connected-entry.ts");
  for(const route of ["/tools","/tools/astro","/time-machine","/on-this-day","/fm","/tv","/samachar","/me","/convert","/rashifal"])assert.ok(bridge.includes(`"${route}"`),`root SPA bridge lost ${route}`);
  assert.ok(bridge.includes("exactSpaAssetResponse"),"exact prerender lookup missing");
  assert.ok(bridge.includes("rootSpaResponse"),"root SPA fallback missing");
  assert.ok(bridge.includes('"/index.html"'),"root SPA index asset missing");
  assert.ok(bridge.includes('headers.set("x-patro-shell", "root-spa")'));
  assert.equal(bridge.includes('"/astro/index.html"'),false,"production bridge must not depend on stale /astro/index.html");
});

test("Community Suite remains complete and emitted as six calendars plus Chakra overview",()=>{
  const emitter=read("scripts/emit-community-suites.mjs");
  const preferences=read("src/community/preferences.ts");
  const required=["/nepal-sambat/mandala","/samudaya/lhosar","/samudaya/tharu","/samudaya/mithila","/samudaya/kirat","/samudaya/hijri","/samudaya/chakra"];
  for(const route of required)assert.ok(emitter.includes(route),route);
  assert.ok(emitter.includes("expected 7/7 routes"));
  assert.equal((preferences.match(/href:\s*"\//g)||[]).length,6,"community preference/menu inventory must remain exactly six calendars");
});

test("production runtime stays on the single canonical Worker config",()=>{
  const wrangler=JSON.parse(read("wrangler.jsonc"));
  assert.equal(wrangler.name,"patro");
  assert.equal(wrangler.main,"worker/connected-entry.ts");
  assert.equal(wrangler.preview_urls,false);
  assert.equal(wrangler.assets?.directory,"./dist");
  assert.equal(wrangler.assets?.binding,"ASSETS");
  assert.equal(wrangler.assets?.not_found_handling,"none");
  assert.deepEqual(wrangler.assets?.run_worker_first,["/*","!/assets/*"]);
  assert.ok((wrangler.d1_databases||[]).some((db)=>db?.binding==="DB"),"DB binding missing");
  assert.ok((wrangler.routes||[]).some((route)=>route?.pattern==="aafnaipatro.com"&&route?.custom_domain===true),"canonical custom domain missing");
});