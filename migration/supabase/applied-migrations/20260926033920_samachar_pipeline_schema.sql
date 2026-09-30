-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260926033920
-- Name: samachar_pipeline_schema
-- Recovered 2026-09-30


create table if not exists public.news_items (
  id text primary key,
  source_id text not null,
  title text not null,
  excerpt text,
  url text not null,
  image_url text,
  category_raw text,
  category text,
  province smallint,
  published_at timestamptz not null,
  fetched_at timestamptz not null default now(),
  constraint news_excerpt_len check (excerpt is null or char_length(excerpt) <= 320),
  constraint news_province_range check (province is null or province between 1 and 7)
);
create index if not exists news_items_published_idx on public.news_items (published_at desc);
create index if not exists news_items_category_idx on public.news_items (category);
create index if not exists news_items_province_idx on public.news_items (province);
alter table public.news_items enable row level security;
drop policy if exists "news items public read" on public.news_items;
create policy "news items public read" on public.news_items for select using (true);

create table if not exists public.news_clusters (
  id text primary key,
  item_ids text[] not null,
  source_count int not null check (source_count >= 1),
  lead_published_at timestamptz not null,
  category text,
  province smallint,
  updated_at timestamptz not null default now(),
  constraint news_clusters_province_range check (province is null or province between 1 and 7)
);
create index if not exists news_clusters_lead_idx on public.news_clusters (lead_published_at desc);
alter table public.news_clusters enable row level security;
drop policy if exists "news clusters public read" on public.news_clusters;
create policy "news clusters public read" on public.news_clusters for select using (true);

create table if not exists public.news_source_health (
  source_id text primary key,
  last_ok_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  consecutive_failures int not null default 0
);
alter table public.news_source_health enable row level security;
drop policy if exists "source health public read" on public.news_source_health;
create policy "source health public read" on public.news_source_health for select using (true);

create table if not exists public.news_category_keywords (
  category text not null check (category in ('politics','economy','sports','province','world','tech','entertainment','society')),
  keyword text not null,
  primary key (category, keyword)
);
alter table public.news_category_keywords enable row level security;
drop policy if exists "keywords public read" on public.news_category_keywords;
create policy "keywords public read" on public.news_category_keywords for select using (true);

insert into public.news_category_keywords(category,keyword) values
 ('politics','राजनीति'),('politics','संसद'),('politics','सरकार'),('politics','निर्वाचन'),
 ('economy','अर्थ'),('economy','बजार'),('economy','बैंक'),('economy','व्यवसाय'),
 ('sports','खेल'),('sports','क्रिकेट'),('sports','फुटबल'),
 ('province','प्रदेश'),('province','पालिका'),('province','जिल्ला'),
 ('world','विश्व'),('world','अन्तर्राष्ट्रिय'),
 ('tech','प्रविधि'),('tech','इन्टरनेट'),('tech','साइबर'),('tech','एआई'),
 ('entertainment','मनोरञ्जन'),('entertainment','चलचित्र'),('entertainment','संगीत'),
 ('society','समाज'),('society','शिक्षा'),('society','स्वास्थ्य'),('society','दुर्घटना')
on conflict do nothing;

