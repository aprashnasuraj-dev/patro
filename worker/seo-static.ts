// Sitemaps and robots.txt are always served straight from the static asset store with crawler-safe
// headers: never the SPA shell, never an HTMLRewriter/CSP pass, never an x-robots-tag. Wired first in
// worker/optimized-entry.ts (production main) and worker/connected-entry.ts.
type AssetBinding = { fetch(request: Request): Promise<Response> };

const SITEMAP_PATH = /^\/sitemap[\w-]*\.xml$/;

export function isSeoStaticPath(pathname: string): boolean {
  return pathname === "/robots.txt" || SITEMAP_PATH.test(pathname);
}

export async function seoStaticResponse(request: Request, env: { ASSETS?: AssetBinding }): Promise<Response | null> {
  const url = new URL(request.url);
  if (!isSeoStaticPath(url.pathname)) return null;
  const head = request.method === "HEAD";
  const contentType = url.pathname === "/robots.txt" ? "text/plain; charset=utf-8" : "application/xml; charset=utf-8";
  if (request.method !== "GET" && !head) {
    return new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, HEAD", "content-type": "text/plain; charset=utf-8" } });
  }
  const notFound = () => new Response(head ? null : "Not Found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=300" },
  });
  if (!env.ASSETS || typeof env.ASSETS.fetch !== "function") return notFound();

  const assetUrl = new URL(url.toString());
  assetUrl.search = "";
  assetUrl.hash = "";
  let asset: Response;
  try {
    asset = await env.ASSETS.fetch(new Request(assetUrl.toString(), { method: "GET" }));
  } catch {
    return notFound();
  }
  // Anything other than a direct 200 hit (redirects, 404, an HTML fallback) is treated as missing.
  const assetType = (asset.headers.get("content-type") || "").toLowerCase();
  if (asset.status !== 200 || assetType.includes("text/html")) return notFound();

  const headers = new Headers({
    "content-type": contentType,
    "cache-control": "public, max-age=3600",
    "x-content-type-options": "nosniff",
    "x-patro-backend": "static-seo-asset",
  });
  const etag = asset.headers.get("etag");
  if (etag) headers.set("etag", etag);
  const lastModified = asset.headers.get("last-modified");
  if (lastModified) headers.set("last-modified", lastModified);
  return new Response(head ? null : asset.body, { status: 200, headers });
}
