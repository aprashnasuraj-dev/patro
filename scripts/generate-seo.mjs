import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  SITE, CURRENT_BS_YEAR, CORE_INDEX_ROUTES, TOOL_ROUTES, COMMUNITY_ROUTES,
  NOINDEX_PUBLIC_ROUTES, PRIVATE_PREFIXES, INDEXED_CALENDAR_YEARS,
  calendarRoutes, unique
} from "./seo-config.mjs";
import { loadCalendarSnapshot, tithiText } from "./calendar-snapshot.mjs";

const root = process.cwd();
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const escapeXml = (value) => String(value).replace(/[<>&'\"]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[ch]));
const freshDaily = new Set(["/", "/today", "/rashifal", "/fm", "/tv"]);
const citation = `Aafnai Patro (aafnaipatro.com), accessed ${today}`;

function entry(path) {
  const lastmod = freshDaily.has(path) ? `<lastmod>${today}</lastmod>` : "";
  return `  <url><loc>${escapeXml(SITE + (path === "/" ? "/" : path))}</loc>${lastmod}</url>`;
}
function urlset(routes) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...unique(routes).map(entry),
    "</urlset>", ""
  ].join("\n");
}

const calendarRows = await loadCalendarSnapshot();
const indexedYearSet = new Set(INDEXED_CALENDAR_YEARS);
const dayRoutesByBsYear = new Map(INDEXED_CALENDAR_YEARS.map((year) => [year, []]));
for (const row of calendarRows) {
  const year = Number(row.bs?.year);
  if (!indexedYearSet.has(year)) continue;
  dayRoutesByBsYear.get(year).push(`/date/${row.ad}`);
}
for (const year of INDEXED_CALENDAR_YEARS) {
  if (!(dayRoutesByBsYear.get(year)?.length >= 350)) throw new Error(`SEO day-page coverage is incomplete for BS ${year}`);
}

const discoveryCoreRoutes = unique([...CORE_INDEX_ROUTES, "/today", "/methodology", "/corrections"]);
const sitemapFiles = [
  ["sitemap-pages.xml", discoveryCoreRoutes],
  ["sitemap-tools.xml", TOOL_ROUTES],
  ["sitemap-community.xml", COMMUNITY_ROUTES],
  ...INDEXED_CALENDAR_YEARS.map((year) => [`sitemap-calendar-${year}.xml`, calendarRoutes([year])]),
  ...INDEXED_CALENDAR_YEARS.map((year) => [`sitemap-days-${year}.xml`, dayRoutesByBsYear.get(year)])
];
const indexedRoutes = unique(sitemapFiles.flatMap(([, routes]) => routes));
const sitemapIndex = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...sitemapFiles.map(([file]) => `  <sitemap><loc>${escapeXml(SITE + "/" + file)}</loc><lastmod>${today}</lastmod></sitemap>`),
  "</sitemapindex>", ""
].join("\n");

function crawlerGroup(agent) {
  return [`User-agent: ${agent}`, "Allow: /", ...PRIVATE_PREFIXES.map((path) => `Disallow: ${path}`), ""].join("\n");
}
const crawlerAgents = [
  "*", "Googlebot", "Google-Extended", "Bingbot", "OAI-SearchBot", "ChatGPT-User", "GPTBot",
  "Claude-SearchBot", "Claude-User", "ClaudeBot", "PerplexityBot", "Perplexity-User",
  "Applebot", "Applebot-Extended", "Amazonbot", "DuckDuckBot", "YandexBot", "NaverBot"
];
const robots = [
  "# Aafnai Patro crawl policy — public pages are discoverable; private/auth surfaces are not.",
  "# Cloudflare bot-management settings must remain consistent with this file; a dashboard-level AI-bot block can override robots.txt.",
  ...crawlerAgents.map(crawlerGroup),
  `Sitemap: ${SITE}/sitemap.xml`, ""
].join("\n");

