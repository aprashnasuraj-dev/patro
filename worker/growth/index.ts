/**
 * Growth page families, wired into worker/optimized-entry.ts (the production entry) before any D1/KV/R2 work.
 *
 *   Global (EN + DE/FR/ES/IT): /moon/*, /de/mond, /fr/lune, /es/luna, /it/luna (+ full-moon years),
 *                              /eclipse/*, /de/finsternis/*, /fr/eclipse/*, /es/eclipse/*, /it/eclissi/*
 *   Nepal for the world (EN):  /nepal, /nepal/time, /nepal/year, /nepal/trek-weather/*
 *   US diaspora (EN):          /us/*
 *   Nepal (NE-first):          /weather/*
 *
 * CLOUDFLARE FREE PLAN (default): every page is PRERENDERED at build time by scripts/prerender-growth.mjs into
 * dist/ (e.g. /moon → dist/moon.html) and served as a static asset — free and unlimited, no Worker request,
 * no CPU, no D1/KV/R2. Live values (moon phase, BS date, weather) are computed or fetched in the visitor's browser.
 * wrangler.jsonc excludes these paths from run_worker_first so the Worker is not invoked for them.
 * If a request still reaches the Worker (missing file, old config), growthPageResponse() only proxies the static
 * asset or returns a cheap 404/redirect — it never runs the astronomy engine (the Free plan allows 10 ms CPU).
 *
 * WORKERS PAID PLAN: set GROWTH_DYNAMIC="1" to render on demand instead (Cache API keyed by path).
 */
import type { GrowthEnv } from "./html";
import { eclipsePageResponse, eclipseRoutes } from "./eclipse-pages";
import { moonI18nPageResponse, moonI18nRoutes } from "./moon-i18n-pages";
import { moonPageResponse, moonRoutes } from "./moon-pages";
import { nepalPageResponse, nepalRoutes } from "./nepal-pages";
import { usFestivalPageResponse, usFestivalRoutes } from "./us-festival-pages";
import { weatherPageResponse, weatherRoutes } from "./weather-pages";

const PREFIXES = ["/moon", "/us", "/weather", "/eclipse", "/nepal", "/de/mond", "/de/finsternis", "/fr/lune", "/fr/eclipse", "/es/luna", "/es/eclipse", "/it/luna", "/it/eclissi"];
export const isGrowthPath = (pathname: string) => {
  const p = (pathname.replace(/\/+$/, "") || "/").toLowerCase();
  return PREFIXES.some((x) => p === x || p.startsWith(x + "/"));
};

const HANDLERS = [moonPageResponse, moonI18nPageResponse, eclipsePageResponse, nepalPageResponse, usFestivalPageResponse, weatherPageResponse];

type GrowthWorkerEnv = GrowthEnv & { ASSETS?: { fetch(request: Request): Promise<Response> }; GROWTH_DYNAMIC?: string };

export async function growthPageResponse(request: Request, env: GrowthWorkerEnv): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  if (!isGrowthPath(url.pathname)) return null;
  if (env.GROWTH_DYNAMIC === "1") return dynamicResponse(request, env);

  // Free plan: cheap path only. Normalise case and trailing slash, then hand over to the static file.
  const clean = (url.pathname.replace(/\/+$/, "") || "/").toLowerCase();
  if (clean !== url.pathname) { url.pathname = clean; url.search = ""; return Response.redirect(url.toString(), 301); }
  const y = new Date().getUTCFullYear();
  const hubs: Record<string, string> = {
    "/us": "/us/festivals", "/moon/full-moon": `/moon/full-moon/${y}`, "/moon/new-moon": `/moon/new-moon/${y}`, "/moon/calendar": `/moon/calendar/${y}`,
    "/de/mond/vollmond": `/de/mond/vollmond/${y}`, "/fr/lune/pleine-lune": `/fr/lune/pleine-lune/${y}`, "/es/luna/luna-llena": `/es/luna/luna-llena/${y}`, "/it/luna/luna-piena": `/it/luna/luna-piena/${y}`,
  };
  if (hubs[clean]) { url.pathname = hubs[clean]; url.search = ""; return Response.redirect(url.toString(), 302); }
  if (env.ASSETS) {
    const asset = await env.ASSETS.fetch(new Request(url.origin + clean, { method: request.method, headers: request.headers }));
    if (asset.status !== 404) return asset;
  }
  return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600", "x-robots-tag": "noindex, nofollow" } });
}

async function dynamicResponse(request: Request, env: GrowthEnv): Promise<Response | null> {
  const url = new URL(request.url);
  const cache: Cache | undefined = (globalThis as any).caches?.default;
  const key = new Request(url.origin + url.pathname, { method: "GET" });
  if (cache) {
    try {
      const hit = await cache.match(key);
      if (hit) {
        const headers = new Headers(hit.headers);
        headers.set("x-patro-cache", "hit");
        return new Response(request.method === "HEAD" ? null : hit.body, { status: hit.status, headers });
      }
    } catch { /* cache unavailable: compute */ }
  }
  let response: Response | null = null;
  for (const handler of HANDLERS) {
    response = await handler(key, env);
    if (response) break;
  }
  if (!response) return null;
  if (cache && response.status === 200) {
    try { await cache.put(key, response.clone()); } catch { /* best effort */ }
  }
  if (request.method === "HEAD") return new Response(null, { status: response.status, headers: response.headers });
  return response;
}

/**
 * Build-time rendering for the Free plan. Returns every indexable page as { route, file, html }.
 * file: "/moon" → "moon.html", "/moon/new-york" → "moon/new-york.html" (Workers Static Assets with the default
 * html_handling "auto-trailing-slash" serves moon.html at /moon, so canonical URLs stay without a slash).
 */
export async function growthStaticPages(now = new Date(), site = "https://aafnaipatro.com") {
  const env: GrowthEnv = { PUBLIC_SITE_URL: site, GROWTH_STATIC: "1" };
  const out: Array<{ route: string; file: string; html: string }> = [];
  for (const route of growthSitemapRoutes(now)) {
    const req = new Request(site + route);
    let res: Response | null = null;
    for (const h of [moonPageResponse, moonI18nPageResponse, eclipsePageResponse, nepalPageResponse, usFestivalPageResponse] as const) {
      res = await h(req, env, now);
      if (res) break;
    }
    if (!res) res = await weatherPageResponse(req, env);
    if (!res || res.status !== 200) throw new Error(`Static render failed for ${route}: ${res?.status}`);
    out.push({ route, file: route.slice(1) + ".html", html: await res.text() });
  }
  return out;
}

/** Indexable routes for the sitemap (see scripts/build-growth-sitemap.mjs). */
export function growthSitemapRoutes(now = new Date()) {
  return [...moonRoutes(now), ...moonI18nRoutes(now), ...eclipseRoutes(now), ...nepalRoutes(), ...usFestivalRoutes(now), ...weatherRoutes()];
}
