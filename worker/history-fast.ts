type D1Row = Record<string, unknown> & { payload?: unknown };
type D1Like = {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      all(): Promise<{ results?: D1Row[] }>;
    };
  };
};

type R2ObjectBodyLike = { text(): Promise<string> };
type R2Like = { get(key: string): Promise<R2ObjectBodyLike | null> };
type Env = { DB?: D1Like; ARCHIVE?: R2Like };

const HISTORY_RELEASE_MARKER = "release:on_this_day_events";
const EXPECTED_HISTORY_ROWS = 5454;
const HISTORY_R2_PREFIX = "datasets/on-this-day/v1";

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

function sortRecords(records: Record<string, unknown>[]) {
  records.sort((a, b) => {
    const highlight = Number(Boolean(b.highlight)) - Number(Boolean(a.highlight));
    if (highlight) return highlight;
    const importance = Number(b.importance || 0) - Number(a.importance || 0);
    if (importance) return importance;
    return String(a.id ?? "").localeCompare(String(b.id ?? ""));
  });
  return records;
}

function response(body: unknown, status = 200, backend = "cloudflare-native-history") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": status === 200
        ? "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800"
        : "no-store",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
      "x-patro-backend": backend,
    },
  });
}

async function queryR2Records(archive: R2Like, month: number, day: number) {
  const key = `${HISTORY_R2_PREFIX}/month-${String(month).padStart(2, "0")}.json`;
  const object = await archive.get(key);
  if (!object) return null;
  const doc = JSON.parse(await object.text()) as {
    schema?: unknown;
    table?: unknown;
    month?: unknown;
    days?: Record<string, unknown>;
  };
  if (Number(doc?.schema) !== 1 || doc?.table !== "on_this_day_events" || Number(doc?.month) !== month || !doc?.days) {
    return null;
  }
  const raw = doc.days[String(day).padStart(2, "0")];
  if (!Array.isArray(raw)) return [] as Record<string, unknown>[];
  return raw.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
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
  // Normal D1 fallback: fast indexed lookup on content_records(table_name, month, day).
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
 * On This Day endpoint with a quota-safe source hierarchy:
 *   R2 monthly archive -> D1 indexed fallback.
 * The outer quota cache adds Edge Cache -> KV -> R2 day-response caching ahead of this
 * handler, so after the one-time annual prime normal traffic does not touch either source.
 */
export async function fastHistoryResponse(request: Request, env: Env) {
  if (request.method !== "GET" || new URL(request.url).pathname !== "/api/v1/on-this-day") return null;

  const url = new URL(request.url);
  const date = url.searchParams.get("date") || todayNepal();
  if (!validDate(date)) return response({ error: "invalid_date", expected: "YYYY-MM-DD" }, 400);

  const [, month, day] = date.split("-").map(Number);

  // R2 is the primary public archive. It is independent of the D1 daily read/write quota.
  if (env.ARCHIVE) {
    try {
      const r2Rows = await queryR2Records(env.ARCHIVE, month, day);
      if (r2Rows !== null) {
        const records = sortRecords(r2Rows.filter(isPublished));
        return response({
          ok: true,
          date,
          count: records.length,
          items: records,
          source: "Cloudflare R2 On This Day archive",
        }, 200, "cloudflare-r2-history");
      }
    } catch {
      // Fall through to D1 only when the R2 object is absent/corrupt/unavailable.
    }
  }

  if (env.DB) {
    try {
      const queried = await queryRows(env.DB, month, day);
      const records = sortRecords(queried.rows
        .map(parsePayload)
        .filter((row): row is Record<string, unknown> => Boolean(row) && isPublished(row as Record<string, unknown>)));

      if (!records.length && queried.indexedReady) {
        return response({ ok: true, date, count: 0, items: [], source: "Cloudflare D1 On This Day archive" }, 200, "cloudflare-d1-history");
      }
      if (records.length) {
        return response({
          ok: true,
          date,
          count: records.length,
          items: records,
          source: "Cloudflare D1 On This Day archive",
        }, 200, "cloudflare-d1-history");
      }
    } catch {
      // Report a real source outage below instead of silently falling into an unrelated backend.
    }
  }

  return response({
    ok: false,
    error: "history_source_unavailable",
    date,
    message: "On This Day archive is temporarily unavailable",
  }, 503, "cloudflare-history-unavailable");
}
