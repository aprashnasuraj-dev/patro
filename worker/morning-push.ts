import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";
import { parseBody, sha256 } from "./auth";
import { loadCalendarShard, type CalendarArchiveEnv } from "./calendar-archive";
import { morningMessage, nextNepalMorning } from "../lib/morning-message";
import type { PushEnv } from "./push";

type Env = PushEnv & CalendarArchiveEnv & { PUBLIC_SITE_URL?: string };

const schemaReady = new WeakMap<object, Promise<void>>();
async function ensureMorningSchema(env: Env) {
  if (!env.DB) return;
  let ready = schemaReady.get(env.DB);
  if (!ready) {
    ready = (async () => {
      const statements = `CREATE TABLE IF NOT EXISTS morning_subscriptions (
  device_id TEXT PRIMARY KEY,
  secret_hash TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  keys TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  next_due_at TEXT NOT NULL,
  last_sent_date TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  claim_until TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS morning_push_due_idx ON morning_subscriptions(next_due_at);`.split(";").map(s => s.trim()).filter(Boolean);
      for (const statement of statements) await env.DB.prepare(statement).bind().run();
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS runtime_rate_buckets (scope TEXT NOT NULL,key_hash TEXT NOT NULL,window_start INTEGER NOT NULL,count INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(scope,key_hash,window_start))").bind().run();
    })().catch(error => { schemaReady.delete(env.DB); throw error; });
    schemaReady.set(env.DB, ready);
  }
  await ready;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
export function validPushEndpoint(endpoint: string) {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && !u.username && !u.password && !u.port &&
      /^(?:fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/.test(u.hostname);
  } catch { return false; }
}
const validKeys = (keys: any) => /^[A-Za-z0-9_-]{87,88}$/.test(keys?.p256dh || "") && /^[A-Za-z0-9_-]{22,24}$/.test(keys?.auth || "");

export async function morningPushResponse(request: Request, env: Env): Promise<Response | null> {
  if (new URL(request.url).pathname !== "/api/push/morning") return null;
  if (!["GET", "POST", "DELETE"].includes(request.method)) return json({ error: "method_not_allowed" }, 405);
  if (request.method !== "GET" && request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "same_origin_required" }, 403);
  if (!env.DB || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return json({ error: "push_not_configured" }, 503);
  try { await ensureMorningSchema(env); } catch { return json({ error: "push_storage_unavailable" }, 503); }
  if (request.method === "GET") return json({ configured: true, time: "06:00", timezone: "Asia/Kathmandu", installation_feature: true });
  const ip=request.headers.get("cf-connecting-ip")||"local";
  const windowStart=Math.floor(Date.now()/600_000)*600;
  const rate=await env.DB.prepare("INSERT INTO runtime_rate_buckets(scope,key_hash,window_start,count) VALUES('morning-subscribe',?1,?2,1) ON CONFLICT(scope,key_hash,window_start) DO UPDATE SET count=count+1 RETURNING count")
    .bind(await sha256(ip),windowStart).first();
  if(Number(rate?.count)>20)return json({error:"rate_limited"},429);
  let body: any; try { body = await parseBody(request, 8192); } catch { return json({ error: "invalid_json" }, 400); }
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(body.device_id || "") || !/^[a-zA-Z0-9_-]{32,128}$/.test(body.device_secret || "")) return json({ error: "invalid_device" }, 400);
  const hash = await sha256(body.device_secret);
  const own = await env.DB.prepare("SELECT secret_hash FROM morning_subscriptions WHERE device_id=?1").bind(body.device_id).first();
  if (own && own.secret_hash !== hash) return json({ error: "forbidden" }, 403);
  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM morning_subscriptions WHERE device_id=?1 AND secret_hash=?2").bind(body.device_id, hash).run();
    return json({ ok: true });
  }
  if (body.consent !== true || !validPushEndpoint(String(body.subscription?.endpoint || "")) || !validKeys(body.subscription?.keys)) return json({ error: "invalid_subscription_or_consent" }, 400);
  const endpointOwner = await env.DB.prepare("SELECT device_id FROM morning_subscriptions WHERE endpoint=?1").bind(body.subscription.endpoint).first();
  if (endpointOwner && endpointOwner.device_id !== body.device_id) return json({ error: "subscription_owned_by_another_device" }, 409);
  const name = String(body.name || "").replace(/[\p{Cc}\p{Cf}]/gu, "").trim().slice(0, 80);
  // An upsert updates the user's preference without delaying an already-due greeting.
  await env.DB.prepare("INSERT INTO morning_subscriptions(device_id,secret_hash,endpoint,keys,display_name,next_due_at) VALUES(?1,?2,?3,?4,?5,?6) ON CONFLICT(device_id) DO UPDATE SET endpoint=excluded.endpoint,keys=excluded.keys,display_name=excluded.display_name")
    .bind(body.device_id, hash, body.subscription.endpoint, JSON.stringify(body.subscription.keys), name, nextNepalMorning()).run();
  return json({ ok: true, time: "06:00", timezone: "Asia/Kathmandu" });
}

