-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260919004405
-- Name: personal_astrology_private_schema
-- Recovered 2026-09-30


create table if not exists public.astrology_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'My birth chart' check (char_length(label) between 1 and 80),
  birth_date_ad date not null,
  birth_date_bs text,
  time_known boolean not null default false,
  birth_time time,
  location_name text,
  latitude double precision,
  longitude double precision,
  timezone text not null default 'Asia/Kathmandu',
  ayanamsa text not null default 'lahiri',
  calculation_engine text not null default 'astronomy-engine@2.1.19',
  cloud_sync_opt_in boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180),
  check ((time_known = false) or birth_time is not null)
);
create index if not exists astrology_profiles_user_idx on public.astrology_profiles(user_id, updated_at desc);

create table if not exists public.astrology_chart_cache (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.astrology_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  calculation_version text not null,
  chart jsonb not null,
  generated_at timestamptz not null default now(),
  unique(profile_id, calculation_version)
);
create index if not exists astrology_chart_cache_user_idx on public.astrology_chart_cache(user_id);

alter table public.astrology_profiles enable row level security;
alter table public.astrology_chart_cache enable row level security;

drop policy if exists "astro_profiles_own_select" on public.astrology_profiles;
drop policy if exists "astro_profiles_own_insert" on public.astrology_profiles;
drop policy if exists "astro_profiles_own_update" on public.astrology_profiles;
drop policy if exists "astro_profiles_own_delete" on public.astrology_profiles;
create policy "astro_profiles_own_select" on public.astrology_profiles for select to authenticated using (user_id=(select auth.uid()));
create policy "astro_profiles_own_insert" on public.astrology_profiles for insert to authenticated with check (user_id=(select auth.uid()) and cloud_sync_opt_in=true);
create policy "astro_profiles_own_update" on public.astrology_profiles for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "astro_profiles_own_delete" on public.astrology_profiles for delete to authenticated using (user_id=(select auth.uid()));

drop policy if exists "astro_cache_own_select" on public.astrology_chart_cache;
drop policy if exists "astro_cache_own_insert" on public.astrology_chart_cache;
drop policy if exists "astro_cache_own_update" on public.astrology_chart_cache;
drop policy if exists "astro_cache_own_delete" on public.astrology_chart_cache;
create policy "astro_cache_own_select" on public.astrology_chart_cache for select to authenticated using (user_id=(select auth.uid()));
create policy "astro_cache_own_insert" on public.astrology_chart_cache for insert to authenticated with check (
  user_id=(select auth.uid()) and exists (
    select 1 from public.astrology_profiles p where p.id=profile_id and p.user_id=(select auth.uid()) and p.cloud_sync_opt_in=true
  )
);
create policy "astro_cache_own_update" on public.astrology_chart_cache for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "astro_cache_own_delete" on public.astrology_chart_cache for delete to authenticated using (user_id=(select auth.uid()));

