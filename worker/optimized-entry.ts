import connectedWorker from "./connected-entry";
import { seoStaticResponse } from "./seo-static";
import { fastCalendarResponse } from "./calendar-fast";
import { fastHistoryResponse } from "./history-fast";
import { historyEventPageResponse } from "./history-event-page";
import { staticFestivalResponse } from "./festival-static";
import { quotaCachedResponse } from "./quota-cache";
import { speechApiResponse } from "./speech";

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