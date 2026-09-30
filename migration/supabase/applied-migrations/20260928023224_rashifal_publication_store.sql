-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260928023224
-- Name: rashifal_publication_store
-- Recovered 2026-09-30


create table if not exists public.miti_rashifal_publications (
  id text primary key,
  engine_version text not null,
  window_key text not null,
  system text not null check (system in ('vedic','western')),
  period text not null check (period in ('daily','weekly','monthly')),
  calendar text not null check (calendar in ('bs','gregorian')),
  period_window jsonb not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  constraint miti_rashifal_id_sha256 check (id ~ '^[0-9a-f]{64}$'),
  constraint miti_rashifal_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint miti_rashifal_window_object check (jsonb_typeof(period_window) = 'object')
);
alter table public.miti_rashifal_publications enable row level security;
revoke all on table public.miti_rashifal_publications from anon, authenticated;
grant select, insert, update, delete on table public.miti_rashifal_publications to service_role;
create index if not exists miti_rashifal_window_idx on public.miti_rashifal_publications(window_key, system);
create index if not exists miti_rashifal_created_idx on public.miti_rashifal_publications(created_at desc);
comment on table public.miti_rashifal_publications is
'Public universal Rashifal publication batches only. Birth details and personalized readings must never be stored here.';

