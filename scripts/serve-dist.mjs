import { createServer } from "node:http";
import { createSecureServer } from "node:http2";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.cwd(), "dist");
const repoRoot = process.cwd();
const port = Number(process.env.PORT || 4173);
const auditApi = process.env.PATRO_AUDIT_API === "1";
const tlsKeyPath = process.env.PATRO_TLS_KEY;
const tlsCertPath = process.env.PATRO_TLS_CERT;
const tlsEnabled = Boolean(tlsKeyPath && tlsCertPath);
if (Boolean(tlsKeyPath) !== Boolean(tlsCertPath)) {
  throw new Error("PATRO_TLS_KEY and PATRO_TLS_CERT must be supplied together.");
}
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


function parseStaticHeaderRules(source) {
  const rules = [];
  let current = null;
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: trimmed, headers: [] };
      rules.push(current);
      continue;
    }
    if (!current) continue;
    const removal = trimmed.match(/^!\s+([^:]+)$/);
    if (removal) {
      current.headers.push({ name: removal[1].trim(), remove: true });
      continue;
    }
    const separator = trimmed.indexOf(":");
    if (separator <= 0) continue;
    current.headers.push({
      name: trimmed.slice(0, separator).trim(),
      value: trimmed.slice(separator + 1).trim(),
      remove: false
    });
  }
  return rules;
}

function pathMatchesHeaderRule(pattern, pathname) {
  const parts = pattern.split("*");
  if (parts.length === 1) return pathname === pattern;
  let offset = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i === 0 && !pathname.startsWith(part)) return false;
    if (i > 0 && part) {
      const found = pathname.indexOf(part, offset);
      if (found < 0) return false;
      offset = found + part.length;
    }
    if (i === parts.length - 1 && !pathname.endsWith(part)) return false;
  }
  return true;
}

function headersForPath(pathname) {
  const resolved = new Map();
  for (const rule of headerRules) {
    if (!pathMatchesHeaderRule(rule.pattern, pathname)) continue;
    for (const header of rule.headers) {
      const key = header.name.toLowerCase();
      if (header.remove) resolved.delete(key);
      else resolved.set(key, { name: header.name, value: header.value });
    }
  }
  return Object.fromEntries([...resolved.values()].map(({ name, value }) => [name, value]));
}

const headerRules = await readFile(join(root, "_headers"), "utf8")
  .then(parseStaticHeaderRules)
  .catch(() => []);

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

const handler = async (req, res) => {
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
  res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream", ...headersForPath(url.pathname) });
  res.end(body);
};

const server = tlsEnabled
  ? createSecureServer({
      key: await readFile(tlsKeyPath),
      cert: await readFile(tlsCertPath),
      allowHTTP1: true
    }, handler)
  : createServer(handler);

server.listen(port, "127.0.0.1", () => {
  const scheme = tlsEnabled ? "https" : "http";
  console.log(`PATRO_STATIC_READY ${scheme}://127.0.0.1:${port}${auditApi ? " audit-api=bounded" : ""}${tlsEnabled ? " http2=tls" : ""}`);
});
