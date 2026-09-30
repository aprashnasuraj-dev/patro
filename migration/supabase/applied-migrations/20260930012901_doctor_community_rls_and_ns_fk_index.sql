-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260930012901
-- Name: doctor_community_rls_and_ns_fk_index
-- Recovered 2026-09-30


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

