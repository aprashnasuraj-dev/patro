/**
 * Places-calendar pages (places-calendar/ generator, PR #137) served from R2, wired near the top of
 * worker/optimized-entry.ts through a null-returning hook:
 *
 *   const placesCalendar = await placesCalendarResponse(request, env as any, ctx);
 *   if (placesCalendar) return placesCalendar;
 *
 * Owns only prefixes no other route uses (tests/places-calendar-route.test.ts proves it against the published
 * baseline, dist/ and the app's routes):
 *   /kati, /janma, /shraddha, /mountains, /treks and the same under /ne/   HTML pages (directory URLs, trailing slash)
 *   /static/places/*, /og/*, /places-data/*                                  their CSS/JS/fonts, social cards, JSON
 *   /sitemap-places.xml, /sitemaps/{section}-{n}.xml                          their sitemaps
 * The generator's /places and /festivals sections are NOT served: /festivals already belongs to the site's own
 * festival pages and /places is reserved by the app.
 *
 * Storage: R2 (EXPLORE bucket when bound, else ARCHIVE) under pc/v1/, written only by
 * .github/workflows/places-calendar-deploy.yml. One R2 read per cache miss; Cloudflare edge cache in front.
 */
type R2ObjectLike = { body: ReadableStream; httpEtag: string };
type R2Like = { get(key: string): Promise<R2ObjectLike | null> };
type Env = { EXPLORE?: R2Like; ARCHIVE?: R2Like };
type Ctx = { waitUntil(promise: Promise<unknown>): void };

export const PC_STORAGE_PREFIX = "pc/v1";
export const PC_PAGE_SECTIONS = ["kati", "janma", "shraddha", "mountains", "treks"] as const;
const ASSET_PREFIXES = ["/static/places/", "/og/", "/places-data/"];
const SITEMAP_RE = /^\/sitemaps\/(kati|janma|shraddha|mountains|treks)-\d{1,3}\.xml$/;
const SAFE_PATH = /^\/[a-z0-9\-_.\/]*$/;

const TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8", css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", json: "application/json; charset=utf-8",
  xml: "application/xml; charset=utf-8", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", svg: "image/svg+xml", webp: "image/webp",
  woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", txt: "text/plain; charset=utf-8",
};
const CACHE: Record<string, string> = {
  html: "public, max-age=3600, s-maxage=21600, stale-while-revalidate=604800",
  xml: "public, max-age=3600, s-maxage=21600",
  asset: "public, max-age=86400, s-maxage=604800",
};

function pageSection(path: string): boolean {
  const parts = path.split("/").filter(Boolean);
  const first = parts[0] === "ne" ? parts[1] : parts[0];
  return !!first && (PC_PAGE_SECTIONS as readonly string[]).includes(first);
}

/** True for every path this module answers; everything else falls through untouched. */
export function isPlacesCalendarPath(pathname: string): boolean {
  if (pathname === "/sitemap-places.xml" || SITEMAP_RE.test(pathname)) return true;
  if (ASSET_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  return pageSection(pathname);
}

export async function placesCalendarResponse(request: Request, env: Env, ctx?: Ctx): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!isPlacesCalendarPath(path)) return null;
  const head = request.method === "HEAD";
  if (request.method !== "GET" && !head) return new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, HEAD" } });
  if (path.length > 400 || !SAFE_PATH.test(path) || path.includes("..") || path.includes("//")) return notFound(head);

  // Pages are directory URLs: /kati/1-tola-kati-gram/ . Add the slash (and lower-case) with one 301.
  const isPage = pageSection(path) && !/\.[a-z0-9]+$/.test(path);
  if (isPage && !path.endsWith("/")) {
    const target = new URL(url.toString());
    target.pathname = path + "/";
    target.search = "";
    return Response.redirect(target.toString(), 301);
  }

  const cache: Cache | undefined = (globalThis as any).caches?.default;
  const cacheKey = new Request(url.origin + path, { method: "GET" });
  if (cache) {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) return finish(request, hit, head);
    } catch {
      /* fall through */
    }
  }
  const bucket = env.EXPLORE || env.ARCHIVE;
  if (!bucket) return new Response(head ? null : "Temporarily unavailable", { status: 503, headers: { "retry-after": "600", "cache-control": "no-store", "x-robots-tag": "noindex" } });

  const key = PC_STORAGE_PREFIX + (isPage ? path + "index.html" : path);
  let object: R2ObjectLike | null;
  try {
    object = await bucket.get(key);
  } catch (error) {
    console.error("places-calendar: storage read failed", key, error);
    return new Response(head ? null : "Temporarily unavailable", { status: 503, headers: { "retry-after": "600", "cache-control": "no-store" } });
  }
  if (!object) return notFound(head);
  const ext = isPage ? "html" : (path.match(/\.([a-z0-9]+)$/)?.[1] ?? "");
  const response = new Response(object.body, {
    status: 200,
    headers: {
      "content-type": TYPES[ext] || "application/octet-stream",
      "cache-control": ext === "html" ? CACHE.html : ext === "xml" ? CACHE.xml : CACHE.asset,
      etag: object.httpEtag,
      "x-content-type-options": "nosniff",
    },
  });
  if (cache) {
    const put = cache.put(cacheKey, response.clone()).catch(() => undefined);
    if (ctx) ctx.waitUntil(put);
    else await put;
  }
  return finish(request, response, head);
}

function finish(request: Request, response: Response, head: boolean): Response {
  const etag = response.headers.get("etag");
  if (etag && request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: response.headers });
  return new Response(head ? null : response.body, { status: response.status, headers: response.headers });
}

function notFound(head: boolean): Response {
  return new Response(head ? null : "Not Found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=600", "x-robots-tag": "noindex" } });
}
