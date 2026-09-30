-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260919030923
-- Name: protected_calendar_api_rate_limit
-- Recovered 2026-09-30


create table if not exists public.api_rate_buckets (
  bucket_key text not null,
  route text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  primary key(bucket_key, route, window_start)
);
alter table public.api_rate_buckets enable row level security;

create or replace function public.consume_api_quota(
  p_bucket_key text,
  p_route text,
  p_window_start timestamptz,
  p_limit integer
)
returns table(allowed boolean, request_count integer, quota_limit integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  insert into public.api_rate_buckets(bucket_key, route, window_start, request_count)
  values(p_bucket_key, p_route, p_window_start, 1)
  on conflict(bucket_key, route, window_start)
  do update set request_count = public.api_rate_buckets.request_count + 1
  returning public.api_rate_buckets.request_count into n;

  return query select n <= p_limit, n, p_limit;
end;
$$;

revoke all on function public.consume_api_quota(text,text,timestamptz,integer) from public, anon, authenticated;
grant execute on function public.consume_api_quota(text,text,timestamptz,integer) to service_role;

create index if not exists api_rate_buckets_cleanup_idx on public.api_rate_buckets(window_start);

