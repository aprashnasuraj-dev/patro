import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.cwd(), "dist");
const repoRoot = process.cwd();
const port = Number(process.env.PORT || 4173);
const auditApi = process.env.PATRO_AUDIT_API === "1";
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

async function existing(path) {
  try { return (await stat(path)).isFile(); } catch { return false; }
}

let fixturePromise;
async function calendarFixture() {
  if (!fixturePromise) {
    fixturePromise = readFile(resolve(repoRoot, "public/data/calendar/offline-window.json"), "utf8").then(JSON.parse);
  }
  return fixturePromise;
}
function json(res, status, body, cacheControl = "public, max-age=60") {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": cacheControl });
  res.end(JSON.stringify(body));
}
async function serveAuditApi(url, res) {
  // These two endpoints are consumed by the shared utility shell even in the static
  // browser suite. Return deterministic local fixtures so unrelated routes do not
  // emit false 503 errors; this server never proxies or changes production responses.
  if (url.pathname === "/api/v1/tools/catalog") {
    json(res, 200, { items: [] });
    return true;
  }
  if (url.pathname === "/api/v1/radio/catalog") {
    json(res, 200, {
      ok: true, source: "static-audit-fixture", directory_warning: "Static audit fixture",
      country: "NP", total: 0, page: 1, pages: 1, page_size: 24,
      has_more: false, verified_total: 0, items: []
    });
    return true;
  }
  if (url.pathname === "/api/v1/noc/fuel-prices") {
    json(res, 200, {
      ok: true,
      source: "Nepal Oil Corporation",
      sourceUrl: "https://noc.org.np/retailprice",
      fetchedAt: "2026-10-20T00:00:00.000Z",
      effectiveDate: "2083.04.17 (2026-08-02)",
      freshness: "official-snapshot",
      stale: true,
      note: "Static audit fixture only; live NOC data is not available in this server.",
      zones: [{
        depots: ["Kathmandu", "Pokhara", "Dipayal"],
        petrol: 200,
        diesel: 200,
        kerosene: 200,
        atfDutyFreeUsdPerKl: 1697,
        atfDomesticNprPerL: 249,
        lpgNprPerCylinder: 2060
      }]
    });
    return true;
  }
  if (!auditApi) return false;
  const fixture = await calendarFixture().catch(() => null);
  if (!fixture) return false;
  const days = Array.isArray(fixture.days) ? fixture.days : [];
  const events = Array.isArray(fixture.events) ? fixture.events : [];
  if (url.pathname === "/api/v1/sync") {
    const date = url.searchParams.get("date");
    if (date) { json(res, 200, days.find((row) => row.ad === date) || { date }); return true; }
    const start = url.searchParams.get("start"), end = url.searchParams.get("end");
    json(res, 200, { days: days.filter((row) => (!start || row.ad >= start) && (!end || row.ad <= end)) });
    return true;
  }
  if (url.pathname === "/api/v1/today") {
    const date = url.searchParams.get("date");
    json(res, 200, days.find((row) => row.ad === date) || { date }); return true;
  }
  const month = url.pathname.match(/^\/api\/v1\/calendar\/(\d{4})\/(\d{1,2})$/);
  if (month) {
    const year = Number(month[1]), number = Number(month[2]);
    json(res, 200, { days: days.filter((row) => Number(row?.bs?.year) === year && Number(row?.bs?.month) === number) });
    return true;
  }
  if (url.pathname === "/api/v1/festivals" || url.pathname === "/api/v1/holidays") {
    const year = Number(url.searchParams.get("year"));
    const holidayOnly = url.pathname.endsWith("/holidays");
    const items = events.filter((row) => {
      const dateYear = Number(String(row.ad_date || "").slice(0,4));
      const holiday = /holiday|बिदा|छुट्टी/i.test(`${row.effect || ""} ${row.name_ne || ""} ${row.name_en || ""}`);
      return (!year || dateYear === year) && (holidayOnly ? holiday : !holiday);
    });
    json(res, 200, { items }); return true;
  }
  if (url.pathname === "/api/v1/weather/daily") { json(res, 200, { days: [] }); return true; }
  return false;
}

createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  if (url.pathname.startsWith("/api/")) {
    if (await serveAuditApi(url, res)) return;
    res.writeHead(503, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end('{"error":"static_audit_server"}');
    return;
  }
  const decoded = decodeURIComponent(url.pathname);
  const safe = normalize(decoded).replace(/^([.][.][/\\])+/, "").replace(/^[/\\]+/, "");
  let file = join(root, safe || "index.html");
  if (!(await existing(file))) {
    const indexCandidate = join(file, "index.html");
    file = (await existing(indexCandidate)) ? indexCandidate : join(root, "index.html");
  }
  if (!(await existing(file))) {
    res.writeHead(404); res.end("Not found"); return;
  }
  const body = await readFile(file);
  res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
  res.end(body);
}).listen(port, "127.0.0.1", () => {
  console.log(`PATRO_STATIC_READY http://127.0.0.1:${port}${auditApi ? " audit-api=bounded" : ""}`);
});