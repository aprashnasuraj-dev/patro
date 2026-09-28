import { Hono } from "npm:hono@4.7.2";
import { cors } from "npm:hono@4.7.2/cors";

const app = new Hono().basePath("/functions/v1/router");

app.use("*", cors({
  // Public factual APIs intentionally support cross-origin reads. Credentials are
  // never enabled here; private routes still require explicit bearer auth.
  origin: "*",
  allowMethods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "apikey", "x-client-info"],
  maxAge: 86400
}));

app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  c.header("Cross-Origin-Opener-Policy", "same-origin");
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value: string | undefined | null): value is string {
  if (!value || !DATE_RE.test(value)) return false;
  const [y,m,d] = value.split("-").map(Number);
  const x = new Date(Date.UTC(y,m-1,d));
  return x.getUTCFullYear() === y && x.getUTCMonth() === m-1 && x.getUTCDate() === d;
}

function todayNepal() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function daysInclusive(start: string, end: string) {
  const a = Date.parse(start + "T00:00:00Z");
  const b = Date.parse(end + "T00:00:00Z");
  return Math.floor((b - a) / 86_400_000) + 1;
}

function syncPayload(date: string, calendar: {
  bs: { formatted: string; [key: string]: unknown };
  ns: { formatted: string; [key: string]: unknown };
  panchang: {
    tithi: { number: number; en: string; ne: string; paksha: string };
    [key: string]: unknown;
  };
}) {
  return {
    success: true,
    query_date: date,
    calendars: {
      gregorian_ad: date,
      bikram_sambat: calendar.bs.formatted,
      nepal_sambat: calendar.ns.formatted,
      bikram_sambat_detail: calendar.bs,
      nepal_sambat_detail: calendar.ns
    },
    tithi: calendar.panchang.tithi,
    archive_panchang: calendar.panchang
  };
}


const LEGACY_BASE = "https://pxlsmxbpgdfzjzuqtict.supabase.co/functions/v1/nepal-miti-protected";
const LEGACY_PAGES = new Set([
  "/aaja","/tithi","/diaspora","/card","/family","/family/join","/my-data",
  "/settings/holidays","/settings/notifications","/offline","/developers",
  "/jyotish","/jyotish/rashifal","/time-machine","/samachar","/fm","/explore",
  "/tv","/on-this-day","/astrology","/convert","/search","/notes","/planner",
  "/data-trust","/nepal-sambat"
]);
const LEGACY_PAGE_PREFIXES = ["/family/","/settings/","/calendar/","/date/","/festival/","/jyotish/"];
const LEGACY_STATIC = new Set([
  "/sw.js","/manifest.webmanifest","/icon.svg","/style.css","/app.js","/tv-hls.js",
  "/nm-foundation.js","/nm-foundation.css","/nm-home.js","/nm-home.css",
  "/.well-known/assetlinks.json"
]);
const LEGACY_API_ROOTS = new Set([
  "admin","astrology","bundle","config","convert","cron","date","family","festivals",
  "flags","fm","forex","habits","health","ics","jyotish-chat","month","my-data",
  "on-this-day","push","rashifal","rashifal_engine","samachar","time-machine",
  "tv","v1","weather"
]);
const MAX_PROXY_BODY_BYTES = 512 * 1024;
const REQUEST_HEADERS_TO_FORWARD = new Set([
  "accept","accept-language","authorization","apikey","content-type","if-match",
  "if-none-match","if-modified-since","range","x-client-info"
]);
const RESPONSE_HEADERS_TO_FORWARD = new Set([
  "accept-ranges","cache-control","content-disposition","content-range","content-type",
  "etag","last-modified","location","retry-after","vary","x-robots-tag"
]);
const LOCAL_RATE = new Map<string,{window:number;count:number}>();

