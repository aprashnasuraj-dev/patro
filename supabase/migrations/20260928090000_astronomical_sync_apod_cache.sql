create table if not exists public.nasa_apod_cache (
  date text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  constraint nasa_apod_cache_date_format_chk
    check (date ~ '^\\d{4}-\\d{2}-\\d{2}$')
);

alter table public.nasa_apod_cache enable row level security;

create index if not exists nasa_apod_cache_created_at_idx
  on public.nasa_apod_cache (created_at desc);

comment on table public.nasa_apod_cache is
  'Server-side cache for normalized NASA APOD responses. Accessed by Supabase Edge Function service role; no client RLS policy is intentionally granted.';
