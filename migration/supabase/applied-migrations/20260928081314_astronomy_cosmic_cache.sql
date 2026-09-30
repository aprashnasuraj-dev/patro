-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260928081314
-- Name: astronomy_cosmic_cache
-- Recovered 2026-09-30


create table if not exists public.nasa_cosmic_cache (
  cache_key text primary key,
  source text not null,
  request_date date,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nasa_cosmic_cache_expires_at_idx
  on public.nasa_cosmic_cache (expires_at);

alter table public.nasa_cosmic_cache enable row level security;

drop policy if exists "nasa cosmic cache deny anon" on public.nasa_cosmic_cache;
create policy "nasa cosmic cache deny anon"
  on public.nasa_cosmic_cache
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "nasa cosmic cache deny authenticated" on public.nasa_cosmic_cache;
create policy "nasa cosmic cache deny authenticated"
  on public.nasa_cosmic_cache
  for all
  to authenticated
  using (false)
  with check (false);

comment on table public.nasa_cosmic_cache is
  'Server-only NASA/astronomy upstream response cache. Client roles are explicitly denied; Edge Functions use service-role access.';

