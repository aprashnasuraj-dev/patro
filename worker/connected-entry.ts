import productionWorker from "./entry";
import { rewriteConnectedSeo } from "./connected-seo";
import { handleAgentSurface } from "./agent-gateway";
import { withAdminConsole } from "./admin-console";

type AssetBinding = { fetch(request: Request): Promise<Response> };
type Env = Record<string, unknown> & {
  SUPABASE_COMPAT_ORIGIN?: string;
  PUBLIC_SITE_URL?: string;
  ASSETS?: AssetBinding;
};

const COMPAT_PREFIX = "/api/v1/compat-api/";
const ALLOWED_COMPAT_ROOTS = new Set(["tv", "fm", "samachar"]);
const LEGACY_REDIRECTS: Record<string, string> = {
  "/aaja": "/",
  "/astro": "/tools/astro",
  "/my-diary": "/me/diary",
  "/notes": "/me/notes",
  "/planner": "/me/planner",
  "/family": "/me/family",
  "/family/join": "/me/family",
  "/tools/family": "/me/family",
  "/tithi": "/me/reminders",
  "/settings/notifications": "/me/reminders",
  "/tools/tithi": "/me/reminders",
  "/card": "/me/cards",
  "/tools/card": "/me/cards",
  "/settings": "/me/settings",
  "/settings/holidays": "/me/settings",
  "/my-data": "/me/data",
  "/tools/my-data": "/me/data",
  "/diaspora": "/tools/clock",
  "/jyotish/rashifal": "/rashifal",
  "/jyotish/china/rashi": "/rashifal",
  "/jyotish/janma-patro": "/jyotish/china",
  "/explore": "/tools",
  "/search": "/tools",
  "/feedback": "/contact",
  "/data-trust": "/privacy",
  "/astrology": "/rashifal",
  "/nepal-sambat": "/nepal-sambat/mandala",
};
const SPA_EXACT = new Set([
  "/", "/today", "/methodology", "/corrections", "/tools", "/tools/astro", "/me", "/convert", "/rashifal", "/samachar", "/fm", "/tv",
  "/time-machine", "/on-this-day", "/jyotish/china", "/jyotish/matchmaking", "/privacy", "/terms",
  "/about", "/sources", "/contact", "/developers", "/offline", "/samudaya", "/nepal-sambat/mandala",
  "/samudaya/lhosar", "/samudaya/tharu", "/samudaya/mithila", "/samudaya/kirat", "/samudaya/hijri", "/samudaya/chakra",
  "/aaja", "/astro", "/my-diary", "/notes", "/planner", "/family", "/family/join", "/settings",
  "/settings/notifications", "/settings/holidays", "/settings/community", "/my-data", "/card", "/tithi", "/diaspora",
  "/jyotish/rashifal", "/jyotish/janma-patro", "/nepal-sambat", "/explore"
]);
const PRIVATE_SPA_PREFIXES = ["/me", "/family", "/my-diary", "/notes", "/planner", "/settings", "/my-data", "/admin"];
const PRIVATE_TOOL_PATHS = new Set(["/tools/family", "/tools/my-data", "/tools/card", "/tools/tithi"]);
const SEARCH_NOINDEX_EXACT = new Set(["/samachar", "/developers", "/tools/api", "/offline"]);
const PRERENDER_MARKER = 'data-seo-prerender="true"';

function cleanPath(pathname: string) {
  return pathname.replace(/\/+$/, "") || "/";
}

function legacyRedirectResponse(request: Request) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  const path = cleanPath(url.pathname);
  // There are no standalone festival pages; old /festivals/<slug>/<year> links go to the
  // homepage, which lists upcoming festivals.
  const target = path.startsWith("/family/") ? "/me/family"
    : path === "/festivals" || path.startsWith("/festivals/") ? "/"
    : LEGACY_REDIRECTS[path];
  if (!target || target === path) return null;
  url.pathname = target;
  return Response.redirect(url.toString(), 301);
}

function isSpaPath(pathname: string) {
  const path = cleanPath(pathname);
  if (path === "/tools/sw.js") return false;
  return SPA_EXACT.has(path)
    || path.startsWith("/calendar/")
    || path.startsWith("/date/")
    || path.startsWith("/countdown/")
    || path.startsWith("/panchang/")
    || path.startsWith("/festivals/")
    || path.startsWith("/sait/")
    || path.startsWith("/widget/")
    || path.startsWith("/me/")
    || path.startsWith("/settings/")
    || path.startsWith("/tools/")
    || path.startsWith("/jyotish/");
}

function isPrivateSpaPath(path: string) {
  return PRIVATE_TOOL_PATHS.has(path) || PRIVATE_SPA_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + "/"));
}

