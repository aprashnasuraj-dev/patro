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

alter table user_calendar_state add column revision integer not null default 0;
