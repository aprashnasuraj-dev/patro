/**
 * Explore engine entry. Wired near the top of worker/optimized-entry.ts:
 *
 *   const explore = await exploreResponse(request, env as any, ctx);
 *   if (explore) return explore;
 *
 * Returns null for every path it does not own, so all existing routes behave exactly as before.
 * Owns: /sitemap-explore.xml, /sitemap-x-{family}-{n}.xml, and each enabled family prefix (see families.ts).
 */
import { familyById, familyForPath, isExplorePath, SITEMAP_INDEX_PATH, SITEMAP_SHARD_RE, type ExploreFamily } from "./families";
import { getChildren, getPage, getShard, getShards, getShardUrls, getTitles, type D1Like } from "./db";
import { ancestorPaths, esc, isIndexable, parseBody, renderNotFound, renderPage } from "./render";

export { isExplorePath } from "./families";

type ExploreEnv = { DB?: D1Like; PUBLIC_SITE_URL?: string };
type Ctx = { waitUntil(promise: Promise<unknown>): void };

const PAGE_CACHE = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
const SITEMAP_CACHE = "public, max-age=3600, s-maxage=21600";

const siteOf = (env: ExploreEnv, url: URL) => (env.PUBLIC_SITE_URL || url.origin).replace(/\/+$/, "");

function text(body: string | null, status: number, headers: Record<string, string>, head: boolean) {
  return new Response(head ? null : body, { status, headers });
}

function unavailable(head: boolean) {
  // 503 + Retry-After tells crawlers "come back later" instead of dropping URLs as 404.
  return text("Temporarily unavailable", 503, { "content-type": "text/plain; charset=utf-8", "retry-after": "600", "cache-control": "no-store", "x-robots-tag": "noindex" }, head);
}

export async function exploreResponse(request: Request, env: ExploreEnv, ctx?: Ctx): Promise<Response | null> {
  const url = new URL(request.url);
  if (!isExplorePath(url.pathname)) return null;
  const head = request.method === "HEAD";
  if (request.method !== "GET" && !head) {
    return text("Method Not Allowed", 405, { allow: "GET, HEAD", "content-type": "text/plain; charset=utf-8" }, false);
  }

  // Canonical form: lower-case, no trailing slash. Query strings are ignored (cache key and canonical drop them).
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
      if (hit) return conditional(request, hit, head, "hit");
    } catch {
      /* cache unavailable: render */
    }
  }

  if (!env.DB) return unavailable(head);
  let response: Response;
  try {
    response = await render(clean, url, env, env.DB);
  } catch (error) {
    console.error("explore render failed", clean, error);
    return unavailable(head);
  }

  if (cache && (response.status === 200 || response.status === 404)) {
    const put = cache.put(cacheKey, response.clone()).catch(() => undefined);
    if (ctx) ctx.waitUntil(put);
    else await put;
  }
  return conditional(request, response, head, "miss");
}

function conditional(request: Request, response: Response, head: boolean, state: string): Response {
  const headers = new Headers(response.headers);
  headers.set("x-explore-cache", state);
  const etag = headers.get("etag");
  if (etag && request.headers.get("if-none-match") === etag && response.status === 200) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(head ? null : response.body, { status: response.status, headers });
}

async function render(path: string, url: URL, env: ExploreEnv, db: D1Like): Promise<Response> {
  const site = siteOf(env, url);
  if (path === SITEMAP_INDEX_PATH) return sitemapIndex(site, db);
  const shardMatch = path.match(SITEMAP_SHARD_RE);
  if (shardMatch) return sitemapShard(site, db, shardMatch[1], Number(shardMatch[2]));

  const family = familyForPath(path)!;
  const row = await getPage(db, family.id, path);
  if (!row) return notFound(family);

  const body = parseBody(row);
  const ancestorList = ancestorPaths(row.path, family.prefix);
  const [titles, children, siblingRows] = await Promise.all([
    getTitles(db, ancestorList),
    getChildren(db, row.path),
    row.parent_path ? getChildren(db, row.parent_path, 25) : Promise.resolve([]),
  ]);
  const ancestors = ancestorList.map((p) => titles.get(p)).filter((r): r is NonNullable<typeof r> => Boolean(r));
  const siblings = siblingRows.filter((s) => s.path !== row.path).slice(0, 24);
  const html = renderPage({ site, family, row, body, ancestors, children, siblings });
  const indexable = isIndexable(row, body, family);

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": PAGE_CACHE,
      etag: `"${row.content_hash}"`,
      "last-modified": new Date(row.lastmod + "T00:00:00Z").toUTCString(),
      "x-robots-tag": indexable ? "index, follow" : "noindex, follow",
      "x-content-type-options": "nosniff",
    },
  });
}

function notFound(family: ExploreFamily): Response {
  return new Response(renderNotFound(family), {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=600, s-maxage=3600", "x-robots-tag": "noindex, follow" },
  });
}

const xmlHeaders = { "content-type": "application/xml; charset=utf-8", "cache-control": SITEMAP_CACHE, "x-content-type-options": "nosniff" };

async function sitemapIndex(site: string, db: D1Like): Promise<Response> {
  const shards = (await getShards(db)).filter((s) => familyById(s.family) && s.url_count > 0);
  const lines = shards.map((s) => `  <sitemap><loc>${esc(`${site}/sitemap-x-${s.family}-${s.shard}.xml`)}</loc>${s.lastmod ? `<lastmod>${esc(s.lastmod)}</lastmod>` : ""}</sitemap>`);
  const xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...lines, "</sitemapindex>", ""].join("\n");
  return new Response(xml, { status: 200, headers: xmlHeaders });
}

async function sitemapShard(site: string, db: D1Like, familyId: string, shardNo: number): Promise<Response> {
  const family = familyById(familyId);
  const shard = family ? await getShard(db, familyId, shardNo) : null;
  if (!family || !shard) {
    return new Response("Not Found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=600" } });
  }
  const urls = await getShardUrls(db, familyId, shard.min_id, shard.max_id);
  const parts: string[] = ['<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'];
  for (const u of urls) parts.push(`  <url><loc>${site}${esc(u.path)}</loc><lastmod>${u.lastmod}</lastmod></url>\n`);
  parts.push("</urlset>\n");
  return new Response(parts.join(""), { status: 200, headers: xmlHeaders });
}
