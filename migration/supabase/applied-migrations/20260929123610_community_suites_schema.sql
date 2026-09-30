-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260929123610
-- Name: community_suites_schema
-- Recovered 2026-09-30


create table if not exists public.community_festivals (
  suite text not null, id text not null, dev text not null, roman text, en text, rule jsonb not null,
  start_offset smallint default 0, span_days smallint default 1, regions jsonb, communities text[], summary text,
  details text[], places text[], holiday text, announced boolean default false, status text not null, sources text[],
  primary key (suite, id)
);
create table if not exists public.community_dates (
  suite text not null, festival_id text not null, region text, year smallint not null,
  main date not null, start_ad date not null, end_ad date not null, confidence text not null,
  primary key (suite, festival_id, year, main)
);
create index if not exists community_dates_start on public.community_dates(start_ad);
create table if not exists public.community_overrides (
  suite text not null, festival_id text not null, year smallint not null, start_ad date not null, end_ad date, note text,
  created_by text, created_at timestamptz default now(), primary key (suite, festival_id, year)
);

create table if not exists public.ns_months (
  n smallint primary key, amanta_index smallint not null, dev text not null, newa text not null, roman text not null,
  dev_variants text[] not null default '{}', lunar_sanskrit text, full_moon_dev text, full_moon_newa text, full_moon_roman text,
  gregorian text, status text not null, sources text[] not null
);
create table if not exists public.ns_festivals (
  id text primary key, dev text not null, newa text not null, roman text not null, en text not null, aliases text[] not null default '{}',
  anchor jsonb not null, span_days smallint not null default 1, tradition text not null, places text[] not null default '{}',
  summary text, is_new_year boolean default false, public_holiday text, declared_annually boolean default false,
  status text not null, sources text[] not null default '{}', updated_at timestamptz default now()
);
create table if not exists public.ns_festival_dates (
  ns_year smallint not null, festival_id text not null references public.ns_festivals(id), start_ad date not null, end_ad date not null,
  confidence text not null check (confidence in ('computed','confirmed')), confirmed_by text, note text,
  primary key (ns_year, festival_id)
);
create index if not exists ns_festival_dates_start on public.ns_festival_dates(start_ad);
create table if not exists public.ns_days (
  ad date primary key, ns_year smallint not null, ns_month smallint not null, ns_adhik boolean not null,
  ns_paksha text not null, ns_tithi smallint not null, ns_label text not null, ns_label_newa text not null,
  solar_year smallint not null, solar_month smallint not null, solar_day smallint not null
);

alter table public.community_festivals enable row level security;
alter table public.community_dates enable row level security;
alter table public.community_overrides enable row level security;
alter table public.ns_months enable row level security;
alter table public.ns_festivals enable row level security;
alter table public.ns_festival_dates enable row level security;
alter table public.ns_days enable row level security;

do $$
declare t text;
begin
  foreach t in array array['community_festivals','community_dates','community_overrides','ns_months','ns_festivals','ns_festival_dates','ns_days']
  loop
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename=t and policyname='public_read'
    ) then
      execute format('create policy public_read on public.%I for select to anon, authenticated using (true)', t);
    end if;
  end loop;
end $$;

grant select on public.community_festivals, public.community_dates, public.community_overrides,
  public.ns_months, public.ns_festivals, public.ns_festival_dates, public.ns_days to anon, authenticated;
revoke insert, update, delete on public.community_festivals, public.community_dates, public.community_overrides,
  public.ns_months, public.ns_festivals, public.ns_festival_dates, public.ns_days from anon, authenticated;

