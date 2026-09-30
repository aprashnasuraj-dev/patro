-- Cloudflare-native identity and private per-user state.
-- Google is an identity provider only; no Gmail/Drive scopes are required.

create table if not exists app_users (
  id text primary key,
  provider text not null,
  provider_subject text not null,
  email text,
  email_verified integer not null default 0,
  display_name text,
  picture_url text,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  unique(provider, provider_subject)
);

create table if not exists auth_sessions (
  id text primary key,
  user_id text not null references app_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at text not null,
  created_at text not null default (datetime('now')),
  last_seen_at text not null default (datetime('now'))
);
create index if not exists auth_sessions_user_idx on auth_sessions(user_id);
create index if not exists auth_sessions_expiry_idx on auth_sessions(expires_at);

create table if not exists user_calendar_state (
  user_id text primary key references app_users(id) on delete cascade,
  notes text not null default '{}',
  events text not null default '[]',
  calendars text not null default '[]',
  preferences text not null default '{}',
  feedback text not null default '[]',
  updated_at text not null default (datetime('now'))
);

create table if not exists user_community_preferences (
  user_id text primary key references app_users(id) on delete cascade,
  communities text not null default '[]',
  updated_at text not null default (datetime('now'))
);

create table if not exists families (
  id text primary key,
  name text not null,
  created_by text not null references app_users(id) on delete cascade,
  created_at text not null default (datetime('now'))
);
create table if not exists family_members (
  family_id text not null references families(id) on delete cascade,
  user_id text not null references app_users(id) on delete cascade,
  role text not null,
  display_name text,
  timezone text not null default 'Asia/Kathmandu',
  joined_at text not null default (datetime('now')),
  primary key(family_id,user_id)
);
create table if not exists family_invites (
  id text primary key,
  family_id text not null references families(id) on delete cascade,
  token_hash text not null unique,
  role text not null default 'member',
  expires_at text not null,
  max_uses integer not null default 1,
  uses integer not null default 0,
  created_by text not null references app_users(id) on delete cascade,
  created_at text not null default (datetime('now'))
);

create table if not exists personal_ics_tokens (
  user_id text primary key references app_users(id) on delete cascade,
  token_hash text not null unique,
  created_at text not null default (datetime('now'))
);

create table if not exists push_subscriptions (
  device_id text primary key,
  device_secret_hash text not null,
  user_id text references app_users(id) on delete set null,
  endpoint text not null unique,
  keys text not null,
  user_agent_family text not null default 'unknown',
  timezone text not null default 'Asia/Kathmandu',
  quiet_hours text,
  created_at text not null default (datetime('now')),
  last_success_at text
);
create index if not exists push_subscriptions_user_idx on push_subscriptions(user_id);

create table if not exists notification_jobs (
  id text primary key,
  device_id text not null references push_subscriptions(device_id) on delete cascade,
  fire_at_utc text not null,
  job_ref text not null,
  category text not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  next_attempt_at text,
  shared_payload text,
  created_at text not null default (datetime('now'))
);
create index if not exists notification_jobs_due_idx on notification_jobs(status,fire_at_utc);

create table if not exists private_migration_claims (
  id text primary key,
  user_id text not null references app_users(id) on delete cascade,
  source text not null,
  source_user_id text,
  status text not null default 'pending',
  created_at text not null default (datetime('now')),
  completed_at text
);
