/**
 * Explore engine entry, wired near the top of worker/optimized-entry.ts:
 *
 *   const explore = await exploreResponse(request, env as any, ctx);
 *   if (explore) return explore;
 *
 * Returns null for every path it does not own, so all existing routes behave exactly as before.
 * Owns: /sitemap-explore.xml, /sitemap-x-{family}-{n}.xml and each enabled family prefix (families.json).
 *
 * Read path, built for heavy traffic:
 *   1. Cloudflare edge cache (Cache API, 1 day + 7 days stale-while-revalidate) — most views stop here.
 *   2. Miss → exactly ONE R2 read of a prebuilt record or sitemap. No database, no fan-out queries.
 *   3. Template fill (well under 1 ms CPU), then the response is cached for the next visitor.
 *
 * Storage: the existing ARCHIVE R2 bucket under the explore/v1/ prefix (no new binding needed), or a
 * dedicated EXPLORE bucket when one is bound. Only scripts/explore + .github/workflows/explore-deploy.yml write it.
 */
import { familyById, familyForPath, isExplorePath, pageKey, SITEMAP_INDEX_PATH, SITEMAP_SHARD_RE, sitemapKey, type ExploreFamily } from "./families";
import { isIndexable, renderNotFound, renderPage, type ExploreRecord } from "./render";

export { isExplorePath } from "./families";

type R2ObjectLike = { body: ReadableStream; httpEtag: string; uploaded?: Date; text(): Promise<string> };
export type R2Like = { get(key: string): Promise<R2ObjectLike | null> };
type ExploreEnv = { EXPLORE?: R2Like; ARCHIVE?: R2Like; PUBLIC_SITE_URL?: string };
type Ctx = { waitUntil(promise: Promise<unknown>): void };

const PAGE_CACHE = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
const SITEMAP_CACHE = "public, max-age=3600, s-maxage=21600";
const NOT_FOUND_CACHE = "public, max-age=600, s-maxage=3600";

export async function exploreResponse(request: Request, env: ExploreEnv, ctx?: Ctx): Promise<Response | null> {
  const url = new URL(request.url);
  if (!isExplorePath(url.pathname)) return null;
  const head = request.method === "HEAD";
  if (request.method !== "GET" && !head) {
    return new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, HEAD", "content-type": "text/plain; charset=utf-8" } });
  }

  // One canonical URL per page: lower-case, no trailing slash. Query strings are ignored by cache and canonical.
  const clean = url.pathname.toLowerCase().replace(/\/+$/, "") || "/";
  if (clean !== url.pathname) {
    const target = new URL(url.toString());
    target.pathname = clean;
    target.search = "";
    return Response.redirect(target.toString(), 301);
  }

  const cache: Cache | undefined = (globalThis as any).caches?.default;
  const cacheKey = new Request(url.origin + clean, { method: "GET" });
  if (cache) {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) return finish(request, hit, head, "hit");
    } catch {
      /* cache unavailable: fall through to storage */
    }
  }

  const bucket = env.EXPLORE || env.ARCHIVE;
  if (!bucket) return unavailable(head);

  let response: Response;
  try {
    response = await build(clean, (env.PUBLIC_SITE_URL || url.origin).replace(/\/+$/, ""), bucket);
  } catch (error) {
    console.error("explore: storage read failed", clean, error);
    return unavailable(head);
  }

  if (cache && (response.status === 200 || response.status === 404)) {
    const put = cache.put(cacheKey, response.clone()).catch(() => undefined);
    if (ctx) ctx.waitUntil(put);
    else await put;
  }
  return finish(request, response, head, "miss");
}

/** 503 + Retry-After: crawlers retry later instead of dropping the URL as a 404. */
function unavailable(head: boolean): Response {
  return new Response(head ? null : "Temporarily unavailable", {
    status: 503,
    headers: { "content-type": "text/plain; charset=utf-8", "retry-after": "600", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}

function finish(request: Request, response: Response, head: boolean, state: string): Response {
  const headers = new Headers(response.headers);
  headers.set("x-explore-cache", state);
  const etag = headers.get("etag");
  if (response.status === 200 && etag && request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  return new Response(head ? null : response.body, { status: response.status, headers });
}

async function build(path: string, site: string, bucket: R2Like): Promise<Response> {
  if (path === SITEMAP_INDEX_PATH) return sitemapFile(bucket, "sitemap-explore.xml");
  const shard = path.match(SITEMAP_SHARD_RE);
  if (shard) return familyById(shard[1]) ? sitemapFile(bucket, path.slice(1)) : plainNotFound();

  const family = familyForPath(path)!;
  // Same slug grammar the build enforces; anything else cannot exist, so skip the storage read.
  if (path.length > 300 || !/^\/[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(path)) return notFound(family);
  const object = await bucket.get(pageKey(path));
  if (!object) return notFound(family);
  const record = JSON.parse(await object.text()) as ExploreRecord;
  if (record.v !== 1 || record.path !== path || record.family !== family.id) return notFound(family);

  const indexable = isIndexable(record, family);
  return new Response(renderPage(site, family, record), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": PAGE_CACHE,
      etag: `"${record.hash}"`,
      "last-modified": new Date(record.lastmod + "T00:00:00Z").toUTCString(),
      "x-robots-tag": indexable ? "index, follow" : "noindex, follow",
      "x-content-type-options": "nosniff",
    },
  });
}

/** Prebuilt sitemap: streamed straight from R2, zero parsing. */
async function sitemapFile(bucket: R2Like, file: string): Promise<Response> {
  const object = await bucket.get(sitemapKey(file));
  if (!object) return plainNotFound();
  return new Response(object.body, {
    status: 200,
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": SITEMAP_CACHE, etag: object.httpEtag, "x-content-type-options": "nosniff" },
  });
}

function plainNotFound(): Response {
  return new Response("Not Found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": NOT_FOUND_CACHE, "x-robots-tag": "noindex" } });
}

function notFound(family: ExploreFamily): Response {
  return new Response(renderNotFound(family), { status: 404, headers: { "content-type": "text/html; charset=utf-8", "cache-control": NOT_FOUND_CACHE, "x-robots-tag": "noindex, follow" } });
}
