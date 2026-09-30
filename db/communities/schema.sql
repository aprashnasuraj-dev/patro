-- Community suites (Postgres / Supabase)
create table if not exists community_festivals (
  suite text not null, id text not null, dev text not null, roman text, en text, rule jsonb not null,
  start_offset smallint default 0, span_days smallint default 1, regions jsonb, communities text[], summary text,
  details text[], places text[], holiday text, announced boolean default false, status text not null, sources text[],
  primary key (suite, id)
);
create table if not exists community_dates (
  suite text not null, festival_id text not null, region text, year smallint not null,
  main date not null, start_ad date not null, end_ad date not null, confidence text not null,
  primary key (suite, festival_id, year, main)
);
create index if not exists community_dates_start on community_dates(start_ad);
-- OPTIONAL: official announcements (Home Ministry / Muslim Commission). Rows here upgrade "expected" → "announced".
create table if not exists community_overrides (
  suite text not null, festival_id text not null, year smallint not null, start_ad date not null, end_ad date, note text,
  created_by text, created_at timestamptz default now(), primary key (suite, festival_id, year)
);
alter table community_dates enable row level security; create policy "read" on community_dates for select using (true);
alter table community_overrides enable row level security; create policy "read" on community_overrides for select using (true);
