-- Applied to Supabase as migration 20260930012901.
-- Keeps Community Preferences ownership semantics unchanged while allowing
-- Postgres to evaluate auth.uid() once per statement, and covers the
-- ns_festival_dates foreign key used by community-suite lookups.

create index if not exists ns_festival_dates_festival_id_idx
  on public.ns_festival_dates(festival_id);

drop policy if exists own_preferences_select on public.user_community_preferences;
create policy own_preferences_select
  on public.user_community_preferences
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists own_preferences_insert on public.user_community_preferences;
create policy own_preferences_insert
  on public.user_community_preferences
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists own_preferences_update on public.user_community_preferences;
create policy own_preferences_update
  on public.user_community_preferences
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists own_preferences_delete on public.user_community_preferences;
create policy own_preferences_delete
  on public.user_community_preferences
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
