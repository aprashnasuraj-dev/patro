import { readdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  CURRENT_BS_YEAR, INDEXED_CALENDAR_YEARS, CITY_SLUGS, calendarRoute, SITE,
  SITEMAP_MIN_BS_YEAR, SITEMAP_MAX_BS_YEAR, isSitemapYear, approxBsYear,
  NOINDEX_EXACT_ROUTES, PRIVATE_PREFIXES, sitemapExclusionReason
} from "./seo-config.mjs";
import { parseSitemapIndex } from "./sitemap-utils.mjs";
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
const windowYears = calendarManifest.bs_years.filter(isSitemapYear);
expect(SITEMAP_MIN_BS_YEAR === CURRENT_BS_YEAR - 10 && SITEMAP_MAX_BS_YEAR === CURRENT_BS_YEAR + 10, "sitemap BS window must be current year ±10");
expect(windowYears.length >= 10, `too few archive years inside sitemap window: ${windowYears.length}`);
expect(JSON.stringify(manifest.indexed_calendar_years) === JSON.stringify(windowYears), "indexed calendar years must equal the R2 BS archive years inside the sitemap window");
expect(JSON.stringify(manifest.calendar_archive_bs_years) === JSON.stringify(calendarManifest.bs_years), "full R2 BS archive year inventory missing from SEO manifest");
expect(manifest.calendar_archive_row_count === calendarManifest.row_count, "SEO manifest archive row count mismatch");
expect(manifest.indexed_calendar_year_route_count === windowYears.length, "indexed year route count mismatch");
expect(manifest.indexed_day_route_count > 0 && manifest.indexed_day_route_count < calendarManifest.row_count, `factual day route count ${manifest.indexed_day_route_count} must be the windowed subset of ${calendarManifest.row_count}`);
expect(manifest.calendar_archive_source_version === calendarManifest.source_version, "SEO/R2 source version mismatch");
expect(manifest.calendar_archive_ad_start === calendarManifest.ad_start && manifest.calendar_archive_ad_end === calendarManifest.ad_end, "SEO/R2 archive bounds mismatch");
expect(manifest.indexed_route_count >= 1800, `too few indexable routes: ${manifest.indexed_route_count}`);
expect(/^Cite as: Aafnai Patro \(aafnaipatro\.com\), accessed \d{4}-\d{2}-\d{2}$/.test(String(manifest.preferred_citation || "")), "exact preferred citation missing");
expect(manifest.llms_full_txt === "https://aafnaipatro.com/llms-full.txt", "llms-full manifest target missing");
expect(manifest.ai_txt === "https://aafnaipatro.com/ai.txt", "ai.txt manifest target missing");
expect(manifest.agents_json === "https://aafnaipatro.com/.well-known/agents.json", "agents manifest target missing");
expect(manifest.mcp === "https://aafnaipatro.com/mcp", "MCP manifest target missing");