async function dayFacts(env: Env, date: string) {
  const request = new Request(`${env.PUBLIC_SITE_URL || "https://aafnaipatro.com"}/date/${date}`);
  const shard = await loadCalendarShard(request, env, "ad", Number(date.slice(0, 4)));
  const day = shard?.doc.rows.find((row: any) => row.ad === date);
  if (!day) return null;
  const names: string[] = [];
  if (env.ASSETS) {
    const response = await env.ASSETS.fetch(new Request(new URL("/data/festival-index.json", request.url)));
    if (response.ok) {
      const index: any = await response.json();
      for (const festival of Object.values(index.festivals || {}) as any[]) {
        if (Object.values(festival.years || {}).some((o: any) => o.dates?.includes(date))) names.push(festival.name);
      }
    }
  }
  return { day, names };
}

export async function dispatchMorningPush(env: Env, limit = 32, now = Date.now()) {
  if (!env.DB || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return { ok: false, error: "push_not_configured" };
  const clock = new Date(now + 345 * 60_000);
  const date = clock.toISOString().slice(0, 10);
  const minutes = clock.getUTCHours() * 60 + clock.getUTCMinutes();
  if (minutes < 360 || minutes >= 720) return { ok: true, sent: 0, skipped: "outside_morning" };
  await ensureMorningSchema(env);
  const instant = new Date(now).toISOString();
  const rows = await env.DB.prepare("SELECT * FROM morning_subscriptions WHERE next_due_at<=?1 AND (claim_until IS NULL OR claim_until<=?1) ORDER BY next_due_at LIMIT ?2").bind(instant, Math.min(32, Math.max(1, Math.floor(limit)))).all();
  if (!rows.results?.length) return { ok: true, sent: 0 };
  const facts = await dayFacts(env, date);
  if (!facts) return { ok: false, error: "calendar_unavailable", sent: 0 };
  let sent = 0, failed = 0;
  const send = async (row: any) => {
    // Claim with an atomic conditional update, so overlapping crons cannot send the same device twice.
    const claim = await env.DB.prepare("UPDATE morning_subscriptions SET claim_until=?2 WHERE device_id=?1 AND next_due_at<=?3 AND (claim_until IS NULL OR claim_until<=?3)")
      .bind(row.device_id, new Date(now + 10 * 60_000).toISOString(), instant).run();
    if (!claim.meta?.changes) return;
    if (row.last_sent_date === date) {
      await env.DB.prepare("UPDATE morning_subscriptions SET next_due_at=?2,claim_until=NULL WHERE device_id=?1").bind(row.device_id, nextNepalMorning(now)).run(); return;
    }
    try {
      if (!validPushEndpoint(row.endpoint)) throw new Error("invalid_endpoint");
      const sub: PushSubscription = { endpoint: row.endpoint, expirationTime: null, keys: JSON.parse(row.keys) };
      const payload = await buildPushPayload({ data: JSON.stringify(morningMessage(date, facts.day, facts.names, row.display_name)), options: { ttl: 6 * 3600, urgency: "normal" } }, sub, { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY });
      const response = await fetch(row.endpoint, { ...payload, redirect: "error", signal: AbortSignal.timeout(8000) });
      if (response.ok) {
        await env.DB.prepare("UPDATE morning_subscriptions SET last_sent_date=?2,next_due_at=?3,attempts=0,claim_until=NULL WHERE device_id=?1").bind(row.device_id, date, nextNepalMorning(now)).run(); sent++;
      } else if (response.status === 404 || response.status === 410) {
        await env.DB.prepare("DELETE FROM morning_subscriptions WHERE device_id=?1").bind(row.device_id).run(); failed++;
      } else throw new Error("push_http");
    } catch {
      const attempts = Number(row.attempts || 0) + 1;
      await env.DB.prepare("UPDATE morning_subscriptions SET attempts=?2,next_due_at=?3,claim_until=NULL WHERE device_id=?1")
        .bind(row.device_id, attempts, attempts >= 5 ? nextNepalMorning(now) : new Date(now + Math.min(3600, 60 * 2 ** attempts) * 1000).toISOString()).run(); failed++;
    }
  }
  for(let offset=0;offset<rows.results.length;offset+=4)await Promise.all(rows.results.slice(offset,offset+4).map(send));
  return { ok: true, sent, failed, processed: rows.results.length };
}
