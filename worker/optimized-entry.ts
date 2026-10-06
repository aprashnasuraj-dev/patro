import connectedWorker from "./connected-entry";
import { conversionPageResponse } from "./conversion-page";
import { seoStaticResponse } from "./seo-static";
import { fastCalendarResponse } from "./calendar-fast";
import { fastHistoryResponse } from "./history-fast";
import { historyEventPageResponse } from "./history-event-page";
import { timeMachinePageResponse } from "./time-machine-page";
import { festivalPageResponse } from "./festival-page";
import { communityEventPageResponse } from "./community-event-page";
import { staticFestivalResponse } from "./festival-static";
import { quotaCachedResponse } from "./quota-cache";
import { speechApiResponse } from "./speech";
import { nativeRashifalResponse } from "./rashifal-native";

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
 * - each Time Machine record gets one dynamic detail URL while /time-machine itself stays the immersive SPA;
 * - festival hub/identity/year pages render from one compact index plus the immutable calendar archive;
 * - 1,000+ community observance records get factual detail pages with source/community data and day-calendar enrichment;
 * - prerendered festival assets remain a fallback, never a redirect-to-home dependency;
 * - Rashifal public broadcasts and private birthday calculations use the native deterministic engine before connected storage;
 * - public reference/calendar/history routes use cacheable server HTML without one stored HTML file per URL.
 */
const optimizedWorker = {
  ...connectedWorker,
  async fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext) {
    const normalizedDate = canonicalDateRedirect(request);
    if (normalizedDate) return normalizedDate;
    const conversion = await conversionPageResponse(request, env as any);
    if (conversion) return conversion;

    const seoStatic = await seoStaticResponse(request, env as any);
    if (seoStatic) return seoStatic;

    const speech = await speechApiResponse(request, env);
    if (speech) return speech;

    const historyEvent = await historyEventPageResponse(request, env as any);
    if (historyEvent) return historyEvent;

    const timeMachineDetail = await timeMachinePageResponse(request, env as any);
    if (timeMachineDetail) return timeMachineDetail;

    const communityEvent = await communityEventPageResponse(request, env as any);
    if (communityEvent) return communityEvent;

    const festivalPage = await festivalPageResponse(request, env as any);
    if (festivalPage) return festivalPage;

    const festivalStatic = await staticFestivalResponse(request, env as any);
    if (festivalStatic) return festivalStatic;

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
