-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260919032441
-- Name: on_this_day_enrichment_and_preview_feedback
-- Recovered 2026-09-30


alter table public.on_this_day_events add column if not exists source_record_id text;
alter table public.on_this_day_events add column if not exists event_type text;
alter table public.on_this_day_events add column if not exists country_code text;
alter table public.on_this_day_events add column if not exists country text;
alter table public.on_this_day_events add column if not exists highlight boolean not null default false;
alter table public.on_this_day_events add column if not exists image_api_url text;
alter table public.on_this_day_events add column if not exists image_page_title text;
create unique index if not exists on_this_day_source_record_uidx on public.on_this_day_events(source_record_id) where source_record_id is not null;
create index if not exists on_this_day_day_rank_idx on public.on_this_day_events(ad_month,ad_day,published,highlight desc,importance desc,ad_year);

create table if not exists public.preview_feedback (
  id bigint generated always as identity primary key,
  area text not null default 'general',
  rating smallint check (rating between 1 and 5),
  message text not null check (char_length(message) between 2 and 3000),
  page_path text,
  user_agent text,
  created_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new','reviewed','planned','resolved','dismissed'))
);
alter table public.preview_feedback enable row level security;
drop policy if exists "preview_feedback_public_insert" on public.preview_feedback;
create policy "preview_feedback_public_insert" on public.preview_feedback
for insert to anon, authenticated with check (true);

