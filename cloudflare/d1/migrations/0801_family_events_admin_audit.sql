create table if not exists family_events (
  id text primary key,
  family_id text not null references families(id) on delete cascade,
  created_by text not null references app_users(id) on delete cascade,
  title text not null,
  event_date text not null,
  payload text not null default '{}',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);
create index if not exists family_events_family_date_idx on family_events(family_id,event_date);

create table if not exists admin_audit_log (
  id text primary key,
  user_id text references app_users(id) on delete set null,
  action text not null,
  target text not null,
  payload text,
  created_at text not null default (datetime('now'))
);
create index if not exists admin_audit_created_idx on admin_audit_log(created_at);
