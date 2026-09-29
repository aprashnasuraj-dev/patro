create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(), name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254), message text not null check (char_length(message) between 5 and 5000),
  source text not null default 'mero-patro-web', ip_hint text, user_agent text,
  status text not null default 'new' check (status in ('new','reviewed','closed','spam')), created_at timestamptz not null default now()
);
create index if not exists contact_messages_created_idx on public.contact_messages(created_at desc);
alter table public.contact_messages enable row level security;
revoke all on table public.contact_messages from anon, authenticated;
grant select, insert, update, delete on table public.contact_messages to service_role;
