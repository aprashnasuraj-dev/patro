import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CURRENT_BS_YEAR, INDEXED_CALENDAR_YEARS, CITY_SLUGS, calendarRoute } from "./seo-config.mjs";
import { loadCalendarSnapshot, tithiText } from "./calendar-snapshot.mjs";

const root = process.cwd();
const read = (path) => readFile(resolve(root, path), "utf8");
const fail = (message) => { throw new Error(`SEO build verification failed: ${message}`); };
const expect = (condition, message) => { if (!condition) fail(message); };

const manifest = JSON.parse(await read("public/seo-manifest.json"));
const calendarManifest = JSON.parse(await read(".cloudflare/calendar-r2/manifest.json"));
expect(manifest.schema_version === 4, "manifest schema must be 4");
expect(manifest.site_url === "https://aafnaipatro.com", "canonical host mismatch");
expect(calendarManifest.row_count === 77070, `calendar R2 row count mismatch: ${calendarManifest.row_count}`);
expect(calendarManifest.ad_start === "1826-04-11" && calendarManifest.ad_end === "2037-04-13", "calendar R2 coverage mismatch");
expect(Array.isArray(calendarManifest.bs_years) && calendarManifest.bs_years.length > 200, "full BS archive year inventory missing");
expect(Array.isArray(manifest.indexed_calendar_years), "indexed calendar year inventory missing");
expect(JSON.stringify(manifest.indexed_calendar_years) === JSON.stringify(calendarManifest.bs_years), "indexed calendar years must match validated R2 BS archive coverage");
expect(manifest.indexed_calendar_year_route_count === calendarManifest.bs_years.length, "indexed year route count mismatch");
expect(manifest.indexed_day_route_count === calendarManifest.row_count, `factual day route count ${manifest.indexed_day_route_count} != ${calendarManifest.row_count}`);
expect(manifest.calendar_archive_source_version === calendarManifest.source_version, "SEO/R2 source version mismatch");
expect(manifest.calendar_archive_ad_start === calendarManifest.ad_start && manifest.calendar_archive_ad_end === calendarManifest.ad_end, "SEO/R2 archive bounds mismatch");
expect(manifest.indexed_route_count >= 1800, `too few indexable routes: ${manifest.indexed_route_count}`);
expect(/^Cite as: Aafnai Patro \(aafnaipatro\.com\), accessed \d{4}-\d{2}-\d{2}$/.test(String(manifest.preferred_citation || "")), "exact preferred citation missing");
expect(manifest.llms_full_txt === "https://aafnaipatro.com/llms-full.txt", "llms-full manifest target missing");
expect(manifest.ai_txt === "https://aafnaipatro.com/ai.txt", "ai.txt manifest target missing");
expect(manifest.agents_json === "https://aafnaipatro.com/.well-known/agents.json", "agents manifest target missing");
expect(manifest.mcp === "https://aafnaipatro.com/mcp", "MCP manifest target missing");

const sitemapIndex = await read("public/sitemap.xml");
for (const year of calendarManifest.bs_years) {
  expect(manifest.sitemap_files.includes(`sitemap-calendar-${year}.xml`), `calendar sitemap missing from manifest: ${year}`);
  expect(manifest.sitemap_files.includes(`sitemap-days-${year}.xml`), `day sitemap missing from manifest: ${year}`);
  expect(sitemapIndex.includes(`https://aafnaipatro.com/sitemap-calendar-${year}.xml`), `calendar sitemap missing from index: ${year}`);
  expect(sitemapIndex.includes(`https://aafnaipatro.com/sitemap-days-${year}.xml`), `day sitemap missing from index: ${year}`);
}

const pagesSitemap = await read("public/sitemap-pages.xml");
for (const city of CITY_SLUGS) expect(pagesSitemap.includes(`https://aafnaipatro.com/today/${city}`), `diaspora today route missing from sitemap: ${city}`);

