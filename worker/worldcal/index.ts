/**
 * World-calendar entry, wired into worker/optimized-entry.ts right after the explore hook:
 *
 *   const worldcal = await worldcalResponse(request, env as any, ctx);
 *   if (worldcal) return worldcal;
 *
 * Returns null for every path it does not own, so all existing routes behave exactly as before.
 * Owns: /nameday, /ethiopian-calendar, /bali-calendar, /weton, /mondkalender, /calendario-lunar, /calendario-lunare,
 *       /sitemap-worldcal.xml and /sitemap-wc-*.xml. No database, no storage: everything is computed or bundled.
 * Responses are cached at the edge (Cache API); "today" pages expire at the next local midnight.
 */
import { familyForPath, FAMILIES, isWorldcalPath, SITEMAP_CHILD_RE, SITEMAP_INDEX, type FamilyId } from "./config";
import { secondsToLocalMidnight } from "./dates";
import { esc } from "./html";
import { namedayRoute } from "./pages/nameday";
import { ethiopianRoute } from "./pages/ethiopian";
import { baliRoute, wetonRoute } from "./pages/bali-weton";
import { moonRoute } from "./pages/moon";
import { sitemapChild, sitemapIndex } from "./sitemap";
import type { Ctx, Rendered } from "./types";

export { isWorldcalPath } from "./config";

type Env = { PUBLIC_SITE_URL?: string };
const QUERY_PATHS = /\/(search|convert|otonan|hitung|jodoh)$/;
type ExecCtx = { waitUntil(p: Promise<unknown>): void };

const ROUTES: Record<FamilyId, (ctx: Ctx, rest: string[]) => Rendered | null> = {
  nameday: namedayRoute,
  ethiopian: ethiopianRoute,
  bali: baliRoute,
  weton: wetonRoute,
  "moon-de": (c, r) => moonRoute("de", c, r),
  "moon-es": (c, r) => moonRoute("es", c, r),
  "moon-it": (c, r) => moonRoute("it", c, r),
};

const NOT_FOUND_HTML = (home: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not found</title><meta name="robots" content="noindex, follow"></head><body style="font-family:system-ui;max-width:640px;margin:40px auto;padding:0 16px"><h1>Page not found</h1><p><a href="${esc(home)}">Back</a> · <a href="/">Aafnai Patro</a></p></body></html>`;

export async function worldcalResponse(request: Request, env: Env, ctx?: ExecCtx, now: Date = new Date()): Promise<Response | null> {
  const url = new URL(request.url);
  if (!isWorldcalPath(url.pathname)) return null;
  const head = request.method === "HEAD";
  if (request.method !== "GET" && !head) return new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, HEAD" } });

  // One canonical URL per page: lower-case, no trailing slash.
  const clean = url.pathname.toLowerCase().replace(/\/+$/, "") || "/";
  if (clean !== url.pathname && !SITEMAP_CHILD_RE.test(url.pathname)) {
    const target = new URL(url.toString());
    target.pathname = clean;
    return Response.redirect(target.toString(), 301);
  }
  const site = (env.PUBLIC_SITE_URL || url.origin).replace(/\/+$/, "");

  const cache: Cache | undefined = (globalThis as any).caches?.default;
  // Only the form endpoints read the query string; everything else is cached per path so random queries cannot fragment the cache.
  const keyUrl = new URL(url.toString());
  if (!QUERY_PATHS.test(clean)) keyUrl.search = "";
  const cacheKey = new Request(keyUrl.toString(), { method: "GET" });
  if (cache) {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) return finish(hit, head, "hit");
    } catch { /* cache unavailable */ }
  }

  let response: Response;
  try {
    response = render(clean, url, site, now);
  } catch (error) {
    console.error("worldcal render failed", clean, error);
    return new Response(head ? null : "Temporarily unavailable", { status: 503, headers: { "retry-after": "300", "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" } });
  }
  if (cache && (response.status === 200 || response.status === 404)) {
    const put = cache.put(cacheKey, response.clone()).catch(() => undefined);
    if (ctx) ctx.waitUntil(put); else await put;
  }
  return finish(response, head, "miss");
}

function finish(res: Response, head: boolean, state: string): Response {
  const headers = new Headers(res.headers);
  headers.set("x-worldcal-cache", state);
  return new Response(head ? null : res.body, { status: res.status, headers });
}

export function render(path: string, url: URL, site: string, now: Date): Response {
  if (path === SITEMAP_INDEX) return xml(sitemapIndex(site, now));
  const sm = path.match(SITEMAP_CHILD_RE);
  if (sm) {
    const body = sitemapChild(sm[1], site, now);
    return body ? xml(body) : new Response("Not Found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=600" } });
  }
  const family = familyForPath(path)!;
  const prefix = FAMILIES[family].prefix;
  const rest = path.slice(prefix.length).split("/").filter(Boolean);
  const ctx: Ctx = { site, url, path, now };
  const out = ROUTES[family](ctx, rest);
  if (!out) {
    return new Response(NOT_FOUND_HTML(prefix), { status: 404, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=600, s-maxage=3600", "x-robots-tag": "noindex, follow" } });
  }
  if ("location" in out) {
    return new Response(null, { status: out.status, headers: { location: out.location, "cache-control": "no-store" } });
  }
  const seconds = out.maxAge === "midnight" ? secondsToLocalMidnight(out.tz || FAMILIES[family].tz, now) : out.maxAge;
  return new Response(out.html, {
    status: out.status,
    headers: {
      "content-type": out.contentType || "text/html; charset=utf-8",
      "cache-control": `public, max-age=${Math.min(seconds, 3600)}, s-maxage=${seconds}`,
      "x-robots-tag": out.indexable ? "index, follow" : "noindex, follow",
      "x-content-type-options": "nosniff",
    },
  });
}

const xml = (body: string) => new Response(body, { status: 200, headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600, s-maxage=21600", "x-content-type-options": "nosniff" } });
