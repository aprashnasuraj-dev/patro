import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const unique=(values)=>[...new Set(values)];

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

test("critical product surfaces remain discoverable in the new UI and routed",()=>{
  const pages=read("src/AafnaiPages.tsx");
  const chrome=read("src/components/AppChrome.tsx");
  const router=read("src/PatroRouter.tsx");
  for(const route of ["/time-machine","/on-this-day","/tools/astro"]){
    assert.ok(pages.includes(route),`Tools UI lost ${route}`);
    assert.ok(router.includes(route),`router lost ${route}`);
  }
  for(const route of ["/samachar","/fm","/tv","/samudaya"]){
    assert.ok(chrome.includes(`href="${route}"`),`global UI lost ${route}`);
  }
  for(const route of ["/samachar","/fm","/tv"]){
    assert.ok(router.includes(`"${route}"`),`router lost ${route}`);
  }
});

test("every registered Patro tool slug resolves to a real component, never the fallback",()=>{
  const shell=read("src/patro-tools-integration/PatroToolsShell.tsx");
  const slugs=setStringEntries(read("src/patro-tools-integration/toolSlugs.ts"));
  assert.ok(slugs.length>=11,"Patro tool registry unexpectedly shrank");
  for(const slug of slugs){
    assert.ok(shell.includes(`slug==="${slug}"`),`registered tool can hit placeholder fallback: ${slug}`);
  }
});

test("calendar, Time Machine, Samachar and media UI point to backed API contracts",()=>{
  const pages=read("src/AafnaiPages.tsx");
  const details=read("src/AafnaiDetailPages.tsx");
  const media=read("src/media/MediaSuite.tsx");
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
  assert.match(wrangler,/"main"\s*:\s*"worker\/connected-entry\.ts"/);
  assert.match(wrangler,/"pattern"\s*:\s*"aafnaipatro\.com"/);
  assert.match(wrangler,/"custom_domain"\s*:\s*true/);
  assert.match(wrangler,/"preview_urls"\s*:\s*false/);
});
