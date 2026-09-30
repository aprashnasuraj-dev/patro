-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260927134458
-- Name: bundle_family_hardened
-- Recovered 2026-09-30


create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 80),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.family_members (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  display_name text check (length(display_name) <= 60),
  timezone text not null default 'Asia/Kathmandu' check (length(timezone) <= 64),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);
create index if not exists family_members_user on public.family_members (user_id);
create table if not exists public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  token_hash text not null unique check (length(token_hash) = 64),
  role text not null default 'viewer' check (role in ('editor', 'viewer')),
  expires_at timestamptz not null,
  max_uses int not null default 5 check (max_uses between 1 and 50),
  uses int not null default 0 check (uses >= 0),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (expires_at <= created_at + interval '30 days')
);
create table if not exists public.shared_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  kind text not null check (kind in ('shraddha', 'tithi_birthday', 'ad_birthday', 'bs_birthday', 'anniversary', 'custom')),
  anchor jsonb not null,
  rule text not null check (rule in ('udaya', 'aparahna', 'madhyahna', 'sayahna', 'pradosha', 'nishitha', 'arunodaya', 'official_only')),
  adhik_policy text not null default 'nija_month' check (adhik_policy in ('nija_month', 'adhik_month', 'both_flagged')),
  location_policy text not null default 'kathmandu_panchang' check (location_policy in ('kathmandu_panchang', 'local_computation')),
  title_ne text check (length(title_ne) <= 120),
  title_en text check (length(title_en) <= 120),
  notes text check (length(notes) <= 2000),
  reminder_offsets int[] not null default '{7,1}' check (reminder_offsets <@ array[0,1,2,3,7,14,15,30]),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shared_events_family on public.shared_events (family_id);
create or replace function public.family_role(fid uuid) returns text
language sql stable security definer set search_path = public, auth as $$
  select role from public.family_members where family_id = fid and user_id = auth.uid()
$$;
create or replace function public.is_family_member(fid uuid) returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from public.family_members where family_id = fid and user_id = auth.uid())
$$;
create or replace function public.create_family(p_name text, p_display_name text default null, p_timezone text default 'Asia/Kathmandu')
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  insert into public.families (name, created_by) values (p_name, auth.uid()) returning id into fid;
  insert into public.family_members (family_id, user_id, role, display_name, timezone) values (fid, auth.uid(), 'owner', p_display_name, p_timezone);
  return fid;
end $$;
create or replace function public.accept_family_invite(p_token_hash text, p_display_name text default null, p_timezone text default 'Asia/Kathmandu')
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare inv public.family_invites;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select * into inv from public.family_invites where token_hash = p_token_hash for update;
  if not found or inv.expires_at < now() or inv.uses >= inv.max_uses then
    raise exception 'invite invalid or expired' using errcode = 'P0002';
  end if;
  insert into public.family_members (family_id, user_id, role, display_name, timezone)
    values (inv.family_id, auth.uid(), inv.role, p_display_name, p_timezone)
    on conflict (family_id, user_id) do nothing;
  update public.family_invites set uses = uses + 1 where id = inv.id;
  return inv.family_id;
end $$;
create or replace function public.update_shared_event(p_id uuid, p_expected_updated_at timestamptz, p_patch jsonb)
returns public.shared_events language plpgsql security invoker set search_path = public, auth as $$
declare r public.shared_events;
begin
  update public.shared_events set
    title_ne = coalesce(p_patch ->> 'title_ne', title_ne),
    title_en = coalesce(p_patch ->> 'title_en', title_en),
    notes = coalesce(p_patch ->> 'notes', notes),
    anchor = coalesce(p_patch -> 'anchor', anchor),
    rule = coalesce(p_patch ->> 'rule', rule),
    adhik_policy = coalesce(p_patch ->> 'adhik_policy', adhik_policy),
    location_policy = coalesce(p_patch ->> 'location_policy', location_policy),
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_id and updated_at = p_expected_updated_at
  returning * into r;
  if not found then
    if exists (select 1 from public.shared_events where id = p_id) then
      raise exception 'conflict' using errcode = '40001';
    end if;
    raise exception 'not found' using errcode = 'P0002';
  end if;
  return r;
end $$;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invites enable row level security;
alter table public.shared_events enable row level security;
create policy families_member_read on public.families for select to authenticated using ((select public.is_family_member(id)));
create policy families_owner_update on public.families for update to authenticated using ((select public.family_role(id)) = 'owner') with check ((select public.family_role(id)) = 'owner');
create policy families_owner_delete on public.families for delete to authenticated using ((select public.family_role(id)) = 'owner');
create policy members_read on public.family_members for select to authenticated using ((select public.is_family_member(family_id)));
create policy members_owner_manage on public.family_members for update to authenticated using ((select public.family_role(family_id)) = 'owner') with check ((select public.family_role(family_id)) = 'owner');
create policy members_self_update on public.family_members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and role = (select public.family_role(family_id)));
create policy members_owner_remove on public.family_members for delete to authenticated using ((select public.family_role(family_id)) = 'owner' and user_id <> (select auth.uid()));
create policy members_self_leave on public.family_members for delete to authenticated using (user_id = (select auth.uid()) and role <> 'owner');
create policy invites_owner on public.family_invites for all to authenticated
  using ((select public.family_role(family_id)) = 'owner') with check ((select public.family_role(family_id)) = 'owner' and created_by = (select auth.uid()));
create policy events_member_read on public.shared_events for select to authenticated using ((select public.is_family_member(family_id)));
create policy events_editor_insert on public.shared_events for insert to authenticated
  with check ((select public.family_role(family_id)) in ('owner', 'editor') and created_by = (select auth.uid()));
create policy events_editor_update on public.shared_events for update to authenticated
  using ((select public.family_role(family_id)) in ('owner', 'editor')) with check ((select public.family_role(family_id)) in ('owner', 'editor'));
create policy events_editor_delete on public.shared_events for delete to authenticated using ((select public.family_role(family_id)) in ('owner', 'editor'));
grant select, update, delete on public.families to authenticated;
grant select, update, delete on public.family_members to authenticated;
grant select, insert, update, delete on public.family_invites to authenticated;
grant select, insert, update, delete on public.shared_events to authenticated;
grant execute on function public.create_family(text, text, text) to authenticated;
grant execute on function public.accept_family_invite(text, text, text) to authenticated;
grant execute on function public.update_shared_event(uuid, timestamptz, jsonb) to authenticated;
revoke execute on function public.family_role(uuid) from public, anon;
revoke execute on function public.is_family_member(uuid) from public, anon;
revoke execute on function public.create_family(text, text, text) from public, anon;
revoke execute on function public.accept_family_invite(text, text, text) from public, anon;
revoke execute on function public.update_shared_event(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.family_role(uuid) to authenticated;
grant execute on function public.is_family_member(uuid) to authenticated;
