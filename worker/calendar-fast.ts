import { bsToAd, daysInBsMonth } from "../packages/core/src";

type CalendarEnv = { DB?: any };

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
 * The migrated D1 archive is keyed by AD date. Querying a BS month by repeatedly
 * json_extract-ing nested payload.bs fields forces D1 to scan the full ~77k-row
 * archive. Convert the BS month boundary to AD once, then use the indexed record_key
 * range instead. This preserves the original archive's tithi and Nepal Sambat payloads.
 */
export async function fastCalendarResponse(request: Request, env: CalendarEnv): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);

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