function safeCompatTail(rest: string) {
  if (!rest || rest.length > 1024 || rest.includes("\\") || rest.includes("\0")) return false;
  try {
    const decoded = decodeURIComponent(rest);
    if (decoded.includes("\\") || decoded.includes("\0")) return false;
    return !decoded.split("/").some((part) => part === "." || part === "..");
  } catch {
    return false;
  }
}
function clientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "shared-anonymous"
  ).slice(0,128);
}
function fallbackRateAllowed(key: string, limit: number) {
  const window = Math.floor(Date.now() / 3_600_000);
  const old = LOCAL_RATE.get(key);
  const row = old?.window === window ? old : {window,count:0};
  row.count += 1;
  LOCAL_RATE.set(key,row);
  if (LOCAL_RATE.size > 5000) {
    for (const [k,v] of LOCAL_RATE) if (v.window !== window) LOCAL_RATE.delete(k);
  }
  return row.count <= limit;
}
async function publicRateAllowed(request: Request, scope: string, limit: number) {
  const ip = clientIp(request);
  const fallbackKey = scope + "|" + ip;
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRole) return fallbackRateAllowed(fallbackKey, Math.max(10, Math.floor(limit / 4)));

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(serviceRole + "|" + ip + "|" + scope),
  );
  const pKeyHash = [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2,"0")).join("");
  try {
    const r = await fetch(`${supabaseUrl}/rest/v1/rpc/consume_public_api_rate`, {
      method: "POST",
      headers: {
        apikey: serviceRole,
        authorization: `Bearer ${serviceRole}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({p_key_hash:pKeyHash,p_limit:limit}),
      signal: AbortSignal.timeout(2500),
    });
    if (!r.ok) return fallbackRateAllowed(fallbackKey, Math.max(10, Math.floor(limit / 4)));
    return (await r.json()) === true;
  } catch {
    return fallbackRateAllowed(fallbackKey, Math.max(10, Math.floor(limit / 4)));
  }
}
function proxyRequestHeaders(request: Request) {
  const headers = new Headers();
  for (const [key,value] of request.headers) {
    if (REQUEST_HEADERS_TO_FORWARD.has(key.toLowerCase())) headers.set(key,value);
  }
  const ip = clientIp(request);
  if (ip !== "shared-anonymous") headers.set("x-forwarded-for",ip);
  return headers;
}
function proxyResponseHeaders(upstream: Response) {
  const headers = new Headers();
  for (const [key,value] of upstream.headers) {
    if (RESPONSE_HEADERS_TO_FORWARD.has(key.toLowerCase())) headers.set(key,value);
  }
  return headers;
}
async function readBodyLimited(request: Request) {
  const declared = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(declared) && declared > MAX_PROXY_BODY_BYTES) throw new Error("proxy_body_too_large");
  if (!request.body) return undefined;
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > MAX_PROXY_BODY_BYTES) {
        await reader.cancel("proxy_body_too_large");
        throw new Error("proxy_body_too_large");
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    body.set(part,offset);
    offset += part.byteLength;
  }
  return body;
}
function legacyPageAllowed(path: string) {
  return LEGACY_PAGES.has(path) || LEGACY_PAGE_PREFIXES.some((prefix) => path.startsWith(prefix));
}
function safeCompatPath(path: string) {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\\\") && !path.includes("..");
}
async function proxyLegacy(request: Request, targetPath: string, opts: {page?: boolean; preserveQuery?: boolean} = {}) {
  const incoming = new URL(request.url);
  const target = new URL(LEGACY_BASE + targetPath);
  if (opts.preserveQuery !== false && !target.search) target.search = incoming.search;

  const init: RequestInit = {
    method: request.method,
    headers: proxyRequestHeaders(request),
    redirect: "manual",
  };
  try {
    if (request.method !== "GET" && request.method !== "HEAD") {
      const body = await readBodyLimited(request);
      if (body) init.body = body;
    }
  } catch (error) {
    if ((error as Error)?.message === "proxy_body_too_large") {
      return new Response(JSON.stringify({error:"request_too_large",max_bytes:MAX_PROXY_BODY_BYTES}), {
        status: 413,
        headers: {"content-type":"application/json; charset=utf-8","cache-control":"no-store"},
      });
    }
    throw error;
  }

  const upstream = await fetch(target,init);
  const outHeaders = proxyResponseHeaders(upstream);
  const ct = upstream.headers.get("content-type") || "";
  if (opts.page && ct.includes("text/html")) {
    outHeaders.set(
      "content-security-policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
      "style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co " +
      "https://geocoding-api.open-meteo.com https://cdn.jsdelivr.net; img-src 'self' data: https:; " +
      "font-src 'self' data:; manifest-src 'self'; media-src 'self' blob:; worker-src 'self' blob:; " +
      "object-src 'none'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'"
    );
    outHeaders.set("cache-control","no-store");
    let html = await upstream.text();
    html = html.replaceAll("/api/","/api/v1/compat-api/");
    html = html.replace("<head>","<head><base target=\"_top\">");
    return new Response(html,{status:upstream.status,headers:outHeaders});
  }
  return new Response(upstream.body,{status:upstream.status,headers:outHeaders});
}
app.all("/compat/page",async(c)=>{
  const path=c.req.query("path")||"", search=c.req.query("search")||"";
  if(!safeCompatPath(path)||!legacyPageAllowed(path)) return c.json({error:"unsupported_compat_page"},404);
  if(search&&(!search.startsWith("?")||search.length>2048)) return c.json({error:"invalid_search"},400);
  return proxyLegacy(c.req.raw,path+search,{page:true,preserveQuery:false});
});

function tailAfter(request: Request, marker: string){
  const path=new URL(request.url).pathname, i=path.indexOf(marker);
  return i>=0?path.slice(i+marker.length).replace(/^[/]+/,""):"";
}
app.all("/compat-api/*",(c)=>{
  const rest = tailAfter(c.req.raw,"/compat-api/");
  if (!safeCompatTail(rest)) return c.json({error:"invalid_compat_api"},400);
  const root = rest.split("/")[0]?.toLowerCase();
  if (!LEGACY_API_ROOTS.has(root)) return c.json({error:"unsupported_compat_api"},404);
  return proxyLegacy(c.req.raw,"/api/"+rest);
});
app.all("/compat-ical/*",(c)=>{
  const rest = tailAfter(c.req.raw,"/compat-ical/");
  if (!safeCompatTail(rest)) return c.json({error:"invalid_ical_path"},400);
  return proxyLegacy(c.req.raw,"/ical/"+rest);
});
app.all("/compat-embed/*",(c)=>{
  const rest = tailAfter(c.req.raw,"/compat-embed/");
  if (!safeCompatTail(rest)) return c.json({error:"invalid_embed_path"},400);
  return proxyLegacy(c.req.raw,"/embed/"+rest);
});
app.all("/compat-static",(c)=>{const path=c.req.query("path")||"";if(!LEGACY_STATIC.has(path))return c.json({error:"unsupported_static_asset"},404);return proxyLegacy(c.req.raw,path,{preserveQuery:false})});
const legacyV1=(c:any,suffix:string)=>proxyLegacy(c.req.raw,"/api/v1"+suffix);
app.all("/today",(c)=>legacyV1(c,"/today"));
app.all("/convert",(c)=>legacyV1(c,"/convert"));
app.all("/festivals",(c)=>legacyV1(c,"/festivals"));
app.all("/holidays",(c)=>legacyV1(c,"/holidays"));
app.all("/market/latest",(c)=>legacyV1(c,"/market/latest"));
app.all("/openapi.json",(c)=>legacyV1(c,"/openapi.json"));
app.all("/panchang",(c)=>legacyV1(c,"/panchang"));
app.all("/tithi/derive",(c)=>legacyV1(c,"/tithi/derive"));
app.all("/tithi/next",(c)=>legacyV1(c,"/tithi/next"));
app.all("/calendar/:year/:month",(c)=>legacyV1(c,"/calendar/"+c.req.param("year")+"/"+c.req.param("month")));
app.all("/rashifal/metadata",(c)=>proxyLegacy(c.req.raw,"/api/rashifal/metadata"));
app.all("/rashifal/universal",(c)=>proxyLegacy(c.req.raw,"/api/rashifal/universal"));
app.all("/rashifal/personalized",(c)=>proxyLegacy(c.req.raw,"/api/rashifal/personalized"));
app.all("/rashifal/service-token-hash",(c)=>proxyLegacy(c.req.raw,"/api/rashifal/service-token-hash"));
app.all("/cron/rashifal",(c)=>proxyLegacy(c.req.raw,"/api/cron/rashifal"));

app.get("/health", (c) => c.json({
  status: "online",
  runtime: "Deno",
  framework: "Hono"
}));

app.get("/sync", async (c) => {
  if (!(await publicRateAllowed(c.req.raw,"router-sync",240))) {
    return c.json({success:false,error:"rate_limit_exceeded",retry_after:"1 hour"},429,{"Retry-After":"3600"});
  }
  const start = c.req.query("start");
  const end = c.req.query("end");
  const cacheHeaders = {
    "Cache-Control": "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400"
  };

  const { getCalendarDate, getCalendarRange, getCalendarCoverage } =
    await import("./services/calendarService.ts");

  if (start != null || end != null) {
    if (!validDate(start) || !validDate(end)) {
      return c.json({
        success: false,
        error: "invalid_range",
        expected: "start=YYYY-MM-DD&end=YYYY-MM-DD"
      }, 400);
    }

    const count = daysInclusive(start, end);
    if (count < 1 || count > 62) {
      return c.json({
        success: false,
        error: "range_limit_exceeded",
        max_days: 62
      }, 400);
    }

    const calendars = await getCalendarRange(start, end);
    const days = calendars.map((calendar) => syncPayload(calendar.ad, calendar));

    return c.json({
      success: true,
      start_date: start,
      end_date: end,
      requested_days: count,
      returned_days: days.length,
      days,
      coverage: getCalendarCoverage()
    }, 200, cacheHeaders);
  }

  const date = c.req.query("date") || todayNepal();
  if (!validDate(date)) {
    return c.json({ success: false, error: "invalid_date", expected: "YYYY-MM-DD" }, 400);
  }

  const calendar = await getCalendarDate(date);
  if (!calendar) {
    return c.json({
      success: false,
      error: "date_outside_existing_patro_archive",
      query_date: date,
      coverage: getCalendarCoverage()
    }, 422);
  }

  return c.json(syncPayload(date, calendar), 200, cacheHeaders);
});

app.get("/nasa/apod", async (c) => {
  if (!(await publicRateAllowed(c.req.raw,"router-nasa-apod",60))) {
    return c.json({error:"rate_limit_exceeded",retry_after:"1 hour"},429,{"Retry-After":"3600"});
  }
  const date = c.req.query("date") || todayNepal();
  if (!validDate(date)) return c.json({ error: "invalid_date", expected: "YYYY-MM-DD" }, 400);
  const { fetchNasaApod } = await import("./services/nasaService.ts");
  const payload = await fetchNasaApod(date);
  return c.json(payload, 200, {
    "Cache-Control": payload.is_fallback
      ? "public, max-age=60, s-maxage=300"
      : "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800"
  });
});

app.get("/nasa/cosmic", async (c) => {
  if (!(await publicRateAllowed(c.req.raw,"router-nasa-cosmic",60))) {
    return c.json({error:"rate_limit_exceeded",retry_after:"1 hour"},429,{"Retry-After":"3600"});
  }
  const date = c.req.query("date") || todayNepal();
  if (!validDate(date)) return c.json({ error: "invalid_date", expected: "YYYY-MM-DD" }, 400);
  const { fetchCosmicDay } = await import("./services/cosmicService.ts");
  const payload = await fetchCosmicDay(date);
  return c.json(payload, 200, {
    "Cache-Control": "public, max-age=60, s-maxage=900, stale-while-revalidate=3600"
  });
});

app.get("/astronomy/tithi", async (c) => {
  if (!(await publicRateAllowed(c.req.raw,"router-astronomy-tithi",240))) {
    return c.json({error:"rate_limit_exceeded",retry_after:"1 hour"},429,{"Retry-After":"3600"});
  }
  const date = c.req.query("date") || todayNepal();
  if (!validDate(date)) return c.json({ error: "invalid_date", expected: "YYYY-MM-DD" }, 400);

  const latRaw = c.req.query("lat");
  const lngRaw = c.req.query("lng");
  const lat = latRaw == null ? 27.7172 : Number(latRaw);
  const lng = lngRaw == null ? 85.3240 : Number(lngRaw);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return c.json({ error: "invalid_lat" }, 400);
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return c.json({ error: "invalid_lng" }, 400);

  try {
    const [{ calculateAstronomicalTithi }, { getCalendarDate }] = await Promise.all([
      import("./services/tithiEngine.ts"),
      import("./services/calendarService.ts")
    ]);
    const calendar = await getCalendarDate(date);
    const result = calculateAstronomicalTithi({
      date,
      lat,
      lng,
      bsFormatted: calendar?.bs.formatted ?? null,
      nsFormatted: calendar?.ns.formatted ?? null
    });
    return c.json(result, 200, {
      "Cache-Control": "public, max-age=60, s-maxage=1800"
    });
  } catch (error) {
    return c.json({ error: String((error as Error)?.message || error) }, 400);
  }
});


app.get("/media/proxy", async (c) => {
  const mediaKey = "router-media|" + clientIp(c.req.raw);
  if (!fallbackRateAllowed(mediaKey, 7200)) {
    return c.json({ error: "rate_limit_exceeded", retry_after: "1 hour" }, 429, { "Retry-After": "3600" });
  }
  const raw = c.req.query("url");
  if (!raw) return c.json({ error: "missing_stream_url" }, 400);
  try {
    const { proxyMedia } = await import("./services/mediaProxy.ts");
    return await proxyMedia(c.req.raw, raw);
  } catch (error) {
    const message = String((error as Error)?.message || error);
    const badRequest = [
      "invalid_stream_url",
      "unsupported_stream_protocol",
      "stream_host_not_allowed",
      "credentials_not_allowed"
    ].includes(message);
    return c.json({ error: message }, badRequest ? 400 : 502);
  }
});

app.notFound((c) => c.json({
  error: "not_found",
  routes: ["/health","/sync","/nasa/apod","/nasa/cosmic","/astronomy/tithi","/media/proxy","/today","/convert","/holidays","/panchang","/tithi/next","/calendar/*","/rashifal/*"]
}, 404));

app.onError((error, c) => {
  console.error("router_error", error);
  return c.json({ error: "internal_error" }, 500);
});

Deno.serve((req: Request) => {
  const url = new URL(req.url);
  if (url.pathname === "/router" || url.pathname.startsWith("/router/")) {
    url.pathname = "/functions/v1" + url.pathname;
    const init: RequestInit = {
      method: req.method,
      headers: req.headers,
      body: (req.method === "GET" || req.method === "HEAD") ? undefined : req.body,
      redirect: req.redirect,
      signal: req.signal
    };
    return app.fetch(new Request(url.toString(), init));
  }
  return app.fetch(req);
});
