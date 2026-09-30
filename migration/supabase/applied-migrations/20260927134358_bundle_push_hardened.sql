-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260927134358
-- Name: bundle_push_hardened
-- Recovered 2026-09-30


create table if not exists public.push_subscriptions (
  device_id uuid primary key,
  device_secret_hash text not null check (length(device_secret_hash) = 64),
  user_id uuid references auth.users (id) on delete set null,
  endpoint text not null unique check (endpoint ~ '^https://'),
  keys jsonb not null check (keys ? 'p256dh' and keys ? 'auth' and (keys - 'p256dh' - 'auth') = '{}'::jsonb),
  user_agent_family text not null default 'other' check (length(user_agent_family) <= 32),
  timezone text not null default 'Asia/Kathmandu' check (length(timezone) <= 64),
  quiet_hours jsonb check (quiet_hours is null or (quiet_hours ? 'start' and quiet_hours ? 'end')),
  created_at timestamptz not null default now(),
  last_success_at timestamptz
);
create table if not exists public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.push_subscriptions (device_id) on delete cascade,
  fire_at_utc timestamptz not null,
  job_ref text not null check (job_ref ~ '^[A-Za-z0-9_-]{16,64}$'),
  category text not null check (category in ('due_date', 'expiry', 'family_date', 'tithi_event', 'fasting', 'festival_prep', 'family_shared')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'cancelled')),
  attempts int not null default 0 check (attempts between 0 and 20),
  next_attempt_at timestamptz,
  shared_payload jsonb check (shared_payload is null or category = 'family_shared'),
  created_at timestamptz not null default now(),
  unique (device_id, job_ref)
);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id) where user_id is not null;
create index if not exists jobs_device_id_idx on public.notification_jobs (device_id);
create index if not exists jobs_due on public.notification_jobs (status, fire_at_utc) where status = 'pending';
alter table public.push_subscriptions enable row level security;
alter table public.notification_jobs enable row level security;
create policy push_own_read on public.push_subscriptions for select to authenticated using (user_id = (select auth.uid()));
create policy push_own_delete on public.push_subscriptions for delete to authenticated using (user_id = (select auth.uid()));
create policy jobs_own_read on public.notification_jobs for select to authenticated
  using (exists (select 1 from public.push_subscriptions s where s.device_id = notification_jobs.device_id and s.user_id = (select auth.uid())));
grant select, delete on public.push_subscriptions to authenticated;
grant select on public.notification_jobs to authenticated;