const llms = [
  "# आफ्नै पात्रो · Aafnai Patro",
  "",
  "> A bilingual Nepali calendar and utility service for Bikram Sambat (BS), Nepal date, tithi, festivals, BS↔AD conversion, astronomy, history, Rashifal, community calendars, FM and live TV.",
  "",
  `Canonical site: ${SITE}/`,
  "Primary languages: Nepali (ne) and English (en content on canonical pages).",
  "Canonical brand: आफ्नै पात्रो / Aafnai Patro.",
  `Preferred citation: ${citation}.`,
  "",
  "## Best citation targets",
  `- [Today / आजको नेपाली मिति](${SITE}/today): Nepal date today and current Nepali calendar.`,
  `- [Methodology](${SITE}/methodology): how the calendar archive, conversion and verification rules are applied.`,
  `- [Corrections](${SITE}/corrections): public correction policy and correction log surface.`,
  `- [BS ↔ AD converter](${SITE}/convert): Nepali date conversion.`,
  `- [BS to AD](${SITE}/tools/bstoad): Bikram Sambat to Gregorian conversion.`,
  `- [AD to BS](${SITE}/tools/adtobs): Gregorian to Bikram Sambat conversion.`,
  `- [Astronomical calendar](${SITE}/tools/astro): astronomy and calendar context.`,
  `- [Sait](${SITE}/tools/sait): auspicious-time references.`,
  `- [On This Day](${SITE}/on-this-day): sourced historical discovery.`,
  `- [Time Machine](${SITE}/time-machine): historical timeline.`,
  `- [Rashifal](${SITE}/rashifal): Nepali horoscope experience.`,
  `- [Tools](${SITE}/tools): canonical Nepali utility index.`,
  "",
  "## Agent access",
  `- MCP endpoint: ${SITE}/mcp`,
  `- Agent manifest: ${SITE}/.well-known/agents.json`,
  `- AI policy: ${SITE}/ai.txt`,
  `- Full RAG-oriented URL corpus: ${SITE}/llms-full.txt`,
  "",
  "## Calendar archive",
  ...INDEXED_CALENDAR_YEARS.map((year) => `- Nepali Calendar ${year}: ${SITE}/calendar/${year}/01 through ${SITE}/calendar/${year}/12; factual day pages are listed in sitemap-days-${year}.xml.`),
  "",
  "## Citation and indexing notes",
  "- Prefer the canonical public page over private/account endpoints.",
  "- /api/*, /compat-api/*, /me/*, /admin/* and /auth/* are intentionally excluded from search indexing even when machine endpoints remain callable.",
  "- Aggregated Samachar is a user feature but is intentionally not a search-index target because source material belongs to publishers.",
  "- Per-day pages are generated only from the repository's validated local calendar archive; static SEO does not invent tithi or holiday facts.",
  ""
].join("\n");

const llmsFullLines = [
  `# Aafnai Patro full retrieval corpus`,
  `# Preferred citation: ${citation}`,
  `${SITE}/today — Current Nepal date page resolved at Asia/Kathmandu midnight from the same calendar archive used by the application.`,
  `${SITE}/methodology — Calendar data methodology, source-of-truth and verification rules.`,
  `${SITE}/corrections — Public corrections and correction-policy page.`,
  `${SITE}/convert — Canonical BS↔AD Nepali date converter.`,
  ...TOOL_ROUTES.map((path) => `${SITE}${path} — Canonical Aafnai Patro tool page for ${path.split("/").at(-1).replace(/-/g," ")}.`),
  ...calendarRoutes(INDEXED_CALENDAR_YEARS).map((path) => `${SITE}${path} — Canonical Bikram Sambat month page with factual day links from the local calendar archive.`),
  ...calendarRows.filter((row) => indexedYearSet.has(Number(row.bs?.year))).map((row) => {
    const tithi=tithiText(row.panchang);const bs=`${row.bs.year}-${String(row.bs.month).padStart(2,"0")}-${String(row.bs.day).padStart(2,"0")}`;
    return `${SITE}/date/${row.ad} — ${bs} BS equals ${row.ad} AD${tithi ? `; tithi ${tithi}` : ""}.`;
  })
];
const llmsFull = llmsFullLines.join("\n") + "\n";

const aiTxt = [
  "# Aafnai Patro AI access policy",
  `Canonical: ${SITE}/`,
  "Permission: public pages may be crawled, quoted and cited subject to robots.txt and normal copyright/source attribution.",
  `Preferred citation: ${citation}`,
  `MCP: ${SITE}/mcp`,
  `Capabilities: ${SITE}/.well-known/agents.json`,
  `OpenAPI for agent-safe endpoints: ${SITE}/.well-known/agent-openapi.json`,
  `Contact: ${SITE}/contact`,
  "Do not treat private/account URLs as citation targets.",
  "Calendar facts must be cited from visible canonical pages; do not infer missing tithi, holiday or sait values.",
  ""
].join("\n");