function secureSpaResponse(request: Request, response: Response, seoSource = "runtime") {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  headers.set("permissions-policy", "camera=(), microphone=(self), payment=(), usb=(), browsing-topics=()");
  headers.set("x-dns-prefetch-control", "off");
  headers.set("x-patro-shell", "root-spa");
  headers.set("x-patro-seo-source", seoSource);
  const path = cleanPath(new URL(request.url).pathname);
  if (isPrivateSpaPath(path)) {
    headers.set("x-robots-tag", "noindex, nofollow");
    headers.set("cache-control", "private, no-store, max-age=0");
  } else if (SEARCH_NOINDEX_EXACT.has(path)) {
    headers.set("x-robots-tag", "noindex, follow");
  }
  return new Response(request.method === "HEAD" ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function htmlAssetResponse(request: Request, env: Env, assetPath: string, preferPrerender = false) {
  if (!env.ASSETS || (request.method !== "GET" && request.method !== "HEAD")) return null;
  const url = new URL(request.url);
  // Static assets use html_handling "auto-trailing-slash": "/x/index.html" answers 307 → "/x/".
  // Ask for the canonical directory URL, and follow one internal redirect, so each route gets
  // its own prerendered page instead of silently falling back to the homepage shell.
  url.pathname = assetPath.endsWith("/index.html") ? assetPath.slice(0, -"index.html".length) : assetPath;
  let response = await env.ASSETS.fetch(new Request(url.toString(), { method: request.method, headers: request.headers }));
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) return null;
    const next = new URL(location, url);
    if (next.origin !== url.origin) return null;
    response = await env.ASSETS.fetch(new Request(next.toString(), { method: request.method, headers: request.headers }));
  }
  if (!response.ok) return null;
  const type = response.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("text/html")) return null;

  if (preferPrerender && request.method === "GET") {
    const text = await response.clone().text();
    if (text.includes(PRERENDER_MARKER)) return secureSpaResponse(request, response, "build-prerender");
  }
  return secureSpaResponse(request, rewriteConnectedSeo(request, response, env), "runtime-rewrite");
}

async function exactSpaAssetResponse(request: Request, env: Env) {
  const path = cleanPath(new URL(request.url).pathname);
  const assetPath = path === "/" ? "/index.html" : `${path}/index.html`;
  return htmlAssetResponse(request, env, assetPath, true);
}

async function rootSpaResponse(request: Request, env: Env) {
  return htmlAssetResponse(request, env, "/index.html", false);
}

// Self-contained tool apps shipped as folders in dist/ (e.g. /nepali-tools/). The asset store
// answers "/x/index.html" with a 307 to "/x/", and "/x/" never reached the asset store, so the
// Nepali Typing / Preeti tools loaded blank. Serve the folder index here, embeddable by our own pages.
const MICRO_APP = /^\/(nepali-tools|nepali-typing)(\/|\/index\.html)?$/;
async function microAppResponse(request: Request, env: Env, pathname: string) {
  const m = pathname.match(MICRO_APP);
  if (!m || !env.ASSETS || (request.method !== "GET" && request.method !== "HEAD")) return null;
  const url = new URL(request.url);
  url.pathname = `/${m[1]}/`;
  const res = await env.ASSETS.fetch(new Request(url.toString(), { method: request.method, headers: request.headers }));
  if (!res.ok) return null;
  const headers = new Headers(res.headers);
  headers.set("content-security-policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; frame-ancestors 'self'; base-uri 'self'; object-src 'none'");
  headers.delete("x-frame-options");
  headers.set("x-content-type-options", "nosniff");
  headers.set("cache-control", "public, max-age=300");
  return new Response(request.method === "HEAD" ? null : res.body, { status: 200, headers });
}

// /api/v1/news is proxied to the legacy Supabase router. When that is unreachable, serve the
// newest articles already stored in D1 instead of an empty page.
const NEWS_SOURCE_NAMES: Record<string, string> = {
  "bbc-nepali": "BBC नेपाली", "onlinekhabar": "अनलाइनखबर", "setopati": "सेतोपाटी", "ekantipur": "कान्तिपुर",
  "nagarik": "नागरिक", "ratopati": "रातोपाटी", "ujyaalo": "उज्यालो", "annapurna": "अन्नपूर्ण पोस्ट", "gorkhapatra": "गोरखापत्र",
  "nepalkhabar": "नेपाल खबर", "nepalpress": "नेपाल प्रेस", "kathmandupost": "The Kathmandu Post", "arthasarokar": "अर्थ सरोकार",
  "bizmandu": "बिजमाण्डू", "deshsanchar": "देशसञ्चार", "khabarhub": "खबरहब", "imagekhabar": "इमेज खबर", "shilapatra": "शिलापत्र",
  "himalkhabar": "हिमाल खबर", "hamrokhelkud": "हाम्रो खेलकुद",
};
async function archivedNewsResponse(request: Request, env: Env) {
  const db = (env as any).DB;
  if (!db || request.method !== "GET") return null;
  const limit = Math.max(1, Math.min(60, Number(new URL(request.url).searchParams.get("limit")) || 30));
  try {
    const rows = await db.prepare(
      "select payload from content_records where table_name='news_items' order by json_extract(payload,'$.published_at') desc limit ?1"
    ).bind(limit).all();
    const items = (rows?.results || []).map((r: any) => {
      let n: any = {};
      try { n = JSON.parse(r.payload); } catch { return null; }
      const sourceId = String(n.source_id || "");
      return {
        id: n.id, url: n.url, title: n.title, summary: n.excerpt || null, image_url: n.image_url || null,
        source: sourceId, source_name: NEWS_SOURCE_NAMES[sourceId] || sourceId.replace(/[-_]+/g, " ") || "समाचार",
        category: n.category_raw || n.category || null, published_at: n.published_at || null,
      };
    }).filter((n: any) => n && n.url && n.title);
    if (!items.length) return null;
    return new Response(JSON.stringify({ ok: true, source: "d1-archive", stale: true, count: items.length, items }), {
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300", "x-patro-backend": "d1-news-archive", "x-robots-tag": "noindex, nofollow" },
    });
  } catch {
    return null;
  }
}

