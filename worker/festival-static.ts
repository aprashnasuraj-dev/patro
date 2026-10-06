type AssetBinding = { fetch(request: Request): Promise<Response> };
type FestivalAssetEnv = { ASSETS?: AssetBinding };

const FESTIVAL_ROUTE = /^\/festivals\/([^/]+)(?:\/(\d{4}))?\/?$/;

function secureHtml(request: Request, response: Response) {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("x-patro-backend", "static-festival-archive");
  headers.set("cache-control", "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800");
  return new Response(request.method === "HEAD" ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function staticFestivalResponse(request: Request, env: FestivalAssetEnv): Promise<Response | null> {
  if (!env.ASSETS || (request.method !== "GET" && request.method !== "HEAD")) return null;
  const incoming = new URL(request.url);
  const match = incoming.pathname.match(FESTIVAL_ROUTE);
  if (!match) return null;

  const slug = match[1];
  const year = match[2];
  if (!/^[a-z0-9\p{L}-]+$/u.test(slug)) return null;

  const assetUrl = new URL(incoming);
  assetUrl.search = "";
  assetUrl.pathname = year ? `/festivals/${slug}/${year}/` : `/festivals/${slug}/`;

  let response = await env.ASSETS.fetch(new Request(assetUrl.toString(), {
    method: request.method,
    headers: request.headers,
  }));

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) return null;
    const next = new URL(location, assetUrl);
    if (next.origin !== assetUrl.origin) return null;
    response = await env.ASSETS.fetch(new Request(next.toString(), {
      method: request.method,
      headers: request.headers,
    }));
  }

  if (!response.ok) return null;
  if (!(response.headers.get("content-type") || "").toLowerCase().includes("text/html")) return null;
  return secureHtml(request, response);
}
