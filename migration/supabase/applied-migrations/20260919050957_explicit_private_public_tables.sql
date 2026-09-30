-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260919050957
-- Name: explicit_private_public_tables
-- Recovered 2026-09-30


drop policy if exists "api_rate_deny_client" on public.api_rate_limit_buckets;
create policy "api_rate_deny_client" on public.api_rate_limit_buckets
  for all to anon, authenticated using (false) with check (false);

drop policy if exists "on_this_day_deny_direct_client" on public.on_this_day_events;
create policy "on_this_day_deny_direct_client" on public.on_this_day_events
  for all to anon, authenticated using (false) with check (false);

do $$
begin
  if to_regclass('public.preview_feedback') is not null then
    execute 'drop policy if exists "preview_feedback_deny_client" on public.preview_feedback';
    execute 'create policy "preview_feedback_deny_client" on public.preview_feedback for all to anon, authenticated using (false) with check (false)';
  end if;
end $$;

