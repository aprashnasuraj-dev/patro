import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const production="https://aafnaipatro.com";
const retired="patro-blush.vercel.app";
const canonicalTools=[
 "/tools/astro","/tools/nepali-typing","/tools/preeti-converter","/tools/bstoad","/tools/adtobs","/tools/calc","/tools/age","/tools/clock","/tools/forex","/tools/gold","/tools/emi","/tools/vat","/tools/units","/tools/words","/tools/incometax","/tools/landconverter","/tools/nepaliqr","/tools/fuelprice","/tools/tithi-reminder","/tools/sait","/tools/baby-names","/tools/janmadin-akhbar","/tools/future-letter","/tools/spell-check","/tools/voice-typing","/tools/ocr","/tools/name-check","/tools/read-aloud","/tools/patro-bot"
];

test("SEO discovery uses production canonical and the full validated R2-backed calendar archive",()=>{
 const manifest=JSON.parse(read("public/seo-manifest.json"));
 assert.equal(manifest.schema_version,4);assert.equal(manifest.site_url,production);assert.equal(manifest.canonical_tool_route_count,29);
 assert.ok(manifest.indexed_calendar_years.length>200);assert.equal(manifest.indexed_calendar_year_route_count,manifest.indexed_calendar_years.length);assert.equal(manifest.indexed_day_route_count,77070);assert.ok(manifest.indexed_route_count>=1800);
 assert.equal(manifest.calendar_archive_ad_start,"1826-04-11");assert.equal(manifest.calendar_archive_ad_end,"2037-04-13");assert.match(manifest.calendar_archive_source_version,/^sha256:[a-f0-9]{64}$/);
 assert.match(manifest.preferred_citation,/^Cite as: Aafnai Patro \(aafnaipatro\.com\), accessed \d{4}-\d{2}-\d{2}$/);
 const index=read("public/sitemap.xml");assert.ok(index.includes("<sitemapindex"));
 for(const year of manifest.indexed_calendar_years){
   const cal=`sitemap-calendar-${year}.xml`,days=`sitemap-days-${year}.xml`;assert.ok(manifest.sitemap_files.includes(cal));assert.ok(manifest.sitemap_files.includes(days));
   const calText=read(`public/${cal}`);assert.ok(calText.includes(`<loc>${production}/calendar/${year}</loc>`),`year hub ${year}`);
   const daysText=read(`public/${days}`);assert.ok(daysText.includes(`${production}/date/`));
 }
 for(const name of manifest.sitemap_files){assert.ok(index.includes(`${production}/${name}`));const path=`public/${name}`;assert.ok(existsSync(new URL("../"+path,import.meta.url)));const text=read(path);assert.ok(text.includes(production));assert.ok(!text.includes(retired));}
 const pages=read("public/sitemap-pages.xml");
 for(const route of ["/","/today","/methodology","/corrections","/convert","/rashifal","/time-machine","/on-this-day","/fm","/tv","/today/tokyo","/today/sydney"]){const url=route==="/"?`${production}/`:`${production}${route}`;assert.ok(pages.includes(`<loc>${url}</loc>`),route);}
});

test("canonical tools stay complete while private/news/developer surfaces stay out of discovery",()=>{
 const tools=read("public/sitemap-tools.xml");assert.equal(canonicalTools.length,29);for(const route of canonicalTools)assert.ok(tools.includes(`<loc>${production}${route}</loc>`),route);
 const pages=read("public/sitemap-pages.xml");for(const route of ["/samachar","/developers","/tools/api"])assert.ok(!pages.includes(`<loc>${production}${route}</loc>`),route);
});

test("robots covers 2026 search and AI crawlers with private boundaries",()=>{
 const robots=read("public/robots.txt");
 for(const agent of ["OAI-SearchBot","ChatGPT-User","GPTBot","Googlebot","Google-Extended","Bingbot","Claude-SearchBot","Claude-User","ClaudeBot","PerplexityBot","Perplexity-User","Applebot","Applebot-Extended","Amazonbot","DuckDuckBot","YandexBot","NaverBot"]){const marker=`User-agent: ${agent}`;assert.ok(robots.includes(marker),agent);const start=robots.indexOf(marker),stop=robots.indexOf("\n\n",start),block=robots.slice(start,stop<0?undefined:stop);for(const path of ["/api/","/compat-api/","/me/","/admin/","/auth/"])assert.ok(block.includes(`Disallow: ${path}`),`${agent} ${path}`);}
 assert.ok(robots.includes("Cloudflare bot-management settings"));assert.ok(robots.includes(`Sitemap: ${production}/sitemap.xml`));
});

test("agent discovery files, citation, MCP and narrow read-only OpenAPI are generated",()=>{
 for(const file of ["public/llms.txt","public/llms-full.txt","public/ai.txt","public/.well-known/ai-plugin.json","public/.well-known/agents.json","public/.well-known/agent-openapi.json","public/.well-known/security.txt"])assert.ok(existsSync(new URL("../"+file,import.meta.url)),file);
 const llms=read("public/llms.txt");assert.ok(llms.includes(`${production}/mcp`));assert.ok(llms.includes(`${production}/methodology`));assert.ok(llms.includes(`${production}/corrections`));assert.match(llms,/Cite as: Aafnai Patro \(aafnaipatro\.com\), accessed \d{4}-\d{2}-\d{2}/);assert.ok(!llms.includes("MeroPatro"));
 const full=read("public/llms-full.txt");assert.ok(full.split("\n").length>=1700);assert.ok(full.includes("/calendar/"));assert.match(full,/Cite as: Aafnai Patro \(aafnaipatro\.com\), accessed \d{4}-\d{2}-\d{2}/);
 const ai=read("public/ai.txt");assert.ok(ai.includes("/.well-known/agents.json"));
 const agents=JSON.parse(read("public/.well-known/agents.json"));assert.equal(agents.mcp.url,`${production}/mcp`);assert.deepEqual(agents.mcp.tools,["get_today","convert_date","get_festival"]);
 const plugin=JSON.parse(read("public/.well-known/ai-plugin.json"));assert.equal(plugin.api.url,`${production}/.well-known/agent-openapi.json`);
 const openapi=JSON.parse(read("public/.well-known/agent-openapi.json"));for(const path of ["/api/agent/v1/today","/api/agent/v1/convert","/api/agent/v1/festival","/api/agent/v1/sait"])assert.ok(openapi.paths[path],path);
 const security=read("public/.well-known/security.txt");assert.ok(security.includes(`Contact: ${production}/contact`));assert.ok(security.includes(`Canonical: ${production}/.well-known/security.txt`));
});

