-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260919001553
-- Name: nepal_sambat_reference_and_on_this_day
-- Recovered 2026-09-30


create table if not exists public.nepal_sambat_months (
  month_no smallint primary key,
  dev text not null,
  roman text not null,
  newa text,
  lunar_equivalent text,
  full_moon_name text,
  month_kind text not null default 'standard' check (month_kind in ('standard','intercalary','reduced')),
  updated_at timestamptz not null default now()
);
create table if not exists public.nepal_sambat_tithis (
  tithi_no smallint primary key check (tithi_no between 1 and 15),
  dev text not null,
  roman text not null,
  standard_dev text,
  standard_roman text,
  updated_at timestamptz not null default now()
);
create table if not exists public.nepal_sambat_rules (
  id text primary key,
  title_ne text not null,
  detail_ne text not null,
  authority text,
  source_url text,
  updated_at timestamptz not null default now()
);
create table if not exists public.nepal_sambat_sources (
  id bigint generated always as identity primary key,
  url text not null unique,
  role text not null,
  source_level text,
  updated_at timestamptz not null default now()
);
create table if not exists public.nepal_sambat_examples (
  id bigint generated always as identity primary key,
  bs_date text,
  notation_ne text not null,
  authority text,
  source_url text,
  updated_at timestamptz not null default now()
);
create table if not exists public.nepal_sambat_observances (
  id bigint generated always as identity primary key,
  phase_type text not null check (phase_type in ('punhi','amai','chahre','paru')),
  month_key text not null,
  observance_ne text not null,
  source_url text,
  updated_at timestamptz not null default now(),
  unique(phase_type, month_key, observance_ne)
);
create table if not exists public.on_this_day_events (
  id uuid primary key default gen_random_uuid(),
  ad_year integer,
  ad_month smallint not null check (ad_month between 1 and 12),
  ad_day smallint not null check (ad_day between 1 and 31),
  ad_date date,
  bs_date text,
  title_ne text,
  title_en text,
  summary_ne text,
  summary_en text,
  category text not null default 'history',
  importance smallint not null default 50 check (importance between 0 and 100),
  source_name text,
  source_url text,
  sources jsonb not null default '[]'::jsonb,
  image_url text,
  image_caption_ne text,
  image_caption_en text,
  image_credit text,
  image_license text,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified','single-source','cross-checked','primary-source','verified')),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (title_ne is not null or title_en is not null)
);
create index if not exists on_this_day_md_idx on public.on_this_day_events(ad_month,ad_day,published,ad_year);
create index if not exists on_this_day_category_idx on public.on_this_day_events(category,published);

alter table public.nepal_sambat_months enable row level security;
alter table public.nepal_sambat_tithis enable row level security;
alter table public.nepal_sambat_rules enable row level security;
alter table public.nepal_sambat_sources enable row level security;
alter table public.nepal_sambat_examples enable row level security;
alter table public.nepal_sambat_observances enable row level security;
alter table public.on_this_day_events enable row level security;

drop policy if exists "ns_months_public_read" on public.nepal_sambat_months;
drop policy if exists "ns_tithis_public_read" on public.nepal_sambat_tithis;
drop policy if exists "ns_rules_public_read" on public.nepal_sambat_rules;
drop policy if exists "ns_sources_public_read" on public.nepal_sambat_sources;
drop policy if exists "ns_examples_public_read" on public.nepal_sambat_examples;
drop policy if exists "ns_observances_public_read" on public.nepal_sambat_observances;
drop policy if exists "otd_public_read_published" on public.on_this_day_events;

create policy "ns_months_public_read" on public.nepal_sambat_months for select to anon, authenticated using (true);
create policy "ns_tithis_public_read" on public.nepal_sambat_tithis for select to anon, authenticated using (true);
create policy "ns_rules_public_read" on public.nepal_sambat_rules for select to anon, authenticated using (true);
create policy "ns_sources_public_read" on public.nepal_sambat_sources for select to anon, authenticated using (true);
create policy "ns_examples_public_read" on public.nepal_sambat_examples for select to anon, authenticated using (true);
create policy "ns_observances_public_read" on public.nepal_sambat_observances for select to anon, authenticated using (true);
create policy "otd_public_read_published" on public.on_this_day_events for select to anon, authenticated using (published = true);

