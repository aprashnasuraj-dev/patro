import { calculateAstronomicalTithi } from "./tithi";

type Env = {
  DB: any;
  CACHE: any;
  ASSETS: { fetch(request: Request): Promise<Response> };
  SUPABASE_COMPAT_ORIGIN?: string;
  SUPABASE_PROTECTED_ORIGIN?: string;
  NASA_API_KEY?: string;
  CALENDAR_COVERAGE_START?: string;
  CALENDAR_COVERAGE_END?: string;
  CALENDAR_SOURCE_VERSION?: string;
};

const DEFAULT_ROUTER = "https://pxlsmxbpgdfzjzuqtict.supabase.co/functions/v1/router";
const DEFAULT_PROTECTED = "https://pxlsmxbpgdfzjzuqtict.supabase.co/functions/v1/nepal-miti-protected";
const APOD_PRIMARY = "https://science.nasa.gov/wp-json/wp/v2/apod-basic/";
const APOD_LEGACY = "https://api.nasa.gov/planetary/apod";
const APOD_FALLBACK = "https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005587/Moon_2026_print.jpg";

function json(body: unknown, status = 200, cache = "no-store") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cache,
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin"
    }
  });
}

function validDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y,m,d] = value.split("-").map(Number);
  const x = new Date(Date.UTC(y,m-1,d));
  return x.getUTCFullYear() === y && x.getUTCMonth() === m-1 && x.getUTCDate() === d;
}

function todayNepal() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function daysInclusive(start: string, end: string) {
  return Math.floor((Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z")) / 86_400_000) + 1;
}

function syncPayload(date: string, calendar: any) {
  return {
    success: true,
    query_date: date,
    calendars: {
      gregorian_ad: date,
      bikram_sambat: calendar.bs?.formatted || "",
      nepal_sambat: calendar.ns?.formatted || "",
      bikram_sambat_detail: calendar.bs || null,
      nepal_sambat_detail: calendar.ns || null
    },
    tithi: calendar.panchang?.tithi || null,
    archive_panchang: calendar.panchang || null
  };
}

function parseRecord(row: any) {
  if (!row?.payload) return null;
  try { return typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload; }
  catch { return null; }
}

async function contentRecord(env: Env, table: string, key: string) {
  try {
    const row = await env.DB.prepare(
      "select payload from content_records where table_name = ?1 and record_key = ?2 limit 1"
    ).bind(table, key).first();
    return parseRecord(row);
  } catch {
    return null;
  }
}

async function contentRange(env: Env, table: string, start: string, end: string, limit = 100) {
  try {
    const out = await env.DB.prepare(
      "select payload from content_records where table_name = ?1 and record_key >= ?2 and record_key <= ?3 order by record_key asc limit ?4"
    ).bind(table, start, end, limit).all();
    return (out.results || []).map(parseRecord).filter(Boolean);
  } catch {
    return [];
  }
}

async function contentByDay(env: Env, table: string, month: number, day: number, limit = 100) {
  try {
    const out = await env.DB.prepare(
      "select payload from content_records where table_name = ?1 and month = ?2 and day = ?3 order by sort_order desc, record_key asc limit ?4"
    ).bind(table, month, day, limit).all();
    return (out.results || []).map(parseRecord).filter(Boolean);
  } catch {
    return [];
  }
}

async function compat(request: Request, env: Env, base: "router" | "protected" = "router", overridePath?: string) {
  const incoming = new URL(request.url);
  const origin = base === "protected"
    ? (env.SUPABASE_PROTECTED_ORIGIN || DEFAULT_PROTECTED)
    : (env.SUPABASE_COMPAT_ORIGIN || DEFAULT_ROUTER);
  const target = new URL(origin.replace(/\/$/,"") + (overridePath || incoming.pathname.replace(/^\/api\/v1/, "")));
  if (!target.search) target.search = incoming.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");

  const init: RequestInit = { method: request.method, headers, redirect: "manual" };
  if (request.method !== "GET" && request.method !== "HEAD") init.body = request.body;
  const response = await fetch(target.toString(), init);
  const out = new Headers(response.headers);
  out.set("x-patro-backend", "supabase-compat");
  out.set("x-content-type-options", "nosniff");
  return new Response(response.body, { status: response.status, headers: out });
}

async function edgeCached(request: Request, ctx: ExecutionContext, ttl: number, producer: () => Promise<Response>) {
  if (request.method !== "GET") return producer();
  const cache = caches.default;
  const key = new Request(request.url, { method: "GET", headers: { accept: request.headers.get("accept") || "*/*" } });
  const hit = await cache.match(key);
  if (hit) return hit;
  const response = await producer();
  if (response.ok) {
    const headers = new Headers(response.headers);
    headers.set("cache-control", `public, max-age=${Math.min(ttl,300)}, s-maxage=${ttl}, stale-while-revalidate=${Math.max(ttl,3600)}`);
    const cached = new Response(response.body, { status: response.status, headers });
    ctx.waitUntil(cache.put(key, cached.clone()));
    return cached;
  }
  return response;
}

function apodFallback(date: string, reason: string) {
  return {
    title: "Moon Phase Visualization (NASA SVS Fallback)",
    explanation: "High-resolution lunar visualization provided by NASA Goddard Scientific Visualization Studio while APOD is unavailable.",
    media_type: "image",
    source_media_type: "image",
    url: APOD_FALLBACK,
    hdurl: APOD_FALLBACK,
    date,
    copyright: "NASA / Goddard Space Flight Center Scientific Visualization Studio",
    is_fallback: true,
    fallback_reason: reason
  };
}

function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.split("/").filter(Boolean)[0]?.slice(0,11) || null;
    if (u.hostname.includes("youtube.com")) {
      const q = u.searchParams.get("v");
      if (q) return q.slice(0,11);
      const parts = u.pathname.split("/").filter(Boolean);
      const marker = parts.findIndex(x => ["embed","shorts","live"].includes(x));
      if (marker >= 0 && parts[marker + 1]) return parts[marker + 1].slice(0,11);
    }
  } catch {}
  return null;
}

