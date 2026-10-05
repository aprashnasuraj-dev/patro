import { bsToAd, daysInBsMonth } from "../packages/core/src";

type CalendarEnv = {
  DB?: any;
  CALENDAR_COVERAGE_START?: string;
  CALENDAR_COVERAGE_END?: string;
  CALENDAR_SOURCE_VERSION?: string;
};

const CACHE = "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": CACHE,
      "x-content-type-options": "nosniff",
      "x-patro-backend": "cloudflare-native-indexed-calendar",
    },
  });
}

function validDate(value: string | null) {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + "T00:00:00Z"));
}

function todayNepal() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function daysInclusive(start: string, end: string) {
  return Math.floor((Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z")) / 86_400_000) + 1;
}

function parseCalendar(row: any) {
  if (!row) return null;
  let value = row.payload ?? row;
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { return null; }
  }
  if (value && typeof value === "object" && value.payload && typeof value.payload === "object") {
    const inner = value.payload;
    if (inner.bs || inner.ad || inner.ns || inner.panchang) {
      return { ...inner, ad: inner.ad || value.ad_date || row.ad_date || null };
    }
  }
  return value;
}

function shape(calendar: any) {
  return {
    ad: calendar?.ad || null,
    bs: calendar?.bs || null,
    nepal_sambat: calendar?.ns || calendar?.nepal_sambat || null,
    panchang: calendar?.panchang || null,
    source: "Cloudflare D1 indexed astronomy archive",
  };
}

function syncPayload(date: string, calendar: any) {
  return {
    success: true,
    query_date: date,
    calendars: {
      gregorian_ad: date,
      bikram_sambat: calendar?.bs?.formatted || "",
      nepal_sambat: calendar?.ns?.formatted || "",
      bikram_sambat_detail: calendar?.bs || null,
      nepal_sambat_detail: calendar?.ns || null,
    },
    tithi: calendar?.panchang?.tithi || null,
    archive_panchang: calendar?.panchang || null,
  };
}

function coverage(env: CalendarEnv) {
  return {
    ad_start: env.CALENDAR_COVERAGE_START || "1826-04-11",
    ad_end: env.CALENDAR_COVERAGE_END || "2037-04-13",
    source_version: env.CALENDAR_SOURCE_VERSION || "patro-archive-v79",
    rows: 77070,
  };
}

async function rowsByAdRange(env: CalendarEnv, start: string, end: string) {
  if (!env.DB) return [];
  try {
    const out = await env.DB.prepare(
      "select payload from content_records where table_name='astronomy_calendar_map' and record_key>=?1 and record_key<=?2 order by record_key"
    ).bind(start, end).all();
    return (out?.results || []).map(parseCalendar).filter(Boolean);
  } catch {
    return [];
  }
}

async function rowByAd(env: CalendarEnv, ad: string) {
  if (!env.DB) return null;
  try {
    const row = await env.DB.prepare(
      "select payload from content_records where table_name='astronomy_calendar_map' and record_key=?1 limit 1"
    ).bind(ad).first();
    return parseCalendar(row);
  } catch {
    return null;
  }
}

function bsBounds(year: number, month: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  try {
    const days = daysInBsMonth(year, month);
    return {
      start: bsToAd({ year, month, day: 1 }),
      end: bsToAd({ year, month, day: days }),
    };
  } catch {
    return null;
  }
}

/**
 * Hot-path calendar repair.
 *
 * The migrated D1 archive is keyed by AD date. Calendar and converter traffic must
 * resolve to indexed record_key lookups/ranges instead of json_extract scans over the
 * ~77k-row archive. The response shapes intentionally match the connected worker.
 */
export async function fastCalendarResponse(request: Request, env: CalendarEnv): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);

  if (url.pathname === "/api/v1/sync") {
    const start = url.searchParams.get("start");
    const end = url.searchParams.get("end");

    if (start != null || end != null) {
      if (!validDate(start) || !validDate(end)) return json({ success: false, error: "invalid_range", expected: "start=YYYY-MM-DD&end=YYYY-MM-DD" }, 400);
      const requested = daysInclusive(start!, end!);
      if (requested < 1 || requested > 62) return json({ success: false, error: "range_limit_exceeded", max_days: 62 }, 400);
      const rows = await rowsByAdRange(env, start!, end!);
      if (!rows.length) return null;
      const days = rows.map((calendar: any) => syncPayload(calendar?.ad || "", calendar));
      const response = json({
        success: true,
        start_date: start,
        end_date: end,
        requested_days: requested,
        returned_days: days.length,
        days,
        coverage: coverage(env),
      });
      return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
    }

    const date = url.searchParams.get("date") || todayNepal();
    if (!validDate(date)) return json({ success: false, error: "invalid_date", expected: "YYYY-MM-DD" }, 400);
    const row = await rowByAd(env, date);
    if (!row) return null;
    const response = json(syncPayload(date, row));
    return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
  }

  const monthMatch = url.pathname.match(/^\/api\/v1\/calendar\/(\d{4})\/(\d{1,2})$/);
  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const month = Number(monthMatch[2]);
    const mode = url.searchParams.get("calendar") || (year > 2050 ? "bs" : "ad");
    if (mode === "bs") {
      const bounds = bsBounds(year, month);
      if (!bounds) return null;
      const rows = await rowsByAdRange(env, bounds.start, bounds.end);
      if (!rows.length) return null;
      const days = rows.map(shape);
      const response = json({ ok: true, calendar: "bs", year, month, count: days.length, days });
      return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
    }
  }

  // BS→AD conversion used to use the same full-table JSON scan. Resolve the BS date
  // locally, then do one indexed lookup so converter traffic cannot recreate the freeze.
  if (url.pathname === "/api/v1/convert" && url.searchParams.has("bs") && !url.searchParams.has("ad")) {
    const raw = String(url.searchParams.get("bs") || "");
    const match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) return null;
    try {
      const ad = bsToAd({ year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) });
      const row = await rowByAd(env, ad);
      if (!row) return null;
      const response = json({ ok: true, ...shape(row) });
      return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
    } catch {
      return null;
    }
  }

  return null;
}
