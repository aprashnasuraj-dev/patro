import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const production="https://aafnaipatro.com";
const retired="patro-blush.vercel.app";
const canonicalTools=[
 "/tools/astro","/tools/nepali-typing","/tools/preeti-converter","/tools/bstoad","/tools/adtobs","/tools/calc","/tools/age","/tools/clock","/tools/forex","/tools/gold","/tools/emi","/tools/vat","/tools/units","/tools/words","/tools/incometax","/tools/landconverter","/tools/nepaliqr","/tools/fuelprice","/tools/tithi-reminder","/tools/sait","/tools/baby-names","/tools/janmadin-akhbar","/tools/future-letter","/tools/spell-check","/tools/voice-typing","/tools/ocr","/tools/name-check","/tools/read-aloud","/tools/patro-bot"
];

test("SEO discovery uses production canonical and submits a broad factual BS-year window",()=>{
 const manifest=JSON.parse(read("public/seo-manifest.json"));
 assert.equal(manifest.schema_version,4);assert.equal(manifest.site_url,production);assert.equal(manifest.canonical_tool_route_count,29);
 assert.ok(manifest.calendar_archive_bs_years.length>200);assert.equal(manifest.calendar_archive_row_count,77070);
 const {min,max,current}=manifest.sitemap_bs_year_window;assert.equal(min,current-35);assert.equal(max,current+10);
 assert.deepEqual(manifest.indexed_calendar_years,manifest.calendar_archive_bs_years.filter((y)=>y>=min&&y<=max));
 assert.ok(manifest.indexed_calendar_years.length>=40&&manifest.indexed_calendar_years.length<=46);
 assert.equal(manifest.indexed_calendar_year_route_count,manifest.indexed_calendar_years.length);
 assert.ok(manifest.indexed_day_route_count>15000&&manifest.indexed_day_route_count<18000);
 assert.ok(manifest.indexed_route_count>=1800);
 assert.match(manifest.archive_policy,/indexable BS \d{4}–\d{4} window/);
 for(const name of manifest.sitemap_files){const archive=name.match(/^sitemap-(?:calendar|days)-(\d+)\.xml$/);if(archive)assert.ok(Number(archive[1])>=min&&Number(archive[1])<=max,name);}
 assert.equal(manifest.calendar_archive_ad_start,"1826-04-11");assert.equal(manifest.calendar_archive_ad_end,"2037-04-13");assert.match(manifest.calendar_archive_source_version,/^sha256:[a-f0-9]{64}$/);
 assert.match(manifest.preferred_citation,/^Cite as: Aafnai Patro \(aafnaipatro\.com\), accessed \d{4}-\d{2}-\d{2}$/);
 const index=read("public/sitemap.xml");assert.ok(index.includes("<sitemapindex"));
 const entries=[...index.matchAll(/<sitemap><loc>([^<]+)<\/loc>(?:<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>)?<\/sitemap>/g)];
 assert.equal(entries.length,(index.match(/<sitemap>/g)||[]).length,"sitemap entries use canonical URLs and valid lastmod when known");
 assert.ok(index.includes("sitemap-conversions.xml"));
 assert.ok(entries.length>=90&&entries.length<=140,`index child count ${entries.length}`);
 for(const year of manifest.indexed_calendar_years){
   const cal=`sitemap-calendar-${year}.xml`,days=`sitemap-days-${year}.xml`;assert.ok(manifest.sitemap_files.includes(cal));assert.ok(manifest.sitemap_files.includes(days));
   const calText=read(`public/${cal}`);assert.ok(calText.includes(`<loc>${production}/calendar/${year}</loc>`),`year hub ${year}`);
   const daysText=read(`public/${days}`);assert.ok(daysText.includes(`${production}/date/`));
 }
 for(const name of manifest.sitemap_files){assert.ok(index.includes(`${production}/${name}`));const path=`public/${name}`;assert.ok(existsSync(new URL("../"+path,import.meta.url)));const text=read(path);assert.ok(text.includes(production));assert.ok(!text.includes(retired));}
 const pages=read("public/sitemap-pages.xml");
 for(const route of ["/","/today","/methodology","/corrections","/convert","/rashifal","/time-machine","/on-this-day","/fm","/tv","/today/tokyo","/today/sydney"]){const url=route==="/"?`${production}/`:`${production}${route}`;assert.ok(pages.includes(`<loc>${url}</loc>`),route);}
 assert.ok(manifest.sitemap_files.includes("sitemap-history-events.xml"));
 assert.ok(manifest.sitemap_files.includes("sitemap-time-machine.xml"));
 assert.ok(Number(manifest.indexed_history_event_route_count||0)>=3000);
 assert.equal(Number(manifest.indexed_time_machine_route_count||0),706);
 assert.ok(Number(manifest.dynamic_indexable_route_count||0)>=21000);
});

