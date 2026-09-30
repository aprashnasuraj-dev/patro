-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260928042229
-- Name: astronomical_sync_calendar_map
-- Recovered 2026-09-30


create table if not exists public.astronomy_calendar_map (
  ad_date date primary key,
  payload jsonb not null,
  source_version text not null default 'patro-archive-v1',
  created_at timestamptz not null default now()
);

alter table public.astronomy_calendar_map enable row level security;

create index if not exists astronomy_calendar_map_source_idx
  on public.astronomy_calendar_map (source_version);

comment on table public.astronomy_calendar_map is
  'Private server-side AD/BS/Nepal-Sambat/Panchang synchronization map migrated from the existing Patro archive for the single router Edge Function.';

