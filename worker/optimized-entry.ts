import connectedWorker from "./connected-entry";
import { fastCalendarResponse } from "./calendar-fast";
import { fastHistoryResponse } from "./history-fast";

/**
 * Thin production wrapper that keeps the full connected worker intact while routing
 * the hottest calendar/history lookups through indexed D1 access first.
 */
const optimizedWorker = {
  ...connectedWorker,
  async fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext) {
    const history = await fastHistoryResponse(request, env as any);
    if (history) return history;
    const fast = await fastCalendarResponse(request, env as any);
    if (fast) return fast;
    return connectedWorker.fetch(request, env as any, ctx);
  },
};

export default optimizedWorker;
