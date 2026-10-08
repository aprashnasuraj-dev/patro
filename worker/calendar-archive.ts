export type CalendarKind = "ad" | "bs";
export type CalendarArchiveBackend = "r2" | "static-fallback";

type R2ObjectLike = { text(): Promise<string> };
type R2Like = { get(key: string): Promise<R2ObjectLike | null> };
type AssetBinding = { fetch(request: Request): Promise<Response> };

export type CalendarArchiveEnv = {
  ARCHIVE?: R2Like;
  ASSETS?: AssetBinding;
};

export type CalendarShard = {
  schema: 1;
  calendar: CalendarKind;
  year: number;
  rows: any[];
  source_version?: string;
  [key: string]: unknown;
};

export type LoadedCalendarShard = {
  doc: CalendarShard;
  backend: CalendarArchiveBackend;
};

export const CALENDAR_PREFIX = "datasets/calendar/v1";
export const CALENDAR_STATIC_PREFIX = "/data/calendar";
const CACHE_LIMIT = 48;
const shardCache = new Map<string, LoadedCalendarShard>();

export function calendarArchiveKey(calendar: CalendarKind, year: number): string {
  return `${CALENDAR_PREFIX}/${calendar}/${year}.json`;
}

export function calendarStaticPath(calendar: CalendarKind, year: number): string {
  return `${CALENDAR_STATIC_PREFIX}/${calendar}/${year}.json`;
}

export function isCalendarShard(value: any, calendar: CalendarKind, year: number): value is CalendarShard {
  return Boolean(value)
    && Number(value.schema) === 1
    && value.calendar === calendar
    && Number(value.year) === year
    && Array.isArray(value.rows);
}

function remember(key: string, value: LoadedCalendarShard): LoadedCalendarShard {
  if (shardCache.has(key)) shardCache.delete(key);
  shardCache.set(key, value);
  while (shardCache.size > CACHE_LIMIT) {
    const oldest = shardCache.keys().next().value;
    if (oldest == null) break;
    shardCache.delete(oldest);
  }
  return value;
}

async function parseText(text: string, calendar: CalendarKind, year: number): Promise<CalendarShard | null> {
  try {
    const doc = JSON.parse(text);
    return isCalendarShard(doc, calendar, year) ? doc : null;
  } catch {
    return null;
  }
}

export async function loadCalendarShard(request: Request, env: CalendarArchiveEnv, calendar: CalendarKind, year: number): Promise<LoadedCalendarShard | null> {
  const cacheKey = `${calendar}:${year}`;
  const cached = shardCache.get(cacheKey);
  if (cached) {
    shardCache.delete(cacheKey);
    shardCache.set(cacheKey, cached);
    return cached;
  }

  if (env.ASSETS) {
    try {
      const url = new URL(request.url);
      url.pathname = calendarStaticPath(calendar, year);
      url.search = "";
      url.hash = "";
      const response = await env.ASSETS.fetch(new Request(url.toString(), { method: "GET", headers: { accept: "application/json" } }));
      if (response.ok) {
        const doc = await parseText(await response.text(), calendar, year);
        if (doc) return remember(cacheKey, { doc, backend: "static-fallback" });
      }
    } catch {
      // Caller returns a bounded 503 only after both immutable sources fail.
    }
  }

  if (env.ARCHIVE) {
    try {
      const object = await env.ARCHIVE.get(calendarArchiveKey(calendar, year));
      if (object) {
        const doc = await parseText(await object.text(), calendar, year);
        if (doc) return remember(cacheKey, { doc, backend: "r2" });
      }
    } catch {
      // Static assets are the availability floor when R2 is unavailable.
    }
  }


  return null;
}

export function calendarArchiveUnavailable(body: BodyInit | null = "Calendar archive unavailable", contentType = "text/plain; charset=utf-8"): Response {
  return new Response(body, {
    status: 503,
    headers: {
      "content-type": contentType,
      "cache-control": "no-store",
      "retry-after": "300",
      "x-robots-tag": "noindex, nofollow",
      "x-patro-backend": "unavailable",
    },
  });
}

/** Test-only cache reset; harmless in production and keeps contract tests deterministic. */
export function clearCalendarArchiveCache(): void {
  shardCache.clear();
}
