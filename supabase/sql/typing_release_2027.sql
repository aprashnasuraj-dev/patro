-- Reproducible bootstrap for the staged Nepali typing release.
-- This is an idempotent runbook, not a migration-history entry.
-- Target publication gate: 2027-09-29 00:00 Asia/Kathmandu.

create table if not exists public.tool_catalog (
  tool_id text primary key,
  slug text not null unique,
  title text not null,
  subtitle text not null,
  category text not null check (category in ('typing','utility','tools')),
  parent_slug text,
  target_path text not null,
  icon text not null default '',
  badge text not null default 'Tools',
  sort_order integer not null default 100,
  enabled boolean not null default true,
  release_after timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists tool_catalog_visible_idx
  on public.tool_catalog (enabled, release_after, category, sort_order);

alter table public.tool_catalog enable row level security;
revoke all on table public.tool_catalog from anon, authenticated;
grant select, insert, update, delete on table public.tool_catalog to service_role;

create table if not exists public.tool_release_plan (
  release_id text primary key,
  feature_key text not null,
  version text not null,
  target_path text not null,
  publish_after timestamptz not null,
  state text not null check (state in ('prepared','staged','published','retired')),
  source_bundle_version text,
  source_bundle_sha256 text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists tool_release_plan_publish_idx
  on public.tool_release_plan (state, publish_after);

alter table public.tool_release_plan enable row level security;
revoke all on table public.tool_release_plan from anon, authenticated;
grant select, insert, update, delete on table public.tool_release_plan to service_role;

insert into public.tool_catalog
(tool_id,slug,title,subtitle,category,parent_slug,target_path,icon,badge,sort_order,enabled,release_after,metadata)
values
('typingtools','typingtools','Typing Tools · टाइपिङ टुल्स','Nepali typing and legacy-font conversion tools.','typing',null,'/tools/typingtools','क','Typing Tools',10,true,'2026-09-29T00:00:00+05:45','{"kind":"hub"}'),
('preetitounicode','preetitounicode','Preeti → Unicode','Legacy compatibility row; hidden in the catalog because Preeti conversion is one unified tool.','typing','typingtools','/tools/preetitounicode','क','Typing Tools',998,false,'2026-09-29T00:00:00+05:45','{"legacy_alias":true}'),
('unicodetopreeti','unicodetopreeti','Unicode → Preeti','Legacy compatibility row; hidden in the catalog because Preeti conversion is one unified tool.','typing','typingtools','/tools/unicodetopreeti','प्री','Typing Tools',999,false,'2026-09-29T00:00:00+05:45','{"legacy_alias":true}'),
('preeti-converter','preeti-converter','Preeti Converter · प्रीति रूपान्तरण','Convert both Preeti → Unicode and Unicode → Preeti from one converter.','typing','typingtools','/tools/preeti-converter','प्री','Typing Tools',20,true,'2026-09-29T00:00:00+05:45','{"directions":["preeti-to-unicode","unicode-to-preeti"],"legacy_routes":["/tools/preetitounicode","/tools/unicodetopreeti"]}'),
('nepali-typing','nepali-typing','नेपाली टाइपिङ · Nepali Typing','Type Roman Nepali and choose from local Devanagari suggestions without sending your text to a typing service.','typing','typingtools','/tools/nepali-typing','ने','Typing Tools',30,true,'2027-09-29T00:00:00+05:45','{"engine":"local-worker","dictionary_version":"1.0.0","suggestions":34571,"privacy":"client-only"}'),
('bstoad','bstoad','BS → AD Date Converter','Convert Bikram Sambat dates to Gregorian/AD dates.','utility',null,'/tools/bstoad','वि','Calendar',200,true,'2026-09-29T00:00:00+05:45','{}'),
('adtobs','adtobs','AD → BS Date Converter','Convert Gregorian/AD dates to Bikram Sambat dates.','utility',null,'/tools/adtobs','AD','Calendar',210,true,'2026-09-29T00:00:00+05:45','{}'),
('landconverter','landconverter','Nepali Land Converter','Convert Ropani–Aana–Paisa–Dam, Bigha–Kattha–Dhur and square feet.','utility',null,'/tools/landconverter','▦','Land',220,true,'2026-09-29T00:00:00+05:45','{}'),
('incometax','incometax','Income Tax Calculator','Estimate FY 2083/84 salary tax with supported deductions.','utility',null,'/tools/incometax','रु','Finance',230,true,'2026-09-29T00:00:00+05:45','{}'),
('nepaliqr','nepaliqr','Devanagari QR Generator','Create a private UTF-8 QR code from Nepali or English text.','utility',null,'/tools/nepaliqr','QR','QR',240,true,'2026-09-29T00:00:00+05:45','{}'),
('fuelprice','fuelprice','NOC Fuel Price Tracker','Check Nepal Oil Corporation fuel price references.','utility',null,'/tools/fuelprice','⛽','Fuel',250,true,'2026-09-29T00:00:00+05:45','{}'),
('tithi','tithi','तिथि · Tithi','Tithi reminders, lunar-date derivation and recurrence tools.','tools',null,'/tools/tithi','त','Tools',50,true,'2026-09-29T00:00:00+05:45','{"legacy_path":"/tithi"}'),
('diaspora','diaspora','Diaspora','Timezone-aware Nepal calendar context for users abroad.','tools',null,'/tools/diaspora','🌏','Tools',60,true,'2026-09-29T00:00:00+05:45','{"legacy_path":"/diaspora"}'),
('card','card','कार्ड · Share Cards','Create calendar, date and festival cards for sharing.','tools',null,'/tools/card','▣','Tools',70,true,'2026-09-29T00:00:00+05:45','{"legacy_path":"/card"}'),
('family','family','परिवार · Family','Keep private family dates and shared household events together.','tools',null,'/tools/family','परि','Tools',80,true,'2026-09-29T00:00:00+05:45','{"legacy_path":"/family","private":true}'),
('api','api','API · Developers','Explore Nepal Miti APIs, integration guidance and developer resources.','tools',null,'/tools/api','</>','Tools',90,true,'2026-09-29T00:00:00+05:45','{"legacy_path":"/developers"}'),
('my-data','my-data','मेरो डेटा · My Data','Review, export or remove private data associated with Nepal Miti.','tools',null,'/tools/my-data','🔐','Tools',100,true,'2026-09-29T00:00:00+05:45','{"legacy_path":"/my-data","private":true}')
on conflict (tool_id) do update set
  slug=excluded.slug,title=excluded.title,subtitle=excluded.subtitle,category=excluded.category,
  parent_slug=excluded.parent_slug,target_path=excluded.target_path,icon=excluded.icon,badge=excluded.badge,
  sort_order=excluded.sort_order,enabled=excluded.enabled,release_after=excluded.release_after,
  metadata=excluded.metadata,updated_at=now();

insert into public.tool_release_plan
(release_id,feature_key,version,target_path,publish_after,state,source_bundle_version,source_bundle_sha256,notes,metadata)
values
('nepali-typing-v1','nepali-typing','1.0.0','/tools/nepali-typing','2027-09-29T00:00:00+05:45','staged','1.0.0','dfc130b2ccbaeee54a859bdc512c27107eb6efa6ae5167615a65df83377ba427','34,571 local suggestions; worker-based Roman-to-Nepali typing.','{"source_words":34548,"suggestions":34571}'),
('enhanced-preeti-converter-v2','preeti-converter','2.0.0','/tools/preeti-converter','2027-09-29T00:00:00+05:45','staged','1.0.0','dfc130b2ccbaeee54a859bdc512c27107eb6efa6ae5167615a65df83377ba427','Single enhanced Preeti Converter containing both conversion directions.','{"legacy_routes":["/tools/preetitounicode","/tools/unicodetopreeti"],"directions":["preeti-to-unicode","unicode-to-preeti"]}')
on conflict (release_id) do update set
  feature_key=excluded.feature_key,version=excluded.version,target_path=excluded.target_path,
  publish_after=excluded.publish_after,state=excluded.state,source_bundle_version=excluded.source_bundle_version,
  source_bundle_sha256=excluded.source_bundle_sha256,notes=excluded.notes,metadata=excluded.metadata,updated_at=now();
