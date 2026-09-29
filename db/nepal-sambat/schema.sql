-- Nepal Sambat schema (Postgres / Supabase)
create table if not exists ns_months (
  n smallint primary key, amanta_index smallint not null, dev text not null, newa text not null, roman text not null,
  dev_variants text[] not null default '{}', lunar_sanskrit text, full_moon_dev text, full_moon_newa text, full_moon_roman text,
  gregorian text, status text not null, sources text[] not null
);
create table if not exists ns_festivals (
  id text primary key, dev text not null, newa text not null, roman text not null, en text not null, aliases text[] not null default '{}',
  anchor jsonb not null, span_days smallint not null default 1, tradition text not null, places text[] not null default '{}',
  summary text, is_new_year boolean default false, public_holiday text, declared_annually boolean default false,
  status text not null, sources text[] not null default '{}', updated_at timestamptz default now()
);
create table if not exists ns_festival_dates (
  ns_year smallint not null, festival_id text not null references ns_festivals(id), start_ad date not null, end_ad date not null,
  confidence text not null check (confidence in ('computed','confirmed')), confirmed_by text, note text,
  primary key (ns_year, festival_id)
);
create index if not exists ns_festival_dates_start on ns_festival_dates(start_ad);
create table if not exists ns_days (
  ad date primary key, ns_year smallint not null, ns_month smallint not null, ns_adhik boolean not null,
  ns_paksha text not null, ns_tithi smallint not null, ns_label text not null, ns_label_newa text not null,
  solar_year smallint not null, solar_month smallint not null, solar_day smallint not null
);
-- Editors confirm/override computed jātrā dates (e.g. Bhoto Jātrā) here:
--   update ns_festival_dates set start_ad = '…', confidence = 'confirmed', confirmed_by = 'guthi notice' where …;
alter table ns_festival_dates enable row level security;
create policy "public read" on ns_festival_dates for select using (true);
