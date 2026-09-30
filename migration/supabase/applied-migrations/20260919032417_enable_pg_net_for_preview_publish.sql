-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260919032417
-- Name: enable_pg_net_for_preview_publish
-- Recovered 2026-09-30

create extension if not exists pg_net with schema extensions;
