create table if not exists holiday_overrides (
  id text primary key,
  ad_date text not null,
  name_ne text not null,
  name_en text,
  scope_type text not null default 'national',
  effect text not null default 'closed',
  status text not null default 'announced',
  source_url text,
  source_title text,
  payload text not null default '{}',
  updated_by text,
  updated_at text not null default (datetime('now'))
);
create index if not exists holiday_overrides_date_idx on holiday_overrides(ad_date);
