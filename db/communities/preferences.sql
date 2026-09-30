create table if not exists public.user_community_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  communities text[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint user_community_preferences_allowed check (
    communities <@ array['nepal-sambat','lhosar','tharu','mithila','kirat','hijri']::text[]
  )
);

alter table public.user_community_preferences enable row level security;
grant select, insert, update, delete on public.user_community_preferences to authenticated;

do $$
begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='user_community_preferences' and policyname='own_preferences_select') then
    create policy own_preferences_select on public.user_community_preferences for select to authenticated using (auth.uid()=user_id);
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='user_community_preferences' and policyname='own_preferences_insert') then
    create policy own_preferences_insert on public.user_community_preferences for insert to authenticated with check (auth.uid()=user_id);
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='user_community_preferences' and policyname='own_preferences_update') then
    create policy own_preferences_update on public.user_community_preferences for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='user_community_preferences' and policyname='own_preferences_delete') then
    create policy own_preferences_delete on public.user_community_preferences for delete to authenticated using (auth.uid()=user_id);
  end if;
end $$;
