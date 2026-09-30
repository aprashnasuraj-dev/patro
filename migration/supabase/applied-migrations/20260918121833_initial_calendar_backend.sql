-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260918121833
-- Name: initial_calendar_backend
-- Recovered 2026-09-30

-- Nepali Calendar v0.5 backend foundation
-- External Google/Apple/ICS calendar bridges intentionally excluded.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text not null default 'ne',
  timezone text not null default 'Asia/Kathmandu',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_calendar_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notes jsonb not null default '{}'::jsonb,
  events jsonb not null default '[]'::jsonb,
  calendars jsonb not null default '[]'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  feedback jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_spaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  kind text not null default 'private' check (kind in ('private','family','work','community')),
  description text,
  share_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_space_members (
  calendar_id uuid not null references public.calendar_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner','editor','viewer')),
  joined_at timestamptz not null default now(),
  primary key(calendar_id,user_id)
);

create table if not exists public.calendar_space_events (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendar_spaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  note text,
  bs_date text,
  ad_date date,
  recurrence text not null default 'none' check (recurrence in ('none','yearly-bs','yearly-ad','yearly-tithi')),
  bs_month smallint,
  bs_day smallint,
  ad_month smallint,
  ad_day smallint,
  lunar_month smallint,
  tithi_num smallint,
  remind_days smallint not null default 1 check (remind_days between 0 and 60),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.correction_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  bs_date text,
  issue_type text not null,
  detail text not null check (char_length(detail) between 3 and 4000),
  source_url text,
  status text not null default 'pending' check (status in ('pending','reviewing','accepted','rejected','duplicate')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.profiles enable row level security;
alter table public.user_calendar_state enable row level security;
alter table public.calendar_spaces enable row level security;
alter table public.calendar_space_members enable row level security;
alter table public.calendar_space_events enable row level security;
alter table public.correction_reports enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using (user_id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "state_select_own" on public.user_calendar_state for select to authenticated using (user_id = auth.uid());
create policy "state_insert_own" on public.user_calendar_state for insert to authenticated with check (user_id = auth.uid());
create policy "state_update_own" on public.user_calendar_state for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "state_delete_own" on public.user_calendar_state for delete to authenticated using (user_id = auth.uid());

create or replace function public.can_view_calendar(target_calendar uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.calendar_spaces c
    left join public.calendar_space_members m
      on m.calendar_id = c.id and m.user_id = auth.uid()
    where c.id = target_calendar
      and (c.owner_id = auth.uid() or m.user_id = auth.uid())
  );
$$;

create or replace function public.can_edit_calendar(target_calendar uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.calendar_spaces c
    left join public.calendar_space_members m
      on m.calendar_id = c.id and m.user_id = auth.uid()
    where c.id = target_calendar
      and (c.owner_id = auth.uid() or m.role in ('owner','editor'))
  );
$$;

revoke all on function public.can_view_calendar(uuid) from public;
revoke all on function public.can_edit_calendar(uuid) from public;
grant execute on function public.can_view_calendar(uuid) to authenticated;
grant execute on function public.can_edit_calendar(uuid) to authenticated;

create policy "spaces_select_member" on public.calendar_spaces for select to authenticated
using (owner_id = auth.uid() or public.can_view_calendar(id));
create policy "spaces_insert_owner" on public.calendar_spaces for insert to authenticated with check (owner_id = auth.uid());
create policy "spaces_update_owner" on public.calendar_spaces for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "spaces_delete_owner" on public.calendar_spaces for delete to authenticated using (owner_id = auth.uid());

create policy "members_select_related" on public.calendar_space_members for select to authenticated
using (user_id = auth.uid() or public.can_edit_calendar(calendar_id));
create policy "members_insert_owner" on public.calendar_space_members for insert to authenticated
with check (public.can_edit_calendar(calendar_id));
create policy "members_update_owner" on public.calendar_space_members for update to authenticated
using (public.can_edit_calendar(calendar_id)) with check (public.can_edit_calendar(calendar_id));
create policy "members_delete_owner_or_self" on public.calendar_space_members for delete to authenticated
using (user_id = auth.uid() or public.can_edit_calendar(calendar_id));

create policy "space_events_select_member" on public.calendar_space_events for select to authenticated
using (public.can_view_calendar(calendar_id));
create policy "space_events_insert_editor" on public.calendar_space_events for insert to authenticated
with check (created_by = auth.uid() and public.can_edit_calendar(calendar_id));
create policy "space_events_update_editor" on public.calendar_space_events for update to authenticated
using (public.can_edit_calendar(calendar_id)) with check (public.can_edit_calendar(calendar_id));
create policy "space_events_delete_editor" on public.calendar_space_events for delete to authenticated
using (public.can_edit_calendar(calendar_id));

create policy "correction_insert_own" on public.correction_reports for insert to authenticated with check (user_id = auth.uid());
create policy "correction_select_own" on public.correction_reports for select to authenticated using (user_id = auth.uid());

create index if not exists calendar_space_members_user_idx on public.calendar_space_members(user_id);
create index if not exists calendar_space_events_calendar_idx on public.calendar_space_events(calendar_id, updated_at desc);
create index if not exists calendar_space_events_created_by_idx on public.calendar_space_events(created_by);
create index if not exists correction_reports_user_idx on public.correction_reports(user_id, created_at desc);
