-- Applied to Supabase as migration 20260928150257.
-- Security hardening only: no user-facing feature or route changes.

revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

revoke all privileges on table public.astronomy_calendar_map from anon, authenticated;
revoke all privileges on table public.nasa_apod_cache from anon, authenticated;
revoke all privileges on table public.nasa_cosmic_cache from anon, authenticated;
revoke all privileges on table public.api_rate_buckets from anon, authenticated;
revoke all privileges on table public.api_rate_limit_buckets from anon, authenticated;
revoke all privileges on table public.fm_stream_candidates from anon, authenticated;
revoke all privileges on table public.miti_rashifal_publications from anon, authenticated;
revoke all privileges on table public.on_this_day_events from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete, truncate, references, trigger on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke usage, select, update on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

drop policy if exists "signed-in users can report" on public.fm_reports;
create policy "signed-in users can report"
on public.fm_reports
for insert
to authenticated
with check ((select auth.uid()) = user_id and status = 'pending');

create index if not exists fm_reports_station_id_idx on public.fm_reports(station_id);
create index if not exists fm_reports_user_id_idx on public.fm_reports(user_id);
create index if not exists fm_stream_candidates_station_id_idx on public.fm_stream_candidates(station_id);
