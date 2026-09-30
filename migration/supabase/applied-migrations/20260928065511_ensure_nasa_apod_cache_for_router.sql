-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260928065511
-- Name: ensure_nasa_apod_cache_for_router
-- Recovered 2026-09-30

create table if not exists public.nasa_apod_cache (
  date text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.nasa_apod_cache enable row level security;

comment on table public.nasa_apod_cache is
  'Server-side NASA APOD cache used by the Supabase Edge Function router. Service-role access only.';
