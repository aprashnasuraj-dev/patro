// Aafnai Patro admin console — first-party, privacy-friendly analytics.
// - No cookies, no fingerprinting beyond a SHA-256 of (daily salt + IP + UA),
//   so a visitor can be counted within a day but not tracked across days.
// - Raw IPs are never stored. Rows older than the retention window are pruned
//   by the daily cron.
// - Counts JS-executing browsers only (beacon from /aap/runtime.js), which
//   naturally excludes most crawlers; obvious bot UAs are dropped too.
import { randomToken, sha256Hex } from "./crypto";
import { all, clientIp, first, getSetting, json, setSetting, type AdminEnv } from "./db";
import { getSecret } from "./secrets";

const BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link|whatsapp|telegrambot|discordbot|headless|lighthouse|pagespeed|gtmetrix|curl|wget|python|httpclient|axios|node-fetch|go-http/i;
const NEPAL_OFFSET = "'+345 minutes'";
export const ACTIVE_WINDOW_MS = 5 * 60_000;

function device(ua: string) {
  if (/ipad|tablet|kindle|playbook|silk|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
}
function browser(ua: string) {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/samsungbrowser/i.test(ua)) return "Samsung";
  if (/ucbrowser/i.test(ua)) return "UC";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/chrome|crios|crmo/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua)) return "Safari";
  return "Other";
}

async function dailySalt(env: AdminEnv) {
  const day = new Date(Date.now() + 345 * 60_000).toISOString().slice(0, 10);
  const stored = await getSetting<{ day: string; salt: string } | null>(env, "analytics.salt", null);
  if (stored?.day === day) return stored.salt;
  const salt = randomToken(16);
  await setSetting(env, "analytics.salt", { day, salt });
  return salt;
}

let saltMemo: { at: number; salt: string } | null = null;
async function salt(env: AdminEnv) {
  if (saltMemo && Date.now() - saltMemo.at < 60_000) return saltMemo.salt;
  const s = await dailySalt(env);
  saltMemo = { at: Date.now(), salt: s };
  return s;
}

/** POST /api/aap/hit — {t:"pv"|"hb", p:"/path", r:"https://referrer"} */
export async function recordHit(request: Request, env: AdminEnv): Promise<Response> {
  const ok = new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  const ua = request.headers.get("user-agent") || "";
  if (!ua || BOT_RE.test(ua)) return ok;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return ok;
  let body: any = {};
  try {
    const text = await request.text();
    if (text.length > 2048) return ok;
    body = text ? JSON.parse(text) : {};
  } catch {
    return ok;
  }
  const kind = body?.t === "hb" ? "hb" : "pv";
  let path = String(body?.p || "/").split("?")[0].split("#")[0].slice(0, 200);
  if (!path.startsWith("/") || path.startsWith("/admin")) return ok;
  let referrer: string | null = null;
  try {
    if (body?.r) {
      const host = new URL(String(body.r)).hostname.replace(/^www\./, "");
      if (host && host !== new URL(request.url).hostname.replace(/^www\./, "")) referrer = host.slice(0, 120);
    }
  } catch {
    /* ignore */
  }
  const visitor = (await sha256Hex((await salt(env)) + "|" + clientIp(request) + "|" + ua)).slice(0, 24);
  const cf = (request as any).cf || {};
  const country = typeof cf.country === "string" ? cf.country : null;
  const dev = device(ua), now = Date.now();
  const stmts = [
    env.DB.prepare(
      "insert into aap_presence(visitor,ts,path,country,device) values(?1,?2,?3,?4,?5) on conflict(visitor) do update set ts=excluded.ts,path=excluded.path,country=excluded.country,device=excluded.device"
    ).bind(visitor, now, path, country, dev),
  ];
  if (kind === "pv") {
    stmts.push(
      env.DB.prepare("insert into aap_pageviews(ts,path,visitor,country,device,browser,referrer) values(?1,?2,?3,?4,?5,?6,?7)").bind(now, path, visitor, country, dev, browser(ua), referrer)
    );
  }
  await env.DB.batch(stmts);
  return ok;
}

const RANGES: Record<string, { ms: number; bucket: "hour" | "day" }> = {
  "24h": { ms: 24 * 3600_000, bucket: "hour" },
  "7d": { ms: 7 * 86400_000, bucket: "day" },
  "30d": { ms: 30 * 86400_000, bucket: "day" },
  "90d": { ms: 90 * 86400_000, bucket: "day" },
};

export async function stats(env: AdminEnv, rangeKey: string) {
  const range = RANGES[rangeKey] || RANGES["7d"];
  const since = Date.now() - range.ms;
  const prevSince = since - range.ms;
  const fmt = range.bucket === "hour" ? "%Y-%m-%d %H:00" : "%Y-%m-%d";
  const bucketExpr = `strftime('${fmt}', ts/1000, 'unixepoch', ${NEPAL_OFFSET})`;
  const [totals, prev, series, paths, refs, countries, devices, browsers] = await Promise.all([
    first<any>(env, "select count(*) as views, count(distinct visitor) as visitors from aap_pageviews where ts>=?1", since),
    first<any>(env, "select count(*) as views, count(distinct visitor) as visitors from aap_pageviews where ts>=?1 and ts<?2", prevSince, since),
    all<any>(env, `select ${bucketExpr} as bucket, count(*) as views, count(distinct visitor) as visitors from aap_pageviews where ts>=?1 group by bucket order by bucket`, since),
    all<any>(env, "select path, count(*) as views, count(distinct visitor) as visitors from aap_pageviews where ts>=?1 group by path order by views desc limit 25", since),
    all<any>(env, "select coalesce(referrer,'(direct)') as referrer, count(*) as views from aap_pageviews where ts>=?1 group by referrer order by views desc limit 15", since),
    all<any>(env, "select coalesce(country,'??') as country, count(distinct visitor) as visitors from aap_pageviews where ts>=?1 group by country order by visitors desc limit 20", since),
    all<any>(env, "select device, count(distinct visitor) as visitors from aap_pageviews where ts>=?1 group by device order by visitors desc", since),
    all<any>(env, "select browser, count(distinct visitor) as visitors from aap_pageviews where ts>=?1 group by browser order by visitors desc", since),
  ]);
  return {
    range: rangeKey in RANGES ? rangeKey : "7d",
    bucket: range.bucket,
    totals: { views: Number(totals?.views || 0), visitors: Number(totals?.visitors || 0) },
    previous: { views: Number(prev?.views || 0), visitors: Number(prev?.visitors || 0) },
    series: fillSeries(series, range.bucket, since),
    paths, referrers: refs, countries, devices, browsers,
  };
}

