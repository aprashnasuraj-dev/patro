-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260926024739
-- Name: app_flags_foundation
-- Recovered 2026-09-30


create table if not exists public.app_flags (
  key text primary key,
  enabled boolean not null default false,
  note text,
  updated_at timestamptz not null default now()
);

alter table public.app_flags enable row level security;

drop policy if exists "flags are public-readable" on public.app_flags;
create policy "flags are public-readable"
on public.app_flags
for select
to anon, authenticated
using (true);

grant select on public.app_flags to anon, authenticated;

insert into public.app_flags (key, enabled, note) values
  ('home_polish', false, 'Home skeletons, grid polish, countdown chip, pinned clocks'),
  ('tm_ruler', false, 'Time Machine scrub ruler and era bands'),
  ('tm_detail', false, 'Time Machine moment detail sheet and deep links'),
  ('tm_birth_mode', false, 'Time Machine birth-year mode'),
  ('tm_world', false, 'Time Machine Nepal vs world strip'),
  ('tm_map', false, 'Time Machine map layer'),
  ('tm_quiz', false, 'Time Machine quiz and collections'),
  ('fm_directory_v2', false, 'All-Nepal FM directory and new FM page UI'),
  ('news_pipeline', false, 'Normalized news items and clusters'),
  ('news_desk', false, 'New Samachar layout'),
  ('jy_north_chart', false, 'North Indian kundali chart'),
  ('jy_dasha', false, 'Vimshottari dasha timeline'),
  ('jy_guna', false, 'Guna milan'),
  ('jy_profiles', false, 'Saved kundali profiles'),
  ('life_v2', false, 'Daily Life chips, quick-add, actions'),
  ('life_ics', false, 'Calendar export'),
  ('pwa', false, 'Service worker and install prompt')
on conflict (key) do nothing;

