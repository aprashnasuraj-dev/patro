type D1Row = Record<string, unknown> & { payload?: unknown };
type D1Like = {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      all(): Promise<{ results?: D1Row[] }>;
    };
  };
};

type Env = { DB?: D1Like };
const HISTORY_RELEASE_MARKER = "release:on_this_day_events";
const EXPECTED_HISTORY_ROWS = 5454;

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day;
}

function todayNepal() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function parsePayload(row: { payload?: unknown }) {
  const raw = row?.payload;
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw !== "string") return null;
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function isPublished(row: Record<string, unknown>) {
  const value = row.published;
  return value !== false && value !== 0 && String(value ?? "true").toLowerCase() !== "false";
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": status === 200
        ? "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800"
        : "no-store",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
      "x-patro-backend": "cloudflare-native-indexed-history",
    },
  });
}

async function verifiedIndexedArchive(db: D1Like) {
  try {
    const out = await db.prepare(
      "select row_count from migration_state where source=?1 limit 1",
    ).bind(HISTORY_RELEASE_MARKER).all();
    return Number(out.results?.[0]?.row_count || 0) >= EXPECTED_HISTORY_ROWS;
  } catch {
    return false;
  }
}

async function queryRows(db: D1Like, month: number, day: number) {
  // Normal path: fast indexed lookup on content_records(table_name, month, day).
  const indexed = await db.prepare(
    "select payload from content_records where table_name='on_this_day_events' and month=?1 and day=?2 order by sort_order desc, record_key asc limit 100",
  ).bind(month, day).all();
  if ((indexed.results || []).length) return { rows: indexed.results || [], indexedReady: true };

  // Once the release marker confirms a complete import, an empty indexed result really
  // means this date has no record. Do not pay for a 5,454-row JSON scan to prove it.
  if (await verifiedIndexedArchive(db)) return { rows: [] as D1Row[], indexedReady: true };

  // Recovery only for a legacy/incomplete database that predates the verified import.
  const legacy = await db.prepare(
    "select payload from content_records where table_name='on_this_day_events' and (" +
      "(cast(json_extract(payload,'$.ad_month') as integer)=?1 and cast(json_extract(payload,'$.ad_day') as integer)=?2)" +
      " or (cast(substr(json_extract(payload,'$.ad_date'),6,2) as integer)=?1 and cast(substr(json_extract(payload,'$.ad_date'),9,2) as integer)=?2)" +
    ") order by coalesce(cast(json_extract(payload,'$.importance') as integer),0) desc, record_key asc limit 100",
  ).bind(month, day).all();
  return { rows: legacy.results || [], indexedReady: false };
}

/**
 * Hot-path On This Day endpoint. Normal traffic is an indexed month/day lookup. The
 * expensive JSON recovery scan is gated behind the absence of the verified release marker.
 */
export async function fastHistoryResponse(request: Request, env: Env) {
  if (request.method !== "GET" || new URL(request.url).pathname !== "/api/v1/on-this-day") return null;

  const url = new URL(request.url);
  const date = url.searchParams.get("date") || todayNepal();
  if (!validDate(date)) return response({ error: "invalid_date", expected: "YYYY-MM-DD" }, 400);
  if (!env.DB) return null;

  const [, month, day] = date.split("-").map(Number);
  try {
    const queried = await queryRows(env.DB, month, day);
    const records = queried.rows
      .map(parsePayload)
      .filter((row): row is Record<string, unknown> => Boolean(row) && isPublished(row as Record<string, unknown>));

    if (!records.length && queried.indexedReady) {
      return response({ ok: true, date, count: 0, items: [], source: "Cloudflare D1 On This Day archive" });
    }
    if (!records.length) return null;

    records.sort((a, b) => {
      const highlight = Number(Boolean(b.highlight)) - Number(Boolean(a.highlight));
      if (highlight) return highlight;
      return Number(b.importance || 0) - Number(a.importance || 0);
    });

    return response({
      ok: true,
      date,
      count: records.length,
      items: records,
      source: "Cloudflare D1 On This Day archive",
    });
  } catch {
    return null;
  }
}
