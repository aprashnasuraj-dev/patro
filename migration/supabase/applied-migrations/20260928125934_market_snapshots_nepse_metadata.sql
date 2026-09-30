-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260928125934
-- Name: market_snapshots_nepse_metadata
-- Recovered 2026-09-30


alter table public.market_snapshots
  add column if not exists change numeric,
  add column if not exists percent_change numeric,
  add column if not exists source_label text,
  add column if not exists source_updated_at timestamptz;

comment on column public.market_snapshots.change is 'Absolute movement for index-like market snapshots.';
comment on column public.market_snapshots.percent_change is 'Percent movement for index-like market snapshots.';
comment on column public.market_snapshots.source_label is 'Human-readable provenance label shown in UI.';
comment on column public.market_snapshots.source_updated_at is 'Timestamp reported by the upstream source, when available.';

