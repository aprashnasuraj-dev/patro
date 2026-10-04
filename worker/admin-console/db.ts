// Aafnai Patro admin console — D1 schema + helpers.
// Cloudflare Workers Builds runs `npm run build` + `wrangler deploy` but does NOT
// apply D1 migrations, so the console creates its own tables idempotently on the
// first request each isolate serves. The same DDL is mirrored in
// cloudflare/d1/schema-migrations/0003_admin_console.sql for manual application.

export type AdminEnv = Record<string, unknown> & {
  DB?: any;
  ASSETS?: { fetch(request: Request): Promise<Response> };
  ADMIN_SECRET?: string;
  ADMIN_BOOTSTRAP_PASSWORD?: string;
  ADMIN_RECOVERY_PASSWORD?: string;
  PUBLIC_SITE_URL?: string;
};

export const SCHEMA: string[] = [
  `create table if not exists aap_admins (
    id text primary key,
    username text not null unique collate nocase,
    password_hash text not null,
    role text not null default 'editor',
    display_name text,
    totp_secret_enc text,
    totp_enabled integer not null default 0,
    must_change_password integer not null default 0,
    created_at integer not null,
    updated_at integer not null,
    last_login_at integer,
    last_login_ip text
  )`,
  `create table if not exists aap_sessions (
    id text primary key,
    admin_id text not null,
    token_hash text not null unique,
    csrf text not null,
    created_at integer not null,
    expires_at integer not null,
    last_seen_at integer not null,
    ip text,
    user_agent text
  )`,
  `create index if not exists aap_sessions_admin_idx on aap_sessions(admin_id)`,
  `create table if not exists aap_login_attempts (
    key text primary key,
    failures integer not null default 0,
    first_at integer not null,
    locked_until integer not null default 0
  )`,
  `create table if not exists aap_settings (
    key text primary key,
    value text not null,
    updated_at integer not null
  )`,
  `create table if not exists aap_secrets (
    name text primary key,
    value_enc text not null,
    hint text,
    updated_at integer not null,
    updated_by text
  )`,
  `create table if not exists aap_config (
    slot text primary key,
    json text not null,
    version integer not null default 0,
    updated_at integer not null,
    updated_by text
  )`,
  `create table if not exists aap_config_versions (
    id integer primary key autoincrement,
    version integer not null,
    json text not null,
    note text,
    created_at integer not null,
    created_by text
  )`,
  `create table if not exists aap_pageviews (
    id integer primary key autoincrement,
    ts integer not null,
    path text not null,
    visitor text not null,
    country text,
    device text,
    browser text,
    referrer text
  )`,
  `create index if not exists aap_pageviews_ts_idx on aap_pageviews(ts)`,
  `create table if not exists aap_presence (
    visitor text primary key,
    ts integer not null,
    path text,
    country text,
    device text
  )`,
  `create index if not exists aap_presence_ts_idx on aap_presence(ts)`,
  `create table if not exists aap_ai_threads (
    id text primary key,
    admin_id text not null,
    title text not null,
    messages text not null,
    created_at integer not null,
    updated_at integer not null
  )`,
  `create table if not exists aap_ai_proposals (
    id text primary key,
    thread_id text,
    tool text not null,
    args text not null,
    summary text not null,
    status text not null default 'pending',
    created_at integer not null,
    decided_at integer,
    decided_by text
  )`,
  `create index if not exists aap_ai_proposals_thread_idx on aap_ai_proposals(thread_id)`,
  `create table if not exists aap_audit (
    id integer primary key autoincrement,
    ts integer not null,
    admin text,
    action text not null,
    target text,
    detail text
  )`,
  `create index if not exists aap_audit_ts_idx on aap_audit(ts)`,
];

let schemaReady: Promise<void> | null = null;

export function ensureSchema(env: AdminEnv) {
  if (!env.DB) return Promise.reject(new Error("d1_unavailable"));
  if (!schemaReady) {
    const db = env.DB;
    schemaReady = db
      .batch(SCHEMA.map((sql) => db.prepare(sql)))
      .then(() => undefined)
      .catch((error: unknown) => {
        schemaReady = null; // retry on next request
        throw error;
      });
  }
  return schemaReady as Promise<void>;
}

export async function all<T = any>(env: AdminEnv, sql: string, ...binds: unknown[]): Promise<T[]> {
  let q = env.DB.prepare(sql);
  if (binds.length) q = q.bind(...binds);
  const res = await q.all();
  return (res?.results || []) as T[];
}
export async function first<T = any>(env: AdminEnv, sql: string, ...binds: unknown[]): Promise<T | null> {
  let q = env.DB.prepare(sql);
  if (binds.length) q = q.bind(...binds);
  return ((await q.first()) ?? null) as T | null;
}
export async function run(env: AdminEnv, sql: string, ...binds: unknown[]) {
  let q = env.DB.prepare(sql);
  if (binds.length) q = q.bind(...binds);
  return q.run();
}

export async function getSetting<T = any>(env: AdminEnv, key: string, fallback: T): Promise<T> {
  const row = await first<{ value: string }>(env, "select value from aap_settings where key=?1", key);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}
export async function setSetting(env: AdminEnv, key: string, value: unknown) {
  await run(
    env,
    "insert into aap_settings(key,value,updated_at) values(?1,?2,?3) on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at",
    key,
    JSON.stringify(value),
    Date.now()
  );
}

export async function audit(env: AdminEnv, admin: string | null, action: string, target: string, detail?: unknown) {
  try {
    await run(
      env,
      "insert into aap_audit(ts,admin,action,target,detail) values(?1,?2,?3,?4,?5)",
      Date.now(),
      admin,
      action,
      target,
      detail === undefined ? null : JSON.stringify(detail).slice(0, 4000)
    );
  } catch {
    /* audit must never break the action */
  }
}

export function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
      ...extra,
    },
  });
}

export async function readJson(request: Request, max = 256 * 1024): Promise<any> {
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > max) throw new Error("payload_too_large");
  return text ? JSON.parse(text) : {};
}

export function clientIp(request: Request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
}