const rootHtml = await read("dist/index.html");
expect(rootHtml.includes('data-seo-prerender="true"'), "homepage lacks server-visible semantic body");
expect(rootHtml.includes("<h1>"), "homepage lacks H1");
expect(rootHtml.includes('rel="canonical" href="https://aafnaipatro.com/"'), "homepage canonical missing");
expect(rootHtml.includes('"@type":"Organization"') || rootHtml.includes('"@type": "Organization"'), "Organization schema missing");
expect(rootHtml.includes('rel="describedby"') || rootHtml.includes("/llms.txt"), "homepage lacks agent discovery hint");
expect(!rootHtml.includes("patro-blush.vercel.app"), "retired Vercel hostname leaked into homepage");

const rows = await loadCalendarSnapshot();
expect(rows.length === calendarManifest.row_count, "Git mirror row count does not match R2 manifest");
const sample = rows.find((row) => Number(row.bs?.year) === CURRENT_BS_YEAR && tithiText(row.panchang))
  || rows.find((row) => INDEXED_CALENDAR_YEARS.includes(Number(row.bs?.year)) && tithiText(row.panchang));
expect(sample, "no hot prerender calendar sample with tithi found");

const monthPath = calendarRoute(Number(sample.bs.year), Number(sample.bs.month));
const monthHtml = await read(`dist${monthPath}/index.html`);
expect(monthHtml.includes('data-seo-prerender="true"'), "month page lacks semantic prerender");
expect(monthHtml.includes('class="seo-calendar-days"'), "month page lacks factual day-link section");
expect(monthHtml.includes(`/date/${sample.ad}`), "month page does not link factual day page");
expect(monthHtml.includes(tithiText(sample.panchang)), "month page does not expose sample tithi in raw HTML");
expect(!monthHtml.includes("patro-blush.vercel.app"), "retired Vercel hostname leaked into month page");

const dayHtml = await read(`dist/date/${sample.ad}/index.html`);
expect(dayHtml.includes('data-seo-prerender="true"'), "day page lacks semantic prerender");
expect(dayHtml.includes("यो मितिको सीधा उत्तर"), "day page lacks answer-first block");
expect(dayHtml.includes(tithiText(sample.panchang)), "day page lacks archive tithi");
expect(dayHtml.includes('"@type":"WebPage"') || dayHtml.includes('"@type": "WebPage"'), "day WebPage schema missing");
expect(dayHtml.includes('"@type":"BreadcrumbList"') || dayHtml.includes('"@type": "BreadcrumbList"'), "day breadcrumb schema missing");
expect(dayHtml.includes(`rel="canonical" href="https://aafnaipatro.com/date/${sample.ad}"`), "day canonical missing");
expect(dayHtml.includes('href="/today"'), "day page missing /today link");
expect(dayHtml.includes(`href="/calendar/${sample.bs.year}"`), "day page missing year hub link");
expect(dayHtml.includes('href="/convert"'), "day page missing converter link");
expect(!dayHtml.includes("patro-blush.vercel.app"), "retired Vercel hostname leaked into day page");

const robots = await read("public/robots.txt");
for (const agent of [
  "OAI-SearchBot", "Googlebot", "Google-Extended", "Bingbot", "Claude-SearchBot", "PerplexityBot",
  "Applebot", "Applebot-Extended", "Amazonbot", "DuckDuckBot", "YandexBot", "NaverBot"
]) expect(robots.includes(`User-agent: ${agent}`), `missing crawler group ${agent}`);
for (const path of ["/api/", "/compat-api/", "/me/", "/admin/", "/auth/"]) expect(robots.includes(`Disallow: ${path}`), `private/machine path exposed: ${path}`);
expect(robots.includes("Cloudflare") && robots.includes("override robots.txt"), "Cloudflare crawler override warning missing");

const llms = await read("public/llms.txt");
expect(llms.includes("Aafnai Patro"), "llms brand missing");
expect(llms.includes("/mcp"), "llms MCP discovery missing");
expect(llms.includes("/methodology"), "llms methodology target missing");
expect(llms.includes("/corrections"), "llms corrections target missing");
expect(llms.includes("Cite as: Aafnai Patro (aafnaipatro.com), accessed"), "llms exact citation missing");
expect(!llms.includes("MeroPatro"), "retired brand leaked into llms");

