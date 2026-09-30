-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260918121905
-- Name: harden_rls_and_helpers
-- Recovered 2026-09-30

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

drop policy if exists "spaces_select_member" on public.calendar_spaces;
drop policy if exists "members_select_related" on public.calendar_space_members;
drop policy if exists "members_insert_owner" on public.calendar_space_members;
drop policy if exists "members_update_owner" on public.calendar_space_members;
drop policy if exists "members_delete_owner_or_self" on public.calendar_space_members;
drop policy if exists "space_events_select_member" on public.calendar_space_events;
drop policy if exists "space_events_insert_editor" on public.calendar_space_events;
drop policy if exists "space_events_update_editor" on public.calendar_space_events;
drop policy if exists "space_events_delete_editor" on public.calendar_space_events;

drop function if exists public.can_view_calendar(uuid);
drop function if exists public.can_edit_calendar(uuid);

create or replace function private.can_view_calendar(target_calendar uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.calendar_spaces c
    left join public.calendar_space_members m
      on m.calendar_id = c.id and m.user_id = (select auth.uid())
    where c.id = target_calendar
      and (c.owner_id = (select auth.uid()) or m.user_id = (select auth.uid()))
  );
$$;

create or replace function private.can_edit_calendar(target_calendar uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.calendar_spaces c
    left join public.calendar_space_members m
      on m.calendar_id = c.id and m.user_id = (select auth.uid())
    where c.id = target_calendar
      and (c.owner_id = (select auth.uid()) or m.role in ('owner','editor'))
  );
$$;

revoke all on function private.can_view_calendar(uuid) from public, anon;
revoke all on function private.can_edit_calendar(uuid) from public, anon;
grant execute on function private.can_view_calendar(uuid) to authenticated;
grant execute on function private.can_edit_calendar(uuid) to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "state_select_own" on public.user_calendar_state;
drop policy if exists "state_insert_own" on public.user_calendar_state;
drop policy if exists "state_update_own" on public.user_calendar_state;
drop policy if exists "state_delete_own" on public.user_calendar_state;
create policy "state_select_own" on public.user_calendar_state for select to authenticated using (user_id = (select auth.uid()));
create policy "state_insert_own" on public.user_calendar_state for insert to authenticated with check (user_id = (select auth.uid()));
create policy "state_update_own" on public.user_calendar_state for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "state_delete_own" on public.user_calendar_state for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "spaces_insert_owner" on public.calendar_spaces;
drop policy if exists "spaces_update_owner" on public.calendar_spaces;
drop policy if exists "spaces_delete_owner" on public.calendar_spaces;
create policy "spaces_select_member" on public.calendar_spaces for select to authenticated using (owner_id = (select auth.uid()) or private.can_view_calendar(id));
create policy "spaces_insert_owner" on public.calendar_spaces for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "spaces_update_owner" on public.calendar_spaces for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "spaces_delete_owner" on public.calendar_spaces for delete to authenticated using (owner_id = (select auth.uid()));

create policy "members_select_related" on public.calendar_space_members for select to authenticated using (user_id = (select auth.uid()) or private.can_edit_calendar(calendar_id));
create policy "members_insert_owner" on public.calendar_space_members for insert to authenticated with check (private.can_edit_calendar(calendar_id));
create policy "members_update_owner" on public.calendar_space_members for update to authenticated using (private.can_edit_calendar(calendar_id)) with check (private.can_edit_calendar(calendar_id));
create policy "members_delete_owner_or_self" on public.calendar_space_members for delete to authenticated using (user_id = (select auth.uid()) or private.can_edit_calendar(calendar_id));

create policy "space_events_select_member" on public.calendar_space_events for select to authenticated using (private.can_view_calendar(calendar_id));
create policy "space_events_insert_editor" on public.calendar_space_events for insert to authenticated with check (created_by = (select auth.uid()) and private.can_edit_calendar(calendar_id));
create policy "space_events_update_editor" on public.calendar_space_events for update to authenticated using (private.can_edit_calendar(calendar_id)) with check (private.can_edit_calendar(calendar_id));
create policy "space_events_delete_editor" on public.calendar_space_events for delete to authenticated using (private.can_edit_calendar(calendar_id));

drop policy if exists "correction_insert_own" on public.correction_reports;
drop policy if exists "correction_select_own" on public.correction_reports;
create policy "correction_insert_own" on public.correction_reports for insert to authenticated with check (user_id = (select auth.uid()));
create policy "correction_select_own" on public.correction_reports for select to authenticated using (user_id = (select auth.uid()));

create index if not exists calendar_spaces_owner_idx on public.calendar_spaces(owner_id);
