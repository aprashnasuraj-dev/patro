-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260927134748
-- Name: bundle_foundation_security_hardening
-- Recovered 2026-09-30


create or replace function private.nm_is_admin() returns boolean
language sql stable security definer set search_path = private, public, auth as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;
create or replace function private.nm_family_role(fid uuid) returns text
language sql stable security definer set search_path = private, public, auth as $$
  select role from public.family_members where family_id = fid and user_id = auth.uid()
$$;
create or replace function private.nm_is_family_member(fid uuid) returns boolean
language sql stable security definer set search_path = private, public, auth as $$
  select exists (select 1 from public.family_members where family_id = fid and user_id = auth.uid())
$$;
revoke all on function private.nm_is_admin() from public, anon;
revoke all on function private.nm_family_role(uuid) from public, anon;
revoke all on function private.nm_is_family_member(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.nm_is_admin() to authenticated;
grant execute on function private.nm_family_role(uuid) to authenticated;
grant execute on function private.nm_is_family_member(uuid) to authenticated;

drop policy if exists audit_admin_read on public.audit_log;
drop policy if exists audit_admin_insert on public.audit_log;
create policy audit_admin_read on public.audit_log for select to authenticated using ((select private.nm_is_admin()));
create policy audit_admin_insert on public.audit_log for insert to authenticated with check ((select private.nm_is_admin()) and actor = (select auth.uid()));

drop policy if exists facts_admin_write on public.official_panchang_facts;
create policy facts_admin_insert on public.official_panchang_facts for insert to authenticated with check ((select private.nm_is_admin()));
create policy facts_admin_update on public.official_panchang_facts for update to authenticated using ((select private.nm_is_admin())) with check ((select private.nm_is_admin()));
create policy facts_admin_delete on public.official_panchang_facts for delete to authenticated using ((select private.nm_is_admin()));

drop policy if exists holidays_admin on public.holidays;
create policy holidays_admin_insert on public.holidays for insert to authenticated with check ((select private.nm_is_admin()));
create policy holidays_admin_update on public.holidays for update to authenticated using ((select private.nm_is_admin())) with check ((select private.nm_is_admin()));
create policy holidays_admin_delete on public.holidays for delete to authenticated using ((select private.nm_is_admin()));

drop policy if exists weekly_admin on public.weekly_off_rules;
create policy weekly_admin_insert on public.weekly_off_rules for insert to authenticated with check ((select private.nm_is_admin()));
create policy weekly_admin_update on public.weekly_off_rules for update to authenticated using ((select private.nm_is_admin())) with check ((select private.nm_is_admin()));
create policy weekly_admin_delete on public.weekly_off_rules for delete to authenticated using ((select private.nm_is_admin()));

drop policy if exists coverage_admin on public.holiday_coverage;
create policy coverage_admin_insert on public.holiday_coverage for insert to authenticated with check ((select private.nm_is_admin()));
create policy coverage_admin_update on public.holiday_coverage for update to authenticated using ((select private.nm_is_admin())) with check ((select private.nm_is_admin()));
create policy coverage_admin_delete on public.holiday_coverage for delete to authenticated using ((select private.nm_is_admin()));

drop policy if exists families_member_read on public.families;
drop policy if exists families_owner_update on public.families;
drop policy if exists families_owner_delete on public.families;
create policy families_member_read on public.families for select to authenticated using ((select private.nm_is_family_member(id)));
create policy families_owner_update on public.families for update to authenticated using ((select private.nm_family_role(id)) = 'owner') with check ((select private.nm_family_role(id)) = 'owner');
create policy families_owner_delete on public.families for delete to authenticated using ((select private.nm_family_role(id)) = 'owner');

drop policy if exists members_read on public.family_members;
drop policy if exists members_owner_manage on public.family_members;
drop policy if exists members_self_update on public.family_members;
drop policy if exists members_owner_remove on public.family_members;
drop policy if exists members_self_leave on public.family_members;
create policy members_read on public.family_members for select to authenticated using ((select private.nm_is_family_member(family_id)));
create policy members_update on public.family_members for update to authenticated
using (
  (select private.nm_family_role(family_id)) = 'owner'
  or user_id = (select auth.uid())
)
with check (
  (select private.nm_family_role(family_id)) = 'owner'
  or (
    user_id = (select auth.uid())
    and role = (select private.nm_family_role(family_id))
  )
);
create policy members_delete on public.family_members for delete to authenticated using (
  ((select private.nm_family_role(family_id)) = 'owner' and user_id <> (select auth.uid()))
  or (user_id = (select auth.uid()) and role <> 'owner')
);

drop policy if exists invites_owner on public.family_invites;
create policy invites_owner on public.family_invites for all to authenticated
using ((select private.nm_family_role(family_id)) = 'owner')
with check ((select private.nm_family_role(family_id)) = 'owner' and created_by = (select auth.uid()));

drop policy if exists events_member_read on public.shared_events;
drop policy if exists events_editor_insert on public.shared_events;
drop policy if exists events_editor_update on public.shared_events;
drop policy if exists events_editor_delete on public.shared_events;
create policy events_member_read on public.shared_events for select to authenticated using ((select private.nm_is_family_member(family_id)));
create policy events_editor_insert on public.shared_events for insert to authenticated
with check ((select private.nm_family_role(family_id)) in ('owner','editor') and created_by = (select auth.uid()));
create policy events_editor_update on public.shared_events for update to authenticated
using ((select private.nm_family_role(family_id)) in ('owner','editor'))
with check ((select private.nm_family_role(family_id)) in ('owner','editor'));
create policy events_editor_delete on public.shared_events for delete to authenticated
using ((select private.nm_family_role(family_id)) in ('owner','editor'));

revoke execute on function public.create_family(text,text,text) from authenticated, anon, public;
revoke execute on function public.accept_family_invite(text,text,text) from authenticated, anon, public;
revoke execute on function public.my_data_delete() from authenticated, anon, public;
grant execute on function public.create_family(text,text,text) to service_role;
grant execute on function public.accept_family_invite(text,text,text) to service_role;
grant execute on function public.my_data_delete() to service_role;

drop function if exists public.is_admin();
drop function if exists public.family_role(uuid);
drop function if exists public.is_family_member(uuid);

create index if not exists families_created_by_idx on public.families(created_by);
create index if not exists family_invites_family_id_idx on public.family_invites(family_id);
create index if not exists family_invites_created_by_idx on public.family_invites(created_by);
create index if not exists shared_events_created_by_idx on public.shared_events(created_by) where created_by is not null;
create index if not exists shared_events_updated_by_idx on public.shared_events(updated_by) where updated_by is not null;
