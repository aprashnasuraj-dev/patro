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

function secureSpaResponse(request: Request, response: Response) {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  headers.set("permissions-policy", "camera=(), microphone=(self), payment=(), usb=(), browsing-topics=()");
  headers.set("x-dns-prefetch-control", "off");
  headers.set("x-patro-shell", "root-spa");
  const path = cleanPath(new URL(request.url).pathname);
  if (isPrivateSpaPath(path)) {
    headers.set("x-robots-tag", "noindex, nofollow");
    headers.set("cache-control", "private, no-store, max-age=0");
  }
  return new Response(request.method === "HEAD" ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function rootSpaResponse(request: Request, env: Env) {
  if (!env.ASSETS || (request.method !== "GET" && request.method !== "HEAD")) return null;
  const url = new URL(request.url);
  url.pathname = "/index.html";
  const assetRequest = new Request(url.toString(), request);
  const response = await env.ASSETS.fetch(assetRequest);
  if (!response.ok) return null;
  const seoResponse = rewriteConnectedSeo(request, response, env);
  return secureSpaResponse(request, seoResponse);
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
    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  } catch {
    return null;
  }
}

export default {
  ...productionWorker,
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const pathname = new URL(request.url).pathname;

    if (isSpaPath(pathname)) {
      const spa = await rootSpaResponse(request, env);
      if (spa) return spa;
    }

    const response = await productionWorker.fetch(request, env as any, ctx);
    if (response.status !== 404) return response;

    const suffix = compatSuffix(pathname);
    if (!suffix) return response;

    return (await compatibilityResponse(request, env, suffix)) || response;
  },
};
