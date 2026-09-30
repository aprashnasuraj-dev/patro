-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260927134354
-- Name: bundle_holidays_hardened
-- Recovered 2026-09-30


create table if not exists public.holidays (
  id text primary key,
  ad_date date not null,
  bs_date text not null check (bs_date ~ '^\d{4}-\d{2}-\d{2}$'),
  name_ne text not null,
  name_en text not null,
  scope_type text not null check (scope_type in ('national', 'province', 'district', 'valley', 'custom')),
  scope_codes text[] not null default '{}',
  audiences text[] not null check (cardinality(audiences) > 0),
  effect text not null check (effect in ('closed', 'partial', 'open_exception')),
  status text not null check (status in ('announced', 'tentative', 'cancelled')),
  scope_verified boolean not null default true,
  source_url text not null check (source_url ~ '^https://'),
  source_title text not null,
  notice_date date,
  verified_by text,
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists holidays_ad_date on public.holidays (ad_date);
create table if not exists public.weekly_off_rules (
  id text primary key,
  audience text not null,
  weekdays int[] not null check (weekdays <@ array[0,1,2,3,4,5,6]),
  effective_from date not null,
  effective_to date,
  source_url text not null check (source_url ~ '^https://'),
  source_title text
);
create table if not exists public.holiday_coverage (
  bs_year int not null,
  audience text not null,
  source_url text not null check (source_url ~ '^https://'),
  source_title text not null,
  primary key (bs_year, audience)
);
alter table public.holidays enable row level security;
alter table public.weekly_off_rules enable row level security;
alter table public.holiday_coverage enable row level security;
create policy holidays_read on public.holidays for select to anon, authenticated using (true);
create policy holidays_admin on public.holidays for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy weekly_read on public.weekly_off_rules for select to anon, authenticated using (true);
create policy weekly_admin on public.weekly_off_rules for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy coverage_read on public.holiday_coverage for select to anon, authenticated using (true);
create policy coverage_admin on public.holiday_coverage for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
grant select on public.holidays, public.weekly_off_rules, public.holiday_coverage to anon, authenticated;
grant insert, update, delete on public.holidays, public.weekly_off_rules, public.holiday_coverage to authenticated;
