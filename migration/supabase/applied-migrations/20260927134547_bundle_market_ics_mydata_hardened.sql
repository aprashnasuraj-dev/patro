-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260927134547
-- Name: bundle_market_ics_mydata_hardened
-- Recovered 2026-09-30


create table if not exists public.market_snapshots (
  provider text not null,
  asset text not null,
  as_of date not null,
  kind text not null,
  value numeric not null,
  buy numeric,
  sell numeric,
  unit text not null,
  per numeric not null default 1 check (per > 0),
  fetched_at timestamptz not null,
  source_url text not null check (source_url ~ '^https://'),
  primary key (provider, asset, as_of)
);
alter table public.market_snapshots enable row level security;
create policy market_public_read on public.market_snapshots for select to anon, authenticated using (true);
grant select on public.market_snapshots to anon, authenticated;

create table if not exists public.personal_ics_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token_hash text not null unique check (length(token_hash) = 64),
  created_at timestamptz not null default now()
);
alter table public.personal_ics_tokens enable row level security;
create policy ics_own_read on public.personal_ics_tokens for select to authenticated using (user_id = (select auth.uid()));
create policy ics_own_delete on public.personal_ics_tokens for delete to authenticated using (user_id = (select auth.uid()));
create policy ics_own_insert on public.personal_ics_tokens for insert to authenticated with check (user_id = (select auth.uid()));
grant select, insert, delete on public.personal_ics_tokens to authenticated;

create or replace function public.my_data_export() returns jsonb
language sql stable security invoker set search_path = public, auth as $$
  select jsonb_build_object(
    'user_id', auth.uid(),
    'families', coalesce((select jsonb_agg(f) from public.families f where public.is_family_member(f.id)), '[]'::jsonb),
    'memberships', coalesce((select jsonb_agg(m) from public.family_members m where m.user_id = auth.uid()), '[]'::jsonb),
    'shared_events_created', coalesce((select jsonb_agg(e) from public.shared_events e where e.created_by = auth.uid()), '[]'::jsonb),
    'push_subscriptions', coalesce((select jsonb_agg(jsonb_build_object('device_id', s.device_id, 'user_agent_family', s.user_agent_family, 'timezone', s.timezone, 'quiet_hours', s.quiet_hours, 'created_at', s.created_at, 'last_success_at', s.last_success_at)) from public.push_subscriptions s where s.user_id = auth.uid()), '[]'::jsonb),
    'notification_jobs', coalesce((select jsonb_agg(jsonb_build_object('fire_at_utc', j.fire_at_utc, 'category', j.category, 'status', j.status)) from public.notification_jobs j join public.push_subscriptions s using (device_id) where s.user_id = auth.uid()), '[]'::jsonb),
    'personal_ics', coalesce((select jsonb_agg(jsonb_build_object('created_at', t.created_at)) from public.personal_ics_tokens t where t.user_id = auth.uid()), '[]'::jsonb)
  )
$$;

create or replace function public.my_data_delete() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  delete from public.families f where exists (select 1 from public.family_members m where m.family_id = f.id and m.user_id = auth.uid() and m.role = 'owner');
  delete from public.family_members where user_id = auth.uid();
  delete from public.push_subscriptions where user_id = auth.uid();
  delete from public.personal_ics_tokens where user_id = auth.uid();
  update public.shared_events set created_by = null where created_by = auth.uid();
  update public.shared_events set updated_by = null where updated_by = auth.uid();
end $$;
grant execute on function public.my_data_export() to authenticated;
grant execute on function public.my_data_delete() to authenticated;
revoke execute on function public.my_data_export() from public, anon;
revoke execute on function public.my_data_delete() from public, anon;
grant execute on function public.my_data_export() to authenticated;
grant execute on function public.my_data_delete() to authenticated;
