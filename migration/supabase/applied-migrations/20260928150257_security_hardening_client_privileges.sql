-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260928150257
-- Name: security_hardening_client_privileges
-- Recovered 2026-09-30


-- Remove privileges that browser roles never need. PostgreSQL RLS does not
-- govern TRUNCATE/REFERENCES/TRIGGER, so these should not be granted to clients.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- Server-only state remains available to service_role but not directly to browser roles.
revoke all privileges on table public.astronomy_calendar_map from anon, authenticated;
revoke all privileges on table public.nasa_apod_cache from anon, authenticated;
revoke all privileges on table public.nasa_cosmic_cache from anon, authenticated;
revoke all privileges on table public.api_rate_buckets from anon, authenticated;
revoke all privileges on table public.api_rate_limit_buckets from anon, authenticated;
revoke all privileges on table public.fm_stream_candidates from anon, authenticated;
revoke all privileges on table public.miti_rashifal_publications from anon, authenticated;
revoke all privileges on table public.on_this_day_events from anon, authenticated;

-- Secure defaults: future objects are private until a migration explicitly grants access.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete, truncate, references, trigger on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke usage, select, update on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- Preserve FM report behavior while avoiding per-row auth.uid() reevaluation.
drop policy if exists "signed-in users can report" on public.fm_reports;
create policy "signed-in users can report"
on public.fm_reports
for insert
to authenticated
with check ((select auth.uid()) = user_id and status = 'pending');

-- Cover the FKs used by report/candidate lookups and deletes.
create index if not exists fm_reports_station_id_idx on public.fm_reports(station_id);
create index if not exists fm_reports_user_id_idx on public.fm_reports(user_id);
create index if not exists fm_stream_candidates_station_id_idx on public.fm_stream_candidates(station_id);

