create table if not exists public.astronomy_calendar_map (
  ad_date date primary key,
  payload jsonb not null,
  source_version text not null default 'patro-archive-v1',
  created_at timestamptz not null default now()
);

alter table public.astronomy_calendar_map enable row level security;


comment on table public.astronomy_calendar_map is
  'Private server-side AD/BS/Nepal-Sambat/Panchang synchronization map migrated from the existing Patro archive for the single router Edge Function.';