function fillSeries(rows: any[], bucket: "hour" | "day", since: number) {
  const map = new Map(rows.map((r) => [r.bucket, r]));
  const out: { bucket: string; views: number; visitors: number }[] = [];
  const step = bucket === "hour" ? 3600_000 : 86400_000;
  const offset = 345 * 60_000;
  for (let t = since; t <= Date.now() + 1; t += step) {
    const iso = new Date(t + offset).toISOString();
    const key = bucket === "hour" ? iso.slice(0, 13).replace("T", " ") + ":00" : iso.slice(0, 10);
    if (out.length && out[out.length - 1].bucket === key) continue;
    const r = map.get(key);
    out.push({ bucket: key, views: Number(r?.views || 0), visitors: Number(r?.visitors || 0) });
  }
  return out;
}

export async function live(env: AdminEnv) {
  const since = Date.now() - ACTIVE_WINDOW_MS;
  const [count, paths, countries, devices, recent] = await Promise.all([
    first<any>(env, "select count(*) as c from aap_presence where ts>=?1", since),
    all<any>(env, "select path, count(*) as visitors from aap_presence where ts>=?1 group by path order by visitors desc limit 15", since),
    all<any>(env, "select coalesce(country,'??') as country, count(*) as visitors from aap_presence where ts>=?1 group by country order by visitors desc limit 10", since),
    all<any>(env, "select device, count(*) as visitors from aap_presence where ts>=?1 group by device", since),
    all<any>(env, "select ts,path,country,device from aap_pageviews order by id desc limit 30"),
  ]);
  let signedIn: number | null = null;
  try {
    const row = await first<any>(env, "select count(distinct user_id) as c from auth_sessions where last_seen_at>=datetime('now','-15 minutes')");
    signedIn = Number(row?.c || 0);
  } catch {
    signedIn = null;
  }
  return { activeNow: Number(count?.c || 0), signedInNow: signedIn, paths, countries, devices, recent, windowMinutes: ACTIVE_WINDOW_MS / 60_000 };
}

export async function today(env: AdminEnv) {
  const dayStart = new Date(Date.now() + 345 * 60_000);
  dayStart.setUTCHours(0, 0, 0, 0);
  const since = dayStart.getTime() - 345 * 60_000;
  const row = await first<any>(env, "select count(*) as views, count(distinct visitor) as visitors from aap_pageviews where ts>=?1", since);
  return { views: Number(row?.views || 0), visitors: Number(row?.visitors || 0) };
}

export async function prune(env: AdminEnv) {
  const days = Math.max(7, Math.min(400, Number(await getSetting(env, "analytics.retention_days", 90)) || 90));
  await env.DB.batch([
    env.DB.prepare("delete from aap_pageviews where ts<?1").bind(Date.now() - days * 86400_000),
    env.DB.prepare("delete from aap_presence where ts<?1").bind(Date.now() - 86400_000),
    env.DB.prepare("delete from aap_sessions where expires_at<?1").bind(Date.now()),
    env.DB.prepare("delete from aap_login_attempts where first_at<?1 and locked_until<?1").bind(Date.now() - 86400_000),
    env.DB.prepare("delete from aap_audit where ts<?1").bind(Date.now() - 365 * 86400_000),
  ]);
}

/** Optional: zone-level numbers from Cloudflare's GraphQL Analytics API. */
export async function cloudflareEdge(env: AdminEnv, days: number) {
  const token = await getSecret(env, "cloudflare.api_token");
  const zone = await getSetting<string>(env, "cloudflare.zone_id", "");
  if (!token || !zone) return { configured: false };
  const since = new Date(Date.now() - Math.max(1, Math.min(30, days)) * 86400_000).toISOString().slice(0, 10);
  const query = `query($zone:String!,$since:Date!){viewer{zones(filter:{zoneTag:$zone}){httpRequests1dGroups(limit:31,filter:{date_geq:$since},orderBy:[date_ASC]){dimensions{date}sum{requests pageViews bytes threats cachedRequests}uniq{uniques}}}}}`;
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { authorization: "Bearer " + token, "content-type": "application/json" },
    body: JSON.stringify({ query, variables: { zone, since } }),
    signal: AbortSignal.timeout(10_000),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || data?.errors?.length) {
    return { configured: true, error: data?.errors?.[0]?.message || "Cloudflare returned HTTP " + res.status };
  }
  const rows = data?.data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];
  return {
    configured: true,
    days: rows.map((r: any) => ({
      date: r.dimensions.date, requests: r.sum.requests, pageViews: r.sum.pageViews, bytes: r.sum.bytes,
      threats: r.sum.threats, cached: r.sum.cachedRequests, uniques: r.uniq.uniques,
    })),
  };
}

export function analyticsJson(data: unknown) {
  return json({ ok: true, ...(data as object) });
}
