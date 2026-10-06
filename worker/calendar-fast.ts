import { bsToAd, daysInBsMonth } from "../packages/core/src";

type R2ObjectLike = { text(): Promise<string> };
type R2Like = { get(key: string): Promise<R2ObjectLike | null> };
type AssetBinding = { fetch(request: Request): Promise<Response> };
type CalendarEnv = {
  ARCHIVE?: R2Like;
  ASSETS?: AssetBinding;
  CALENDAR_COVERAGE_START?: string;
  CALENDAR_COVERAGE_END?: string;
  CALENDAR_SOURCE_VERSION?: string;
};

type SourceRows = { rows: any[]; backend: string };

const CACHE = "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400";
const CALENDAR_R2_PREFIX = "datasets/calendar/v1";
const CALENDAR_ASSET_PREFIX = "/data/calendar";

function json(body: unknown, status = 200, backend = "cloudflare-native-indexed-calendar") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": status === 200 ? CACHE : "no-store",
      "x-content-type-options": "nosniff",
      "x-patro-backend": backend,
    },
  });
}
function unavailable() {
  return json({ success:false, error:"calendar_archive_unavailable" }, 503, "r2-required");
}
function validDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day;
}
function todayNepal() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
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
    if (inner.bs || inner.ad || inner.ns || inner.panchang) return { ...inner, ad: inner.ad || value.ad_date || row.ad_date || null };
  }
  return value;
}
function shape(calendar: any) {
  return {
    ad: calendar?.ad || null,
    bs: calendar?.bs || null,
    nepal_sambat: calendar?.ns || calendar?.nepal_sambat || null,
    panchang: calendar?.panchang || null,
    source: "Aafnai Patro validated calendar archive",
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
    source_version: env.CALENDAR_SOURCE_VERSION || "repository-r2-manifest",
    rows: 77070,
  };
}
function parseYearShard(text: string, calendar: "ad" | "bs", year: number): any[] | null {
  try {
    const doc = JSON.parse(text);
    if (Number(doc?.schema) !== 1 || doc?.calendar !== calendar || Number(doc?.year) !== year || !Array.isArray(doc?.rows)) return null;
    return doc.rows.map(parseCalendar).filter(Boolean);
  } catch { return null; }
}
async function r2YearRows(env: CalendarEnv, calendar: "ad" | "bs", year: number): Promise<SourceRows | null> {
  if (!env.ARCHIVE) return null;
  try {
    const object = await env.ARCHIVE.get(`${CALENDAR_R2_PREFIX}/${calendar}/${year}.json`);
    if (!object) return null;
    const rows = parseYearShard(await object.text(), calendar, year);
    return rows ? { rows, backend: "cloudflare-r2-calendar" } : null;
  } catch { return null; }
}
async function assetYearRows(request: Request, env: CalendarEnv, calendar: "ad" | "bs", year: number): Promise<SourceRows | null> {
  // Development/offline compatibility only. scripts/release-data-guard.mjs removes the bulk
  // calendar asset tree from production dist, so production immutable reads resolve from R2.
  if (!env.ASSETS) return null;
  try {
    const url = new URL(request.url);
    url.pathname = `${CALENDAR_ASSET_PREFIX}/${calendar}/${year}.json`;
    url.search = ""; url.hash = "";
    const response = await env.ASSETS.fetch(new Request(url.toString(), { method:"GET", headers:{ accept:"application/json" } }));
    if (!response.ok) return null;
    const rows = parseYearShard(await response.text(), calendar, year);
    return rows ? { rows, backend: "cloudflare-asset-calendar" } : null;
  } catch { return null; }
}
async function archiveYearRows(request: Request, env: CalendarEnv, calendar: "ad" | "bs", year: number): Promise<SourceRows | null> {
  return await r2YearRows(env, calendar, year) || await assetYearRows(request, env, calendar, year);
}
async function rowsByAdRange(request: Request, env: CalendarEnv, start: string, end: string): Promise<SourceRows | null> {
  const startYear = Number(start.slice(0,4));
  const endYear = Number(end.slice(0,4));
  const rows: any[] = [];
  const backends = new Set<string>();
  for (let year = startYear; year <= endYear; year++) {
    const source = await archiveYearRows(request, env, "ad", year);
    if (!source) return null;
    backends.add(source.backend);
    rows.push(...source.rows);
  }
  return {
    rows: rows.filter((row) => String(row?.ad || "") >= start && String(row?.ad || "") <= end).sort((a,b) => String(a.ad).localeCompare(String(b.ad))),
    backend: backends.size === 1 ? [...backends][0] : "cloudflare-calendar-archive",
  };
}
async function rowsByAdMonth(request: Request, env: CalendarEnv, year: number, month: number): Promise<SourceRows | null> {
  const source = await archiveYearRows(request, env, "ad", year);
  if (!source) return null;
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  return {
    rows: source.rows.filter((row) => String(row?.ad || "").startsWith(prefix)),
    backend: source.backend,
  };
}
async function rowByAd(request: Request, env: CalendarEnv, ad: string): Promise<{ row:any; backend:string; archiveKnown:boolean } | null> {
  const year = Number(ad.slice(0,4));
  const source = await archiveYearRows(request, env, "ad", year);
  if (!source) return null;
  const row = source.rows.find((value) => String(value?.ad || "").slice(0,10) === ad) || null;
  return { row, backend:source.backend, archiveKnown:true };
}
function bsBounds(year: number, month: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  try {
    const days = daysInBsMonth(year, month);
    return { start: bsToAd({ year, month, day: 1 }), end: bsToAd({ year, month, day: days }) };
  } catch { return null; }
}
async function rowsByBsMonth(request: Request, env: CalendarEnv, year: number, month: number): Promise<SourceRows | null> {
  const source = await archiveYearRows(request, env, "bs", year);
  return source ? { rows: source.rows.filter((row) => Number(row?.bs?.month) === month), backend:source.backend } : null;
}

