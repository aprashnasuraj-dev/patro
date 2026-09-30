-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260919031737
-- Name: deny_client_access_rate_buckets
-- Recovered 2026-09-30


drop policy if exists "rate_buckets_no_client_access" on public.api_rate_buckets;
create policy "rate_buckets_no_client_access"
on public.api_rate_buckets
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

