type D1Like = {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      all(): Promise<{ results?: Array<{ payload?: unknown }> }>;
    };
  };
};

type Env = { DB?: D1Like };

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

async function queryRows(db: D1Like, month: number, day: number) {
  // Normal path: fast indexed lookup on content_records(table_name, month, day).
  const indexed = await db.prepare(
    "select payload from content_records where table_name='on_this_day_events' and month=?1 and day=?2 order by sort_order desc, record_key asc limit 100",
  ).bind(month, day).all();
  if ((indexed.results || []).length) return indexed.results || [];

  // Recovery path for legacy imports whose dimension columns were left null/wrong.
  // The archive is small, and the JSON fallback only runs when the indexed query is empty.
  const legacy = await db.prepare(
    "select payload from content_records where table_name='on_this_day_events' and (" +
      "(cast(json_extract(payload,'$.ad_month') as integer)=?1 and cast(json_extract(payload,'$.ad_day') as integer)=?2)" +
      " or (cast(substr(json_extract(payload,'$.ad_date'),6,2) as integer)=?1 and cast(substr(json_extract(payload,'$.ad_date'),9,2) as integer)=?2)" +
    ") order by coalesce(cast(json_extract(payload,'$.importance') as integer),0) desc, record_key asc limit 100",
  ).bind(month, day).all();
  return legacy.results || [];
}

/**
 * Hot-path On This Day endpoint. It is intentionally independent of the larger API router so
 * homepage history remains available even when an older D1 import has missing month/day columns.
 */
export async function fastHistoryResponse(request: Request, env: Env) {
  if (request.method !== "GET" || new URL(request.url).pathname !== "/api/v1/on-this-day") return null;

  const url = new URL(request.url);
  const date = url.searchParams.get("date") || todayNepal();
  if (!validDate(date)) return response({ error: "invalid_date", expected: "YYYY-MM-DD" }, 400);
  if (!env.DB) return null;

  const [, month, day] = date.split("-").map(Number);
  try {
    const records = (await queryRows(env.DB, month, day))
      .map(parsePayload)
      .filter((row): row is Record<string, unknown> => Boolean(row) && isPublished(row as Record<string, unknown>));

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