/**
 * Immutable public calendar hierarchy:
 *   production: R2 year shard (required)
 *   development/offline build: packaged static year shard may be used before the release guard.
 *
 * D1 is deliberately not a normal fallback. Missing production R2 data fails closed with 503,
 * preventing public archive/API traffic from silently consuming D1 read quota.
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
      const source = await rowsByAdRange(request, env, start!, end!);
      if (!source) return unavailable();
      if (!source.rows.length) return json({ success:false, error:"date_outside_archive" }, 404, source.backend);
      const days = source.rows.map((calendar: any) => syncPayload(calendar?.ad || "", calendar));
      const response = json({ success: true, start_date:start, end_date:end, requested_days:requested, returned_days:days.length, days, coverage:coverage(env) }, 200, source.backend);
      return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
    }

    const date = url.searchParams.get("date") || todayNepal();
    if (!validDate(date)) return json({ success: false, error: "invalid_date", expected: "YYYY-MM-DD" }, 400);
    const source = await rowByAd(request, env, date);
    if (!source) return unavailable();
    if (!source.row) return json({ success:false, error:"date_outside_archive" }, 404, source.backend);
    const response = json(syncPayload(date, source.row), 200, source.backend);
    return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
  }

  const monthMatch = url.pathname.match(/^\/api\/v1\/calendar\/(\d{4})\/(\d{1,2})$/);
  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const month = Number(monthMatch[2]);
    const mode = url.searchParams.get("calendar") || (year > 2050 ? "bs" : "ad");
    if (mode === "bs") {
      const bounds = bsBounds(year, month);
      if (!bounds) return json({ ok:false, error:"invalid_bs_month" }, 400);
      const source = await rowsByBsMonth(request, env, year, month);
      if (!source) return unavailable();
      if (!source.rows.length) return json({ ok:false, error:"date_outside_archive" }, 404, source.backend);
      const days = source.rows.map(shape);
      const response = json({ ok: true, calendar: "bs", year, month, count: days.length, days }, 200, source.backend);
      return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
    }
    if (mode === "ad") {
      if (!Number.isInteger(month) || month < 1 || month > 12) return json({ ok:false, error:"invalid_ad_month" }, 400);
      const source = await rowsByAdMonth(request, env, year, month);
      if (!source) return unavailable();
      if (!source.rows.length) return json({ ok:false, error:"date_outside_archive" }, 404, source.backend);
      const days = source.rows.map(shape);
      const response = json({ ok: true, calendar: "ad", year, month, count: days.length, days }, 200, source.backend);
      return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
    }
    return json({ ok:false, error:"invalid_calendar_mode" }, 400);
  }

  if (url.pathname === "/api/v1/convert" && url.searchParams.has("bs") && !url.searchParams.has("ad")) {
    const raw = String(url.searchParams.get("bs") || "");
    const match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) return null;
    try {
      const ad = bsToAd({ year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) });
      const source = await rowByAd(request, env, ad);
      if (!source) return unavailable();
      if (!source.row) return json({ ok:false, error:"date_outside_archive" }, 404, source.backend);
      const response = json({ ok: true, ...shape(source.row) }, 200, source.backend);
      return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
    } catch {
      return json({ ok:false, error:"invalid_bs_date" }, 400);
    }
  }

  return null;
}