async function apod(env: Env, date: string) {
  const cacheKey = "apod:" + date;
  try {
    const cached = await env.CACHE.get(cacheKey, "json");
    if (cached) return cached;
  } catch {}

  const apiKey = env.NASA_API_KEY || "DEMO_KEY";
  let last = "NASA_APOD_UNAVAILABLE";
  for (const endpoint of [APOD_PRIMARY, APOD_LEGACY]) {
    const url = endpoint + "?api_key=" + encodeURIComponent(apiKey) + "&date=" + encodeURIComponent(date);
    try {
      const response = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(6500) });
      if (!response.ok) throw new Error("NASA_HTTP_" + response.status);
      const raw: any = await response.json();
      const data = Array.isArray(raw) ? raw[0] : raw;
      if (!data || String(data.date || "") !== date || !(data.hdurl || data.url)) throw new Error("NASA_DATE_OR_MEDIA_MISMATCH");

      const sourceMedia = data.media_type === "video" ? "video" : "image";
      let image = String(data.hdurl || data.url || "");
      if (sourceMedia === "video") {
        const id = youtubeId(String(data.url || ""));
        if (!id) return apodFallback(date, "non_youtube_video");
        image = "https://img.youtube.com/vi/" + id + "/maxresdefault.jpg";
      }
      const normalized = {
        title: String(data.title || "Astronomy Picture of the Day"),
        explanation: String(data.explanation || "Astronomical view synchronized with the selected calendar date."),
        media_type: "image",
        source_media_type: sourceMedia,
        url: image,
        hdurl: image,
        date,
        copyright: String(data.copyright || "Public Domain / NASA"),
        is_fallback: false
      };
      try { await env.CACHE.put(cacheKey, JSON.stringify(normalized), { expirationTtl: 30 * 86400 }); } catch {}
      return normalized;
    } catch (error) {
      last = String((error as Error)?.message || error);
    }
  }
  return apodFallback(date, last);
}

async function nativeSync(request: Request, env: Env) {
  const url = new URL(request.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  const coverage = {
    ad_start: env.CALENDAR_COVERAGE_START || "1826-04-11",
    ad_end: env.CALENDAR_COVERAGE_END || "2037-04-13",
    source_version: env.CALENDAR_SOURCE_VERSION || "patro-archive-v79",
    rows: 77070
  };

  if (start != null || end != null) {
    if (!validDate(start) || !validDate(end)) return json({ success:false, error:"invalid_range", expected:"start=YYYY-MM-DD&end=YYYY-MM-DD" },400);
    const count = daysInclusive(start,end);
    if (count < 1 || count > 62) return json({success:false,error:"range_limit_exceeded",max_days:62},400);
    const records = await contentRange(env,"astronomy_calendar_map",start,end,62);
    if (!records.length) return null;
    const days = records.map((record:any) => {
      const calendar = record.payload || record;
      return syncPayload(calendar.ad || record.ad_date, calendar);
    });
    return json({success:true,start_date:start,end_date:end,requested_days:count,returned_days:days.length,days,coverage},200,"public, max-age=60, s-maxage=3600, stale-while-revalidate=86400");
  }

  const date = url.searchParams.get("date") || todayNepal();
  if (!validDate(date)) return json({success:false,error:"invalid_date",expected:"YYYY-MM-DD"},400);
  const record:any = await contentRecord(env,"astronomy_calendar_map",date);
  if (!record) return null;
  const calendar = record.payload || record;
  return json(syncPayload(date,calendar),200,"public, max-age=60, s-maxage=3600, stale-while-revalidate=86400");
}

async function nativeTithi(request: Request, env: Env) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") || todayNepal();
  if (!validDate(date)) return json({error:"invalid_date",expected:"YYYY-MM-DD"},400);
  const lat = url.searchParams.get("lat") == null ? 27.7172 : Number(url.searchParams.get("lat"));
  const lng = url.searchParams.get("lng") == null ? 85.3240 : Number(url.searchParams.get("lng"));
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return json({error:"invalid_lat"},400);
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return json({error:"invalid_lng"},400);
  const record:any = await contentRecord(env,"astronomy_calendar_map",date);
  const calendar = record?.payload || record || null;
  try {
    return json(calculateAstronomicalTithi({
      date, lat, lng,
      bsFormatted: calendar?.bs?.formatted ?? null,
      nsFormatted: calendar?.ns?.formatted ?? null
    }),200,"public, max-age=60, s-maxage=1800, stale-while-revalidate=86400");
  } catch (error) {
    return json({error:String((error as Error)?.message || error)},400);
  }
}