function compatSuffix(pathname: string) {
  if (pathname === "/api/v1/news") return "/compat-api/samachar/feed";
  if (!pathname.startsWith(COMPAT_PREFIX)) return null;

  const tail = pathname.slice(COMPAT_PREFIX.length);
  if (!tail || tail.length > 1024 || tail.includes("\\") || tail.includes("\0")) return null;

  try {
    const decoded = decodeURIComponent(tail);
    if (decoded.includes("\\") || decoded.includes("\0")) return null;
    if (decoded.split("/").some((part) => part === "." || part === "..")) return null;
    const root = decoded.split("/")[0]?.toLowerCase();
    if (!root || !ALLOWED_COMPAT_ROOTS.has(root)) return null;
  } catch {
    return null;
  }

  return "/compat-api/" + tail;
}

async function compatibilityResponse(request: Request, env: Env, suffix: string) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const origin = String(env.SUPABASE_COMPAT_ORIGIN || "").replace(/\/+$/, "");
  if (!origin) return null;
  const incoming = new URL(request.url);
  const target = new URL(origin + suffix);
  target.search = incoming.search;
  try {
    const upstream = await fetch(new Request(target.toString(), request));
    if (!upstream.ok) return null;
    const headers = new Headers(upstream.headers);
    headers.set("x-patro-backend", "supabase-selective-compat");
    headers.set("x-patro-compat-route", suffix.split("?")[0]);
    headers.set("x-robots-tag", "noindex, nofollow");
    return new Response(request.method === "HEAD" ? null : upstream.body, {status: upstream.status,statusText: upstream.statusText,headers});
  } catch { return null; }
}

async function normalizePublicApiBrand(pathname: string, response: Response) {
  if (pathname !== "/api/v1/openapi.json" || !response.ok) return response;
  try {
    const payload = await response.clone().json() as any;
    if (!payload || typeof payload !== "object") return response;
    payload.info = { ...(payload.info || {}), title: "Aafnai Patro API · आफ्नै पात्रो" };
    const headers = new Headers(response.headers);
    headers.set("content-type", "application/json; charset=utf-8");
    headers.set("x-robots-tag", "noindex, nofollow");
    return new Response(JSON.stringify(payload), { status: response.status, statusText: response.statusText, headers });
  } catch { return response; }
}

function protectMachineSurface(pathname: string, response: Response) {
  if (!pathname.startsWith("/api/") && !pathname.startsWith("/compat-api/") && pathname!=="/mcp") return response;
  const headers = new Headers(response.headers);
  headers.set("x-robots-tag", "noindex, nofollow");
  headers.set("x-content-type-options", "nosniff");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

const connectedWorker = {
  ...productionWorker,
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const pathname = new URL(request.url).pathname;

    const redirect = legacyRedirectResponse(request);
    if (redirect) return redirect;

    const agent = await handleAgentSurface(request, env, ctx, (req,e,c)=>productionWorker.fetch(req,e as any,c));
    if (agent) return protectMachineSurface(pathname, agent);

    const micro = await microAppResponse(request, env, pathname);
    if (micro) return micro;

    if (isSpaPath(pathname)) {
      const exact = await exactSpaAssetResponse(request, env);
      if (exact) return exact;
      const spa = await rootSpaResponse(request, env);
      if (spa) return spa;
    }

    const nativeResponse = await productionWorker.fetch(request, env as any, ctx);
    const branded = await normalizePublicApiBrand(pathname, nativeResponse);
    const response = protectMachineSurface(pathname, branded);
    if (response.status !== 404) return rewriteConnectedSeo(request, response, env);

    const suffix = compatSuffix(pathname);
    if (!suffix) return rewriteConnectedSeo(request, response, env);
    const compat = await compatibilityResponse(request, env, suffix);
    if (compat) return compat;
    if (pathname === "/api/v1/news") {
      const archived = await archivedNewsResponse(request, env);
      if (archived) return archived;
    }
    return rewriteConnectedSeo(request, response, env);
  },
};

// /admin console, live site config (theme, renames, banner, features), analytics.
export default withAdminConsole(connectedWorker);
