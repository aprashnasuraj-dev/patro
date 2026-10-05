import connectedWorker from "./connected-entry";
import { fastCalendarResponse } from "./calendar-fast";
import { fastHistoryResponse } from "./history-fast";
import { quotaCachedResponse } from "./quota-cache";
import { speechApiResponse } from "./speech";

/**
 * Production wrapper:
 * - speech stays uncached because it is user/input specific;
 * - public reference/calendar/history routes use Cache API first, then optional KV/R2,
 *   then D1/connected runtime;
 * - private, mutable and compatibility routes remain untouched.
 */
const optimizedWorker = {
  ...connectedWorker,
  async fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext) {
    const speech = await speechApiResponse(request, env);
    if (speech) return speech;

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
