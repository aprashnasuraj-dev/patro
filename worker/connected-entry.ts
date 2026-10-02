import productionWorker from "./entry";
import { rewriteConnectedSeo } from "./connected-seo";

type AssetBinding = { fetch(request: Request): Promise<Response> };
type Env = Record<string, unknown> & {
  SUPABASE_COMPAT_ORIGIN?: string;
  PUBLIC_SITE_URL?: string;
  ASSETS?: AssetBinding;
};

const COMPAT_PREFIX = "/api/v1/compat-api/";
const ALLOWED_COMPAT_ROOTS = new Set(["tv", "fm", "samachar"]);
const SPA_EXACT = new Set([
  "/", "/tools", "/tools/astro", "/me", "/convert", "/rashifal", "/samachar", "/fm", "/tv",
  "/time-machine", "/on-this-day", "/jyotish/china", "/jyotish/matchmaking", "/privacy", "/terms",
  "/about", "/sources", "/contact", "/developers", "/offline",
  "/aaja", "/astro", "/my-diary", "/notes", "/planner", "/family", "/family/join", "/settings",
  "/settings/notifications", "/settings/holidays", "/my-data", "/card", "/tithi", "/diaspora",
  "/jyotish/rashifal", "/jyotish/janma-patro", "/nepal-sambat", "/explore"
]);
const PRIVATE_SPA_PREFIXES = ["/me", "/family", "/my-diary", "/notes", "/planner", "/settings", "/my-data", "/admin"];
const PRIVATE_TOOL_PATHS = new Set(["/tools/family", "/tools/my-data", "/tools/card", "/tools/tithi"]);
const SEARCH_NOINDEX_EXACT = new Set(["/samachar", "/developers", "/tools/api", "/offline"]);
const PRERENDER_MARKER = 'data-seo-prerender="true"';

function cleanPath(pathname: string) {
  return pathname.replace(/\/+$/, "") || "/";
}

function isSpaPath(pathname: string) {
  const path = cleanPath(pathname);
  if (path === "/tools/sw.js") return false;
  return SPA_EXACT.has(path)
    || path.startsWith("/calendar/")
    || path.startsWith("/date/")
    || path.startsWith("/me/")
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
  url.pathname = assetPath;
  const response = await env.ASSETS.fetch(new Request(url.toString(), request));
  if (!response.ok) return null;
  const type = response.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("text/html")) return null;

  // A build-time prerender has richer factual metadata/body than the generic runtime rewriter.
  // Preserve it exactly; use connected-seo only as the compatibility fallback for old/unrendered shells.
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
    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  } catch {
    return null;
  }
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
  } catch {
    return response;
  }
}

function protectMachineSurface(pathname: string, response: Response) {
  if (!pathname.startsWith("/api/") && !pathname.startsWith("/compat-api/")) return response;
  const headers = new Headers(response.headers);
  headers.set("x-robots-tag", "noindex, nofollow");
  headers.set("x-content-type-options", "nosniff");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  ...productionWorker,
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const pathname = new URL(request.url).pathname;

    if (isSpaPath(pathname)) {
      // Prefer build-time route HTML so crawlers receive semantic content before JS.
      // The same React application then replaces that content client-side; no tool is forked or removed.
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

    return (await compatibilityResponse(request, env, suffix)) || rewriteConnectedSeo(request, response, env);
  },
};