async function nativeToolCatalog(env: Env) {
  try {
    const out = await env.DB.prepare(
      "select payload from content_records where table_name = 'tool_catalog' order by sort_order asc, record_key asc"
    ).all();
    const now = Date.now();
    const items = (out.results || []).map(parseRecord).filter(Boolean).filter((row:any) =>
      row.enabled === true && (!row.release_after || Date.parse(String(row.release_after)) <= now)
    ).map((row:any) => ({
      id: row.tool_id, slug: row.slug, title: row.title, subtitle: row.subtitle,
      category: row.category, parent_slug: row.parent_slug, path: row.target_path,
      icon: row.icon, badge: row.badge, sort_order: row.sort_order, metadata: row.metadata || {}
    }));
    if (!items.length) return null;
    return json({ok:true,version:2,generated_at:new Date().toISOString(),source:"Cloudflare D1 content_records",items,releases:[]},200,"public, max-age=60, s-maxage=600, stale-while-revalidate=86400");
  } catch { return null; }
}

async function nativeHistory(request: Request, env: Env) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") || todayNepal();
  if (!validDate(date)) return json({error:"invalid_date"},400);
  const [,m,d] = date.split("-").map(Number);
  const rows = await contentByDay(env,"on_this_day_events",m,d,100);
  if (!rows.length) return null;
  return json({ok:true,date,count:rows.length,items:rows},200,"public, max-age=300, s-maxage=86400, stale-while-revalidate=604800");
}

async function nativeTimeMachine(request: Request, env: Env) {
  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year") || "0");
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || "80")));
  try {
    const stmt = year
      ? env.DB.prepare("select payload from content_records where table_name='time_machine_moments' and year=?1 order by sort_order desc,record_key asc limit ?2").bind(year,limit)
      : env.DB.prepare("select payload from content_records where table_name='time_machine_moments' order by year desc,sort_order desc,record_key asc limit ?1").bind(limit);
    const out = await stmt.all();
    const rows = (out.results || []).map(parseRecord).filter(Boolean);
    if (!rows.length) return null;
    return json({ok:true,year:year||null,count:rows.length,items:rows},200,"public, max-age=300, s-maxage=86400, stale-while-revalidate=604800");
  } catch { return null; }
}

async function handleApi(request: Request, env: Env, ctx: ExecutionContext) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/v1/health") {
    return json({status:"online",runtime:"Cloudflare Workers",framework:"Native Web APIs",database:"D1",cache:"KV"},200,"no-store");
  }

  if (path === "/api/v1/sync" && request.method === "GET") {
    return edgeCached(request,ctx,3600,async() => (await nativeSync(request,env)) || compat(request,env));
  }
  if (path === "/api/v1/astronomy/tithi" && request.method === "GET") {
    return edgeCached(request,ctx,1800,() => nativeTithi(request,env));
  }
  if (path === "/api/v1/nasa/apod" && request.method === "GET") {
    const date = url.searchParams.get("date") || todayNepal();
    if (!validDate(date)) return json({error:"invalid_date",expected:"YYYY-MM-DD"},400);
    return edgeCached(request,ctx,86400,async() => json(await apod(env,date)));
  }
  if (path === "/api/v1/tools/catalog" && request.method === "GET") {
    return edgeCached(request,ctx,600,async() => (await nativeToolCatalog(env)) || compat(request,env));
  }
  if (path === "/api/v1/on-this-day" && request.method === "GET") {
    return edgeCached(request,ctx,86400,async() => (await nativeHistory(request,env)) || compat(request,env,"router","/on-this-day"));
  }
  if (path === "/api/v1/time-machine" && request.method === "GET") {
    return edgeCached(request,ctx,86400,async() => (await nativeTimeMachine(request,env)) || compat(request,env,"router","/time-machine"));
  }

  return compat(request, env);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/v1/")) return handleApi(request,env,ctx);

    if (url.pathname === "/api/jyotish-chat") {
      return compat(request,env,"router","/jyotish-chat");
    }

    if (url.pathname === "/api/rashifal_engine.py") {
      return compat(request,env,"protected","/api/rashifal/personalized");
    }

    if (url.pathname.startsWith("/fm-v2-stream/")) {
      return compat(request,env,"protected",url.pathname);
    }

    return env.ASSETS.fetch(request);
  }
};