test("canonical tools stay complete while private/news/developer surfaces stay out of discovery",()=>{
 const tools=read("public/sitemap-tools.xml");assert.equal(canonicalTools.length,29);for(const route of canonicalTools)assert.ok(tools.includes(`<loc>${production}${route}</loc>`),route);
 const manifest=JSON.parse(read("public/seo-manifest.json"));
 const all=manifest.sitemap_files.map((name)=>read(`public/${name}`)).join("\n");
 for(const route of ["/samachar","/developers","/tools/api","/widget/today","/offline","/mcp"])assert.ok(!all.includes(`<loc>${production}${route}</loc>`),route);
 assert.ok(!/<loc>https:\/\/aafnaipatro\.com\/(?:api|compat-api|me|admin|auth)\//.test(all));
 const config=read("scripts/seo-config.mjs");
 assert.ok(config.includes('export const NOINDEX_EXACT_ROUTES = ["/samachar", "/developers", "/tools/api", "/widget/today", "/offline"]'));
 assert.ok(config.includes("export const INDEXABLE_PAST_YEARS = 35"));
 assert.ok(config.includes("export const INDEXABLE_FUTURE_YEARS = 10"));
});

test("sitemap window and Worker noindex cutoff share one BS-year formula; sitemaps are served as static XML",()=>{
 const config=read("scripts/seo-config.mjs"),win=read("worker/seo-window.ts"),index=read("worker/index.ts"),seo=read("worker/seo-static.ts"),optimized=read("worker/optimized-entry.ts"),connected=read("worker/connected-entry.ts");
 for(const text of [config,win]){assert.ok(text.includes("parts.month > 4 || (parts.month === 4 && parts.day >= 14)"));assert.ok(text.includes("parts.year + (afterApproxNewYear ? 57 : 56)"));}
 assert.ok(win.includes("approxBsYear(date) - INDEXABLE_PAST_YEARS"));assert.ok(index.includes('import { historicalCalendarNoindex } from "./seo-window"'));assert.ok(!index.includes("adYear + 57"));
 assert.ok(seo.includes("/^\\/sitemap[\\w-]*\\.xml$/"));assert.ok(seo.includes('"application/xml; charset=utf-8"'));assert.ok(seo.includes('"text/plain; charset=utf-8"'));assert.ok(seo.includes('"cache-control": "public, max-age=3600"'));
 assert.ok(optimized.indexOf("seoStaticResponse(request")<optimized.indexOf("speechApiResponse(request"));
 assert.ok(connected.indexOf("seoStaticResponse(request")<connected.indexOf("legacyRedirectResponse(request)"));
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

test("canonical adapter uses Git mirror at build time and shared immutable runtime calendar loader",()=>{
 const adapter=read("lib/patro.ts"),nodeProvider=read("lib/patro.mjs"),snapshot=read("scripts/calendar-snapshot.mjs"),source=read("worker/patro-source.ts"),gateway=read("worker/agent-gateway.ts"),mcp=read("worker/mcp.ts"),pages=read("worker/agent-pages.ts"),year=read("worker/year-page.ts"),archive=read("worker/public-archive-pages.ts"),archiveLoader=read("worker/calendar-archive.ts"),data=read("worker/data-export.ts"),calendarFast=read("worker/calendar-fast.ts");
 for(const name of ["getDay","getDayByAd","getMonth","getYear","getFestivals","getFestival","getSait","getHolidays","convertBsToAd","convertAdToBs","getTodayNepal","getTithiAt"])assert.ok(adapter.includes(name),name);
 assert.ok(adapter.includes("PATRO_CITIES"));assert.ok(nodeProvider.includes("migration/data/public/astronomy_calendar_map"));assert.ok(snapshot.includes('../lib/patro.mjs'));
 assert.ok(source.includes('const CALENDAR_PREFIX="datasets/calendar/v1"'));assert.ok(source.includes("createArchivePatroSource"));assert.ok(gateway.includes("createPatroAdapter(createArchivePatroSource(env))"));assert.ok(mcp.includes("createPatroAdapter(createArchivePatroSource(env))"));
 assert.ok(archiveLoader.includes('CALENDAR_PREFIX = "datasets/calendar/v1"'));assert.ok(archiveLoader.includes('CALENDAR_STATIC_PREFIX = "/data/calendar"'));assert.ok(archiveLoader.includes('backend: "r2"'));assert.ok(archiveLoader.includes('backend: "static-fallback"'));
 assert.ok(archive.includes("loadCalendarShard"));assert.ok(archive.includes("datasets/community/v1"));assert.ok(!archive.includes("env.DB"));
 const archiveCall=gateway.indexOf("const archive = await publicArchivePageResponse(request, env)");const agentPageCall=gateway.indexOf("const page = await agentPageResponse(request, env)");assert.ok(archiveCall>=0&&agentPageCall>=0&&archiveCall<agentPageCall,"immutable archive invocation must precede legacy agent page invocation");
 assert.ok(calendarFast.includes("loadCalendarShard"));assert.ok(calendarFast.includes("D1 is deliberately not a normal fallback"));assert.ok(!calendarFast.includes("cloudflare-d1-calendar"));
 assert.ok(data.includes("loadCalendarShard"));assert.ok(!data.includes("createD1PatroSource"));assert.ok(data.includes('"x-patro-backend":source.backend'));
 assert.ok(mcp.includes('const MODERN = "2026-07-28"'));assert.ok(mcp.includes('const LEGACY = "2025-11-25"'));for(const tool of ["get_today","convert_date","get_festival"])assert.ok(mcp.includes(tool),tool);
 for(const direct of ['path === "/today"','path === "/methodology"','path === "/corrections"','path === "/widget/today"'])assert.ok(pages.includes(direct),direct);
 for(const matcher of ["const festival = path.match(","const countdown = path.match(","const panchang = path.match(","const tika = path.match(","const busiest = path.match(","const ics = path.match(","const pdf = path.match(","const widget = path.match("])assert.ok(pages.includes(matcher),matcher);
 for(const handler of ["festivalPage(request","countdownPage(request","panchangPage(request","tikaTimePage(request","busiestMonthsPage(request","festivalIcs(request","calendarPdf(request","calendarWidget(request"])assert.ok(pages.includes(handler),handler);
 assert.ok(year.includes('/calendar\\/(\\d{4})'));assert.ok(data.includes('/data\\/calendar\\/(\\d{4})\\.(csv|json)'));assert.ok(data.includes('"content-type":"application/json; charset=utf-8"'));assert.ok(data.includes('"content-type":"text/csv; charset=utf-8"'));assert.ok(gateway.includes("dataExportResponse"));assert.ok(gateway.includes("yearPageResponse"));
});

test("build and deploy pipeline lock factual prerender, dynamic history and explicit IndexNow tooling",()=>{
 const prerender=read("scripts/prerender-seo.mjs"),days=read("scripts/prerender-days-seo.mjs"),config=read("scripts/seo-config.mjs"),pkg=JSON.parse(read("package.json")),entry=read("worker/connected-entry.ts"),optimized=read("worker/optimized-entry.ts"),history=read("worker/history-event-page.ts"),timeMachine=read("worker/time-machine-page.ts"),indexnow=read("scripts/indexnow.mjs");
 assert.ok(prerender.includes('data-seo-prerender="true"'));assert.ok(prerender.includes('"@type": "WebPage"'));assert.ok(prerender.includes('"@type": "BreadcrumbList"'));assert.ok(prerender.includes('"@type": "WebApplication"'));assert.ok(prerender.includes("max-image-preview:large"));assert.ok(config.includes("Ashwin Ashoj Asoj"));assert.ok(config.includes("calendarYearRoute"));
 assert.ok(days.includes("loadCalendarSnapshot"));assert.ok(days.includes("loadHolidayMap"));assert.ok(days.includes("यो मितिको सीधा उत्तर"));assert.ok(days.includes("calendarYearRoute"));assert.ok(days.includes('href="/today"'));assert.ok(days.includes('/festivals/${esc(h.slug)}/'));
 assert.ok(pkg.scripts.build.includes("npm run seo:phase0"));assert.ok(pkg.scripts.build.includes("build-dynamic-history-pages.mjs"));assert.ok(pkg.scripts.build.includes("build-dynamic-time-machine-pages.mjs"));assert.equal(pkg.scripts["seo:accuracy-reference"],"node scripts/verify-calendar-reference.mjs");assert.equal(pkg.scripts["seo:verify-live"],"node scripts/verify-agent-bots.mjs");assert.equal(pkg.scripts["seo:indexnow"],"node scripts/indexnow.mjs");assert.equal(pkg.scripts["deploy:cloudflare"],"npm run cloudflare:config && wrangler deploy --config wrangler.generated.jsonc");
 assert.ok(entry.includes("exactSpaAssetResponse"));assert.ok(entry.includes('import { handleAgentSurface } from "./agent-gateway"'));assert.ok(optimized.includes("historyEventPageResponse"));assert.ok(optimized.includes("timeMachinePageResponse"));assert.ok(history.includes("dynamic-history-static-index"));assert.ok(timeMachine.includes("dynamic-time-machine-index"));assert.ok(indexnow.includes("https://api.indexnow.org/indexnow"));
});
