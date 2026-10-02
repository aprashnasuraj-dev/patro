import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CURRENT_BS_YEAR, INDEXED_CALENDAR_YEARS, calendarRoute } from "./seo-config.mjs";
import { loadCalendarSnapshot, tithiText } from "./calendar-snapshot.mjs";

const root = process.cwd();
const read = (path) => readFile(resolve(root, path), "utf8");
const fail = (message) => { throw new Error(`SEO build verification failed: ${message}`); };
const expect = (condition, message) => { if (!condition) fail(message); };

const manifest = JSON.parse(await read("public/seo-manifest.json"));
expect(manifest.schema_version === 4, "manifest schema must be 4");
expect(manifest.site_url === "https://aafnaipatro.com", "canonical host mismatch");
expect(Array.isArray(manifest.indexed_calendar_years) && manifest.indexed_calendar_years.length === 5, "five-year focused index window missing");
expect(manifest.indexed_day_route_count >= 1700, `too few factual day routes: ${manifest.indexed_day_route_count}`);
expect(manifest.indexed_route_count >= 1800, `too few indexable routes: ${manifest.indexed_route_count}`);
expect(String(manifest.preferred_citation || "").includes("Aafnai Patro (aafnaipatro.com), accessed"), "preferred citation missing");
expect(manifest.llms_full_txt === "https://aafnaipatro.com/llms-full.txt", "llms-full manifest target missing");
expect(manifest.ai_txt === "https://aafnaipatro.com/ai.txt", "ai.txt manifest target missing");
expect(manifest.agents_json === "https://aafnaipatro.com/.well-known/agents.json", "agents manifest target missing");
expect(manifest.mcp === "https://aafnaipatro.com/mcp", "MCP manifest target missing");

const rootHtml = await read("dist/index.html");
expect(rootHtml.includes('data-seo-prerender="true"'), "homepage lacks server-visible semantic body");
expect(rootHtml.includes("<h1>"), "homepage lacks H1");
expect(rootHtml.includes('rel="canonical" href="https://aafnaipatro.com/"'), "homepage canonical missing");
expect(rootHtml.includes('"@type":"Organization"') || rootHtml.includes('"@type": "Organization"'), "Organization schema missing");
expect(rootHtml.includes('rel="describedby"') || rootHtml.includes("/llms.txt"), "homepage lacks agent discovery hint");
expect(!rootHtml.includes("patro-blush.vercel.app"), "retired Vercel hostname leaked into homepage");

const rows = await loadCalendarSnapshot();
const sample = rows.find((row) => Number(row.bs?.year) === CURRENT_BS_YEAR && tithiText(row.panchang))
  || rows.find((row) => INDEXED_CALENDAR_YEARS.includes(Number(row.bs?.year)) && tithiText(row.panchang));
expect(sample, "no indexed calendar sample with tithi found");

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
expect(!dayHtml.includes("patro-blush.vercel.app"), "retired Vercel hostname leaked into day page");

const robots = await read("public/robots.txt");
for (const agent of [
  "OAI-SearchBot", "Googlebot", "Google-Extended", "Bingbot", "Claude-SearchBot", "PerplexityBot",
  "Applebot", "Applebot-Extended", "Amazonbot", "DuckDuckBot", "YandexBot", "NaverBot"
]) expect(robots.includes(`User-agent: ${agent}`), `missing crawler group ${agent}`);
for (const path of ["/api/", "/compat-api/", "/me/", "/admin/", "/auth/"]) {
  expect(robots.includes(`Disallow: ${path}`), `private/machine path exposed: ${path}`);
}
expect(robots.includes("Cloudflare") && robots.includes("override robots.txt"), "Cloudflare crawler override warning missing");

const llms = await read("public/llms.txt");
expect(llms.includes("Aafnai Patro"), "llms brand missing");
expect(llms.includes("/mcp"), "llms MCP discovery missing");
expect(llms.includes("/methodology"), "llms methodology target missing");
expect(llms.includes("/corrections"), "llms corrections target missing");
expect(!llms.includes("MeroPatro"), "retired brand leaked into llms");

const llmsFull = await read("public/llms-full.txt");
expect(llmsFull.includes(`/date/${sample.ad}`), "llms-full does not contain factual day corpus");
expect(llmsFull.includes(`${sample.bs.year}-`), "llms-full does not contain BS facts");
expect(llmsFull.split("\n").length >= 1700, "llms-full corpus unexpectedly small");

const ai = await read("public/ai.txt");
expect(ai.includes("Preferred citation:"), "ai.txt citation policy missing");
expect(ai.includes("/.well-known/agents.json"), "ai.txt agent manifest discovery missing");
expect(ai.includes("/mcp"), "ai.txt MCP discovery missing");

const agents = JSON.parse(await read("public/.well-known/agents.json"));
expect(agents.name === "Aafnai Patro", "agents.json brand mismatch");
expect(agents.mcp?.url === "https://aafnaipatro.com/mcp", "agents.json MCP URL mismatch");
expect(Array.isArray(agents.mcp?.tools) && agents.mcp.tools.join(",") === "get_today,convert_date,get_festival", "agents.json tool inventory mismatch");

const plugin = JSON.parse(await read("public/.well-known/ai-plugin.json"));
expect(plugin.name_for_model === "aafnai_patro", "legacy plugin compatibility manifest mismatch");
expect(plugin.api?.url === "https://aafnaipatro.com/.well-known/agent-openapi.json", "legacy plugin OpenAPI target mismatch");

const security = await read("public/.well-known/security.txt");
expect(security.includes("Contact: https://aafnaipatro.com/contact"), "security.txt contact missing");
expect(security.includes("Canonical: https://aafnaipatro.com/.well-known/security.txt"), "security.txt canonical missing");
expect(security.includes("Expires:"), "security.txt expiry missing");

const entry = await read("worker/connected-entry.ts");
const gateway = await read("worker/agent-gateway.ts");
const mcp = await read("worker/mcp.ts");
expect(entry.includes('import { handleAgentSurface } from "./agent-gateway"'), "production Worker does not wire agent gateway");
expect(gateway.includes("mcpResponse(request, env)"), "agent gateway does not wire MCP");
expect(mcp.includes('const MODERN = "2026-07-28"'), "MCP modern protocol version missing");
expect(mcp.includes("createPatroAdapter(createD1PatroSource(env))"), "MCP must use canonical Patro adapter");

console.log(`SEO/agent build verified: ${manifest.indexed_route_count} indexable routes, ${manifest.indexed_day_route_count} factual day pages; sample ${sample.ad} / BS ${sample.bs.year}-${sample.bs.month}-${sample.bs.day}.`);