const sitemapIndex = await read("public/sitemap.xml");
for (const year of windowYears) {
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
const calendarFast = await read("worker/calendar-fast.ts");
const patroSource = await read("worker/patro-source.ts");
const jobs = await read("worker/jobs.ts");
const jsonc = await read("wrangler.jsonc");
expect(entry.includes('import { handleAgentSurface } from "./agent-gateway"'), "production Worker does not wire agent gateway");
expect(gateway.includes("mcpResponse(request, env)"), "agent gateway does not wire MCP");
expect(gateway.includes('url.pathname === "/api/agent/v1/sait"'), "agent gateway sourced sait endpoint missing");
expect(gateway.includes("createArchivePatroSource(env)"), "agent calendar reads must use the R2 archive source");
expect(mcp.includes('const MODERN = "2026-07-28"'), "MCP modern protocol version missing");
expect(mcp.includes("createPatroAdapter(createArchivePatroSource(env))"), "MCP calendar reads must use the R2 archive source");
expect(patroSource.includes('const CALENDAR_PREFIX="datasets/calendar/v1"'), "canonical adapter source lacks calendar R2 prefix");
expect(calendarFast.includes("D1 is deliberately not a normal fallback"), "calendar fast path must fail closed instead of reading D1");
expect(!calendarFast.includes("cloudflare-d1-calendar"), "calendar fast path still contains a D1 calendar backend");
expect(jobs.includes('cron==="15 18 * * *"'), "Nepal-midnight cache purge handler missing");
expect(jsonc.includes('"15 18 * * *"'), "Nepal-midnight cron missing from canonical Cloudflare config");


// ---------------------------------------------------------------------------------------------
// Sitemap guard: everything submitted to search engines must be valid, fetchable and indexable.
// ---------------------------------------------------------------------------------------------
const MAX_URLS = 50_000, MAX_BYTES = 50 * 1024 * 1024;

/** Minimal XML well-formedness check (balanced tags, escaped text, single root). No dependencies. */
function wellFormed(xml, name) {
  let body = String(xml);
  if (body.charCodeAt(0) === 0xfeff) body = body.slice(1);
  body = body.replace(/^<\?xml[^?]*\?>/, "");
  const stack = [];
  let roots = 0, last = 0;
  const tag = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|<!--[\s\S]*?-->/g;
  const checkText = (text) => {
    if (/[<>]/.test(text)) fail(`${name}: stray markup character in text`);
    if (/&(?!(?:amp|lt|gt|apos|quot|#\d+|#x[0-9a-fA-F]+);)/.test(text)) fail(`${name}: unescaped & in text`);
    if (!stack.length && text.trim()) fail(`${name}: text outside root element`);
  };
  let m;
  while ((m = tag.exec(body))) {
    checkText(body.slice(last, m.index));
    last = tag.lastIndex;
    if (m[0].startsWith("<!--")) continue;
    const [, closing, nameTag, , selfClosing] = m;
    if (closing) {
      if (stack.pop() !== nameTag) fail(`${name}: mismatched </${nameTag}>`);
    } else if (!selfClosing) {
      if (!stack.length) roots++;
      stack.push(nameTag);
    } else if (!stack.length) roots++;
  }
  checkText(body.slice(last));
  if (stack.length) fail(`${name}: unclosed <${stack.at(-1)}>`);
  if (roots !== 1) fail(`${name}: expected exactly one root element, found ${roots}`);
}

const distDir = resolve(root, "dist");
const distSitemaps = (await readdir(distDir)).filter((file) => /^sitemap[\w-]*\.xml$/.test(file)).sort();
expect(distSitemaps.includes("sitemap.xml"), "dist/sitemap.xml missing");
const distIndexXml = await read("dist/sitemap.xml");
wellFormed(distIndexXml, "sitemap.xml");
expect(/<sitemapindex xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/.test(distIndexXml), "sitemap.xml is not a sitemapindex");
const indexEntries = parseSitemapIndex(distIndexXml);
expect((distIndexXml.match(/<sitemap>/g) || []).length === indexEntries.length, "sitemap index has entries that failed to parse");
expect(indexEntries.length >= 10 && indexEntries.length <= 100, `sitemap index child count out of range: ${indexEntries.length}`);
const indexFiles = new Set();
for (const { file, lastmod } of indexEntries) {
  expect(/^sitemap[\w-]*\.xml$/.test(file), `sitemap index entry is not a same-site sitemap file: ${file}`);
  expect(!indexFiles.has(file), `sitemap index lists ${file} twice`);
  indexFiles.add(file);
  expect(existsSync(resolve(distDir, file)), `sitemap index lists ${file} but dist/${file} does not exist`);
  expect(/^\d{4}-\d{2}-\d{2}$/.test(String(lastmod || "")), `sitemap index entry ${file} lacks a valid <lastmod>`);
  expect(String(lastmod) <= new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), `sitemap index entry ${file} has a future <lastmod> ${lastmod}`);
}
for (const file of distSitemaps) if (file !== "sitemap.xml") expect(indexFiles.has(file), `stale/orphan sitemap shipped in dist but not in index: ${file}`);
expect(JSON.stringify([...indexFiles].sort()) === JSON.stringify([...manifest.sitemap_files].sort()), "seo-manifest sitemap_files out of sync with dist/sitemap.xml");
for (const file of indexFiles) {
  const archive = file.match(/^sitemap-(?:calendar|days)-(\d+)\.xml$/);
  if (archive) expect(isSitemapYear(archive[1]), `archive sitemap outside BS window ${SITEMAP_MIN_BS_YEAR}..${SITEMAP_MAX_BS_YEAR}: ${file}`);
}

const bsYearByAd = new Map(rows.map((row) => [row.ad, Number(row.bs?.year)]));
const robotsDisallows = [...robots.matchAll(/^Disallow:\s*(\S+)\s*$/gm)].map((m) => m[1]);
const seenLocs = new Map();
let totalLocs = 0;
const festivalLocs = [];
for (const file of indexFiles) {
  const path = resolve(distDir, file);
  const size = (await stat(path)).size;
  expect(size <= MAX_BYTES, `${file} exceeds 50 MB uncompressed (${size} bytes)`);
  const xml = await readFile(path, "utf8");
  wellFormed(xml, file);
  expect(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'), `${file} is not a sitemap urlset`);
  const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1].trim());
  expect((xml.match(/<url>/g) || []).length === locs.length, `${file}: every <url> needs exactly one <loc>`);
  expect(locs.length > 0, `${file} is empty`);
  expect(locs.length <= MAX_URLS, `${file} exceeds 50,000 URLs (${locs.length})`);
  for (const loc of locs) {
    expect(loc.startsWith(SITE + "/"), `${file}: <loc> is not absolute on ${SITE}: ${loc}`);
    const route = loc.slice(SITE.length).replace(/&amp;/g, "&");
    const reason = sitemapExclusionReason(route);
    expect(!reason, `${file}: <loc> would be noindex/redirect/private (${reason}): ${loc}`);
    expect(!NOINDEX_EXACT_ROUTES.includes(route), `${file}: noindex route in sitemap: ${route}`);
    expect(!PRIVATE_PREFIXES.some((prefix) => route.startsWith(prefix)) && !route.startsWith("/api/"), `${file}: private/API route in sitemap: ${route}`);
    expect(!robotsDisallows.some((prefix) => route.startsWith(prefix)), `${file}: robots.txt disallows a sitemap URL: ${route}`);
    const calendar = route.match(/^\/calendar\/(\d{4})(?:\/|$)/);
    if (calendar) expect(Number(calendar[1]) >= SITEMAP_MIN_BS_YEAR && isSitemapYear(calendar[1]), `${file}: calendar URL outside BS window: ${route}`);
    const date = route.match(/^\/date\/(\d{4}-\d{2}-\d{2})$/);
    if (route.startsWith("/date/")) {
      expect(Boolean(date) && bsYearByAd.has(date[1]), `${file}: /date/ URL not in validated archive: ${route}`);
      expect(isSitemapYear(bsYearByAd.get(date[1])), `${file}: /date/ URL for BS ${bsYearByAd.get(date[1])} outside window: ${route}`);
    }
    if (route.startsWith("/festivals/")) festivalLocs.push(route);
    expect(!seenLocs.has(loc), `duplicate <loc> ${loc} in ${file} and ${seenLocs.get(loc)}`);
    seenLocs.set(loc, file);
  }
  totalLocs += locs.length;
}
// Festival pages are static prerenders: they must exist, be self-canonical and indexable.
for (const route of festivalLocs) {
  const htmlPath = resolve(distDir, `.${route}/index.html`);
  expect(existsSync(htmlPath), `festival sitemap URL has no prerendered page: ${route}`);
  const html = await readFile(htmlPath, "utf8");
  expect(html.includes(`rel="canonical" href="${SITE}${route}"`), `festival page is not self-canonical: ${route}`);
  expect(!/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html), `festival page is noindex: ${route}`);
}

// robots.txt: exactly one Sitemap line pointing at the index.
const robotsSitemapLines = robots.split("\n").filter((line) => /^sitemap:/i.test(line.trim()));
expect(robotsSitemapLines.length === 1 && robotsSitemapLines[0].trim() === `Sitemap: ${SITE}/sitemap.xml`, "robots.txt must contain exactly one Sitemap line for the index");
expect((await read("dist/robots.txt")) === robots, "dist/robots.txt differs from public/robots.txt");

// Runtime parity: the Worker's noindex cutoff must use the same BS-year formula as the build.
const seoWindow = await read("worker/seo-window.ts");
const workerIndex = await read("worker/index.ts");
const optimizedEntry = await read("worker/optimized-entry.ts");
const seoStatic = await read("worker/seo-static.ts");
expect(seoWindow.includes("parts.month > 4 || (parts.month === 4 && parts.day >= 14)") && seoWindow.includes("parts.year + (afterApproxNewYear ? 57 : 56)") && seoWindow.includes("approxBsYear(date) - 10"), "worker/seo-window.ts BS-year cutoff drifted from scripts/seo-config.mjs");
expect(workerIndex.includes('import { historicalCalendarNoindex } from "./seo-window"') && !workerIndex.includes("adYear + 57"), "worker/index.ts must use the shared seo-window cutoff");
expect(approxBsYear(new Date("2026-04-13T12:00:00+05:45")) === 2082 && approxBsYear(new Date("2026-04-14T12:00:00+05:45")) === 2083, "approxBsYear New Year boundary changed");
const firstSeo = optimizedEntry.indexOf("seoStaticResponse(request");
expect(firstSeo > 0 && firstSeo < optimizedEntry.indexOf("speechApiResponse(request") && firstSeo < optimizedEntry.indexOf("quotaCachedResponse(request"), "sitemap/robots handler must run first in worker/optimized-entry.ts");
expect(entry.indexOf("seoStaticResponse(request") > 0 && entry.indexOf("seoStaticResponse(request") < entry.indexOf("legacyRedirectResponse(request)"), "sitemap/robots handler must run first in worker/connected-entry.ts");
expect(seoStatic.includes('"application/xml; charset=utf-8"') && seoStatic.includes('"cache-control": "public, max-age=3600"') && !seoStatic.includes("x-robots-tag\","), "seo-static headers drifted");
for (const file of (await readdir(resolve(root, "worker"))).filter((name) => name.endsWith(".ts"))) {
  expect(!(await read(`worker/${file}`)).includes("converted-functions"), `worker/${file} must not route legacy converted-functions sitemaps`);
}
console.log(`Sitemap guard passed: ${indexFiles.size} child sitemaps, ${totalLocs} unique indexable URLs, BS window ${SITEMAP_MIN_BS_YEAR}..${SITEMAP_MAX_BS_YEAR}.`);

console.log(`SEO/agent build verified: ${manifest.indexed_day_route_count} validated factual day routes across ${manifest.indexed_calendar_years.length} BS years; hot prerender sample ${sample.ad} / BS ${sample.bs.year}-${sample.bs.month}-${sample.bs.day}.`);
