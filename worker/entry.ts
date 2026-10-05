import worker from "./index";
import { runScheduled, type JobsEnv } from "./jobs";
import { calendarTierResponse } from "./calendar-tier";

type AssetBinding = { fetch(request: Request): Promise<Response> };
type Env = JobsEnv & Record<string, unknown> & {
  ASSETS?: AssetBinding;
};

const TOOL_TITLES: Record<string, string> = {
  typingtools: "टाइपिङ उपकरण",
  "nepali-typing": "नेपाली टाइपिङ",
  "tithi-reminder": "तिथि रिमाइन्डर",
  sait: "साइत",
  "baby-names": "बच्चाको नाम",
  "janmadin-akhbar": "जन्मदिन अखबार",
  "future-letter": "भविष्यको चिठी",
  "spell-check": "नेपाली हिज्जे जाँच",
  "voice-typing": "बोली टाइपिङ",
  ocr: "नेपाली OCR",
  "name-check": "नाम जाँच",
  "read-aloud": "पढेर सुनाउने",
  "patro-bot": "पात्रो बोट",
  family: "परिवार",
  "my-data": "डेटा",
};

const LEGACY_REDIRECTS = new Map<string, string>([
  ["/aaja", "/"],
  ["/astro", "/tools/astro"],
  ["/astro/", "/tools/astro"],
  ["/my-diary", "/me/diary"],
  ["/notes", "/me/notes"],
  ["/planner", "/me/planner"],
  ["/family", "/me/family"],
  ["/family/join", "/me/family"],
  ["/tools/family", "/me/family"],
  ["/tithi", "/me/reminders"],
  ["/settings/notifications", "/me/reminders"],
  ["/tools/tithi", "/me/reminders"],
  ["/card", "/me/cards"],
  ["/tools/card", "/me/cards"],
  ["/settings", "/me/settings"],
  ["/settings/holidays", "/me/settings"],
  ["/my-data", "/me/data"],
  ["/tools/my-data", "/me/data"],
  ["/diaspora", "/tools/clock"],
  ["/jyotish/rashifal", "/rashifal"],
  ["/jyotish/china/rashi", "/rashifal"],
  ["/jyotish/janma-patro", "/jyotish/china"],
  ["/explore", "/tools"],
  ["/search", "/tools"],
  ["/feedback", "/contact"],
  ["/data-trust", "/privacy"],
  ["/astrology", "/rashifal"],
  ["/nepal-sambat", "/nepal-sambat/mandala"],
]);

const SPA_EXACT = new Set([
  "/",
  "/tools",
  "/me",
  "/convert",
  "/rashifal",
  "/samachar",
  "/fm",
  "/tv",
  "/time-machine",
  "/on-this-day",
  "/jyotish/china",
  "/jyotish/matchmaking",
  "/privacy",
  "/terms",
  "/about",
  "/sources",
  "/contact",
  "/developers",
  "/offline",
]);

const TOOL_SLUGS = new Set([
  "astro",
  "typingtools",
  "nepali-typing",
  "preeti-converter",
  "preeti-to-unicode",
  "unicode-to-preeti",
  "preetitounicode",
  "unicodetopreeti",
  "convert",
  "bstoad",
  "adtobs",
  "calc",
  "age",
  "clock",
  "forex",
  "gold",
  "emi",
  "vat",
  "units",
  "words",
  "tax",
  "incometax",
  "land",
  "landconverter",
  "qr",
  "nepaliqr",
  "fuel",
  "fuelprice",
  "tithi-reminder",
  "sait",
  "baby-names",
  "janmadin-akhbar",
  "future-letter",
  "spell-check",
  "voice-typing",
  "ocr",
  "name-check",
  "read-aloud",
  "patro-bot",
  "api",
]);

const SPA_PERSONAL = new Set([
  "/me/diary",
  "/me/notes",
  "/me/planner",
  "/me/family",
  "/me/reminders",
  "/me/cards",
  "/me/settings",
  "/me/data",
]);

const STATIC_PREFIXES = [
  "/api/",
  "/fm-v2-stream/",
  "/fm-stream/",
  "/samudaya/",
  "/nepal-sambat/mandala/",
  "/embed/",
  "/widget/",
  "/.well-known/",
  "/nepali-typing/",
  "/astro/assets/",
  "/astro/data/",
];

const HTML_CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com https://cdn.jsdelivr.net https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://*.supabase.co https://geocoding-api.open-meteo.com https://api.open-meteo.com https://cdn.jsdelivr.net https://cloudflareinsights.com https://static.cloudflareinsights.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; frame-src 'self' https://accounts.google.com; manifest-src 'self'; media-src 'self' blob:; worker-src 'self' blob: https://cdn.jsdelivr.net; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

function canonicalPath(pathname: string) {
  if (!pathname || pathname === "/") return "/";
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function redirect(request: Request, pathname: string) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return Response.redirect(url.toString(), 301);
}

function isSpaPath(path: string) {
  if (SPA_EXACT.has(path) || SPA_PERSONAL.has(path)) return true;
  if (/^\/calendar\/\d{4}\/\d{1,2}$/.test(path)) return true;
  if (/^\/date\/\d{4}-\d{2}-\d{2}$/.test(path)) return true;
  if (path.startsWith("/tools/")) {
    const slug = path.slice("/tools/".length).split("/")[0];
    return TOOL_SLUGS.has(slug) && path === `/tools/${slug}`;
  }
  return false;
}

