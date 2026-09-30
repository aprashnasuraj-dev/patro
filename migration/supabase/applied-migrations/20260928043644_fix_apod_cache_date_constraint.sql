-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260928043644
-- Name: fix_apod_cache_date_constraint
-- Recovered 2026-09-30


alter table public.nasa_apod_cache
  drop constraint if exists nasa_apod_cache_date_format_chk;

alter table public.nasa_apod_cache
  add constraint nasa_apod_cache_date_format_chk
  check (date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');

