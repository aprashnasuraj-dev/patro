-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260927134259
-- Name: bundle_truth_layer_hardened
-- Recovered 2026-09-30


create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

create table if not exists public.audit_log (
  id bigserial primary key,
  actor uuid,
  action text not null check (length(action) <= 64),
  entity text not null check (length(entity) <= 64),
  entity_id text,
  diff jsonb,
  at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
create policy audit_admin_read on public.audit_log for select to authenticated using ((select public.is_admin()));
create policy audit_admin_insert on public.audit_log for insert to authenticated with check ((select public.is_admin()) and actor = (select auth.uid()));
revoke update, delete on public.audit_log from anon, authenticated;

create table if not exists public.official_panchang_facts (
  id uuid primary key default gen_random_uuid(),
  fact_date date not null,
  kind text not null check (kind in ('udaya_tithi', 'festival', 'sait')),
  key text not null check (length(key) <= 80),
  value jsonb not null,
  location_key text not null default 'kathmandu',
  source_url text not null check (source_url ~ '^https://'),
  source_title text not null,
  published_at date,
  entered_by uuid,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (fact_date, kind, key, location_key)
);
create index if not exists official_facts_kind_key on public.official_panchang_facts (kind, key, fact_date);
alter table public.official_panchang_facts enable row level security;
create policy facts_public_read on public.official_panchang_facts for select to anon, authenticated using (true);
create policy facts_admin_write on public.official_panchang_facts for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
grant select on public.official_panchang_facts to anon, authenticated;
grant insert, update, delete on public.official_panchang_facts to authenticated;
grant select, insert on public.audit_log to authenticated;
grant usage on sequence public.audit_log_id_seq to authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
