import connectedWorker from "./connected-entry";
import { fastCalendarResponse } from "./calendar-fast";
import { fastHistoryResponse } from "./history-fast";
import { speechApiResponse } from "./speech";

/**
 * Thin production wrapper that keeps the full connected worker intact while routing
 * hot/native endpoints before the larger compatibility worker.
 */
const optimizedWorker = {
  ...connectedWorker,
  async fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext) {
    const speech = await speechApiResponse(request, env);
    if (speech) return speech;
    const history = await fastHistoryResponse(request, env as any);
    if (history) return history;
    const fast = await fastCalendarResponse(request, env as any);
    if (fast) return fast;
    return connectedWorker.fetch(request, env as any, ctx);
  },
};

export default optimizedWorker;
