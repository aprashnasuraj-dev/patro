create table if not exists community_overrides (
  suite text not null,
  festival_id text not null,
  year integer not null,
  start_ad text not null,
  end_ad text,
  note text,
  updated_by text,
  updated_at text not null default (datetime('now')),
  primary key(suite,festival_id,year)
);
create index if not exists community_overrides_suite_year_idx on community_overrides(suite,year);

create table if not exists ns_festival_overrides (
  festival_id text not null,
  ns_year integer not null,
  start_ad text not null,
  end_ad text not null,
  confidence text not null default 'confirmed',
  note text,
  updated_by text,
  updated_at text not null default (datetime('now')),
  primary key(festival_id,ns_year)
);
create index if not exists ns_festival_overrides_year_idx on ns_festival_overrides(ns_year);