const llmsFull = await read("public/llms-full.txt");
expect(llmsFull.includes(`/date/${sample.ad}`), "llms-full does not contain hot factual day corpus");
expect(llmsFull.includes(`${sample.bs.year}-`), "llms-full does not contain BS facts");
expect(llmsFull.split("\n").length >= 1700, "llms-full corpus unexpectedly small");
for (const city of CITY_SLUGS) expect(llmsFull.includes(`/today/${city}`), `llms-full missing city page ${city}`);

const ai = await read("public/ai.txt");
expect(ai.includes("Cite as: Aafnai Patro (aafnaipatro.com), accessed"), "ai.txt exact citation policy missing");
expect(ai.includes("/.well-known/agents.json"), "ai.txt agent manifest discovery missing");
expect(ai.includes("/mcp"), "ai.txt MCP discovery missing");

const agents = JSON.parse(await read("public/.well-known/agents.json"));
expect(agents.name === "Aafnai Patro", "agents.json brand mismatch");
expect(agents.mcp?.url === "https://aafnaipatro.com/mcp", "agents.json MCP URL mismatch");
expect(Array.isArray(agents.mcp?.tools) && agents.mcp.tools.join(",") === "get_today,convert_date,get_festival", "agents.json MCP tool inventory mismatch");
expect(Array.isArray(agents.capabilities) && agents.capabilities.some((item) => item?.name === "sait_lookup" && item?.endpoint === "/api/agent/v1/sait"), "agents.json sourced sait capability missing");

const plugin = JSON.parse(await read("public/.well-known/ai-plugin.json"));
expect(plugin.name_for_model === "aafnai_patro", "legacy plugin compatibility manifest mismatch");
expect(plugin.api?.url === "https://aafnaipatro.com/.well-known/agent-openapi.json", "legacy plugin OpenAPI target mismatch");
const openapi = JSON.parse(await read("public/.well-known/agent-openapi.json"));
for (const path of ["/api/agent/v1/today","/api/agent/v1/convert","/api/agent/v1/festival","/api/agent/v1/sait"]) expect(openapi.paths?.[path], `agent OpenAPI path missing: ${path}`);

const security = await read("public/.well-known/security.txt");
expect(security.includes("Contact: https://aafnaipatro.com/contact"), "security.txt contact missing");
expect(security.includes("Canonical: https://aafnaipatro.com/.well-known/security.txt"), "security.txt canonical missing");
const expires = security.match(/^Expires:\s*(.+)$/m)?.[1];
expect(Boolean(expires), "security.txt expiry missing");
if (expires) {
  const delta = Date.parse(expires) - Date.now();
  expect(delta > 0 && delta < 365 * 86400000, "security.txt Expires must be in the future and less than one year away");
}

const entry = await read("worker/connected-entry.ts");
const gateway = await read("worker/agent-gateway.ts");
const mcp = await read("worker/mcp.ts");
const jobs = await read("worker/jobs.ts");
const jsonc = await read("wrangler.jsonc");
expect(entry.includes('import { handleAgentSurface } from "./agent-gateway"'), "production Worker does not wire agent gateway");
expect(gateway.includes("mcpResponse(request, env)"), "agent gateway does not wire MCP");
expect(gateway.includes('url.pathname === "/api/agent/v1/sait"'), "agent gateway sourced sait endpoint missing");
expect(mcp.includes('const MODERN = "2026-07-28"'), "MCP modern protocol version missing");
expect(mcp.includes("createPatroAdapter(createD1PatroSource(env))"), "MCP must use canonical Patro adapter");
expect(jobs.includes('cron==="15 18 * * *"'), "Nepal-midnight cache purge handler missing");
expect(jsonc.includes('"15 18 * * *"'), "Nepal-midnight cron missing from canonical Cloudflare config");

console.log(`SEO/agent build verified: ${manifest.indexed_day_route_count} validated factual day routes across ${manifest.indexed_calendar_years.length} BS years; hot prerender sample ${sample.ad} / BS ${sample.bs.year}-${sample.bs.month}-${sample.bs.day}.`);
