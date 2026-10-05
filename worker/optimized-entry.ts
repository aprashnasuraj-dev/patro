import connectedWorker from "./connected-entry";
import { fastCalendarResponse } from "./calendar-fast";
import { fastHistoryResponse } from "./history-fast";
import { speechApiResponse } from "./speech";

type FastHandler = () => Promise<Response | null>;

/**
 * Normalize public hot-path cache keys. The homepage adds `fresh` only to bypass a
 * browser's stale response; it must not fragment the shared edge cache and trigger
 * another D1 read for every browser/session.
 */
function publicCacheKey(request: Request) {
  const url = new URL(request.url);
  if (url.pathname === "/api/v1/on-this-day") url.searchParams.delete("fresh");
  return new Request(url.toString(), { method: "GET" });
}

async function cachedPublicFastResponse(request: Request, ctx: ExecutionContext, handler: FastHandler) {
  if (request.method !== "GET" || typeof caches === "undefined") return handler();

  const cache = caches.default;
  const key = publicCacheKey(request);
  const cached = await cache.match(key);
  if (cached) return cached;

  const response = await handler();
  if (!response) return null;

  const cacheControl = response.headers.get("cache-control") || "";
  if (response.ok && !/\b(?:no-store|private)\b/i.test(cacheControl)) {
    ctx.waitUntil(cache.put(key, response.clone()));
  }
  return response;
}

/**
 * Thin production wrapper that keeps the full connected worker intact while routing
 * hot/native endpoints before the larger compatibility worker. Public D1-backed hot
 * paths use the Workers Cache API so repeated calendar/history traffic is served from
 * the edge instead of consuming D1 rows-read quota on every request.
 */
const optimizedWorker = {
  ...connectedWorker,
  async fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext) {
    const speech = await speechApiResponse(request, env);
    if (speech) return speech;

    const history = await cachedPublicFastResponse(
      request,
      ctx,
      () => fastHistoryResponse(request, env as any),
    );
    if (history) return history;

    const fast = await cachedPublicFastResponse(
      request,
      ctx,
      () => fastCalendarResponse(request, env as any),
    );
    if (fast) return fast;

    return connectedWorker.fetch(request, env as any, ctx);
  },
};

export default optimizedWorker;
