-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260919001653
-- Name: enrich_nepal_sambat_and_history_schema
-- Recovered 2026-09-30


drop table if exists public.nepal_sambat_tithis cascade;
drop table if exists public.nepal_sambat_rules cascade;
drop table if exists public.nepal_sambat_sources cascade;
drop table if exists public.nepal_sambat_examples cascade;

alter table public.on_this_day_events add column if not exists ad_date date;
alter table public.on_this_day_events add column if not exists importance smallint not null default 50;
alter table public.on_this_day_events add column if not exists sources jsonb not null default '[]'::jsonb;
alter table public.on_this_day_events add column if not exists image_url text;
alter table public.on_this_day_events add column if not exists image_caption_ne text;
alter table public.on_this_day_events add column if not exists image_caption_en text;
alter table public.on_this_day_events add column if not exists image_credit text;
alter table public.on_this_day_events add column if not exists image_license text;
do $$ begin
  alter table public.on_this_day_events add constraint on_this_day_importance_range check (importance between 0 and 100);
exception when duplicate_object then null; end $$;
create index if not exists on_this_day_md_idx on public.on_this_day_events(ad_month,ad_day,published,ad_year);
create index if not exists on_this_day_importance_idx on public.on_this_day_events(ad_month,ad_day,published,importance desc);

alter table public.nepal_sambat_observances enable row level security;
drop policy if exists "ns_observances_public_read" on public.nepal_sambat_observances;
create policy "ns_observances_public_read" on public.nepal_sambat_observances for select to anon, authenticated using (true);

