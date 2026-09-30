-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260919034348
-- Name: protect_history_and_feedback_behind_edge_api
-- Recovered 2026-09-30


drop policy if exists "on_this_day_published_read" on public.on_this_day_events;
drop policy if exists "preview_feedback_public_insert" on public.preview_feedback;

revoke select on table public.on_this_day_events from anon, authenticated;
revoke insert,update,delete on table public.on_this_day_events from anon, authenticated;
revoke select,insert,update,delete on table public.preview_feedback from anon, authenticated;

