-- Aafnai Patro admin console tables (prefix aap_).
-- The Worker creates these automatically on first request (worker/admin-console/db.ts),
-- because Cloudflare Workers Builds does not apply D1 migrations. This file mirrors that
-- DDL so `npm run cloudflare:migrate` stays in sync. Every statement is idempotent.

create table if not exists aap_admins (
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
  );

create table if not exists aap_sessions (
  id text primary key,
  admin_id text not null,
  token_hash text not null unique,
  csrf text not null,
  created_at integer not null,
  expires_at integer not null,
  last_seen_at integer not null,
  ip text,
  user_agent text
  );

create index if not exists aap_sessions_admin_idx on aap_sessions(admin_id);

create table if not exists aap_login_attempts (
  key text primary key,
  failures integer not null default 0,
  first_at integer not null,
  locked_until integer not null default 0
  );

create table if not exists aap_settings (
  key text primary key,
  value text not null,
  updated_at integer not null
  );

create table if not exists aap_secrets (
  name text primary key,
  value_enc text not null,
  hint text,
  updated_at integer not null,
  updated_by text
  );

create table if not exists aap_config (
  slot text primary key,
  json text not null,
  version integer not null default 0,
  updated_at integer not null,
  updated_by text
  );

create table if not exists aap_config_versions (
  id integer primary key autoincrement,
  version integer not null,
  json text not null,
  note text,
  created_at integer not null,
  created_by text
  );

create table if not exists aap_pageviews (
  id integer primary key autoincrement,
  ts integer not null,
  path text not null,
  visitor text not null,
  country text,
  device text,
  browser text,
  referrer text
  );

create index if not exists aap_pageviews_ts_idx on aap_pageviews(ts);

create table if not exists aap_presence (
  visitor text primary key,
  ts integer not null,
  path text,
  country text,
  device text
  );

create index if not exists aap_presence_ts_idx on aap_presence(ts);

create table if not exists aap_ai_threads (
  id text primary key,
  admin_id text not null,
  title text not null,
  messages text not null,
  created_at integer not null,
  updated_at integer not null
  );

create table if not exists aap_ai_proposals (
  id text primary key,
  thread_id text,
  tool text not null,
  args text not null,
  summary text not null,
  status text not null default 'pending',
  created_at integer not null,
  decided_at integer,
  decided_by text
  );

create index if not exists aap_ai_proposals_thread_idx on aap_ai_proposals(thread_id);

create table if not exists aap_audit (
  id integer primary key autoincrement,
  ts integer not null,
  admin text,
  action text not null,
  target text,
  detail text
  );

create index if not exists aap_audit_ts_idx on aap_audit(ts);
