import connectedWorker from "./connected-entry";
import { fastCalendarResponse } from "./calendar-fast";
import { fastHistoryResponse } from "./history-fast";
import { staticFestivalResponse } from "./festival-static";
import { quotaCachedResponse } from "./quota-cache";
import { speechApiResponse } from "./speech";
import { nativeRashifalResponse } from "./rashifal-native";

/**
 * Production wrapper:
 * - speech stays uncached because it is user/input specific;
 * - deterministic festival identities/occurrences are served from build assets before
 *   legacy festival redirects, so they do not spend D1 reads;
 * - Rashifal public broadcasts and private birthday calculations are resolved by the
 *   native deterministic engine before any connected/legacy storage runtime;
 * - public reference/calendar/history routes use Cache API first, then optional KV/R2,
 *   then D1/connected runtime;
 * - private, mutable and compatibility routes remain untouched.
 */
const optimizedWorker = {
  ...connectedWorker,
  async fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext) {
    const speech = await speechApiResponse(request, env);
    if (speech) return speech;

    const festival = await staticFestivalResponse(request, env as any);
    if (festival) return festival;

    return quotaCachedResponse(request, env as any, ctx, async () => {
      const rashifal = await nativeRashifalResponse(request, ctx);
      if (rashifal) return rashifal;

      const history = await fastHistoryResponse(request, env as any);
      if (history) return history;

      const calendar = await fastCalendarResponse(request, env as any);
      if (calendar) return calendar;

      return connectedWorker.fetch(request, env as any, ctx);
    }) as Promise<Response>;
  },
};

export default optimizedWorker;