function isStaticPassthrough(path: string) {
  if (path === "/samudaya" || path === "/nepal-sambat/mandala" || path === "/settings/community" || path === "/admin/community-suites" || path === "/tools/samudaya") return true;
  if (STATIC_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;
  const leaf = path.split("/").pop() || "";
  return leaf.includes(".");
}

function secureDocument(response: Response, status: number, path: string, method: string) {
  const headers = new Headers(response.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("content-security-policy", HTML_CSP);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  headers.set("permissions-policy", "camera=(), microphone=(self), payment=(), usb=(), browsing-topics=()");
  headers.set("x-dns-prefetch-control", "off");
  headers.set("cache-control", "no-cache");
  if (status === 404) headers.set("x-robots-tag", "noindex, nofollow");
  if (path === "/me" || path.startsWith("/me/")) {
    headers.set("x-robots-tag", "noindex, nofollow");
    headers.set("cache-control", "private, no-store, max-age=0");
  }
  return new Response(method === "HEAD" ? null : response.body, { status, headers });
}

async function serveSpa(request: Request, env: Env, status = 200) {
  if (!env.ASSETS || typeof env.ASSETS.fetch !== "function") {
    return Response.json({ error: "assets_unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
  const original = new URL(request.url);
  const shellUrl = new URL(request.url);
  shellUrl.pathname = "/index.html";
  shellUrl.search = "";
  const shellRequest = new Request(shellUrl.toString(), { method: "GET", headers: request.headers });
  const shell = await env.ASSETS.fetch(shellRequest);
  if (!shell.ok) return shell;
  return secureDocument(shell, status, original.pathname, request.method);
}

function nepseRemoved() {
  return Response.json({
    ok: false,
    error: "nepse_integration_removed",
    message: "NEPSE/index integration is not part of Aafnai Patro production."
  }, {
    status: 410,
    headers: {
      "cache-control": "public, max-age=3600",
      "x-content-type-options": "nosniff"
    }
  });
}

async function brandCatalog(response: Response) {
  if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) return response;
  try {
    const body: any = await response.clone().json();
    if (!Array.isArray(body?.items)) return response;
    body.items = body.items.map((item: any) => {
      const slug = String(item?.slug || "");
      return TOOL_TITLES[slug] ? { ...item, title: TOOL_TITLES[slug] } : item;
    });
    const headers = new Headers(response.headers);
    headers.set("content-type", "application/json; charset=utf-8");
    return new Response(JSON.stringify(body), { status: response.status, headers });
  } catch {
    return response;
  }
}

async function doctorWithoutMarketDependency(request: Request, env: Env, ctx: ExecutionContext) {
  const response = await worker.fetch(request, env as any, ctx);
  if (!response.headers.get("content-type")?.includes("application/json")) return response;
  try {
    const body: any = await response.clone().json();
    const tables = Array.isArray(body?.database?.tables)
      ? body.database.tables.filter((row: any) => row?.table !== "market_snapshots")
      : body?.database?.tables;
    const missing = Array.isArray(body?.database?.missing)
      ? body.database.missing.filter((name: string) => name !== "market_snapshots")
      : body?.database?.missing;
    if (!Array.isArray(tables) || !Array.isArray(missing)) return response;
    const ok = missing.length === 0;
    body.ok = ok;
    body.status = ok ? "healthy" : "degraded";
    body.database = { ...body.database, ok, tables, missing };
    body.excluded_features = [
      ...(Array.isArray(body.excluded_features) ? body.excluded_features : []),
      "NEPSE/index market integration"
    ];
    const headers = new Headers(response.headers);
    headers.set("cache-control", "no-store");
    return new Response(JSON.stringify(body), { status: ok ? 200 : 503, headers });
  } catch {
    return response;
  }
}

async function callNative(request: Request, env: Env, ctx: ExecutionContext) {
  const url = new URL(request.url);
  const calendar = await calendarTierResponse(request, env as any);
  if (calendar) return calendar;
  const response = await worker.fetch(request, env as any, ctx);
  return url.pathname === "/api/v1/tools/catalog" ? brandCatalog(response) : response;
}

const productionWorker = {
  ...worker,
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    let url = new URL(request.url);
    let path = canonicalPath(url.pathname);

    const legacyTarget = LEGACY_REDIRECTS.get(url.pathname) || LEGACY_REDIRECTS.get(path);
    if (legacyTarget) return redirect(request, legacyTarget);

    if (path === "/api/v1/markets/latest" || path === "/api/v1/market/latest") {
      const kinds = (url.searchParams.get("kind") || "forex").split(",").map((value) => value.trim()).filter(Boolean);
      if (!kinds.length || kinds.some((kind) => kind !== "forex")) return nepseRemoved();
      url.pathname = "/api/v1/markets/latest";
      url.searchParams.set("kind", "forex");
      request = new Request(url.toString(), request);
      path = url.pathname;
    }

    if (path === "/api/v1/doctor") return doctorWithoutMarketDependency(request, env, ctx);

    if ((request.method === "GET" || request.method === "HEAD") && isSpaPath(path)) {
      return serveSpa(request, env, 200);
    }

    if ((request.method === "GET" || request.method === "HEAD") && !isStaticPassthrough(path) && !path.startsWith("/api/")) {
      return serveSpa(request, env, 404);
    }

    return callNative(request, env, ctx);
  },
  async scheduled(controller: { cron: string }, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runScheduled(controller.cron, env));
  }
};

export default productionWorker;