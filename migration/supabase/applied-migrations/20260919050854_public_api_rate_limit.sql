-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260919050854
-- Name: public_api_rate_limit
-- Recovered 2026-09-30


create table if not exists public.api_rate_limit_buckets (
  key_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (key_hash, window_start)
);
alter table public.api_rate_limit_buckets enable row level security;

create or replace function public.consume_public_api_rate(p_key_hash text, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  w timestamptz := date_trunc('hour', now());
  n integer;
begin
  insert into public.api_rate_limit_buckets(key_hash, window_start, request_count, updated_at)
  values (p_key_hash, w, 1, now())
  on conflict (key_hash, window_start)
  do update set request_count = public.api_rate_limit_buckets.request_count + 1,
                updated_at = now()
  returning request_count into n;

  if random() < 0.01 then
    delete from public.api_rate_limit_buckets
    where window_start < now() - interval '48 hours';
  end if;

  return n <= greatest(p_limit, 1);
end;
$$;

revoke all on function public.consume_public_api_rate(text,integer) from public, anon, authenticated;
grant execute on function public.consume_public_api_rate(text,integer) to service_role;

