-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260928043932
-- Name: remove_unused_calendar_map_source_index
-- Recovered 2026-09-30

drop index if exists public.astronomy_calendar_map_source_idx;