test("single-source adapter drives build SEO, D1 agent APIs, data exports and MCP while archive pages are R2-backed",()=>{
 const adapter=read("lib/patro.ts"),nodeProvider=read("lib/patro.mjs"),snapshot=read("scripts/calendar-snapshot.mjs"),source=read("worker/patro-source.ts"),gateway=read("worker/agent-gateway.ts"),mcp=read("worker/mcp.ts"),pages=read("worker/agent-pages.ts"),year=read("worker/year-page.ts"),archive=read("worker/public-archive-pages.ts"),data=read("worker/data-export.ts");
 for(const name of ["getDay","getDayByAd","getMonth","getYear","getFestivals","getFestival","getSait","getHolidays","convertBsToAd","convertAdToBs","getTodayNepal","getTithiAt"])assert.ok(adapter.includes(name),name);
 assert.ok(adapter.includes("PATRO_CITIES"));assert.ok(nodeProvider.includes("migration/data/public/astronomy_calendar_map"));assert.ok(snapshot.includes('../lib/patro.mjs'));assert.ok(source.includes("astronomy_calendar_map"));assert.ok(gateway.includes("createPatroAdapter(createD1PatroSource(env))"));
 assert.ok(archive.includes("datasets/calendar/v1"));assert.ok(archive.includes("datasets/community/v1"));assert.ok(!archive.includes("env.DB"));assert.ok(gateway.indexOf("publicArchivePageResponse")<gateway.indexOf("agentPageResponse"));
 assert.ok(mcp.includes('const MODERN = "2026-07-28"'));assert.ok(mcp.includes('const LEGACY = "2025-11-25"'));for(const tool of ["get_today","convert_date","get_festival"])assert.ok(mcp.includes(tool),tool);
 for(const direct of ['path === "/today"','path === "/methodology"','path === "/corrections"','path === "/widget/today"'])assert.ok(pages.includes(direct),direct);
 for(const matcher of ["const festival = path.match(","const countdown = path.match(","const panchang = path.match(","const tika = path.match(","const busiest = path.match(","const ics = path.match(","const pdf = path.match(","const widget = path.match("])assert.ok(pages.includes(matcher),matcher);
 for(const handler of ["festivalPage(request","countdownPage(request","panchangPage(request","tikaTimePage(request","busiestMonthsPage(request","festivalIcs(request","calendarPdf(request","calendarWidget(request"])assert.ok(pages.includes(handler),handler);
 assert.ok(year.includes('/calendar\\/(\\d{4})'));assert.ok(data.includes('/data\\/calendar\\/(\\d{4})\\.(csv|json)'));assert.ok(data.includes('"content-type":"application/json; charset=utf-8"'));assert.ok(data.includes('"content-type":"text/csv; charset=utf-8"'));assert.ok(gateway.includes("dataExportResponse"));assert.ok(gateway.includes("yearPageResponse"));
});

test("build and deploy pipeline lock factual prerender, Phase 0 and explicit IndexNow tooling",()=>{
 const prerender=read("scripts/prerender-seo.mjs"),days=read("scripts/prerender-days-seo.mjs"),config=read("scripts/seo-config.mjs"),pkg=JSON.parse(read("package.json")),entry=read("worker/connected-entry.ts"),indexnow=read("scripts/indexnow.mjs");
 assert.ok(prerender.includes('data-seo-prerender="true"'));assert.ok(prerender.includes('"@type": "WebPage"'));assert.ok(prerender.includes('"@type": "BreadcrumbList"'));assert.ok(prerender.includes('"@type": "WebApplication"'));assert.ok(prerender.includes("max-image-preview:large"));assert.ok(config.includes("Ashwin Ashoj Asoj"));assert.ok(config.includes("calendarYearRoute"));
 assert.ok(days.includes("loadCalendarSnapshot"));assert.ok(days.includes("loadHolidayMap"));assert.ok(days.includes("यो मितिको सीधा उत्तर"));assert.ok(days.includes("calendarYearRoute"));assert.ok(days.includes('href="/today"'));assert.ok(days.includes('/festivals/${esc(h.slug)}/'));
 assert.ok(pkg.scripts.build.includes("npm run seo:phase0"));assert.equal(pkg.scripts["seo:accuracy-reference"],"node scripts/verify-calendar-reference.mjs");assert.equal(pkg.scripts["seo:verify-live"],"node scripts/verify-agent-bots.mjs");assert.equal(pkg.scripts["seo:indexnow"],"node scripts/indexnow.mjs");assert.equal(pkg.scripts["deploy:cloudflare"],"npm run cloudflare:config && wrangler deploy --config wrangler.generated.jsonc");
 assert.ok(entry.includes("exactSpaAssetResponse"));assert.ok(entry.includes('import { handleAgentSurface } from "./agent-gateway"'));assert.ok(indexnow.includes("https://api.indexnow.org/indexnow"));
});
