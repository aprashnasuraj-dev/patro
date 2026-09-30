-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260919001800
-- Name: remove_duplicate_history_policy
-- Recovered 2026-09-30


drop policy if exists "otd_public_read_published" on public.on_this_day_events;