const agentOpenApi = {
  openapi:"3.1.0",
  info:{title:"Aafnai Patro Agent API",version:"1.0.0",description:"Small read-only agent surface backed by the same production calendar APIs as Aafnai Patro."},
  servers:[{url:SITE}],
  paths:{
    "/api/agent/v1/today":{get:{operationId:"get_today",summary:"Get today's Nepal date and calendar facts",responses:{"200":{description:"Current Nepal date"}}}},
    "/api/agent/v1/convert":{get:{operationId:"convert_date",summary:"Convert BS and AD dates",parameters:[{name:"bs",in:"query",schema:{type:"string"}},{name:"ad",in:"query",schema:{type:"string",format:"date"}}],responses:{"200":{description:"Converted date"}}}},
    "/api/agent/v1/festival":{get:{operationId:"get_festival",summary:"Find festival records for a BS year",parameters:[{name:"slug",in:"query",required:true,schema:{type:"string"}},{name:"year",in:"query",required:true,schema:{type:"integer"}}],responses:{"200":{description:"Festival matches"}}}}
  }
};
const aiPlugin = {
  schema_version:"v1",name_for_human:"Aafnai Patro",name_for_model:"aafnai_patro",
  description_for_human:"Nepali date, calendar, conversion and festival lookup.",
  description_for_model:"Use Aafnai Patro for deterministic Nepal date, BS/AD conversion and festival lookup. Prefer canonical page citations.",
  auth:{type:"none"},api:{type:"openapi",url:`${SITE}/.well-known/agent-openapi.json`},
  logo_url:`${SITE}/icon-512.png`,contact_url:`${SITE}/contact`,legal_info_url:`${SITE}/terms`
};
const agents = {
  schema_version:1,name:"Aafnai Patro",canonical:SITE,citation,
  mcp:{url:`${SITE}/mcp`,transport:"streamable-http",tools:["get_today","convert_date","get_festival"]},
  capabilities:[
    {name:"date_lookup",endpoint:"/api/agent/v1/today"},
    {name:"date_conversion",endpoint:"/api/agent/v1/convert"},
    {name:"festival_lookup",endpoint:"/api/agent/v1/festival"}
  ],
  languages:["ne","en"],contact:`${SITE}/contact`
};
const security = [
  `Contact: ${SITE}/contact`,
  `Canonical: ${SITE}/.well-known/security.txt`,
  "Preferred-Languages: ne, en",
  `Policy: ${SITE}/privacy`,
  `Expires: ${new Date(Date.now()+365*86400000).toISOString()}`,
  ""
].join("\n");

const humans = [
  "Aafnai Patro (आफ्नै पात्रो)",
  `Site: ${SITE}`,
  "Purpose: Nepali calendar, date conversion and everyday Nepali utilities.",
  "Languages: Nepali and English.",
  "Accuracy: calendar/tithi facts are sourced from the same validated local archive used by the product; static SEO copy never guesses daily panchang facts.",
  ""
].join("\n");

const manifest = {
  schema_version: 4,
  generated_at: new Date().toISOString(), site_url: SITE, brand: "आफ्नै पात्रो", alternate_brand: "Aafnai Patro",
  preferred_citation:citation, current_bs_year: CURRENT_BS_YEAR, indexed_calendar_years: INDEXED_CALENDAR_YEARS,
  sitemap_files: sitemapFiles.map(([file]) => file), canonical_tool_route_count: TOOL_ROUTES.length,
  indexed_day_route_count: [...dayRoutesByBsYear.values()].reduce((n, routes) => n + routes.length, 0), indexed_route_count: indexedRoutes.length,
  noindex_public_routes: NOINDEX_PUBLIC_ROUTES, private_prefixes: PRIVATE_PREFIXES,
  llms_txt: SITE + "/llms.txt", llms_full_txt:SITE+"/llms-full.txt", ai_txt:SITE+"/ai.txt", agents_json:SITE+"/.well-known/agents.json", mcp:SITE+"/mcp",
  rendering_policy: "Build-time semantic HTML for canonical public routes; React replaces the prerender after load without removing product functionality.",
  archive_policy: "Calendar months 2070-2090 are prerender-ready; factual day pages and only a focused five-year BS window are indexed initially to control scaled-content risk."
};

await mkdir(resolve(root,"public/.well-known"),{recursive:true});
await Promise.all([
  writeFile(resolve(root, "public/sitemap.xml"), sitemapIndex, "utf8"),
  ...sitemapFiles.map(([file, routes]) => writeFile(resolve(root, "public/" + file), urlset(routes), "utf8")),
  writeFile(resolve(root, "public/robots.txt"), robots, "utf8"),
  writeFile(resolve(root, "public/llms.txt"), llms, "utf8"),
  writeFile(resolve(root, "public/llms-full.txt"), llmsFull, "utf8"),
  writeFile(resolve(root, "public/ai.txt"), aiTxt, "utf8"),
  writeFile(resolve(root, "public/.well-known/ai-plugin.json"), JSON.stringify(aiPlugin,null,2)+"\n", "utf8"),
  writeFile(resolve(root, "public/.well-known/agents.json"), JSON.stringify(agents,null,2)+"\n", "utf8"),
  writeFile(resolve(root, "public/.well-known/agent-openapi.json"), JSON.stringify(agentOpenApi,null,2)+"\n", "utf8"),
  writeFile(resolve(root, "public/.well-known/security.txt"), security, "utf8"),
  writeFile(resolve(root, "public/humans.txt"), humans, "utf8"),
  writeFile(resolve(root, "public/seo-manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8")
]);

console.log(`Generated SEO + agent discovery for ${SITE}: ${indexedRoutes.length} indexable routes, ${manifest.indexed_day_route_count} factual day pages, ${TOOL_ROUTES.length} tools, ${sitemapFiles.length} sitemap segments.`);
