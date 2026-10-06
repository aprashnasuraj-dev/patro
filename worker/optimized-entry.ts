import connectedWorker from "./connected-entry";
import { seoStaticResponse } from "./seo-static";
import { fastCalendarResponse } from "./calendar-fast";
import { fastHistoryResponse } from "./history-fast";
import { historyEventPageResponse } from "./history-event-page";
import { staticFestivalResponse } from "./festival-static";
import { quotaCachedResponse } from "./quota-cache";
import { speechApiResponse } from "./speech";

/** Canonicalize human-entered dates such as /date/2026-8-06 to /date/2026-08-06. */
function canonicalDateRedirect(request: Request): Response | null {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/date\/(\d{4})-(\d{1,2})-(\d{1,2})\/?$/);
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  const canonical = `/date/${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (url.pathname.replace(/\/+$/, "") === canonical) return null;
  url.pathname = canonical;
  return Response.redirect(url.toString(), 301);
}

/**
 * Production wrapper:
 * - speech stays uncached because it is user/input specific;
 * - sourced history-event pages render dynamically from one compact static index;
 * - deterministic festival identities/occurrences are served from build assets before
 *   legacy festival redirects, so they do not spend D1 reads;
 * - public reference/calendar/history routes use Cache API first, then optional KV/R2,
 *   then D1/connected runtime;
 * - private, mutable and compatibility routes remain untouched.
 */
const optimizedWorker = {
  ...connectedWorker,
  async fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext) {
    const normalizedDate = canonicalDateRedirect(request);
    if (normalizedDate) return normalizedDate;

    // Sitemaps/robots.txt: static asset only, crawler-safe headers, 404 when missing.
    const seoStatic = await seoStaticResponse(request, env as any);
    if (seoStatic) return seoStatic;

    const speech = await speechApiResponse(request, env);
    if (speech) return speech;

    const historyEvent = await historyEventPageResponse(request, env as any);
    if (historyEvent) return historyEvent;

    const festival = await staticFestivalResponse(request, env as any);
    if (festival) return festival;

    return quotaCachedResponse(request, env as any, ctx, async () => {
      const history = await fastHistoryResponse(request, env as any);
      if (history) return history;

      const calendar = await fastCalendarResponse(request, env as any);
      if (calendar) return calendar;

      return connectedWorker.fetch(request, env as any, ctx);
    }) as Promise<Response>;
  },
};

export default optimizedWorker;
