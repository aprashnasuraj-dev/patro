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
  return unique([...source.slice(start,end).matchAll(/href:\s*"([^"]+)"/g)].map((m)=>m[1]));
}

function setStringEntries(source){
  return unique([...source.matchAll(/"([a-z0-9-]+)"/g)].map((m)=>m[1]));
}

test("new Aafnai UI preserves at least the requested 29 functional tool entries",()=>{
  const pages=read("src/AafnaiPages.tsx");
  const router=read("src/PatroRouter.tsx");
  const utilities=read("src/utilities/UtilitySuite.tsx");
  const slugs=setStringEntries(read("src/patro-tools-integration/toolSlugs.ts"));
  const hrefs=toolDirectoryHrefs(pages);

  assert.ok(hrefs.length>=29,`expected at least 29 distinct tools, found ${hrefs.length}`);
  assert.equal(hrefs.some((href)=>!href||href==="#"),false,"tool directory must not contain placeholder hrefs");

  const specialized=new Set(["astro","nepali-typing","preeti-converter","api"]);
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

test("29 canonical public tools stay discoverable through launcher and SEO",()=>{
  const launcher=read("src/components/FeatureLauncher.tsx");
  const seo=read("scripts/generate-seo.mjs");
  assert.equal(CANONICAL_TOOL_ROUTES.length,29);
  for(const route of CANONICAL_TOOL_ROUTES){
    assert.ok(launcher.includes(`href:\"${route}\"`)||launcher.includes(`href:"${route}"`),`feature launcher lost ${route}`);
    assert.ok(seo.includes(`"${route}"`),`tool sitemap lost ${route}`);
  }
});

test("critical product surfaces and all Community Suite calendars are visible from new UI",()=>{
  const pages=read("src/AafnaiPages.tsx");
  const chrome=read("src/components/AppChrome.tsx");
  const launcher=read("src/components/FeatureLauncher.tsx");
  const router=read("src/PatroRouter.tsx");
  for(const route of ["/time-machine","/on-this-day","/tools/astro"]){
    assert.ok(pages.includes(route),`Tools UI lost ${route}`);
    assert.ok(router.includes(route),`router lost ${route}`);
  }
  for(const route of ["/time-machine","/on-this-day","/samachar","/fm","/tv","/samudaya","/nepal-sambat/mandala","/samudaya/lhosar","/samudaya/tharu","/samudaya/mithila","/samudaya/kirat","/samudaya/hijri","/samudaya/chakra"]){
    assert.ok(chrome.includes(`href=\"${route}\"`)||chrome.includes(`\"${route}\"`),`global UI lost ${route}`);
    assert.ok(launcher.includes(`href:\"${route}\"`)||launcher.includes(`href:"${route}"`),`launcher lost ${route}`);
  }
  for(const route of ["/samachar","/fm","/tv"]){
    assert.ok(router.includes(`"${route}"`),`router lost ${route}`);
  }
  assert.ok(chrome.includes("FEATURED_EXPERIENCES"),"Tools hub lost premium featured-experience rail");
});

test("every registered Patro tool slug resolves to a real component and no coming-soon placeholder remains",()=>{
  const shell=read("src/patro-tools-integration/PatroToolsShell.tsx");
  const slugs=setStringEntries(read("src/patro-tools-integration/toolSlugs.ts"));
  assert.ok(slugs.length>=11,"Patro tool registry unexpectedly shrank");
  for(const slug of slugs){
    assert.ok(shell.includes(`slug==="${slug}"`),`registered tool can hit unavailable fallback: ${slug}`);
  }
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
  for(const surface of [".ap-tool-card",".utility-directory-card",".patro-tool-hero",".station-card",".community-control-card"]){
    assert.ok(premium.includes(surface),`premium layer lost ${surface}`);
  }
  for(const css of [premium,primitives,launcherCss,exploreCss,safeCss])assert.ok(css.includes("prefers-reduced-motion"),"premium motion must remain accessible");
  assert.ok(primitives.includes(".tool-breadcrumbs"));
  assert.ok(primitives.includes(".tool-trust-row"));
  assert.ok(safeCss.includes(".global-media-player")&&safeCss.includes(".ap-feature-launcher-button"),"mobile player/launcher safe-area stack regressed");
});

test("route-aware metadata covers public discovery and protects private pages",()=>{
  const chrome=read("src/components/AppChrome.tsx");
  for(const token of ["TOOL_SEO","link[rel=\"canonical\"]","og:title","twitter:title","max-image-preview:large","noindex,nofollow"]){
    assert.ok(chrome.includes(token),`route SEO lost ${token}`);
  }
  for(const route of ["/time-machine","/on-this-day","/samachar","/fm","/tv","/samudaya"]){
    assert.ok(chrome.includes(route),`route metadata lost ${route}`);
  }
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

  for(const endpoint of ["/api/v1/calendar/","/api/v1/convert?bs=","/api/v1/sync?","/api/v1/festivals?year=","/api/v1/holidays?"]){
    assert.ok(pages.includes(endpoint)||publicApi.includes(endpoint)||worker.includes(endpoint),endpoint);
  }
  for(const endpoint of ["/api/v1/time-machine","/api/v1/on-this-day"]){
    assert.ok(details.includes(endpoint),`frontend lost ${endpoint}`);
    assert.ok(worker.includes(endpoint)||publicApi.includes(endpoint),`Worker lost ${endpoint}`);
  }
  assert.ok(pages.includes('"/api/v1/news?limit=30"'));
  assert.ok(bridge.includes('pathname === "/api/v1/news"'));
  assert.ok(media.includes('"/api/v1/radio/catalog?"'));
  assert.ok(worker.includes("radioCatalogResponse"));
  for(const endpoint of ["tv/catalog","tv/relay","tv/health"]){
    assert.ok(media.includes(endpoint),`TV UI lost ${endpoint}`);
  }
  for(const root of ['"tv"','"fm"','"samachar"'])assert.ok(bridge.includes(root),`compat bridge lost ${root}`);
  assert.ok(provider.includes("stop: () => void")&&provider.includes("hlsRef.current?.destroy()"),"persistent media must support clean stop and HLS teardown");
  assert.ok(player.includes("Stop & close")&&player.includes("Retry now"),"persistent player recovery controls regressed");
});

test("service worker prewarms critical new UI surfaces and purges old Aafnai cache generations",()=>{
  const sw=read("public/sw.js");
  for(const route of ["/tools","/time-machine","/on-this-day","/samachar","/fm","/tv","/tools/astro","/samudaya","/nepal-sambat/mandala","/samudaya/lhosar","/samudaya/tharu","/samudaya/mithila","/samudaya/kirat","/samudaya/hijri","/samudaya/chakra"]){
    assert.ok(sw.includes(`\"${route}\"`)||sw.includes(`"${route}"`),`offline shell lost ${route}`);
  }
  assert.ok(sw.includes('key.startsWith("aafnai-pwa-")'),"old Aafnai cache generations must be purged");
  assert.ok(sw.includes("networkFirst(event.request"),"navigation must stay network-first after migrations");
});

test("production entry serves React routes from canonical root SPA, not stale astro shell",()=>{
  const bridge=read("worker/connected-entry.ts");
  for(const route of ["/tools","/tools/astro","/time-machine","/on-this-day","/fm","/tv","/samachar","/me","/convert","/rashifal"]){
    assert.ok(bridge.includes(`"${route}"`),`root SPA bridge lost ${route}`);
  }
  assert.ok(bridge.includes('url.pathname = "/index.html"'));
  assert.ok(bridge.includes('headers.set("x-patro-shell", "root-spa")'));
  assert.equal(bridge.includes('"/astro/index.html"'),false,"production bridge must not depend on stale /astro/index.html");
});

test("Community Suite remains complete and emitted as seven static experiences",()=>{
  const emitter=read("scripts/emit-community-suites.mjs");
  const required=[
    "/nepal-sambat/mandala",
    "/samudaya/lhosar",
    "/samudaya/tharu",
    "/samudaya/mithila",
    "/samudaya/kirat",
    "/samudaya/hijri",
    "/samudaya/chakra"
  ];
  for(const route of required)assert.ok(emitter.includes(route),route);
  assert.ok(emitter.includes("expected 7/7 routes"));
});

test("migration runtime stays on connected Worker entry and canonical custom domain",()=>{
  const wrangler=read("wrangler.jsonc");
  const toml=read("wrangler.toml");
  assert.match(wrangler,/"main"\s*:\s*"worker\/connected-entry\.ts"/);
  assert.match(wrangler,/"pattern"\s*:\s*"aafnaipatro\.com"/);
  assert.match(wrangler,/"custom_domain"\s*:\s*true/);
  assert.match(wrangler,/"preview_urls"\s*:\s*false/);
  assert.match(toml,/main\s*=\s*"worker\/connected-entry\.ts"/);
  assert.match(toml,/pattern\s*=\s*"aafnaipatro\.com"/);
  assert.match(toml,/custom_domain\s*=\s*true/);
  assert.match(toml,/preview_urls\s*=\s*false/);
  assert.match(toml,/not_found_handling\s*=\s*"none"/);
  assert.match(toml,/run_worker_first\s*=\s*\["\/\*",\s*"!\/assets\/\*"\]/);
});
