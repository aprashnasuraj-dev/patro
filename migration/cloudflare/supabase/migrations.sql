-- ============================================================================
-- 20260918121833_initial_calendar_backend
-- recovered from live Supabase migration history
-- ============================================================================
-- Nepali Calendar v0.5 backend foundation
-- External Google/Apple/ICS calendar bridges intentionally excluded.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text not null default 'ne',
  timezone text not null default 'Asia/Kathmandu',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_calendar_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notes jsonb not null default '{}'::jsonb,
  events jsonb not null default '[]'::jsonb,
  calendars jsonb not null default '[]'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  feedback jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_spaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  kind text not null default 'private' check (kind in ('private','family','work','community')),
  description text,
  share_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_space_members (
  calendar_id uuid not null references public.calendar_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner','editor','viewer')),
  joined_at timestamptz not null default now(),
  primary key(calendar_id,user_id)
);

create table if not exists public.calendar_space_events (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendar_spaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  note text,
  bs_date text,
  ad_date date,
  recurrence text not null default 'none' check (recurrence in ('none','yearly-bs','yearly-ad','yearly-tithi')),
  bs_month smallint,
  bs_day smallint,
  ad_month smallint,
  ad_day smallint,
  lunar_month smallint,
  tithi_num smallint,
  remind_days smallint not null default 1 check (remind_days between 0 and 60),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.correction_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  bs_date text,
  issue_type text not null,
  detail text not null check (char_length(detail) between 3 and 4000),
  source_url text,
  status text not null default 'pending' check (status in ('pending','reviewing','accepted','rejected','duplicate')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.profiles enable row level security;
alter table public.user_calendar_state enable row level security;
alter table public.calendar_spaces enable row level security;
alter table public.calendar_space_members enable row level security;
alter table public.calendar_space_events enable row level security;
alter table public.correction_reports enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using (user_id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "state_select_own" on public.user_calendar_state for select to authenticated using (user_id = auth.uid());
create policy "state_insert_own" on public.user_calendar_state for insert to authenticated with check (user_id = auth.uid());
create policy "state_update_own" on public.user_calendar_state for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "state_delete_own" on public.user_calendar_state for delete to authenticated using (user_id = auth.uid());

create or replace function public.can_view_calendar(target_calendar uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.calendar_spaces c
    left join public.calendar_space_members m
      on m.calendar_id = c.id and m.user_id = auth.uid()
    where c.id = target_calendar
      and (c.owner_id = auth.uid() or m.user_id = auth.uid())
  );
$$;

create or replace function public.can_edit_calendar(target_calendar uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.calendar_spaces c
    left join public.calendar_space_members m
      on m.calendar_id = c.id and m.user_id = auth.uid()
    where c.id = target_calendar
      and (c.owner_id = auth.uid() or m.role in ('owner','editor'))
  );
$$;

revoke all on function public.can_view_calendar(uuid) from public;
revoke all on function public.can_edit_calendar(uuid) from public;
grant execute on function public.can_view_calendar(uuid) to authenticated;
grant execute on function public.can_edit_calendar(uuid) to authenticated;

create policy "spaces_select_member" on public.calendar_spaces for select to authenticated
using (owner_id = auth.uid() or public.can_view_calendar(id));
create policy "spaces_insert_owner" on public.calendar_spaces for insert to authenticated with check (owner_id = auth.uid());
create policy "spaces_update_owner" on public.calendar_spaces for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "spaces_delete_owner" on public.calendar_spaces for delete to authenticated using (owner_id = auth.uid());

create policy "members_select_related" on public.calendar_space_members for select to authenticated
using (user_id = auth.uid() or public.can_edit_calendar(calendar_id));
create policy "members_insert_owner" on public.calendar_space_members for insert to authenticated
with check (public.can_edit_calendar(calendar_id));
create policy "members_update_owner" on public.calendar_space_members for update to authenticated
using (public.can_edit_calendar(calendar_id)) with check (public.can_edit_calendar(calendar_id));
create policy "members_delete_owner_or_self" on public.calendar_space_members for delete to authenticated
using (user_id = auth.uid() or public.can_edit_calendar(calendar_id));

create policy "space_events_select_member" on public.calendar_space_events for select to authenticated
using (public.can_view_calendar(calendar_id));
create policy "space_events_insert_editor" on public.calendar_space_events for insert to authenticated
with check (created_by = auth.uid() and public.can_edit_calendar(calendar_id));
create policy "space_events_update_editor" on public.calendar_space_events for update to authenticated
using (public.can_edit_calendar(calendar_id)) with check (public.can_edit_calendar(calendar_id));
create policy "space_events_delete_editor" on public.calendar_space_events for delete to authenticated
using (public.can_edit_calendar(calendar_id));

create policy "correction_insert_own" on public.correction_reports for insert to authenticated with check (user_id = auth.uid());
create policy "correction_select_own" on public.correction_reports for select to authenticated using (user_id = auth.uid());

create index if not exists calendar_space_members_user_idx on public.calendar_space_members(user_id);
create index if not exists calendar_space_events_calendar_idx on public.calendar_space_events(calendar_id, updated_at desc);
create index if not exists calendar_space_events_created_by_idx on public.calendar_space_events(created_by);
create index if not exists correction_reports_user_idx on public.correction_reports(user_id, created_at desc);

-- ============================================================================
-- 20260918121905_harden_rls_and_helpers
-- recovered from live Supabase migration history
-- ============================================================================
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

drop policy if exists "spaces_select_member" on public.calendar_spaces;
drop policy if exists "members_select_related" on public.calendar_space_members;
drop policy if exists "members_insert_owner" on public.calendar_space_members;
drop policy if exists "members_update_owner" on public.calendar_space_members;
drop policy if exists "members_delete_owner_or_self" on public.calendar_space_members;
drop policy if exists "space_events_select_member" on public.calendar_space_events;
drop policy if exists "space_events_insert_editor" on public.calendar_space_events;
drop policy if exists "space_events_update_editor" on public.calendar_space_events;
drop policy if exists "space_events_delete_editor" on public.calendar_space_events;

drop function if exists public.can_view_calendar(uuid);
drop function if exists public.can_edit_calendar(uuid);

create or replace function private.can_view_calendar(target_calendar uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.calendar_spaces c
    left join public.calendar_space_members m
      on m.calendar_id = c.id and m.user_id = (select auth.uid())
    where c.id = target_calendar
      and (c.owner_id = (select auth.uid()) or m.user_id = (select auth.uid()))
  );
$$;

create or replace function private.can_edit_calendar(target_calendar uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.calendar_spaces c
    left join public.calendar_space_members m
      on m.calendar_id = c.id and m.user_id = (select auth.uid())
    where c.id = target_calendar
      and (c.owner_id = (select auth.uid()) or m.role in ('owner','editor'))
  );
$$;

revoke all on function private.can_view_calendar(uuid) from public, anon;
revoke all on function private.can_edit_calendar(uuid) from public, anon;
grant execute on function private.can_view_calendar(uuid) to authenticated;
grant execute on function private.can_edit_calendar(uuid) to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "state_select_own" on public.user_calendar_state;
drop policy if exists "state_insert_own" on public.user_calendar_state;
drop policy if exists "state_update_own" on public.user_calendar_state;
drop policy if exists "state_delete_own" on public.user_calendar_state;
create policy "state_select_own" on public.user_calendar_state for select to authenticated using (user_id = (select auth.uid()));
create policy "state_insert_own" on public.user_calendar_state for insert to authenticated with check (user_id = (select auth.uid()));
create policy "state_update_own" on public.user_calendar_state for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "state_delete_own" on public.user_calendar_state for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "spaces_insert_owner" on public.calendar_spaces;
drop policy if exists "spaces_update_owner" on public.calendar_spaces;
drop policy if exists "spaces_delete_owner" on public.calendar_spaces;
create policy "spaces_select_member" on public.calendar_spaces for select to authenticated using (owner_id = (select auth.uid()) or private.can_view_calendar(id));
create policy "spaces_insert_owner" on public.calendar_spaces for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "spaces_update_owner" on public.calendar_spaces for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "spaces_delete_owner" on public.calendar_spaces for delete to authenticated using (owner_id = (select auth.uid()));

create policy "members_select_related" on public.calendar_space_members for select to authenticated using (user_id = (select auth.uid()) or private.can_edit_calendar(calendar_id));
create policy "members_insert_owner" on public.calendar_space_members for insert to authenticated with check (private.can_edit_calendar(calendar_id));
create policy "members_update_owner" on public.calendar_space_members for update to authenticated using (private.can_edit_calendar(calendar_id)) with check (private.can_edit_calendar(calendar_id));
create policy "members_delete_owner_or_self" on public.calendar_space_members for delete to authenticated using (user_id = (select auth.uid()) or private.can_edit_calendar(calendar_id));

create policy "space_events_select_member" on public.calendar_space_events for select to authenticated using (private.can_view_calendar(calendar_id));
create policy "space_events_insert_editor" on public.calendar_space_events for insert to authenticated with check (created_by = (select auth.uid()) and private.can_edit_calendar(calendar_id));
create policy "space_events_update_editor" on public.calendar_space_events for update to authenticated using (private.can_edit_calendar(calendar_id)) with check (private.can_edit_calendar(calendar_id));
create policy "space_events_delete_editor" on public.calendar_space_events for delete to authenticated using (private.can_edit_calendar(calendar_id));

drop policy if exists "correction_insert_own" on public.correction_reports;
drop policy if exists "correction_select_own" on public.correction_reports;
create policy "correction_insert_own" on public.correction_reports for insert to authenticated with check (user_id = (select auth.uid()));
create policy "correction_select_own" on public.correction_reports for select to authenticated using (user_id = (select auth.uid()));

create index if not exists calendar_spaces_owner_idx on public.calendar_spaces(owner_id);

-- ============================================================================
-- 20260919000625_calendar_reference_and_history_layer
-- recovered from live Supabase migration history
-- ============================================================================

create table if not exists public.calendar_reference_sources (
  id bigserial primary key,
  topic text not null,
  authority text not null,
  url text not null,
  source_role text,
  source_level text not null default 'reference',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(topic, url)
);

create table if not exists public.nepal_sambat_months (
  month_no smallint primary key check (month_no between 1 and 14),
  name_newa text,
  name_devanagari text not null,
  name_roman text not null,
  corresponding_lunar_month text,
  full_moon_name text,
  month_kind text not null default 'regular' check (month_kind in ('regular','intercalary','reduced')),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.nepal_sambat_tithi_names (
  tithi_no smallint primary key check (tithi_no between 1 and 15),
  common_roman text,
  common_devanagari text,
  traditional_roman text,
  traditional_devanagari text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.calendar_coverage_tiers (
  id bigserial primary key,
  bs_start text not null,
  bs_end text not null,
  ad_start date,
  ad_end date,
  status text not null,
  description text not null,
  provenance jsonb not null default '{}'::jsonb,
  unique(bs_start, bs_end, status)
);

create table if not exists public.on_this_day_events (
  id uuid primary key default gen_random_uuid(),
  ad_month smallint check (ad_month between 1 and 12),
  ad_day smallint check (ad_day between 1 and 31),
  ad_year integer,
  bs_date text,
  title_ne text,
  title_en text,
  summary_ne text,
  summary_en text,
  category text,
  source_name text,
  source_url text,
  event_date_precision text not null default 'day' check (event_date_precision in ('day','month','year','approximate')),
  verification_status text not null default 'unverified' check (verification_status in ('unverified','source-backed','cross-checked','official')),
  published boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.calendar_reference_sources enable row level security;
alter table public.nepal_sambat_months enable row level security;
alter table public.nepal_sambat_tithi_names enable row level security;
alter table public.calendar_coverage_tiers enable row level security;
alter table public.on_this_day_events enable row level security;

drop policy if exists "reference_sources_public_read" on public.calendar_reference_sources;
create policy "reference_sources_public_read" on public.calendar_reference_sources
for select to anon, authenticated using (true);

drop policy if exists "ns_months_public_read" on public.nepal_sambat_months;
create policy "ns_months_public_read" on public.nepal_sambat_months
for select to anon, authenticated using (true);

drop policy if exists "ns_tithi_public_read" on public.nepal_sambat_tithi_names;
create policy "ns_tithi_public_read" on public.nepal_sambat_tithi_names
for select to anon, authenticated using (true);

drop policy if exists "coverage_tiers_public_read" on public.calendar_coverage_tiers;
create policy "coverage_tiers_public_read" on public.calendar_coverage_tiers
for select to anon, authenticated using (true);

drop policy if exists "on_this_day_published_read" on public.on_this_day_events;
create policy "on_this_day_published_read" on public.on_this_day_events
for select to anon, authenticated using (published = true);

create index if not exists on_this_day_month_day_idx on public.on_this_day_events(ad_month, ad_day) where published = true;
create index if not exists on_this_day_category_idx on public.on_this_day_events(category) where published = true;
create index if not exists calendar_reference_topic_idx on public.calendar_reference_sources(topic);

insert into public.nepal_sambat_months(month_no,name_newa,name_devanagari,name_roman,corresponding_lunar_month,full_moon_name,month_kind,metadata)
values
(1,'𑐎𑐕𑐮𑐵','कछला','Kachhalā','Kartika','Saki Milā Punhi','regular','{}'),
(2,'𑐠𑐶𑑄𑐮𑐵','थिंला','Thinlā','Margashirsha','Yomari Punhi','regular','{}'),
(3,'𑐥𑑂𑐰𑑃𑐴𑐾𑐮𑐵','प्वँहेला','Pwanhelā','Pausha','Milā Punhi','regular','{}'),
(4,'𑐳𑐶𑐮𑐵','सिला','Silā','Magha','Si Punhi','regular','{}'),
(5,'𑐔𑐶𑐮𑐵','चिला','Chilā','Phalguna','Holi Punhi','regular','{}'),
(6,'𑐔𑑁𑐮𑐵','चौला','Chaulā','Chaitra','Lhuti Punhi','regular','{}'),
(7,'𑐧𑐕𑐮𑐵','बछला','Bachhalā','Vaishakha','Swānyā Punhi','regular','{}'),
(8,'𑐟𑐕𑐮𑐵','तछला','Tachhalā','Jyeshtha','Jyā Punhi','regular','{}'),
(9,'𑐡𑐶𑐮𑐵','दिला','Dilā','Ashadha','Dillā Punhi','regular','{}'),
(10,'𑐐𑐸𑑄𑐮𑐵','गुंला','Gunlā','Shravana','Gun Punhi','regular','{}'),
(11,'𑐫𑑄𑐮𑐵','यंला','Yanlā','Bhadrapada','Yenyā Punhi','regular','{"variant_spellings":["ञंला","यँला"]}'),
(12,'𑐎𑑁𑐮𑐵','कौला','Kaulā','Ashwina','Katin Punhi','regular','{}'),
(13,'𑐀𑐣𑐮𑐵','अनला','Analā','intercalary','Analā Punhi','intercalary','{}'),
(14,'𑐴𑑂𑐣𑑄𑐮𑐵','न्हंला','Nhanlā','reduced month','','reduced','{}')
on conflict (month_no) do update set
 name_newa=excluded.name_newa,name_devanagari=excluded.name_devanagari,name_roman=excluded.name_roman,
 corresponding_lunar_month=excluded.corresponding_lunar_month,full_moon_name=excluded.full_moon_name,
 month_kind=excluded.month_kind,metadata=excluded.metadata;

insert into public.nepal_sambat_tithi_names(tithi_no,common_roman,common_devanagari,traditional_roman,traditional_devanagari)
values
(1,'Pāru','पारु','Pāmilā / Pāru','पामिला / पारु'),
(2,'Dwitiyā','द्वितीया','Nimilā','निमिला'),
(3,'Tritiyā','तृतीया','Swamilā','स्वमिला'),
(4,'Chauthi','चौथी','Iṃmilā','इंमिला'),
(5,'Panchami','पञ्चमी','Nyāmilā','न्यामिला'),
(6,'Khasti','खस्ति','Khumilā','खुमिला'),
(7,'Saptami','सप्तमी','Nhemilā','न्हेमिला'),
(8,'Ashtami','अष्टमी','Bāmilā','बामिला'),
(9,'Navami','नवमी','Gumilā','गुमिला'),
(10,'Dashami','दशमी','Jhimilā','झिमिला'),
(11,'Ekādashi','एकादशी','Jhinchamilā','झिंचमिला'),
(12,'Dwādashi','द्वादशी','Jhinnimilā','झिन्निमिला'),
(13,'Trayodashi','त्रयोदशी','Jhinswamilā','झिंस्वमिला'),
(14,'Chahre','चःह्रे','Jhinpyamilā','झिंप्यमिला'),
(15,'Punhi / Āmāi','पुन्हि / आमाइ','Pūmilā / Punhi · Khiṃmilā / Āmai','पूमिला / पुन्हि · खिंमिला / आमाइ')
on conflict (tithi_no) do update set
 common_roman=excluded.common_roman,common_devanagari=excluded.common_devanagari,
 traditional_roman=excluded.traditional_roman,traditional_devanagari=excluded.traditional_devanagari;

insert into public.calendar_reference_sources(topic,authority,url,source_role,source_level,metadata)
values
('nepal-sambat','Office of the President, Nepal','https://president.gov.np/','Current official Nepal Sambat notation examples','government','{}'),
('nepal-sambat','Ministry of Federal Affairs and General Administration','https://www.mofaga.gov.np/','Government date-writing guidance/context','government','{}'),
('nepal-sambat','Nepal Panchanga Nirnayak Bikash Samiti','https://npns.gov.np/','Official Panchanga context','official-panchanga-body','{}'),
('nepal-sambat','Nepal Sambat community reference','https://nepalsambat.org/lunar-calendar/','Traditional lunar month/paksha terminology','cultural-reference','{}'),
('nepal-sambat','Nepal Sambat community reference','https://nepalsambat.org/solar-calendar/','Modern solar Nepal Sambat structure','cultural-reference','{}'),
('bs-history','World Calendars / Keith Wood','https://github.com/kbwood/world-calendars','Historical BS month-length table; code attributes source to ashesh.com.np','open-source-reference','{"license":"MIT"}'),
('bs-history','Ashok095/bikram-sambat','https://github.com/Ashok095/bikram-sambat','Historical BS month-length table','open-source-reference','{}'),
('bs-history','amitgaru/nepali-datetime','https://github.com/amitgaru/nepali-datetime','Corroboration table for BS 1975–2100','open-source-reference','{}')
on conflict(topic,url) do update set authority=excluded.authority,source_role=excluded.source_role,source_level=excluded.source_level,metadata=excluded.metadata;

insert into public.calendar_coverage_tiers(bs_start,bs_end,ad_start,ad_end,status,description,provenance)
values
('2033-01-01','2093-12-30','1976-04-13','2037-04-13','validated-archive','User-supplied 22,281-day authority + astronomy archive; exact civil mapping retained.','{"days":22281}'),
('1975-01-01','2032-12-30','1918-04-13','1976-04-12','corroborated-open-table','Open tabulated BS month-length data independently matches amitgaru/nepali-datetime across this range; astronomical layer recomputed.','{}'),
('1901-01-01','1974-12-30','1844-04-11','1918-04-12','historical-tabulated','Open historical BS month-length table; comparison sources contain disagreements, so this is historical rather than authoritative.','{}'),
('1883-01-01','1900-12-30','1826-04-11','1844-04-10','historical-tabulated-ashesh','Month lengths from world-calendars, whose code attributes its table to ashesh.com.np; historical exploration tier, not a legal record.','{}')
on conflict(bs_start,bs_end,status) do update set ad_start=excluded.ad_start,ad_end=excluded.ad_end,description=excluded.description,provenance=excluded.provenance;


-- ============================================================================
-- 20260919001127_nepal_sambat_reference_facts
-- recovered from live Supabase migration history
-- ============================================================================

create table if not exists public.nepal_sambat_facts (
  fact_key text primary key,
  title_ne text not null,
  title_en text,
  detail_ne text not null,
  detail_en text,
  source_url text,
  source_authority text,
  source_level text not null default 'reference',
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.nepal_sambat_facts enable row level security;
drop policy if exists "ns_facts_public_read" on public.nepal_sambat_facts;
create policy "ns_facts_public_read" on public.nepal_sambat_facts
for select to anon, authenticated using (true);

insert into public.nepal_sambat_facts
(fact_key,title_ne,title_en,detail_ne,detail_en,source_url,source_authority,source_level,metadata)
values
('traditional_year_boundary','परम्परागत वर्ष सीमा','Traditional year boundary',
 'नेपाल संवत् कार्तिक शुक्ल प्रतिपदाबाट सुरु भई कार्तिक कृष्ण औंसीमा वर्ष पूरा हुने सरकारी मिति-लेखन मार्गदर्शनमा उल्लेख छ।',
 'Government date-writing guidance describes the traditional Nepal Sambat year as beginning on Kartika Shukla Pratipada and completing at Kartika Krishna Amavasya.',
 'https://www.mofaga.gov.np/notice-file/Notices-20240108125907641.pdf','Government of Nepal','government','{}'),
('traditional_month_boundary','परम्परागत महिना सीमा','Traditional month boundary',
 'प्रत्येक चान्द्र महिना प्रतिपदाबाट सुरु भई औंसीमा पूरा हुने सरकारी मार्गदर्शनमा उल्लेख छ।',
 'Government guidance describes each traditional lunar month as starting at Pratipada and ending at Amavasya.',
 'https://www.mofaga.gov.np/notice-file/Notices-20240108125907641.pdf','Government of Nepal','government','{}'),
('tithi_variability','तिथि क्षय/वृद्धि','Tithi variability',
 'तिथि घट्न वा बढ्न सक्छ; एउटै तिथि दुई दिन देखिन वा कुनै तिथि लोप हुन सक्छ, त्यसैले बार/दिन सन्दर्भ महत्त्वपूर्ण हुन्छ।',
 'A tithi may repeat or be skipped, so weekday/day context can be necessary for unambiguous notation.',
 'https://www.mofaga.gov.np/notice-file/Notices-20240108125907641.pdf','Government of Nepal','government','{}'),
('tithi_numbering','सरकारी तिथि संख्या','Government tithi numbering',
 'मार्गदर्शनमा प्रतिपदा १ देखि चतुर्दशी १४, पूर्णिमा १५ र औंसी ३० लेख्ने उदाहरण दिइएको छ।',
 'The guidance gives numerical notation from Pratipada 1 through Chaturdashi 14, Purnima 15 and Amavasya 30.',
 'https://www.mofaga.gov.np/notice-file/Notices-20240108125907641.pdf','Government of Nepal','government','{}'),
('official_notation_examples','हालको सरकारी लेखन शैली','Current official notation',
 'राष्ट्रपतिको कार्यालयका हालका सूचनामा “ने.सं. ११४६ कछलाथ्व प्रतिपदा”, “वछलाथ्व: पञ्चमी/सप्तमी” र “वछलागा: चतुर्थी” जस्ता लेखन उदाहरण छन्।',
 'Current Office of the President notices use Nepal Sambat year plus month/paksha/tithi notation.',
 'https://president.gov.np/','Office of the President of Nepal','government','{}'),
('new_year_1146','नेपाल संवत् ११४६ प्रारम्भ','Nepal Sambat 1146 New Year',
 'राष्ट्रपतिको २०८२ कात्तिक ५ को शुभकामना सन्देशमा ने.सं. ११४६ कछलाथ्व प्रतिपदा उल्लेख छ।',
 'The President’s Nepal Sambat 1146 greeting is dated N.S. 1146 Kachhala Thwa Pratipada.',
 'https://president.gov.np/','Office of the President of Nepal','government','{}'),
('sankhadhar_context','शंखधर साख्वा र ऐतिहासिक स्मरण','Sankhadhar Sakhwa historical context',
 'राष्ट्रपतिको शुभकामना सन्देशमा शंखधर साख्वाले ऋणमुक्ति र नयाँ युगको सुरुवातसँग नेपाल संवत् प्रचलनमा ल्याएको मान्यता उल्लेख गरिएको छ।',
 'The President’s greeting describes the tradition linking Sankhadhar Sakhwa, debt relief and the beginning of a new era.',
 'https://president.gov.np/','Office of the President of Nepal','government','{}'),
('npns_current_display','पञ्चाङ्ग निकायको हालको प्रदर्शन','Current Panchanga-body display',
 'नेपाल पञ्चाङ्ग निर्णायक विकास समितिको वेबसाइटमा नेपाल संवत् मिति दैनिक रूपमा वि.सं. सँगै प्रदर्शन हुन्छ।',
 'The Nepal Panchanga Nirnayak Bikash Samiti website displays a current Nepal Sambat date alongside Bikram Sambat.',
 'https://npns.gov.np/','Nepal Panchanga Nirnayak Bikash Samiti','official-panchanga-body','{}'),
('solar_nepal_sambat','आधुनिक Solar Nepal Sambat','Modern Solar Nepal Sambat',
 'आधुनिक solar Nepal Sambat परम्परागत lunar Nepal Sambat सँग छुट्टै प्रणालीका रूपमा दस्तावेज गरिएको छ; एपले परम्परागत lunar मितिलाई मुख्य सांस्कृतिक तह मानेको छ।',
 'Modern Solar Nepal Sambat is documented separately; this app keeps the traditional lunar Nepal Sambat as its primary cultural layer.',
 'https://nepalsambat.org/solar-calendar/','Nepal Sambat cultural reference','cultural-reference','{"solar_epoch":"2020-10-20","solar_epoch_ns":"1141-01-01"}')
on conflict (fact_key) do update set
 title_ne=excluded.title_ne,title_en=excluded.title_en,detail_ne=excluded.detail_ne,detail_en=excluded.detail_en,
 source_url=excluded.source_url,source_authority=excluded.source_authority,source_level=excluded.source_level,
 metadata=excluded.metadata,updated_at=now();


-- ============================================================================
-- 20260919001255_add_primary_nepal_sambat_sources
-- recovered from live Supabase migration history
-- ============================================================================

insert into public.calendar_reference_sources(topic,authority,url,source_role,source_level,metadata)
values
('nepal-sambat','Government of Nepal / MoFAGA-hosted document','https://www.mofaga.gov.np/notice-file/Notices-20240108125907641.pdf','Primary guidance on Nepal Sambat date writing, lunar year/month boundaries and tithi numbering','government-primary','{}'),
('nepal-sambat','Office of the President of Nepal','https://president.gov.np/','Current government notation and Nepal Sambat New Year examples','government-primary','{}')
on conflict(topic,url) do update set authority=excluded.authority,source_role=excluded.source_role,source_level=excluded.source_level,metadata=excluded.metadata;

-- ============================================================================
-- 20260919001553_nepal_sambat_reference_and_on_this_day
-- recovered from live Supabase migration history
-- ============================================================================

create table if not exists public.nepal_sambat_months (
  month_no smallint primary key,
  dev text not null,
  roman text not null,
  newa text,
  lunar_equivalent text,
  full_moon_name text,
  month_kind text not null default 'standard' check (month_kind in ('standard','intercalary','reduced')),
  updated_at timestamptz not null default now()
);
create table if not exists public.nepal_sambat_tithis (
  tithi_no smallint primary key check (tithi_no between 1 and 15),
  dev text not null,
  roman text not null,
  standard_dev text,
  standard_roman text,
  updated_at timestamptz not null default now()
);
create table if not exists public.nepal_sambat_rules (
  id text primary key,
  title_ne text not null,
  detail_ne text not null,
  authority text,
  source_url text,
  updated_at timestamptz not null default now()
);
create table if not exists public.nepal_sambat_sources (
  id bigint generated always as identity primary key,
  url text not null unique,
  role text not null,
  source_level text,
  updated_at timestamptz not null default now()
);
create table if not exists public.nepal_sambat_examples (
  id bigint generated always as identity primary key,
  bs_date text,
  notation_ne text not null,
  authority text,
  source_url text,
  updated_at timestamptz not null default now()
);
create table if not exists public.nepal_sambat_observances (
  id bigint generated always as identity primary key,
  phase_type text not null check (phase_type in ('punhi','amai','chahre','paru')),
  month_key text not null,
  observance_ne text not null,
  source_url text,
  updated_at timestamptz not null default now(),
  unique(phase_type, month_key, observance_ne)
);
create table if not exists public.on_this_day_events (
  id uuid primary key default gen_random_uuid(),
  ad_year integer,
  ad_month smallint not null check (ad_month between 1 and 12),
  ad_day smallint not null check (ad_day between 1 and 31),
  ad_date date,
  bs_date text,
  title_ne text,
  title_en text,
  summary_ne text,
  summary_en text,
  category text not null default 'history',
  importance smallint not null default 50 check (importance between 0 and 100),
  source_name text,
  source_url text,
  sources jsonb not null default '[]'::jsonb,
  image_url text,
  image_caption_ne text,
  image_caption_en text,
  image_credit text,
  image_license text,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified','single-source','cross-checked','primary-source','verified')),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (title_ne is not null or title_en is not null)
);
create index if not exists on_this_day_md_idx on public.on_this_day_events(ad_month,ad_day,published,ad_year);
create index if not exists on_this_day_category_idx on public.on_this_day_events(category,published);

alter table public.nepal_sambat_months enable row level security;
alter table public.nepal_sambat_tithis enable row level security;
alter table public.nepal_sambat_rules enable row level security;
alter table public.nepal_sambat_sources enable row level security;
alter table public.nepal_sambat_examples enable row level security;
alter table public.nepal_sambat_observances enable row level security;
alter table public.on_this_day_events enable row level security;

drop policy if exists "ns_months_public_read" on public.nepal_sambat_months;
drop policy if exists "ns_tithis_public_read" on public.nepal_sambat_tithis;
drop policy if exists "ns_rules_public_read" on public.nepal_sambat_rules;
drop policy if exists "ns_sources_public_read" on public.nepal_sambat_sources;
drop policy if exists "ns_examples_public_read" on public.nepal_sambat_examples;
drop policy if exists "ns_observances_public_read" on public.nepal_sambat_observances;
drop policy if exists "otd_public_read_published" on public.on_this_day_events;

create policy "ns_months_public_read" on public.nepal_sambat_months for select to anon, authenticated using (true);
create policy "ns_tithis_public_read" on public.nepal_sambat_tithis for select to anon, authenticated using (true);
create policy "ns_rules_public_read" on public.nepal_sambat_rules for select to anon, authenticated using (true);
create policy "ns_sources_public_read" on public.nepal_sambat_sources for select to anon, authenticated using (true);
create policy "ns_examples_public_read" on public.nepal_sambat_examples for select to anon, authenticated using (true);
create policy "ns_observances_public_read" on public.nepal_sambat_observances for select to anon, authenticated using (true);
create policy "otd_public_read_published" on public.on_this_day_events for select to anon, authenticated using (published = true);


-- ============================================================================
-- 20260919001653_enrich_nepal_sambat_and_history_schema
-- recovered from live Supabase migration history
-- ============================================================================

drop table if exists public.nepal_sambat_tithis cascade;
drop table if exists public.nepal_sambat_rules cascade;
drop table if exists public.nepal_sambat_sources cascade;
drop table if exists public.nepal_sambat_examples cascade;

alter table public.on_this_day_events add column if not exists ad_date date;
alter table public.on_this_day_events add column if not exists importance smallint not null default 50;
alter table public.on_this_day_events add column if not exists sources jsonb not null default '[]'::jsonb;
alter table public.on_this_day_events add column if not exists image_url text;
alter table public.on_this_day_events add column if not exists image_caption_ne text;
alter table public.on_this_day_events add column if not exists image_caption_en text;
alter table public.on_this_day_events add column if not exists image_credit text;
alter table public.on_this_day_events add column if not exists image_license text;
do $$ begin
  alter table public.on_this_day_events add constraint on_this_day_importance_range check (importance between 0 and 100);
exception when duplicate_object then null; end $$;
create index if not exists on_this_day_md_idx on public.on_this_day_events(ad_month,ad_day,published,ad_year);
create index if not exists on_this_day_importance_idx on public.on_this_day_events(ad_month,ad_day,published,importance desc);

alter table public.nepal_sambat_observances enable row level security;
drop policy if exists "ns_observances_public_read" on public.nepal_sambat_observances;
create policy "ns_observances_public_read" on public.nepal_sambat_observances for select to anon, authenticated using (true);


-- ============================================================================
-- 20260919001800_remove_duplicate_history_policy
-- recovered from live Supabase migration history
-- ============================================================================

drop policy if exists "otd_public_read_published" on public.on_this_day_events;


-- ============================================================================
-- 20260919004405_personal_astrology_private_schema
-- recovered from live Supabase migration history
-- ============================================================================

create table if not exists public.astrology_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'My birth chart' check (char_length(label) between 1 and 80),
  birth_date_ad date not null,
  birth_date_bs text,
  time_known boolean not null default false,
  birth_time time,
  location_name text,
  latitude double precision,
  longitude double precision,
  timezone text not null default 'Asia/Kathmandu',
  ayanamsa text not null default 'lahiri',
  calculation_engine text not null default 'astronomy-engine@2.1.19',
  cloud_sync_opt_in boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180),
  check ((time_known = false) or birth_time is not null)
);
create index if not exists astrology_profiles_user_idx on public.astrology_profiles(user_id, updated_at desc);

create table if not exists public.astrology_chart_cache (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.astrology_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  calculation_version text not null,
  chart jsonb not null,
  generated_at timestamptz not null default now(),
  unique(profile_id, calculation_version)
);
create index if not exists astrology_chart_cache_user_idx on public.astrology_chart_cache(user_id);

alter table public.astrology_profiles enable row level security;
alter table public.astrology_chart_cache enable row level security;

drop policy if exists "astro_profiles_own_select" on public.astrology_profiles;
drop policy if exists "astro_profiles_own_insert" on public.astrology_profiles;
drop policy if exists "astro_profiles_own_update" on public.astrology_profiles;
drop policy if exists "astro_profiles_own_delete" on public.astrology_profiles;
create policy "astro_profiles_own_select" on public.astrology_profiles for select to authenticated using (user_id=(select auth.uid()));
create policy "astro_profiles_own_insert" on public.astrology_profiles for insert to authenticated with check (user_id=(select auth.uid()) and cloud_sync_opt_in=true);
create policy "astro_profiles_own_update" on public.astrology_profiles for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "astro_profiles_own_delete" on public.astrology_profiles for delete to authenticated using (user_id=(select auth.uid()));

drop policy if exists "astro_cache_own_select" on public.astrology_chart_cache;
drop policy if exists "astro_cache_own_insert" on public.astrology_chart_cache;
drop policy if exists "astro_cache_own_update" on public.astrology_chart_cache;
drop policy if exists "astro_cache_own_delete" on public.astrology_chart_cache;
create policy "astro_cache_own_select" on public.astrology_chart_cache for select to authenticated using (user_id=(select auth.uid()));
create policy "astro_cache_own_insert" on public.astrology_chart_cache for insert to authenticated with check (
  user_id=(select auth.uid()) and exists (
    select 1 from public.astrology_profiles p where p.id=profile_id and p.user_id=(select auth.uid()) and p.cloud_sync_opt_in=true
  )
);
create policy "astro_cache_own_update" on public.astrology_chart_cache for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "astro_cache_own_delete" on public.astrology_chart_cache for delete to authenticated using (user_id=(select auth.uid()));


-- ============================================================================
-- 20260919030923_protected_calendar_api_rate_limit
-- recovered from live Supabase migration history
-- ============================================================================

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


-- ============================================================================
-- 20260919031737_deny_client_access_rate_buckets
-- recovered from live Supabase migration history
-- ============================================================================

drop policy if exists "rate_buckets_no_client_access" on public.api_rate_buckets;
create policy "rate_buckets_no_client_access"
on public.api_rate_buckets
as restrictive
for all
to anon, authenticated
using (false)
with check (false);


-- ============================================================================
-- 20260919032417_enable_pg_net_for_preview_publish
-- recovered from live Supabase migration history
-- ============================================================================
create extension if not exists pg_net with schema extensions;

-- ============================================================================
-- 20260919032441_on_this_day_enrichment_and_preview_feedback
-- recovered from live Supabase migration history
-- ============================================================================

alter table public.on_this_day_events add column if not exists source_record_id text;
alter table public.on_this_day_events add column if not exists event_type text;
alter table public.on_this_day_events add column if not exists country_code text;
alter table public.on_this_day_events add column if not exists country text;
alter table public.on_this_day_events add column if not exists highlight boolean not null default false;
alter table public.on_this_day_events add column if not exists image_api_url text;
alter table public.on_this_day_events add column if not exists image_page_title text;
create unique index if not exists on_this_day_source_record_uidx on public.on_this_day_events(source_record_id) where source_record_id is not null;
create index if not exists on_this_day_day_rank_idx on public.on_this_day_events(ad_month,ad_day,published,highlight desc,importance desc,ad_year);

create table if not exists public.preview_feedback (
  id bigint generated always as identity primary key,
  area text not null default 'general',
  rating smallint check (rating between 1 and 5),
  message text not null check (char_length(message) between 2 and 3000),
  page_path text,
  user_agent text,
  created_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new','reviewed','planned','resolved','dismissed'))
);
alter table public.preview_feedback enable row level security;
drop policy if exists "preview_feedback_public_insert" on public.preview_feedback;
create policy "preview_feedback_public_insert" on public.preview_feedback
for insert to anon, authenticated with check (true);


-- ============================================================================
-- 20260919033423_enable_http_for_internal_publish
-- recovered from live Supabase migration history
-- ============================================================================
create extension if not exists http with schema extensions;

-- ============================================================================
-- 20260919034348_protect_history_and_feedback_behind_edge_api
-- recovered from live Supabase migration history
-- ============================================================================

drop policy if exists "on_this_day_published_read" on public.on_this_day_events;
drop policy if exists "preview_feedback_public_insert" on public.preview_feedback;

revoke select on table public.on_this_day_events from anon, authenticated;
revoke insert,update,delete on table public.on_this_day_events from anon, authenticated;
revoke select,insert,update,delete on table public.preview_feedback from anon, authenticated;


-- ============================================================================
-- 20260919050854_public_api_rate_limit
-- recovered from live Supabase migration history
-- ============================================================================

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


-- ============================================================================
-- 20260919050957_explicit_private_public_tables
-- recovered from live Supabase migration history
-- ============================================================================

drop policy if exists "api_rate_deny_client" on public.api_rate_limit_buckets;
create policy "api_rate_deny_client" on public.api_rate_limit_buckets
  for all to anon, authenticated using (false) with check (false);

drop policy if exists "on_this_day_deny_direct_client" on public.on_this_day_events;
create policy "on_this_day_deny_direct_client" on public.on_this_day_events
  for all to anon, authenticated using (false) with check (false);

do $$
begin
  if to_regclass('public.preview_feedback') is not null then
    execute 'drop policy if exists "preview_feedback_deny_client" on public.preview_feedback';
    execute 'create policy "preview_feedback_deny_client" on public.preview_feedback for all to anon, authenticated using (false) with check (false)';
  end if;
end $$;


-- ============================================================================
-- 20260926024739_app_flags_foundation
-- recovered from live Supabase migration history
-- ============================================================================

create table if not exists public.app_flags (
  key text primary key,
  enabled boolean not null default false,
  note text,
  updated_at timestamptz not null default now()
);

alter table public.app_flags enable row level security;

drop policy if exists "flags are public-readable" on public.app_flags;
create policy "flags are public-readable"
on public.app_flags
for select
to anon, authenticated
using (true);

grant select on public.app_flags to anon, authenticated;

insert into public.app_flags (key, enabled, note) values
  ('home_polish', false, 'Home skeletons, grid polish, countdown chip, pinned clocks'),
  ('tm_ruler', false, 'Time Machine scrub ruler and era bands'),
  ('tm_detail', false, 'Time Machine moment detail sheet and deep links'),
  ('tm_birth_mode', false, 'Time Machine birth-year mode'),
  ('tm_world', false, 'Time Machine Nepal vs world strip'),
  ('tm_map', false, 'Time Machine map layer'),
  ('tm_quiz', false, 'Time Machine quiz and collections'),
  ('fm_directory_v2', false, 'All-Nepal FM directory and new FM page UI'),
  ('news_pipeline', false, 'Normalized news items and clusters'),
  ('news_desk', false, 'New Samachar layout'),
  ('jy_north_chart', false, 'North Indian kundali chart'),
  ('jy_dasha', false, 'Vimshottari dasha timeline'),
  ('jy_guna', false, 'Guna milan'),
  ('jy_profiles', false, 'Saved kundali profiles'),
  ('life_v2', false, 'Daily Life chips, quick-add, actions'),
  ('life_ics', false, 'Calendar export'),
  ('pwa', false, 'Service worker and install prompt')
on conflict (key) do nothing;


-- ============================================================================
-- 20260926030018_fm_directory_schema_and_legacy_seed
-- recovered from live Supabase migration history
-- ============================================================================

create schema if not exists private;

create table if not exists public.np_districts (
 id text primary key,
 name_ne text not null,
 name_en text not null,
 province smallint not null check (province between 1 and 7),
 hq_name_ne text,
 hq_lat double precision,
 hq_lng double precision,
 source text not null
);
alter table public.np_districts enable row level security;
drop policy if exists "districts public read" on public.np_districts;
create policy "districts public read" on public.np_districts for select to anon, authenticated using (true);
grant select on public.np_districts to anon, authenticated;

create table if not exists public.fm_stations (
 id uuid primary key default gen_random_uuid(),
 slug text unique not null,
 name_ne text not null,
 name_en text,
 frequency_mhz numeric(4,1) check (frequency_mhz between 87.5 and 108.0),
 district_id text references public.np_districts(id),
 city text,
 languages text[] not null default '{}',
 website text,
 facebook text,
 logo_url text,
 stream_url text,
 stream_format text check (stream_format in ('mp3','aac','hls','ogg')),
 stream_status text not null default 'no_stream' check (stream_status in ('verified','offline','no_stream')),
 stream_evidence_url text,
 listing_source text not null,
 fail_count int not null default 0,
 last_checked_at timestamptz,
 last_ok_at timestamptz,
 updated_at timestamptz not null default now(),
 constraint verified_needs_stream check (stream_status <> 'verified' or stream_url is not null)
);
alter table public.fm_stations enable row level security;
drop policy if exists "stations public read" on public.fm_stations;
create policy "stations public read" on public.fm_stations for select to anon, authenticated using (true);
grant select on public.fm_stations to anon, authenticated;
create index if not exists fm_stations_district_idx on public.fm_stations(district_id);

create table if not exists public.fm_stream_candidates (
 id uuid primary key default gen_random_uuid(),
 station_id uuid references public.fm_stations(id),
 candidate_url text not null,
 found_via text not null,
 evidence_url text,
 status text not null default 'pending' check (status in ('pending','verified','rejected')),
 checked_at timestamptz,
 note text
);
alter table public.fm_stream_candidates enable row level security;
revoke all on public.fm_stream_candidates from anon, authenticated;

create table if not exists public.fm_reports (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 station_id uuid references public.fm_stations(id),
 kind text not null check (kind in ('new_station','wrong_info','stream_broken')),
 payload jsonb not null default '{}'::jsonb,
 status text not null default 'pending' check (status in ('pending','done','rejected')),
 created_at timestamptz not null default now()
);
alter table public.fm_reports enable row level security;
drop policy if exists "signed-in users can report" on public.fm_reports;
create policy "signed-in users can report" on public.fm_reports for insert to authenticated with check (auth.uid()=user_id and status='pending');
grant insert on public.fm_reports to authenticated;

create or replace function private.fm_reports_rate_limit() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if (select count(*) from public.fm_reports where user_id=new.user_id and created_at>now()-interval '1 day') >= 5 then
   raise exception 'daily_report_limit';
 end if;
 return new;
end $$;
revoke all on function private.fm_reports_rate_limit() from public;
drop trigger if exists fm_reports_rate_limit on public.fm_reports;
create trigger fm_reports_rate_limit before insert on public.fm_reports for each row execute function private.fm_reports_rate_limit();

insert into public.np_districts(id,name_ne,name_en,province,source) values('bhojpur','भोजपुर','Bhojpur',1,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('dhankuta','धनकुटा','Dhankuta',1,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('ilam','इलाम','Ilam',1,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('jhapa','झापा','Jhapa',1,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('khotang','खोटाङ','Khotang',1,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('morang','मोरङ','Morang',1,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('okhaldhunga','ओखलढुङ्गा','Okhaldhunga',1,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('panchthar','पाँचथर','Panchthar',1,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('sankhuwasabha','संखुवासभा','Sankhuwasabha',1,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('solukhumbu','सोलुखुम्बु','Solukhumbu',1,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('sunsari','सुनसरी','Sunsari',1,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('taplejung','ताप्लेजुङ','Taplejung',1,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('terhathum','तेह्रथुम','Terhathum',1,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('udayapur','उदयपुर','Udayapur',1,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('bara','बारा','Bara',2,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('dhanusha','धनुषा','Dhanusha',2,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('mahottari','महोत्तरी','Mahottari',2,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('parsa','पर्सा','Parsa',2,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('rautahat','रौतहट','Rautahat',2,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('saptari','सप्तरी','Saptari',2,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('sarlahi','सर्लाही','Sarlahi',2,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('siraha','सिराहा','Siraha',2,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('bhaktapur','भक्तपुर','Bhaktapur',3,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('chitwan','चितवन','Chitwan',3,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('dhading','धादिङ','Dhading',3,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('dolakha','दोलखा','Dolakha',3,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('kathmandu','काठमाडौँ','Kathmandu',3,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('kavrepalanchok','काभ्रेपलाञ्चोक','Kavrepalanchok',3,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('lalitpur','ललितपुर','Lalitpur',3,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('makwanpur','मकवानपुर','Makwanpur',3,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('nuwakot','नुवाकोट','Nuwakot',3,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('ramechhap','रामेछाप','Ramechhap',3,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('rasuwa','रसुवा','Rasuwa',3,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('sindhuli','सिन्धुली','Sindhuli',3,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('sindhupalchok','सिन्धुपाल्चोक','Sindhupalchok',3,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('baglung','बागलुङ','Baglung',4,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('gorkha','गोरखा','Gorkha',4,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('kaski','कास्की','Kaski',4,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('lamjung','लमजुङ','Lamjung',4,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('manang','मनाङ','Manang',4,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('mustang','मुस्ताङ','Mustang',4,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('myagdi','म्याग्दी','Myagdi',4,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('nawalpur','नवलपुर','Nawalpur',4,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('parbat','पर्वत','Parbat',4,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('syangja','स्याङ्जा','Syangja',4,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('tanahun','तनहुँ','Tanahun',4,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('arghakhanchi','अर्घाखाँची','Arghakhanchi',5,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('banke','बाँके','Banke',5,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('bardiya','बर्दिया','Bardiya',5,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('dang','दाङ','Dang',5,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('eastern-rukum','पूर्वी रुकुम','Eastern Rukum',5,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('gulmi','गुल्मी','Gulmi',5,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('kapilvastu','कपिलवस्तु','Kapilvastu',5,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('parasi','परासी','Parasi',5,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('palpa','पाल्पा','Palpa',5,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('pyuthan','प्युठान','Pyuthan',5,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('rolpa','रोल्पा','Rolpa',5,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('rupandehi','रूपन्देही','Rupandehi',5,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('dailekh','दैलेख','Dailekh',6,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('dolpa','डोल्पा','Dolpa',6,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('humla','हुम्ला','Humla',6,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('jajarkot','जाजरकोट','Jajarkot',6,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('jumla','जुम्ला','Jumla',6,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('kalikot','कालिकोट','Kalikot',6,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('mugu','मुगु','Mugu',6,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('salyan','सल्यान','Salyan',6,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('surkhet','सुर्खेत','Surkhet',6,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('western-rukum','पश्चिमी रुकुम','Western Rukum',6,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('achham','अछाम','Achham',7,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('baitadi','बैतडी','Baitadi',7,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('bajhang','बझाङ','Bajhang',7,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('bajura','बाजुरा','Bajura',7,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('dadeldhura','डडेल्धुरा','Dadeldhura',7,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('darchula','दार्चुला','Darchula',7,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('doti','डोटी','Doti',7,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('kailali','कैलाली','Kailali',7,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.np_districts(id,name_ne,name_en,province,source) values('kanchanpur','कञ्चनपुर','Kanchanpur',7,'https://www.mofaga.gov.np/local-contact/dcc-prov-1?province_id=0') on conflict(id) do nothing;
insert into public.fm_stations(slug,name_ne,name_en,frequency_mhz,district_id,city,languages,website,stream_url,stream_format,stream_status,stream_evidence_url,listing_source,last_checked_at,last_ok_at)
 values('radio-nepal-national','रेडियो नेपाल','Radio Nepal',null,'kathmandu','Kathmandu',array['नेपाली']::text[],'https://radionepal.gov.np/','https://stream1.radionepal.gov.np/live/','mp3','verified','https://radionepal.gov.np/en/station-details/','https://radionepal.gov.np/en/station-details/',now(),now())
 on conflict(slug) do nothing;
insert into public.fm_stations(slug,name_ne,name_en,frequency_mhz,district_id,city,languages,website,stream_url,stream_format,stream_status,stream_evidence_url,listing_source,last_checked_at,last_ok_at)
 values('radio-nepal-madhesh-bardibas','रेडियो नेपाल — मधेश','Radio Nepal — Madhesh',103,'mahottari','Bardibas',array['नेपाली']::text[],'https://radionepal.gov.np/','https://stream1.radionepal.gov.np/live/','mp3','verified','https://radionepal.gov.np/en/station-details/','https://radionepal.gov.np/en/station-details/',now(),now())
 on conflict(slug) do nothing;
insert into public.fm_stations(slug,name_ne,name_en,frequency_mhz,district_id,city,languages,website,stream_url,stream_format,stream_status,stream_evidence_url,listing_source,last_checked_at,last_ok_at)
 values('radio-kantipur-96-1','रेडियो कान्तिपुर','Radio Kantipur',96.1,'kathmandu','Kathmandu',array['नेपाली']::text[],'https://radiokantipur.com/','https://radio-broadcast.ekantipur.com/stream','mp3','verified','https://radiokantipur.com/','https://radiokantipur.com/',now(),now())
 on conflict(slug) do nothing;
insert into public.fm_stations(slug,name_ne,name_en,frequency_mhz,district_id,city,languages,website,stream_url,stream_format,stream_status,stream_evidence_url,listing_source,last_checked_at,last_ok_at)
 values('ujyaalo-90-network','उज्यालो ९० नेटवर्क','Ujyaalo 90 Network',90,'lalitpur','Lalitpur / Jawalakhel',array['नेपाली']::text[],'https://ujyaaloonline.com/',null,'mp3','no_stream',null,'https://tingfm.com/radio/64130',null,null)
 on conflict(slug) do nothing;
insert into public.fm_stations(slug,name_ne,name_en,frequency_mhz,district_id,city,languages,website,stream_url,stream_format,stream_status,stream_evidence_url,listing_source,last_checked_at,last_ok_at)
 values('kalika-fm-95-2','कालिका एफएम ९५.२','Kalika FM 95.2',95.2,'chitwan','Bharatpur',array['नेपाली']::text[],null,null,'mp3','no_stream',null,'https://www.freqtrail.com/stations/NP',null,null)
 on conflict(slug) do nothing;
insert into public.fm_stations(slug,name_ne,name_en,frequency_mhz,district_id,city,languages,website,stream_url,stream_format,stream_status,stream_evidence_url,listing_source,last_checked_at,last_ok_at)
 values('radio-audio-106-3','रेडियो अडियो','Radio Audio',106.3,'kathmandu','New Baneshwor',array['नेपाली']::text[],null,null,'mp3','no_stream',null,'https://www.freqtrail.com/stations/NP',null,null)
 on conflict(slug) do nothing;
insert into public.fm_stations(slug,name_ne,name_en,frequency_mhz,district_id,city,languages,website,stream_url,stream_format,stream_status,stream_evidence_url,listing_source,last_checked_at,last_ok_at)
 values('hits-fm-91-2','हिट्स एफएम ९१.२','Hits FM 91.2',91.2,'kathmandu','New Baneshwor',array['नेपाली','English']::text[],'https://hitsfm.com.np/',null,'mp3','no_stream',null,'https://www.freqtrail.com/stations/NP',null,null)
 on conflict(slug) do nothing;
insert into public.fm_stations(slug,name_ne,name_en,frequency_mhz,district_id,city,languages,website,stream_url,stream_format,stream_status,stream_evidence_url,listing_source,last_checked_at,last_ok_at)
 values('capital-fm-92-4','क्यापिटल एफएम ९२.४','Capital FM 92.4',92.4,'kathmandu','Thapagaun',array['नेपाली']::text[],null,null,'mp3','no_stream',null,'https://www.freqtrail.com/stations/NP',null,null)
 on conflict(slug) do nothing;
insert into public.fm_stations(slug,name_ne,name_en,frequency_mhz,district_id,city,languages,website,stream_url,stream_format,stream_status,stream_evidence_url,listing_source,last_checked_at,last_ok_at)
 values('radio-thaha-sanchar-99-6','रेडियो थाहा सञ्चार ९९.६','Radio Thaha Sanchar 99.6',99.6,'makwanpur','Hetauda',array['नेपाली']::text[],null,null,'mp3','no_stream',null,'https://www.freqtrail.com/stations/NP',null,null)
 on conflict(slug) do nothing;
insert into public.fm_stations(slug,name_ne,name_en,frequency_mhz,district_id,city,languages,website,stream_url,stream_format,stream_status,stream_evidence_url,listing_source,last_checked_at,last_ok_at)
 values('butwal-fm-94-4','बुटवल एफएम ९४.४','Butwal FM 94.4',94.4,'rupandehi','Butwal',array['नेपाली']::text[],null,null,'mp3','no_stream',null,'https://www.freqtrail.com/stations/NP',null,null)
 on conflict(slug) do nothing;
insert into public.fm_stations(slug,name_ne,name_en,frequency_mhz,district_id,city,languages,website,stream_url,stream_format,stream_status,stream_evidence_url,listing_source,last_checked_at,last_ok_at)
 values('radio-resunga-106-2','रेडियो रेसुङ्गा १०६.२','Radio Resunga 106.2',106.2,'gulmi','Tamghas',array['नेपाली']::text[],'https://radioresunga.com.np/',null,'mp3','no_stream',null,'https://tingfm.com/radio/69413',null,null)
 on conflict(slug) do nothing;
insert into public.fm_stations(slug,name_ne,name_en,frequency_mhz,district_id,city,languages,website,stream_url,stream_format,stream_status,stream_evidence_url,listing_source,last_checked_at,last_ok_at)
 values('radio-madhyapaschim-91-4','रेडियो मध्यपश्चिम ९१.४','Radio Madhyapaschim 91.4',91.4,'dang','Ghorahi',array['नेपाली']::text[],'https://www.radiomp.org/',null,'mp3','no_stream',null,'https://yp.casterclub.com/station-detail.php?id=3103',null,null)
 on conflict(slug) do nothing;
insert into public.fm_stations(slug,name_ne,name_en,frequency_mhz,district_id,city,languages,website,stream_url,stream_format,stream_status,stream_evidence_url,listing_source,last_checked_at,last_ok_at)
 values('itahari-fm-92-5','इटहरी एफएम ९२.५','Itahari FM 92.5',92.5,'sunsari','Itahari',array['नेपाली']::text[],'https://itaharifm.com.np/',null,'mp3','no_stream',null,'https://www.rcast.net/dir/nepali/page1',null,null)
 on conflict(slug) do nothing;
insert into public.fm_stations(slug,name_ne,name_en,frequency_mhz,district_id,city,languages,website,stream_url,stream_format,stream_status,stream_evidence_url,listing_source,last_checked_at,last_ok_at)
 values('radio-annapurna-93-4','रेडियो अन्नपूर्ण ९३.४','Radio Annapurna 93.4',93.4,'kaski','Pokhara',array['नेपाली']::text[],'http://radioannapurna.com.np/',null,'mp3','no_stream',null,'https://yp.casterclub.com/station-detail.php?id=3101',null,null)
 on conflict(slug) do nothing;
insert into public.fm_stations(slug,name_ne,name_en,frequency_mhz,district_id,city,languages,website,stream_url,stream_format,stream_status,stream_evidence_url,listing_source,last_checked_at,last_ok_at)
 values('radio-syangja-89-6','रेडियो स्याङ्जा ८९.६','Radio Syangja 89.6',89.6,'syangja','Putalibazar',array['नेपाली']::text[],'https://www.radiosyangja.org/',null,'mp3','no_stream',null,'https://yp.casterclub.com/directory.php',null,null)
 on conflict(slug) do nothing;
insert into public.fm_stations(slug,name_ne,name_en,frequency_mhz,district_id,city,languages,website,stream_url,stream_format,stream_status,stream_evidence_url,listing_source,last_checked_at,last_ok_at)
 values('radio-bheri-98-6','रेडियो भेरी ९८.६','Radio Bheri 98.6',98.6,'surkhet','Birendranagar',array['नेपाली']::text[],'https://radiobheri.com.np/',null,'mp3','no_stream',null,'https://yp.casterclub.com/directory.php',null,null)
 on conflict(slug) do nothing;
insert into public.fm_stations(slug,name_ne,name_en,frequency_mhz,district_id,city,languages,website,stream_url,stream_format,stream_status,stream_evidence_url,listing_source,last_checked_at,last_ok_at)
 values('tikapur-fm-101','टीकापुर एफएम १०१','Tikapur FM 101',101,'kailali','Tikapur',array['नेपाली']::text[],null,null,'mp3','no_stream',null,'https://yp.casterclub.com/station-detail.php?id=3126',null,null)
 on conflict(slug) do nothing;
insert into public.fm_stations(slug,name_ne,name_en,frequency_mhz,district_id,city,languages,website,stream_url,stream_format,stream_status,stream_evidence_url,listing_source,last_checked_at,last_ok_at)
 values('jayaprithvi-fm-96-3','जयपृथ्वी एफएम ९६.३','Jayaprithvi FM 96.3',96.3,'bajhang','Chainpur',array['नेपाली']::text[],null,null,'mp3','no_stream',null,'https://www.freqtrail.com/stations/NP',null,null)
 on conflict(slug) do nothing;


-- ============================================================================
-- 20260926033450_fm_directory_v2_hardening
-- recovered from live Supabase migration history
-- ============================================================================

alter table public.fm_stations
  add column if not exists category text;

create index if not exists fm_stations_stream_status_idx
  on public.fm_stations (stream_status);
create index if not exists fm_stations_name_ne_idx
  on public.fm_stations (name_ne);
create index if not exists fm_stations_name_en_idx
  on public.fm_stations (name_en);

create or replace function public.fm_reports_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*)
    from public.fm_reports
    where user_id = new.user_id
      and created_at > now() - interval '1 day'
  ) >= 5 then
    raise exception 'दैनिक रिपोर्ट सीमा पुग्यो';
  end if;
  return new;
end
$$;

revoke all on function public.fm_reports_rate_limit() from public, anon, authenticated;

drop trigger if exists fm_reports_rate_limit on public.fm_reports;
create trigger fm_reports_rate_limit
before insert on public.fm_reports
for each row execute function public.fm_reports_rate_limit();

update public.fm_stations set category = case slug
  when 'radio-nepal-national' then 'समाचार'
  when 'radio-nepal-madhesh-bardibas' then 'समाचार'
  when 'radio-kantipur-96-1' then 'समाचार तथा मनोरञ्जन'
  when 'ujyaalo-90-network' then 'समाचार'
  when 'kalika-fm-95-2' then 'समाचार तथा मनोरञ्जन'
  when 'radio-audio-106-3' then 'मनोरञ्जन'
  when 'hits-fm-91-2' then 'संगीत'
  when 'capital-fm-92-4' then 'समाचार तथा मनोरञ्जन'
  when 'radio-thaha-sanchar-99-6' then 'समाचार'
  when 'butwal-fm-94-4' then 'समाचार तथा मनोरञ्जन'
  when 'radio-resunga-106-2' then 'Community'
  when 'radio-madhyapaschim-91-4' then 'Community'
  when 'itahari-fm-92-5' then 'समाचार तथा मनोरञ्जन'
  when 'radio-annapurna-93-4' then 'समाचार तथा मनोरञ्जन'
  when 'radio-syangja-89-6' then 'Community'
  when 'radio-bheri-98-6' then 'समाचार तथा Community'
  when 'tikapur-fm-101' then 'Community'
  when 'jayaprithvi-fm-96-3' then 'समाचार तथा Community'
  else category
end
where category is null;


-- ============================================================================
-- 20260926033920_samachar_pipeline_schema
-- recovered from live Supabase migration history
-- ============================================================================

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


-- ============================================================================
-- 20260927134259_bundle_truth_layer_hardened
-- recovered from live Supabase migration history
-- ============================================================================

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

create table if not exists public.audit_log (
  id bigserial primary key,
  actor uuid,
  action text not null check (length(action) <= 64),
  entity text not null check (length(entity) <= 64),
  entity_id text,
  diff jsonb,
  at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
create policy audit_admin_read on public.audit_log for select to authenticated using ((select public.is_admin()));
create policy audit_admin_insert on public.audit_log for insert to authenticated with check ((select public.is_admin()) and actor = (select auth.uid()));
revoke update, delete on public.audit_log from anon, authenticated;

create table if not exists public.official_panchang_facts (
  id uuid primary key default gen_random_uuid(),
  fact_date date not null,
  kind text not null check (kind in ('udaya_tithi', 'festival', 'sait')),
  key text not null check (length(key) <= 80),
  value jsonb not null,
  location_key text not null default 'kathmandu',
  source_url text not null check (source_url ~ '^https://'),
  source_title text not null,
  published_at date,
  entered_by uuid,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (fact_date, kind, key, location_key)
);
create index if not exists official_facts_kind_key on public.official_panchang_facts (kind, key, fact_date);
alter table public.official_panchang_facts enable row level security;
create policy facts_public_read on public.official_panchang_facts for select to anon, authenticated using (true);
create policy facts_admin_write on public.official_panchang_facts for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
grant select on public.official_panchang_facts to anon, authenticated;
grant insert, update, delete on public.official_panchang_facts to authenticated;
grant select, insert on public.audit_log to authenticated;
grant usage on sequence public.audit_log_id_seq to authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ============================================================================
-- 20260927134354_bundle_holidays_hardened
-- recovered from live Supabase migration history
-- ============================================================================

create table if not exists public.holidays (
  id text primary key,
  ad_date date not null,
  bs_date text not null check (bs_date ~ '^\d{4}-\d{2}-\d{2}$'),
  name_ne text not null,
  name_en text not null,
  scope_type text not null check (scope_type in ('national', 'province', 'district', 'valley', 'custom')),
  scope_codes text[] not null default '{}',
  audiences text[] not null check (cardinality(audiences) > 0),
  effect text not null check (effect in ('closed', 'partial', 'open_exception')),
  status text not null check (status in ('announced', 'tentative', 'cancelled')),
  scope_verified boolean not null default true,
  source_url text not null check (source_url ~ '^https://'),
  source_title text not null,
  notice_date date,
  verified_by text,
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists holidays_ad_date on public.holidays (ad_date);
create table if not exists public.weekly_off_rules (
  id text primary key,
  audience text not null,
  weekdays int[] not null check (weekdays <@ array[0,1,2,3,4,5,6]),
  effective_from date not null,
  effective_to date,
  source_url text not null check (source_url ~ '^https://'),
  source_title text
);
create table if not exists public.holiday_coverage (
  bs_year int not null,
  audience text not null,
  source_url text not null check (source_url ~ '^https://'),
  source_title text not null,
  primary key (bs_year, audience)
);
alter table public.holidays enable row level security;
alter table public.weekly_off_rules enable row level security;
alter table public.holiday_coverage enable row level security;
create policy holidays_read on public.holidays for select to anon, authenticated using (true);
create policy holidays_admin on public.holidays for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy weekly_read on public.weekly_off_rules for select to anon, authenticated using (true);
create policy weekly_admin on public.weekly_off_rules for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy coverage_read on public.holiday_coverage for select to anon, authenticated using (true);
create policy coverage_admin on public.holiday_coverage for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
grant select on public.holidays, public.weekly_off_rules, public.holiday_coverage to anon, authenticated;
grant insert, update, delete on public.holidays, public.weekly_off_rules, public.holiday_coverage to authenticated;

-- ============================================================================
-- 20260927134358_bundle_push_hardened
-- recovered from live Supabase migration history
-- ============================================================================

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

-- ============================================================================
-- 20260927134458_bundle_family_hardened
-- recovered from live Supabase migration history
-- ============================================================================

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 80),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.family_members (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  display_name text check (length(display_name) <= 60),
  timezone text not null default 'Asia/Kathmandu' check (length(timezone) <= 64),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);
create index if not exists family_members_user on public.family_members (user_id);
create table if not exists public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  token_hash text not null unique check (length(token_hash) = 64),
  role text not null default 'viewer' check (role in ('editor', 'viewer')),
  expires_at timestamptz not null,
  max_uses int not null default 5 check (max_uses between 1 and 50),
  uses int not null default 0 check (uses >= 0),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (expires_at <= created_at + interval '30 days')
);
create table if not exists public.shared_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  kind text not null check (kind in ('shraddha', 'tithi_birthday', 'ad_birthday', 'bs_birthday', 'anniversary', 'custom')),
  anchor jsonb not null,
  rule text not null check (rule in ('udaya', 'aparahna', 'madhyahna', 'sayahna', 'pradosha', 'nishitha', 'arunodaya', 'official_only')),
  adhik_policy text not null default 'nija_month' check (adhik_policy in ('nija_month', 'adhik_month', 'both_flagged')),
  location_policy text not null default 'kathmandu_panchang' check (location_policy in ('kathmandu_panchang', 'local_computation')),
  title_ne text check (length(title_ne) <= 120),
  title_en text check (length(title_en) <= 120),
  notes text check (length(notes) <= 2000),
  reminder_offsets int[] not null default '{7,1}' check (reminder_offsets <@ array[0,1,2,3,7,14,15,30]),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shared_events_family on public.shared_events (family_id);
create or replace function public.family_role(fid uuid) returns text
language sql stable security definer set search_path = public, auth as $$
  select role from public.family_members where family_id = fid and user_id = auth.uid()
$$;
create or replace function public.is_family_member(fid uuid) returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from public.family_members where family_id = fid and user_id = auth.uid())
$$;
create or replace function public.create_family(p_name text, p_display_name text default null, p_timezone text default 'Asia/Kathmandu')
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  insert into public.families (name, created_by) values (p_name, auth.uid()) returning id into fid;
  insert into public.family_members (family_id, user_id, role, display_name, timezone) values (fid, auth.uid(), 'owner', p_display_name, p_timezone);
  return fid;
end $$;
create or replace function public.accept_family_invite(p_token_hash text, p_display_name text default null, p_timezone text default 'Asia/Kathmandu')
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare inv public.family_invites;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select * into inv from public.family_invites where token_hash = p_token_hash for update;
  if not found or inv.expires_at < now() or inv.uses >= inv.max_uses then
    raise exception 'invite invalid or expired' using errcode = 'P0002';
  end if;
  insert into public.family_members (family_id, user_id, role, display_name, timezone)
    values (inv.family_id, auth.uid(), inv.role, p_display_name, p_timezone)
    on conflict (family_id, user_id) do nothing;
  update public.family_invites set uses = uses + 1 where id = inv.id;
  return inv.family_id;
end $$;
create or replace function public.update_shared_event(p_id uuid, p_expected_updated_at timestamptz, p_patch jsonb)
returns public.shared_events language plpgsql security invoker set search_path = public, auth as $$
declare r public.shared_events;
begin
  update public.shared_events set
    title_ne = coalesce(p_patch ->> 'title_ne', title_ne),
    title_en = coalesce(p_patch ->> 'title_en', title_en),
    notes = coalesce(p_patch ->> 'notes', notes),
    anchor = coalesce(p_patch -> 'anchor', anchor),
    rule = coalesce(p_patch ->> 'rule', rule),
    adhik_policy = coalesce(p_patch ->> 'adhik_policy', adhik_policy),
    location_policy = coalesce(p_patch ->> 'location_policy', location_policy),
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_id and updated_at = p_expected_updated_at
  returning * into r;
  if not found then
    if exists (select 1 from public.shared_events where id = p_id) then
      raise exception 'conflict' using errcode = '40001';
    end if;
    raise exception 'not found' using errcode = 'P0002';
  end if;
  return r;
end $$;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invites enable row level security;
alter table public.shared_events enable row level security;
create policy families_member_read on public.families for select to authenticated using ((select public.is_family_member(id)));
create policy families_owner_update on public.families for update to authenticated using ((select public.family_role(id)) = 'owner') with check ((select public.family_role(id)) = 'owner');
create policy families_owner_delete on public.families for delete to authenticated using ((select public.family_role(id)) = 'owner');
create policy members_read on public.family_members for select to authenticated using ((select public.is_family_member(family_id)));
create policy members_owner_manage on public.family_members for update to authenticated using ((select public.family_role(family_id)) = 'owner') with check ((select public.family_role(family_id)) = 'owner');
create policy members_self_update on public.family_members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and role = (select public.family_role(family_id)));
create policy members_owner_remove on public.family_members for delete to authenticated using ((select public.family_role(family_id)) = 'owner' and user_id <> (select auth.uid()));
create policy members_self_leave on public.family_members for delete to authenticated using (user_id = (select auth.uid()) and role <> 'owner');
create policy invites_owner on public.family_invites for all to authenticated
  using ((select public.family_role(family_id)) = 'owner') with check ((select public.family_role(family_id)) = 'owner' and created_by = (select auth.uid()));
create policy events_member_read on public.shared_events for select to authenticated using ((select public.is_family_member(family_id)));
create policy events_editor_insert on public.shared_events for insert to authenticated
  with check ((select public.family_role(family_id)) in ('owner', 'editor') and created_by = (select auth.uid()));
create policy events_editor_update on public.shared_events for update to authenticated
  using ((select public.family_role(family_id)) in ('owner', 'editor')) with check ((select public.family_role(family_id)) in ('owner', 'editor'));
create policy events_editor_delete on public.shared_events for delete to authenticated using ((select public.family_role(family_id)) in ('owner', 'editor'));
grant select, update, delete on public.families to authenticated;
grant select, update, delete on public.family_members to authenticated;
grant select, insert, update, delete on public.family_invites to authenticated;
grant select, insert, update, delete on public.shared_events to authenticated;
grant execute on function public.create_family(text, text, text) to authenticated;
grant execute on function public.accept_family_invite(text, text, text) to authenticated;
grant execute on function public.update_shared_event(uuid, timestamptz, jsonb) to authenticated;
revoke execute on function public.family_role(uuid) from public, anon;
revoke execute on function public.is_family_member(uuid) from public, anon;
revoke execute on function public.create_family(text, text, text) from public, anon;
revoke execute on function public.accept_family_invite(text, text, text) from public, anon;
revoke execute on function public.update_shared_event(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.family_role(uuid) to authenticated;
grant execute on function public.is_family_member(uuid) to authenticated;

-- ============================================================================
-- 20260927134547_bundle_market_ics_mydata_hardened
-- recovered from live Supabase migration history
-- ============================================================================

create table if not exists public.market_snapshots (
  provider text not null,
  asset text not null,
  as_of date not null,
  kind text not null,
  value numeric not null,
  buy numeric,
  sell numeric,
  unit text not null,
  per numeric not null default 1 check (per > 0),
  fetched_at timestamptz not null,
  source_url text not null check (source_url ~ '^https://'),
  primary key (provider, asset, as_of)
);
alter table public.market_snapshots enable row level security;
create policy market_public_read on public.market_snapshots for select to anon, authenticated using (true);
grant select on public.market_snapshots to anon, authenticated;

create table if not exists public.personal_ics_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token_hash text not null unique check (length(token_hash) = 64),
  created_at timestamptz not null default now()
);
alter table public.personal_ics_tokens enable row level security;
create policy ics_own_read on public.personal_ics_tokens for select to authenticated using (user_id = (select auth.uid()));
create policy ics_own_delete on public.personal_ics_tokens for delete to authenticated using (user_id = (select auth.uid()));
create policy ics_own_insert on public.personal_ics_tokens for insert to authenticated with check (user_id = (select auth.uid()));
grant select, insert, delete on public.personal_ics_tokens to authenticated;

create or replace function public.my_data_export() returns jsonb
language sql stable security invoker set search_path = public, auth as $$
  select jsonb_build_object(
    'user_id', auth.uid(),
    'families', coalesce((select jsonb_agg(f) from public.families f where public.is_family_member(f.id)), '[]'::jsonb),
    'memberships', coalesce((select jsonb_agg(m) from public.family_members m where m.user_id = auth.uid()), '[]'::jsonb),
    'shared_events_created', coalesce((select jsonb_agg(e) from public.shared_events e where e.created_by = auth.uid()), '[]'::jsonb),
    'push_subscriptions', coalesce((select jsonb_agg(jsonb_build_object('device_id', s.device_id, 'user_agent_family', s.user_agent_family, 'timezone', s.timezone, 'quiet_hours', s.quiet_hours, 'created_at', s.created_at, 'last_success_at', s.last_success_at)) from public.push_subscriptions s where s.user_id = auth.uid()), '[]'::jsonb),
    'notification_jobs', coalesce((select jsonb_agg(jsonb_build_object('fire_at_utc', j.fire_at_utc, 'category', j.category, 'status', j.status)) from public.notification_jobs j join public.push_subscriptions s using (device_id) where s.user_id = auth.uid()), '[]'::jsonb),
    'personal_ics', coalesce((select jsonb_agg(jsonb_build_object('created_at', t.created_at)) from public.personal_ics_tokens t where t.user_id = auth.uid()), '[]'::jsonb)
  )
$$;

create or replace function public.my_data_delete() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  delete from public.families f where exists (select 1 from public.family_members m where m.family_id = f.id and m.user_id = auth.uid() and m.role = 'owner');
  delete from public.family_members where user_id = auth.uid();
  delete from public.push_subscriptions where user_id = auth.uid();
  delete from public.personal_ics_tokens where user_id = auth.uid();
  update public.shared_events set created_by = null where created_by = auth.uid();
  update public.shared_events set updated_by = null where updated_by = auth.uid();
end $$;
grant execute on function public.my_data_export() to authenticated;
grant execute on function public.my_data_delete() to authenticated;
revoke execute on function public.my_data_export() from public, anon;
revoke execute on function public.my_data_delete() from public, anon;
grant execute on function public.my_data_export() to authenticated;
grant execute on function public.my_data_delete() to authenticated;

-- ============================================================================
-- 20260927134748_bundle_foundation_security_hardening
-- recovered from live Supabase migration history
-- ============================================================================

create or replace function private.nm_is_admin() returns boolean
language sql stable security definer set search_path = private, public, auth as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;
create or replace function private.nm_family_role(fid uuid) returns text
language sql stable security definer set search_path = private, public, auth as $$
  select role from public.family_members where family_id = fid and user_id = auth.uid()
$$;
create or replace function private.nm_is_family_member(fid uuid) returns boolean
language sql stable security definer set search_path = private, public, auth as $$
  select exists (select 1 from public.family_members where family_id = fid and user_id = auth.uid())
$$;
revoke all on function private.nm_is_admin() from public, anon;
revoke all on function private.nm_family_role(uuid) from public, anon;
revoke all on function private.nm_is_family_member(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.nm_is_admin() to authenticated;
grant execute on function private.nm_family_role(uuid) to authenticated;
grant execute on function private.nm_is_family_member(uuid) to authenticated;

drop policy if exists audit_admin_read on public.audit_log;
drop policy if exists audit_admin_insert on public.audit_log;
create policy audit_admin_read on public.audit_log for select to authenticated using ((select private.nm_is_admin()));
create policy audit_admin_insert on public.audit_log for insert to authenticated with check ((select private.nm_is_admin()) and actor = (select auth.uid()));

drop policy if exists facts_admin_write on public.official_panchang_facts;
create policy facts_admin_insert on public.official_panchang_facts for insert to authenticated with check ((select private.nm_is_admin()));
create policy facts_admin_update on public.official_panchang_facts for update to authenticated using ((select private.nm_is_admin())) with check ((select private.nm_is_admin()));
create policy facts_admin_delete on public.official_panchang_facts for delete to authenticated using ((select private.nm_is_admin()));

drop policy if exists holidays_admin on public.holidays;
create policy holidays_admin_insert on public.holidays for insert to authenticated with check ((select private.nm_is_admin()));
create policy holidays_admin_update on public.holidays for update to authenticated using ((select private.nm_is_admin())) with check ((select private.nm_is_admin()));
create policy holidays_admin_delete on public.holidays for delete to authenticated using ((select private.nm_is_admin()));

drop policy if exists weekly_admin on public.weekly_off_rules;
create policy weekly_admin_insert on public.weekly_off_rules for insert to authenticated with check ((select private.nm_is_admin()));
create policy weekly_admin_update on public.weekly_off_rules for update to authenticated using ((select private.nm_is_admin())) with check ((select private.nm_is_admin()));
create policy weekly_admin_delete on public.weekly_off_rules for delete to authenticated using ((select private.nm_is_admin()));

drop policy if exists coverage_admin on public.holiday_coverage;
create policy coverage_admin_insert on public.holiday_coverage for insert to authenticated with check ((select private.nm_is_admin()));
create policy coverage_admin_update on public.holiday_coverage for update to authenticated using ((select private.nm_is_admin())) with check ((select private.nm_is_admin()));
create policy coverage_admin_delete on public.holiday_coverage for delete to authenticated using ((select private.nm_is_admin()));

drop policy if exists families_member_read on public.families;
drop policy if exists families_owner_update on public.families;
drop policy if exists families_owner_delete on public.families;
create policy families_member_read on public.families for select to authenticated using ((select private.nm_is_family_member(id)));
create policy families_owner_update on public.families for update to authenticated using ((select private.nm_family_role(id)) = 'owner') with check ((select private.nm_family_role(id)) = 'owner');
create policy families_owner_delete on public.families for delete to authenticated using ((select private.nm_family_role(id)) = 'owner');

drop policy if exists members_read on public.family_members;
drop policy if exists members_owner_manage on public.family_members;
drop policy if exists members_self_update on public.family_members;
drop policy if exists members_owner_remove on public.family_members;
drop policy if exists members_self_leave on public.family_members;
create policy members_read on public.family_members for select to authenticated using ((select private.nm_is_family_member(family_id)));
create policy members_update on public.family_members for update to authenticated
using (
  (select private.nm_family_role(family_id)) = 'owner'
  or user_id = (select auth.uid())
)
with check (
  (select private.nm_family_role(family_id)) = 'owner'
  or (
    user_id = (select auth.uid())
    and role = (select private.nm_family_role(family_id))
  )
);
create policy members_delete on public.family_members for delete to authenticated using (
  ((select private.nm_family_role(family_id)) = 'owner' and user_id <> (select auth.uid()))
  or (user_id = (select auth.uid()) and role <> 'owner')
);

drop policy if exists invites_owner on public.family_invites;
create policy invites_owner on public.family_invites for all to authenticated
using ((select private.nm_family_role(family_id)) = 'owner')
with check ((select private.nm_family_role(family_id)) = 'owner' and created_by = (select auth.uid()));

drop policy if exists events_member_read on public.shared_events;
drop policy if exists events_editor_insert on public.shared_events;
drop policy if exists events_editor_update on public.shared_events;
drop policy if exists events_editor_delete on public.shared_events;
create policy events_member_read on public.shared_events for select to authenticated using ((select private.nm_is_family_member(family_id)));
create policy events_editor_insert on public.shared_events for insert to authenticated
with check ((select private.nm_family_role(family_id)) in ('owner','editor') and created_by = (select auth.uid()));
create policy events_editor_update on public.shared_events for update to authenticated
using ((select private.nm_family_role(family_id)) in ('owner','editor'))
with check ((select private.nm_family_role(family_id)) in ('owner','editor'));
create policy events_editor_delete on public.shared_events for delete to authenticated
using ((select private.nm_family_role(family_id)) in ('owner','editor'));

revoke execute on function public.create_family(text,text,text) from authenticated, anon, public;
revoke execute on function public.accept_family_invite(text,text,text) from authenticated, anon, public;
revoke execute on function public.my_data_delete() from authenticated, anon, public;
grant execute on function public.create_family(text,text,text) to service_role;
grant execute on function public.accept_family_invite(text,text,text) to service_role;
grant execute on function public.my_data_delete() to service_role;

drop function if exists public.is_admin();
drop function if exists public.family_role(uuid);
drop function if exists public.is_family_member(uuid);

create index if not exists families_created_by_idx on public.families(created_by);
create index if not exists family_invites_family_id_idx on public.family_invites(family_id);
create index if not exists family_invites_created_by_idx on public.family_invites(created_by);
create index if not exists shared_events_created_by_idx on public.shared_events(created_by) where created_by is not null;
create index if not exists shared_events_updated_by_idx on public.shared_events(updated_by) where updated_by is not null;

-- ============================================================================
-- 20260927140755_bundle_verified_seed_20260927
-- recovered from live Supabase migration history
-- ============================================================================
-- GENERATED by `pnpm gen:seed` from fixtures/official — do not edit by hand.
-- Only verified/dated facts are inserted; see supabase/seed/TODO_VERIFY.json for the rest.
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-01-01:new-year:national', '2025-04-14', '2082-01-01', 'नयाँ वर्ष', 'New Year', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-01-18:labour-day:national', '2025-05-01', '2082-01-18', 'अन्तर्राष्ट्रिय श्रमिक दिवस', 'International Labor Day', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-01-29:buddha-jayanti:national', '2025-05-12', '2082-01-29', 'चण्डी पूर्णिमा / बुद्ध जयन्ती / उभौली', 'Chandi Purnima / Buddha Jayanti / Ubhauli Parwa', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-02-15:republic-day:national', '2025-05-29', '2082-02-15', 'गणतन्त्र दिवस', 'Republic Day', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-04-24:rakshya-bandhan:national', '2025-08-09', '2082-04-24', 'रक्षाबन्धन', 'Rakshya Bandhan', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-04-25:gai-jatra:valley', '2025-08-10', '2082-04-25', 'गाईजात्रा', 'Gai Jatra', 'valley', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-04-31:krishna-janmashtami:national', '2025-08-16', '2082-04-31', 'श्रीकृष्ण जन्माष्टमी', 'Shree Krishna Janmastami', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-05-10:haritalika-teej:national', '2025-08-26', '2082-05-10', 'हरितालिका तीज', 'Haritalika (Teej) Barta', 'national', array[]::text[], array['women_employees']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-05-15:gaura-parwa:custom', '2025-08-31', '2082-05-15', 'गौरा पर्व', 'Gaura Parwa', 'custom', array[]::text[], array['government']::text[], 'closed', 'announced', false, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-05-21:indra-jatra:valley', '2025-09-06', '2082-05-21', 'इन्द्रजात्रा', 'Indra Jatra', 'valley', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-05-30:jitiya:national', '2025-09-15', '2082-05-30', 'जितिया पर्व', 'Jitiya Parwa', 'national', array[]::text[], array['community:jitiya_observers']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-06-03:constitution-day:national', '2025-09-19', '2082-06-03', 'संविधान दिवस', 'Constitution Day', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-06-06:ghatasthapana:national', '2025-09-22', '2082-06-06', 'घटस्थापना', 'Gatasthapana', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-06-13:dashain-1:national', '2025-09-29', '2082-06-13', 'बडादशैं बिदा', 'Dashain Holiday (6 days)', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-06-14:dashain-2:national', '2025-09-30', '2082-06-14', 'बडादशैं बिदा', 'Dashain Holiday (6 days)', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-06-15:dashain-3:national', '2025-10-01', '2082-06-15', 'बडादशैं बिदा', 'Dashain Holiday (6 days)', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-06-16:dashain-4:national', '2025-10-02', '2082-06-16', 'बडादशैं बिदा', 'Dashain Holiday (6 days)', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-06-17:dashain-5:national', '2025-10-03', '2082-06-17', 'बडादशैं बिदा', 'Dashain Holiday (6 days)', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-06-18:dashain-6:national', '2025-10-04', '2082-06-18', 'बडादशैं बिदा', 'Dashain Holiday (6 days)', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-07-03:tihar-1:national', '2025-10-20', '2082-07-03', 'तिहार बिदा', 'Tihar Holiday', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-07-04:tihar-2:national', '2025-10-21', '2082-07-04', 'तिहार बिदा', 'Tihar Holiday', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-07-05:tihar-3:national', '2025-10-22', '2082-07-05', 'तिहार बिदा', 'Tihar Holiday', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-07-06:tihar-4:national', '2025-10-23', '2082-07-06', 'तिहार बिदा', 'Tihar Holiday', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-07-07:tihar-5:national', '2025-10-24', '2082-07-07', 'तिहार बिदा', 'Tihar Holiday', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-07-10:chhath:national', '2025-10-27', '2082-07-10', 'छठ पर्व', 'Chhat Parwa', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-08-17:disability-day:national', '2025-12-03', '2082-08-17', 'अन्तर्राष्ट्रिय अपाङ्गता दिवस', 'International Day of People with Disabilities', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-08-18:dhanya-purnima:national', '2025-12-04', '2082-08-18', 'धान्य पूर्णिमा / उधौली / योमरी पुन्ही', 'Dhanya Purnima / Udhhauli Parwa / Yomari Punhi', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-09-10:christmas:national', '2025-12-25', '2082-09-10', 'क्रिसमस', 'Christmas Day', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-09-15:tamu-lhosar:national', '2025-12-30', '2082-09-15', 'तमु ल्होसार', 'Tamu Lhosar', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-09-27:prithvi-jayanti:national', '2026-01-11', '2082-09-27', 'पृथ्वी जयन्ती / राष्ट्रिय एकता दिवस', 'Prithivi Jayanti / National Unity Day', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-10-01:maghe-sankranti:national', '2026-01-15', '2082-10-01', 'माघी पर्व / माघे संक्रान्ति', 'Maghi Parwa / Maghe Sankranti', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-10-05:sonam-lhosar:national', '2026-01-19', '2082-10-05', 'सोनाम ल्होसार', 'Sonam Lhosar', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-10-09:basanta-panchami:national', '2026-01-23', '2082-10-09', 'वसन्त पञ्चमी', 'Basanta Panchami', 'national', array[]::text[], array['school']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-10-16:martyrs-day:national', '2026-01-30', '2082-10-16', 'शहीद दिवस', 'Martyrs'' Day', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-11-03:maha-shivaratri:national', '2026-02-15', '2082-11-03', 'महाशिवरात्री', 'Maha Shivaratri', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-11-07:democracy-day:national', '2026-02-19', '2082-11-07', 'प्रजातन्त्र दिवस', 'National Democracy Day', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-11-18:fagu-purnima:custom', '2026-03-02', '2082-11-18', 'फागु पूर्णिमा', 'Fagu Purnima', 'custom', array[]::text[], array['government']::text[], 'closed', 'announced', false, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-11-19:terai-holi:custom', '2026-03-03', '2082-11-19', 'तराई होली', 'Terai Holi', 'custom', array[]::text[], array['government']::text[], 'closed', 'announced', false, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-11-24:womens-day:national', '2026-03-08', '2082-11-24', 'अन्तर्राष्ट्रिय महिला दिवस', 'International Women''s Day', 'national', array[]::text[], array['women_employees']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-11-25:falgunanda-jayanti:national', '2026-03-09', '2082-11-25', 'फाल्गुनन्द जयन्ती', 'Falgunand Jayanti', 'national', array[]::text[], array['community:kirat']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-12-04:ghode-jatra:valley', '2026-03-18', '2082-12-04', 'घोडेजात्रा', 'Ghode Jatra', 'valley', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2082-12-13:ram-navami:national', '2026-03-27', '2082-12-13', 'रामनवमी', 'Ram Nawami', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)', '2025-02-27', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-01-01:new-year:national', '2026-04-14', '2083-01-01', 'नयाँ वर्ष', 'New Year', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-01-18:labour-day-buddha-jayanti:national', '2026-05-01', '2083-01-18', 'श्रमिक दिवस / चण्डी पूर्णिमा / बुद्ध जयन्ती / उभौली', 'Labor Day / Chandi Purnima / Buddha Jayanti / Ubhauli Parwa', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-02-15:republic-day:national', '2026-05-29', '2083-02-15', 'गणतन्त्र दिवस', 'Republic Day', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-05-12:rakshya-bandhan:national', '2026-08-28', '2083-05-12', 'रक्षाबन्धन', 'Rakshya Bandhan', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-05-13:gai-jatra:valley', '2026-08-29', '2083-05-13', 'गाईजात्रा', 'Gai Jatra', 'valley', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-05-13:gai-jatra-newar:national', '2026-08-29', '2083-05-13', 'गाईजात्रा (नेवार समुदाय)', 'Gai Jatra (Newar community)', 'national', array[]::text[], array['community:newar']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-05-19:krishna-janmashtami:national', '2026-09-04', '2083-05-19', 'श्रीकृष्ण जन्माष्टमी', 'Shree Krishna Janmastami / Gaura Parwa', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-05-29:haritalika-teej:national', '2026-09-14', '2083-05-29', 'हरितालिका तीज', 'Haritalika (Teej) Barta', 'national', array[]::text[], array['women_employees']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-06-03:constitution-day:national', '2026-09-19', '2083-06-03', 'संविधान दिवस', 'Constitution Day', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-06-09:indra-jatra:valley', '2026-09-25', '2083-06-09', 'इन्द्रजात्रा', 'Indra Jatra', 'valley', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-06-18:jitiya:national', '2026-10-04', '2083-06-18', 'जितिया पर्व', 'Jitiya Parwa', 'national', array[]::text[], array['community:jitiya_observers']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-06-25:ghatasthapana:national', '2026-10-11', '2083-06-25', 'घटस्थापना', 'Gatasthapana', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-06-31:dashain-1:national', '2026-10-17', '2083-06-31', 'बडादशैं बिदा', 'Dashain Holiday (7 days)', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-07-01:dashain-2:national', '2026-10-18', '2083-07-01', 'बडादशैं बिदा', 'Dashain Holiday (7 days)', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-07-02:dashain-3:national', '2026-10-19', '2083-07-02', 'बडादशैं बिदा', 'Dashain Holiday (7 days)', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-07-03:dashain-4:national', '2026-10-20', '2083-07-03', 'बडादशैं बिदा', 'Dashain Holiday (7 days)', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-07-04:dashain-5:national', '2026-10-21', '2083-07-04', 'बडादशैं बिदा', 'Dashain Holiday (7 days)', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-07-05:dashain-6:national', '2026-10-22', '2083-07-05', 'बडादशैं बिदा', 'Dashain Holiday (7 days)', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-07-06:dashain-7:national', '2026-10-23', '2083-07-06', 'बडादशैं बिदा', 'Dashain Holiday (7 days)', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-07-22:tihar-1:national', '2026-11-08', '2083-07-22', 'तिहार बिदा', 'Tihar Holiday (5 days)', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-07-23:tihar-2:national', '2026-11-09', '2083-07-23', 'तिहार बिदा', 'Tihar Holiday (5 days)', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-07-24:tihar-3:national', '2026-11-10', '2083-07-24', 'तिहार बिदा', 'Tihar Holiday (5 days)', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-07-25:tihar-4:national', '2026-11-11', '2083-07-25', 'तिहार बिदा', 'Tihar Holiday (5 days)', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-07-25:falgunanda-jayanti:national', '2026-11-11', '2083-07-25', 'फाल्गुनन्द जयन्ती', 'Falgunand Jayanti', 'national', array[]::text[], array['community:kirat']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-07-26:tihar-5:national', '2026-11-12', '2083-07-26', 'तिहार बिदा', 'Tihar Holiday (5 days)', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-07-29:chhath:national', '2026-11-15', '2083-07-29', 'छठ पर्व', 'Chhat Parwa', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-08-17:disability-day:national', '2026-12-03', '2083-08-17', 'अन्तर्राष्ट्रिय अपाङ्गता दिवस', 'International Day of People with Disabilities', 'national', array[]::text[], array['community:people_with_disabilities']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-09-09:dhanya-purnima:national', '2026-12-24', '2083-09-09', 'धान्य पूर्णिमा / उधौली / योमरी पुन्ही', 'Dhanya Purnima / Udhhauli Parwa / Yomari Punhi', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-09-10:christmas:national', '2026-12-25', '2083-09-10', 'क्रिसमस', 'Christmas Day', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-09-15:tamu-lhosar:national', '2026-12-30', '2083-09-15', 'तमु ल्होसार', 'Tamu Lhosar / Dura Mhaipru Nakuma', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-09-27:prithvi-jayanti:national', '2027-01-11', '2083-09-27', 'पृथ्वी जयन्ती / राष्ट्रिय एकता दिवस', 'Prithivi Jayanti / National Unity Day', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-10-01:maghe-sankranti:national', '2027-01-15', '2083-10-01', 'माघी पर्व / माघे संक्रान्ति', 'Maghi Parwa / Maghe Sankranti', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-10-16:martyrs-day:national', '2027-01-30', '2083-10-16', 'शहीद दिवस', 'Martyrs'' Day', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-10-24:sonam-lhosar:national', '2027-02-07', '2083-10-24', 'सोनाम ल्होसार', 'Sonam Lhosar', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-10-28:basanta-panchami:national', '2027-02-11', '2083-10-28', 'वसन्त पञ्चमी', 'Basanta Panchami', 'national', array[]::text[], array['school']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-11-07:democracy-day:national', '2027-02-19', '2083-11-07', 'प्रजातन्त्र दिवस', 'National Democracy Day', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-11-22:maha-shivaratri:national', '2027-03-06', '2083-11-22', 'महाशिवरात्री', 'Maha Shivaratri', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-11-24:womens-day:national', '2027-03-08', '2083-11-24', 'अन्तर्राष्ट्रिय महिला दिवस', 'International Women''s Day', 'national', array[]::text[], array['women_employees']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-11-25:gyalpo-lhosar:national', '2027-03-09', '2083-11-25', 'ग्याल्पो ल्होसार', 'Gyalpo Loshar', 'national', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-12-07:fagu-purnima:custom', '2027-03-21', '2083-12-07', 'फागु पूर्णिमा', 'Fagu Purnima', 'custom', array[]::text[], array['government']::text[], 'closed', 'announced', false, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-12-08:terai-holi:custom', '2027-03-22', '2083-12-08', 'तराई होली', 'Terai Holi', 'custom', array[]::text[], array['government']::text[], 'closed', 'announced', false, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
insert into public.holidays (id, ad_date, bs_date, name_ne, name_en, scope_type, scope_codes, audiences, effect, status, scope_verified, source_url, source_title, notice_date, verified_by, verified_at) values ('2083-12-23:ghode-jatra:valley', '2027-04-06', '2083-12-23', 'घोडेजात्रा', 'Ghode Jatra', 'valley', array[]::text[], array['government']::text[], 'closed', 'announced', true, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)', '2026-03-02', 'Nepal Miti curation (fixture import)', '2026-09-27T00:00:00Z') on conflict (id) do update set ad_date = excluded.ad_date, bs_date = excluded.bs_date, name_ne = excluded.name_ne, name_en = excluded.name_en, scope_type = excluded.scope_type, scope_codes = excluded.scope_codes, audiences = excluded.audiences, effect = excluded.effect, status = excluded.status, scope_verified = excluded.scope_verified, source_url = excluded.source_url, source_title = excluded.source_title, notice_date = excluded.notice_date, verified_by = excluded.verified_by, verified_at = excluded.verified_at, updated_at = now();
begin;
insert into public.weekly_off_rules (id, audience, weekdays, effective_from, effective_to, source_url, source_title) values ('weekly-government-2083', 'government', array[6]::int[], '2026-04-14', null, 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27): Holiday list is stated as "excluding Saturdays"; government office hours Sunday–Thursday 10:00–17:00, Friday 10:00–15:00 (winter 10:00–16:00, Nov 2–Jan 29).') on conflict (id) do nothing;
insert into public.holiday_coverage (bs_year, audience, source_url, source_title) values (2082, 'government', 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)') on conflict (bs_year, audience) do nothing;
insert into public.holiday_coverage (bs_year, audience, source_url, source_title) values (2082, 'women_employees', 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)') on conflict (bs_year, audience) do nothing;
insert into public.holiday_coverage (bs_year, audience, source_url, source_title) values (2082, 'community:jitiya_observers', 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)') on conflict (bs_year, audience) do nothing;
insert into public.holiday_coverage (bs_year, audience, source_url, source_title) values (2082, 'community:kirat', 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Ministry of Home Affairs, Government of Nepal notice (2025-02-27) — via Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.)') on conflict (bs_year, audience) do nothing;
insert into public.holiday_coverage (bs_year, audience, source_url, source_title) values (2083, 'government', 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)') on conflict (bs_year, audience) do nothing;
insert into public.holiday_coverage (bs_year, audience, source_url, source_title) values (2083, 'women_employees', 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)') on conflict (bs_year, audience) do nothing;
insert into public.holiday_coverage (bs_year, audience, source_url, source_title) values (2083, 'community:newar', 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)') on conflict (bs_year, audience) do nothing;
insert into public.holiday_coverage (bs_year, audience, source_url, source_title) values (2083, 'community:jitiya_observers', 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)') on conflict (bs_year, audience) do nothing;
insert into public.holiday_coverage (bs_year, audience, source_url, source_title) values (2083, 'community:kirat', 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)') on conflict (bs_year, audience) do nothing;
insert into public.holiday_coverage (bs_year, audience, source_url, source_title) values (2083, 'community:people_with_disabilities', 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Ministry of Home Affairs, Government of Nepal notice (2026-03-02) — via Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27)') on conflict (bs_year, audience) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2022-05-16', 'festival', 'buddha_jayanti', '{"bs":"2079-02-02","bsYear":2079,"tier":"golden","officialUrl":null}'::jsonb, 'kathmandu', 'https://narayanilawfirm.com/list-of-public-holidays-in-nepal-2079/', 'Narayani Law Firm — List of Public Holidays in Nepal 2079 (transcribes MoHA notice)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2022-08-12', 'festival', 'janai_purnima', '{"bs":"2079-04-27","bsYear":2079,"tier":"golden","officialUrl":null}'::jsonb, 'kathmandu', 'https://narayanilawfirm.com/list-of-public-holidays-in-nepal-2079/', 'Narayani Law Firm — List of Public Holidays in Nepal 2079 (transcribes MoHA notice)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2022-08-19', 'festival', 'krishna_janmashtami', '{"bs":"2079-05-03","bsYear":2079,"tier":"golden","officialUrl":null}'::jsonb, 'kathmandu', 'https://narayanilawfirm.com/list-of-public-holidays-in-nepal-2079/', 'Narayani Law Firm — List of Public Holidays in Nepal 2079 (transcribes MoHA notice)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2022-09-26', 'festival', 'ghatasthapana', '{"bs":"2079-06-10","bsYear":2079,"tier":"golden","officialUrl":null}'::jsonb, 'kathmandu', 'https://narayanilawfirm.com/list-of-public-holidays-in-nepal-2079/', 'Narayani Law Firm — List of Public Holidays in Nepal 2079 (transcribes MoHA notice)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2022-10-30', 'festival', 'chhath', '{"bs":"2079-07-13","bsYear":2079,"tier":"golden","officialUrl":null}'::jsonb, 'kathmandu', 'https://narayanilawfirm.com/list-of-public-holidays-in-nepal-2079/', 'Narayani Law Firm — List of Public Holidays in Nepal 2079 (transcribes MoHA notice)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2022-10-24', 'festival', 'laxmi_puja', '{"bs":"2079-07-07","bsYear":2079,"tier":"golden","officialUrl":null}'::jsonb, 'kathmandu', 'https://narayanilawfirm.com/list-of-public-holidays-in-nepal-2079/', 'Narayani Law Firm — List of Public Holidays in Nepal 2079 (transcribes MoHA notice)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2022-08-30', 'festival', 'haritalika_teej', '{"bs":"2079-05-14","bsYear":2079,"tier":"golden","officialUrl":null}'::jsonb, 'kathmandu', 'https://narayanilawfirm.com/list-of-public-holidays-in-nepal-2079/', 'Narayani Law Firm — List of Public Holidays in Nepal 2079 (transcribes MoHA notice)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2023-02-18', 'festival', 'maha_shivaratri', '{"bs":"2079-11-06","bsYear":2079,"tier":"golden","officialUrl":null}'::jsonb, 'kathmandu', 'https://narayanilawfirm.com/list-of-public-holidays-in-nepal-2079/', 'Narayani Law Firm — List of Public Holidays in Nepal 2079 (transcribes MoHA notice)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2023-01-26', 'festival', 'basanta_panchami', '{"bs":"2079-10-12","bsYear":2079,"tier":"golden","officialUrl":null}'::jsonb, 'kathmandu', 'https://narayanilawfirm.com/list-of-public-holidays-in-nepal-2079/', 'Narayani Law Firm — List of Public Holidays in Nepal 2079 (transcribes MoHA notice)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2022-09-09', 'festival', 'indra_jatra', '{"bs":"2079-05-24","bsYear":2079,"tier":"golden","officialUrl":null}'::jsonb, 'kathmandu', 'https://narayanilawfirm.com/list-of-public-holidays-in-nepal-2079/', 'Narayani Law Firm — List of Public Holidays in Nepal 2079 (transcribes MoHA notice)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2023-03-21', 'festival', 'ghode_jatra', '{"bs":"2079-12-07","bsYear":2079,"tier":"golden","officialUrl":null}'::jsonb, 'kathmandu', 'https://narayanilawfirm.com/list-of-public-holidays-in-nepal-2079/', 'Narayani Law Firm — List of Public Holidays in Nepal 2079 (transcribes MoHA notice)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2023-03-06', 'festival', 'fagu_purnima', '{"bs":"2079-11-22","bsYear":2079,"tier":"golden","officialUrl":null}'::jsonb, 'kathmandu', 'https://narayanilawfirm.com/list-of-public-holidays-in-nepal-2079/', 'Narayani Law Firm — List of Public Holidays in Nepal 2079 (transcribes MoHA notice)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2023-03-07', 'festival', 'terai_holi', '{"bs":"2079-11-23","bsYear":2079,"tier":"golden","officialUrl":null}'::jsonb, 'kathmandu', 'https://narayanilawfirm.com/list-of-public-holidays-in-nepal-2079/', 'Narayani Law Firm — List of Public Holidays in Nepal 2079 (transcribes MoHA notice)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2023-01-15', 'festival', 'maghe_sankranti', '{"bs":"2079-10-01","bsYear":2079,"tier":"golden","officialUrl":null}'::jsonb, 'kathmandu', 'https://narayanilawfirm.com/list-of-public-holidays-in-nepal-2079/', 'Narayani Law Firm — List of Public Holidays in Nepal 2079 (transcribes MoHA notice)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2022-12-08', 'festival', 'dhanya_purnima', '{"bs":"2079-08-22","bsYear":2079,"tier":"golden","officialUrl":null}'::jsonb, 'kathmandu', 'https://narayanilawfirm.com/list-of-public-holidays-in-nepal-2079/', 'Narayani Law Firm — List of Public Holidays in Nepal 2079 (transcribes MoHA notice)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2023-05-05', 'festival', 'baisakh_purnima', '{"bs":"2080-01-22","bsYear":2080,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/public-holidays-for-2080"}'::jsonb, 'kathmandu', 'https://edusanjal.com/news/list-of-public-holidays-of-nepal-2080/', 'Edusanjal — List of Public Holidays of Nepal 2080 (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2023-08-31', 'festival', 'janai_purnima', '{"bs":"2080-05-14","bsYear":2080,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/public-holidays-for-2080"}'::jsonb, 'kathmandu', 'https://edusanjal.com/news/list-of-public-holidays-of-nepal-2080/', 'Edusanjal — List of Public Holidays of Nepal 2080 (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2023-09-06', 'festival', 'krishna_janmashtami', '{"bs":"2080-05-20","bsYear":2080,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/public-holidays-for-2080"}'::jsonb, 'kathmandu', 'https://edusanjal.com/news/list-of-public-holidays-of-nepal-2080/', 'Edusanjal — List of Public Holidays of Nepal 2080 (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2023-10-15', 'festival', 'ghatasthapana', '{"bs":"2080-06-28","bsYear":2080,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/public-holidays-for-2080"}'::jsonb, 'kathmandu', 'https://edusanjal.com/news/list-of-public-holidays-of-nepal-2080/', 'Edusanjal — List of Public Holidays of Nepal 2080 (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2023-11-19', 'festival', 'chhath', '{"bs":"2080-08-03","bsYear":2080,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/public-holidays-for-2080"}'::jsonb, 'kathmandu', 'https://edusanjal.com/news/list-of-public-holidays-of-nepal-2080/', 'Edusanjal — List of Public Holidays of Nepal 2080 (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2023-12-26', 'festival', 'dhanya_purnima', '{"bs":"2080-09-10","bsYear":2080,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/public-holidays-for-2080"}'::jsonb, 'kathmandu', 'https://edusanjal.com/news/list-of-public-holidays-of-nepal-2080/', 'Edusanjal — List of Public Holidays of Nepal 2080 (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2024-01-15', 'festival', 'maghe_sankranti', '{"bs":"2080-10-01","bsYear":2080,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/public-holidays-for-2080"}'::jsonb, 'kathmandu', 'https://edusanjal.com/news/list-of-public-holidays-of-nepal-2080/', 'Edusanjal — List of Public Holidays of Nepal 2080 (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2024-03-08', 'festival', 'maha_shivaratri', '{"bs":"2080-11-25","bsYear":2080,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/public-holidays-for-2080"}'::jsonb, 'kathmandu', 'https://edusanjal.com/news/list-of-public-holidays-of-nepal-2080/', 'Edusanjal — List of Public Holidays of Nepal 2080 (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2024-03-24', 'festival', 'fagu_purnima', '{"bs":"2080-12-11","bsYear":2080,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/public-holidays-for-2080"}'::jsonb, 'kathmandu', 'https://edusanjal.com/news/list-of-public-holidays-of-nepal-2080/', 'Edusanjal — List of Public Holidays of Nepal 2080 (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2024-03-25', 'festival', 'terai_holi', '{"bs":"2080-12-12","bsYear":2080,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/public-holidays-for-2080"}'::jsonb, 'kathmandu', 'https://edusanjal.com/news/list-of-public-holidays-of-nepal-2080/', 'Edusanjal — List of Public Holidays of Nepal 2080 (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2024-04-17', 'festival', 'ram_navami', '{"bs":"2081-01-05","bsYear":2081,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2081"}'::jsonb, 'kathmandu', 'https://edusanjal.com/news/list-of-public-holidays-of-nepal-2081/', 'Edusanjal — List of Public Holidays of Nepal 2081 (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2024-05-23', 'festival', 'buddha_jayanti', '{"bs":"2081-02-10","bsYear":2081,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2081"}'::jsonb, 'kathmandu', 'https://edusanjal.com/news/list-of-public-holidays-of-nepal-2081/', 'Edusanjal — List of Public Holidays of Nepal 2081 (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2024-08-19', 'festival', 'janai_purnima', '{"bs":"2081-05-03","bsYear":2081,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2081"}'::jsonb, 'kathmandu', 'https://edusanjal.com/news/list-of-public-holidays-of-nepal-2081/', 'Edusanjal — List of Public Holidays of Nepal 2081 (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2024-08-26', 'festival', 'krishna_janmashtami', '{"bs":"2081-05-10","bsYear":2081,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2081"}'::jsonb, 'kathmandu', 'https://edusanjal.com/news/list-of-public-holidays-of-nepal-2081/', 'Edusanjal — List of Public Holidays of Nepal 2081 (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2024-09-06', 'festival', 'haritalika_teej', '{"bs":"2081-05-21","bsYear":2081,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2081"}'::jsonb, 'kathmandu', 'https://edusanjal.com/news/list-of-public-holidays-of-nepal-2081/', 'Edusanjal — List of Public Holidays of Nepal 2081 (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2024-10-03', 'festival', 'ghatasthapana', '{"bs":"2081-06-17","bsYear":2081,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2081"}'::jsonb, 'kathmandu', 'https://edusanjal.com/news/list-of-public-holidays-of-nepal-2081/', 'Edusanjal — List of Public Holidays of Nepal 2081 (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2024-11-07', 'festival', 'chhath', '{"bs":"2081-07-22","bsYear":2081,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2081"}'::jsonb, 'kathmandu', 'https://edusanjal.com/news/list-of-public-holidays-of-nepal-2081/', 'Edusanjal — List of Public Holidays of Nepal 2081 (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2025-01-14', 'festival', 'maghe_sankranti', '{"bs":"2081-10-01","bsYear":2081,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2081"}'::jsonb, 'kathmandu', 'https://edusanjal.com/news/list-of-public-holidays-of-nepal-2081/', 'Edusanjal — List of Public Holidays of Nepal 2081 (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2025-02-26', 'festival', 'maha_shivaratri', '{"bs":"2081-11-14","bsYear":2081,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2081"}'::jsonb, 'kathmandu', 'https://edusanjal.com/news/list-of-public-holidays-of-nepal-2081/', 'Edusanjal — List of Public Holidays of Nepal 2081 (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2025-03-13', 'festival', 'fagu_purnima', '{"bs":"2081-11-29","bsYear":2081,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2081"}'::jsonb, 'kathmandu', 'https://edusanjal.com/news/list-of-public-holidays-of-nepal-2081/', 'Edusanjal — List of Public Holidays of Nepal 2081 (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2025-03-14', 'festival', 'terai_holi', '{"bs":"2081-12-01","bsYear":2081,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2081"}'::jsonb, 'kathmandu', 'https://edusanjal.com/news/list-of-public-holidays-of-nepal-2081/', 'Edusanjal — List of Public Holidays of Nepal 2081 (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2025-05-12', 'festival', 'buddha_jayanti', '{"bs":"2082-01-29","bsYear":2082,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2082"}'::jsonb, 'kathmandu', 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.) (transcribes MoHA notice 2081/11/15, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2025-08-09', 'festival', 'janai_purnima', '{"bs":"2082-04-24","bsYear":2082,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2082"}'::jsonb, 'kathmandu', 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.) (transcribes MoHA notice 2081/11/15, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2025-08-10', 'festival', 'gai_jatra', '{"bs":"2082-04-25","bsYear":2082,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2082"}'::jsonb, 'kathmandu', 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.) (transcribes MoHA notice 2081/11/15, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2025-08-16', 'festival', 'krishna_janmashtami', '{"bs":"2082-04-31","bsYear":2082,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2082"}'::jsonb, 'kathmandu', 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.) (transcribes MoHA notice 2081/11/15, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2025-08-26', 'festival', 'haritalika_teej', '{"bs":"2082-05-10","bsYear":2082,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2082"}'::jsonb, 'kathmandu', 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.) (transcribes MoHA notice 2081/11/15, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2025-09-06', 'festival', 'indra_jatra', '{"bs":"2082-05-21","bsYear":2082,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2082"}'::jsonb, 'kathmandu', 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.) (transcribes MoHA notice 2081/11/15, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2025-09-22', 'festival', 'ghatasthapana', '{"bs":"2082-06-06","bsYear":2082,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2082"}'::jsonb, 'kathmandu', 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.) (transcribes MoHA notice 2081/11/15, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2025-10-27', 'festival', 'chhath', '{"bs":"2082-07-10","bsYear":2082,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2082"}'::jsonb, 'kathmandu', 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.) (transcribes MoHA notice 2081/11/15, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2025-12-04', 'festival', 'dhanya_purnima', '{"bs":"2082-08-18","bsYear":2082,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2082"}'::jsonb, 'kathmandu', 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.) (transcribes MoHA notice 2081/11/15, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2026-01-15', 'festival', 'maghe_sankranti', '{"bs":"2082-10-01","bsYear":2082,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2082"}'::jsonb, 'kathmandu', 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.) (transcribes MoHA notice 2081/11/15, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2026-01-23', 'festival', 'basanta_panchami', '{"bs":"2082-10-09","bsYear":2082,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2082"}'::jsonb, 'kathmandu', 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.) (transcribes MoHA notice 2081/11/15, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2026-02-15', 'festival', 'maha_shivaratri', '{"bs":"2082-11-03","bsYear":2082,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2082"}'::jsonb, 'kathmandu', 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.) (transcribes MoHA notice 2081/11/15, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2026-03-02', 'festival', 'fagu_purnima', '{"bs":"2082-11-18","bsYear":2082,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2082"}'::jsonb, 'kathmandu', 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.) (transcribes MoHA notice 2081/11/15, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2026-03-03', 'festival', 'terai_holi', '{"bs":"2082-11-19","bsYear":2082,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2082"}'::jsonb, 'kathmandu', 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.) (transcribes MoHA notice 2081/11/15, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2026-03-18', 'festival', 'ghode_jatra', '{"bs":"2082-12-04","bsYear":2082,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2082"}'::jsonb, 'kathmandu', 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.) (transcribes MoHA notice 2081/11/15, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2026-03-27', 'festival', 'ram_navami', '{"bs":"2082-12-13","bsYear":2082,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2082"}'::jsonb, 'kathmandu', 'https://pradhanlaw.com/publications/list-of-public-holidays-2082-bs-202526-ad', 'Pradhan & Associates — Publication of LIST OF PUBLIC HOLIDAYS, 2082 B.S. (2025/26 A.D.) (transcribes MoHA notice 2081/11/15, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2025-10-02', 'festival', 'vijaya_dashami', '{"bs":"2082-06-16","bsYear":2082,"tier":"golden","officialUrl":null}'::jsonb, 'kathmandu', 'https://thehimalayantimes.com/nepal/dashain-tika-timings-announced-for-nepalis-around-the-world', 'The Himalayan Times — Dashain Tika timings announced for Nepalis around the world (2025-09-21)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2026-05-01', 'festival', 'buddha_jayanti', '{"bs":"2083-01-18","bsYear":2083,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2083"}'::jsonb, 'kathmandu', 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27) (transcribes MoHA notice in Nepal Rajpatra, 2082/11/18)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2026-08-28', 'festival', 'janai_purnima', '{"bs":"2083-05-12","bsYear":2083,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2083"}'::jsonb, 'kathmandu', 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27) (transcribes MoHA notice in Nepal Rajpatra, 2082/11/18)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2026-08-29', 'festival', 'gai_jatra', '{"bs":"2083-05-13","bsYear":2083,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2083"}'::jsonb, 'kathmandu', 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27) (transcribes MoHA notice in Nepal Rajpatra, 2082/11/18)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2026-09-04', 'festival', 'krishna_janmashtami', '{"bs":"2083-05-19","bsYear":2083,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2083"}'::jsonb, 'kathmandu', 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27) (transcribes MoHA notice in Nepal Rajpatra, 2082/11/18)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2026-09-14', 'festival', 'haritalika_teej', '{"bs":"2083-05-29","bsYear":2083,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2083"}'::jsonb, 'kathmandu', 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27) (transcribes MoHA notice in Nepal Rajpatra, 2082/11/18)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2026-09-25', 'festival', 'indra_jatra', '{"bs":"2083-06-09","bsYear":2083,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2083"}'::jsonb, 'kathmandu', 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27) (transcribes MoHA notice in Nepal Rajpatra, 2082/11/18)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2026-10-11', 'festival', 'ghatasthapana', '{"bs":"2083-06-25","bsYear":2083,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2083"}'::jsonb, 'kathmandu', 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27) (transcribes MoHA notice in Nepal Rajpatra, 2082/11/18)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2026-11-15', 'festival', 'chhath', '{"bs":"2083-07-29","bsYear":2083,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2083"}'::jsonb, 'kathmandu', 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27) (transcribes MoHA notice in Nepal Rajpatra, 2082/11/18)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2026-12-24', 'festival', 'dhanya_purnima', '{"bs":"2083-09-09","bsYear":2083,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2083"}'::jsonb, 'kathmandu', 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27) (transcribes MoHA notice in Nepal Rajpatra, 2082/11/18)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2027-01-15', 'festival', 'maghe_sankranti', '{"bs":"2083-10-01","bsYear":2083,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2083"}'::jsonb, 'kathmandu', 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27) (transcribes MoHA notice in Nepal Rajpatra, 2082/11/18)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2027-02-11', 'festival', 'basanta_panchami', '{"bs":"2083-10-28","bsYear":2083,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2083"}'::jsonb, 'kathmandu', 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27) (transcribes MoHA notice in Nepal Rajpatra, 2082/11/18)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2027-03-06', 'festival', 'maha_shivaratri', '{"bs":"2083-11-22","bsYear":2083,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2083"}'::jsonb, 'kathmandu', 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27) (transcribes MoHA notice in Nepal Rajpatra, 2082/11/18)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2027-03-21', 'festival', 'fagu_purnima', '{"bs":"2083-12-07","bsYear":2083,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2083"}'::jsonb, 'kathmandu', 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27) (transcribes MoHA notice in Nepal Rajpatra, 2082/11/18)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2027-03-22', 'festival', 'terai_holi', '{"bs":"2083-12-08","bsYear":2083,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2083"}'::jsonb, 'kathmandu', 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27) (transcribes MoHA notice in Nepal Rajpatra, 2082/11/18)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2027-04-06', 'festival', 'ghode_jatra', '{"bs":"2083-12-23","bsYear":2083,"tier":"golden","officialUrl":"https://www.moha.gov.np/en/page/government-and-public-holidays-in-2083"}'::jsonb, 'kathmandu', 'https://www.pradhanlaw.com/publications/list-of-public-holidays-2083-202627', 'Pradhan & Associates — Publication of List of Public Holidays, 2083 (2026/27) (transcribes MoHA notice in Nepal Rajpatra, 2082/11/18)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2026-10-17', 'festival', 'phulpati', '{"bs":"2083-06-31","bsYear":2083,"tier":"golden","officialUrl":null}'::jsonb, 'kathmandu', 'https://www.ratopati.com/story/543999/calendar-for-2083-bs-dashain-tika-on-kartik-4th-when-is-tihar', 'Ratopati — २०८३ सालको पात्रो: कात्तिक ४ गते दसैँको टीका (reports the 2083 panchang published by Nepal Panchang Nirnayak Vikas Samiti; article 2082-11-02)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2026-10-18', 'festival', 'maha_ashtami', '{"bs":"2083-07-01","bsYear":2083,"tier":"golden","officialUrl":null}'::jsonb, 'kathmandu', 'https://www.ratopati.com/story/543999/calendar-for-2083-bs-dashain-tika-on-kartik-4th-when-is-tihar', 'Ratopati — २०८३ सालको पात्रो: कात्तिक ४ गते दसैँको टीका (reports the 2083 panchang published by Nepal Panchang Nirnayak Vikas Samiti; article 2082-11-02)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2026-10-20', 'festival', 'maha_navami', '{"bs":"2083-07-03","bsYear":2083,"tier":"golden","officialUrl":null}'::jsonb, 'kathmandu', 'https://www.ratopati.com/story/543999/calendar-for-2083-bs-dashain-tika-on-kartik-4th-when-is-tihar', 'Ratopati — २०८३ सालको पात्रो: कात्तिक ४ गते दसैँको टीका (reports the 2083 panchang published by Nepal Panchang Nirnayak Vikas Samiti; article 2082-11-02)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2026-10-21', 'festival', 'vijaya_dashami', '{"bs":"2083-07-04","bsYear":2083,"tier":"golden","officialUrl":null}'::jsonb, 'kathmandu', 'https://www.ratopati.com/story/543999/calendar-for-2083-bs-dashain-tika-on-kartik-4th-when-is-tihar', 'Ratopati — २०८३ सालको पात्रो: कात्तिक ४ गते दसैँको टीका (reports the 2083 panchang published by Nepal Panchang Nirnayak Vikas Samiti; article 2082-11-02)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2026-10-25', 'festival', 'kojagrat_purnima', '{"bs":"2083-07-08","bsYear":2083,"tier":"golden","officialUrl":null}'::jsonb, 'kathmandu', 'https://www.ratopati.com/story/543999/calendar-for-2083-bs-dashain-tika-on-kartik-4th-when-is-tihar', 'Ratopati — २०८३ सालको पात्रो: कात्तिक ४ गते दसैँको टीका (reports the 2083 panchang published by Nepal Panchang Nirnayak Vikas Samiti; article 2082-11-02)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2026-11-08', 'festival', 'laxmi_puja', '{"bs":"2083-07-22","bsYear":2083,"tier":"golden","officialUrl":null}'::jsonb, 'kathmandu', 'https://www.ratopati.com/story/543999/calendar-for-2083-bs-dashain-tika-on-kartik-4th-when-is-tihar', 'Ratopati — २०८३ सालको पात्रो: कात्तिक ४ गते दसैँको टीका (reports the 2083 panchang published by Nepal Panchang Nirnayak Vikas Samiti; article 2082-11-02)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2026-11-11', 'festival', 'bhai_tika', '{"bs":"2083-07-25","bsYear":2083,"tier":"golden","officialUrl":null}'::jsonb, 'kathmandu', 'https://www.ratopati.com/story/543999/calendar-for-2083-bs-dashain-tika-on-kartik-4th-when-is-tihar', 'Ratopati — २०८३ सालको पात्रो: कात्तिक ४ गते दसैँको टीका (reports the 2083 panchang published by Nepal Panchang Nirnayak Vikas Samiti; article 2082-11-02)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2021-05-26', 'festival', 'buddha_jayanti', '{"bs":"2078-02-12","bsYear":2078,"tier":"holdout","officialUrl":null}'::jsonb, 'kathmandu', 'https://blog.educatenepal.com/2021/02/list-of-public-holidays-for-2078-bs.html', 'EducateNepal — List of Public Holidays for 2078 B.S. (2021-2022) (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2021-08-22', 'festival', 'janai_purnima', '{"bs":"2078-05-06","bsYear":2078,"tier":"holdout","officialUrl":null}'::jsonb, 'kathmandu', 'https://blog.educatenepal.com/2021/02/list-of-public-holidays-for-2078-bs.html', 'EducateNepal — List of Public Holidays for 2078 B.S. (2021-2022) (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2021-08-23', 'festival', 'gai_jatra', '{"bs":"2078-05-07","bsYear":2078,"tier":"holdout","officialUrl":null}'::jsonb, 'kathmandu', 'https://blog.educatenepal.com/2021/02/list-of-public-holidays-for-2078-bs.html', 'EducateNepal — List of Public Holidays for 2078 B.S. (2021-2022) (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2021-09-09', 'festival', 'haritalika_teej', '{"bs":"2078-05-24","bsYear":2078,"tier":"holdout","officialUrl":null}'::jsonb, 'kathmandu', 'https://blog.educatenepal.com/2021/02/list-of-public-holidays-for-2078-bs.html', 'EducateNepal — List of Public Holidays for 2078 B.S. (2021-2022) (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2021-10-07', 'festival', 'ghatasthapana', '{"bs":"2078-06-21","bsYear":2078,"tier":"holdout","officialUrl":null}'::jsonb, 'kathmandu', 'https://blog.educatenepal.com/2021/02/list-of-public-holidays-for-2078-bs.html', 'EducateNepal — List of Public Holidays for 2078 B.S. (2021-2022) (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2021-11-10', 'festival', 'chhath', '{"bs":"2078-07-24","bsYear":2078,"tier":"holdout","officialUrl":null}'::jsonb, 'kathmandu', 'https://blog.educatenepal.com/2021/02/list-of-public-holidays-for-2078-bs.html', 'EducateNepal — List of Public Holidays for 2078 B.S. (2021-2022) (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2022-01-15', 'festival', 'maghe_sankranti', '{"bs":"2078-10-01","bsYear":2078,"tier":"holdout","officialUrl":null}'::jsonb, 'kathmandu', 'https://blog.educatenepal.com/2021/02/list-of-public-holidays-for-2078-bs.html', 'EducateNepal — List of Public Holidays for 2078 B.S. (2021-2022) (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2022-02-06', 'festival', 'basanta_panchami', '{"bs":"2078-10-23","bsYear":2078,"tier":"holdout","officialUrl":null}'::jsonb, 'kathmandu', 'https://blog.educatenepal.com/2021/02/list-of-public-holidays-for-2078-bs.html', 'EducateNepal — List of Public Holidays for 2078 B.S. (2021-2022) (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2022-03-01', 'festival', 'maha_shivaratri', '{"bs":"2078-11-17","bsYear":2078,"tier":"holdout","officialUrl":null}'::jsonb, 'kathmandu', 'https://blog.educatenepal.com/2021/02/list-of-public-holidays-for-2078-bs.html', 'EducateNepal — List of Public Holidays for 2078 B.S. (2021-2022) (transcribes MoHA notice, Nepal Rajpatra)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2021-10-07', 'sait', 'ghatasthapana:ghatasthapana', '{"start_local":"2021-10-07T11:46","end_local":null,"tz":"Asia/Kathmandu","label_ne":"घटस्थापना","label_en":"Ghatasthapana"}'::jsonb, 'kathmandu', 'https://english.onlinekhabar.com/auspicious-time-dashain-tika-2021.html', 'OnlineKhabar English (2021-09-24), Nepal Panchanga Nirnayak Samiti', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2021-10-15', 'sait', 'vijaya_dashami:vijaya_dashami_tika', '{"start_local":"2021-10-15T10:02","end_local":null,"tz":"Asia/Kathmandu","label_ne":"विजया दशमी टीका","label_en":"Vijaya Dashami tika"}'::jsonb, 'kathmandu', 'https://english.onlinekhabar.com/auspicious-time-dashain-tika-2021.html', 'OnlineKhabar English (2021-09-24), Nepal Panchanga Nirnayak Samiti', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2021-10-15', 'sait', 'vijaya_dashami:devi_visarjan', '{"start_local":"2021-10-15T08:19","end_local":null,"tz":"Asia/Kathmandu","label_ne":"देवी विसर्जन","label_en":"Devi visarjan"}'::jsonb, 'kathmandu', 'https://english.onlinekhabar.com/auspicious-time-dashain-tika-2021.html', 'OnlineKhabar English (2021-09-24), Nepal Panchanga Nirnayak Samiti', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2022-10-05', 'sait', 'vijaya_dashami:vijaya_dashami_tika', '{"start_local":"2022-10-05T11:51","end_local":null,"tz":"Asia/Kathmandu","label_ne":"विजया दशमी टीका","label_en":"Vijaya Dashami tika"}'::jsonb, 'kathmandu', 'https://en.nepalkhabar.com/news/detail/68/', 'Nepal Khabar (2022-10-05), Panchanga Nirnayak Samiti', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2024-10-12', 'sait', 'vijaya_dashami:vijaya_dashami_tika', '{"start_local":"2024-10-12T11:36","end_local":null,"tz":"Asia/Kathmandu","label_ne":"विजया दशमी टीका","label_en":"Vijaya Dashami tika"}'::jsonb, 'kathmandu', 'https://kathmandupost.com/national/2024/10/12/vijaya-dashami-festival-celebration-today', 'The Kathmandu Post (2024-10-12), Nepal Panchanga Nirnayak Bikas Samiti', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2024-10-12', 'sait', 'vijaya_dashami:durga_visarjan', '{"start_local":"2024-10-12T08:33","end_local":null,"tz":"Asia/Kathmandu","label_ne":"दुर्गा विसर्जन","label_en":"Durga visarjan"}'::jsonb, 'kathmandu', 'https://kathmandupost.com/national/2024/10/12/vijaya-dashami-festival-celebration-today', 'The Kathmandu Post (2024-10-12), Nepal Panchanga Nirnayak Bikas Samiti', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2025-10-02', 'sait', 'vijaya_dashami:vijaya_dashami_tika', '{"start_local":"2025-10-02T11:53","end_local":null,"tz":"Asia/Kathmandu","label_ne":"विजया दशमी टीका","label_en":"Vijaya Dashami tika"}'::jsonb, 'kathmandu', 'https://thehimalayantimes.com/nepal/dashain-tika-timings-announced-for-nepalis-around-the-world', 'The Himalayan Times (2025-09-21) — Dashain Tika timings announced for Nepalis around the world', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2025-10-02', 'sait', 'vijaya_dashami:vijaya_dashami_tika', '{"start_local":"2025-10-02T11:49","end_local":null,"tz":"Asia/Kolkata","label_ne":"विजया दशमी टीका","label_en":"Vijaya Dashami tika"}'::jsonb, 'delhi', 'https://www.ujyaalonepal.com/2025/325103/', 'Ujyaalo Nepal (2025-10-02) — आज बडा दशैंको टीका : यस्तो छ विभिन्न देशमा टीका लगाउने साइत (reports अन्तर्राष्ट्रिय पञ्चांग निर्णय समिति)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2025-10-01', 'sait', 'vijaya_dashami:vijaya_dashami_tika', '{"start_local":"2025-10-01T11:25","end_local":null,"tz":"America/New_York","label_ne":"विजया दशमी टीका","label_en":"Vijaya Dashami tika"}'::jsonb, 'new_york', 'https://www.ujyaalonepal.com/2025/325103/', 'Ujyaalo Nepal (2025-10-02) — आज बडा दशैंको टीका : यस्तो छ विभिन्न देशमा टीका लगाउने साइत (reports अन्तर्राष्ट्रिय पञ्चांग निर्णय समिति)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2025-10-01', 'sait', 'vijaya_dashami:vijaya_dashami_tika', '{"start_local":"2025-10-01T11:55","end_local":null,"tz":"America/Toronto","label_ne":"विजया दशमी टीका","label_en":"Vijaya Dashami tika"}'::jsonb, 'toronto', 'https://www.ujyaalonepal.com/2025/325103/', 'Ujyaalo Nepal (2025-10-02) — आज बडा दशैंको टीका : यस्तो छ विभिन्न देशमा टीका लगाउने साइत (reports अन्तर्राष्ट्रिय पञ्चांग निर्णय समिति)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2025-10-02', 'sait', 'vijaya_dashami:vijaya_dashami_tika', '{"start_local":"2025-10-02T11:31","end_local":null,"tz":"Asia/Tokyo","label_ne":"विजया दशमी टीका","label_en":"Vijaya Dashami tika"}'::jsonb, 'tokyo', 'https://www.ujyaalonepal.com/2025/325103/', 'Ujyaalo Nepal (2025-10-02) — आज बडा दशैंको टीका : यस्तो छ विभिन्न देशमा टीका लगाउने साइत (reports अन्तर्राष्ट्रिय पञ्चांग निर्णय समिति)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2025-10-02', 'sait', 'vijaya_dashami:vijaya_dashami_tika', '{"start_local":"2025-10-02T11:43","end_local":null,"tz":"Australia/Sydney","label_ne":"विजया दशमी टीका","label_en":"Vijaya Dashami tika"}'::jsonb, 'sydney', 'https://www.ujyaalonepal.com/2025/325103/', 'Ujyaalo Nepal (2025-10-02) — आज बडा दशैंको टीका : यस्तो छ विभिन्न देशमा टीका लगाउने साइत (reports अन्तर्राष्ट्रिय पञ्चांग निर्णय समिति)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2025-10-02', 'sait', 'vijaya_dashami:vijaya_dashami_tika', '{"start_local":"2025-10-02T11:19","end_local":null,"tz":"Australia/Melbourne","label_ne":"विजया दशमी टीका","label_en":"Vijaya Dashami tika"}'::jsonb, 'melbourne', 'https://www.ujyaalonepal.com/2025/325103/', 'Ujyaalo Nepal (2025-10-02) — आज बडा दशैंको टीका : यस्तो छ विभिन्न देशमा टीका लगाउने साइत (reports अन्तर्राष्ट्रिय पञ्चांग निर्णय समिति)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2025-10-02', 'sait', 'vijaya_dashami:vijaya_dashami_tika', '{"start_local":"2025-10-02T11:23","end_local":null,"tz":"Pacific/Auckland","label_ne":"विजया दशमी टीका","label_en":"Vijaya Dashami tika"}'::jsonb, 'wellington', 'https://www.ujyaalonepal.com/2025/325103/', 'Ujyaalo Nepal (2025-10-02) — आज बडा दशैंको टीका : यस्तो छ विभिन्न देशमा टीका लगाउने साइत (reports अन्तर्राष्ट्रिय पञ्चांग निर्णय समिति)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2025-10-02', 'sait', 'vijaya_dashami:vijaya_dashami_tika', '{"start_local":"2025-10-02T09:17","end_local":null,"tz":"Europe/London","label_ne":"विजया दशमी टीका","label_en":"Vijaya Dashami tika"}'::jsonb, 'london', 'https://www.ujyaalonepal.com/2025/325103/', 'Ujyaalo Nepal (2025-10-02) — आज बडा दशैंको टीका : यस्तो छ विभिन्न देशमा टीका लगाउने साइत (reports अन्तर्राष्ट्रिय पञ्चांग निर्णय समिति)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2025-10-02', 'sait', 'vijaya_dashami:vijaya_dashami_tika', '{"start_local":"2025-10-02T11:35","end_local":null,"tz":"Asia/Jerusalem","label_ne":"विजया दशमी टीका","label_en":"Vijaya Dashami tika"}'::jsonb, 'tel_aviv', 'https://www.ujyaalonepal.com/2025/325103/', 'Ujyaalo Nepal (2025-10-02) — आज बडा दशैंको टीका : यस्तो छ विभिन्न देशमा टीका लगाउने साइत (reports अन्तर्राष्ट्रिय पञ्चांग निर्णय समिति)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
insert into public.official_panchang_facts (fact_date, kind, key, value, location_key, source_url, source_title, verified_at) values ('2025-10-01', 'sait', 'vijaya_dashami:vijaya_dashami_tika', '{"start_local":"2025-10-01T11:05","end_local":null,"tz":"America/Chicago","label_ne":"विजया दशमी टीका","label_en":"Vijaya Dashami tika"}'::jsonb, 'bowling_green_ky', 'https://www.ujyaalonepal.com/2025/325103/', 'Ujyaalo Nepal (2025-10-02) — आज बडा दशैंको टीका : यस्तो छ विभिन्न देशमा टीका लगाउने साइत (reports अन्तर्राष्ट्रिय पञ्चांग निर्णय समिति)', now()) on conflict (fact_date, kind, key, location_key) do nothing;
commit;

-- ============================================================================
-- 20260928023224_rashifal_publication_store
-- recovered from live Supabase migration history
-- ============================================================================

create table if not exists public.miti_rashifal_publications (
  id text primary key,
  engine_version text not null,
  window_key text not null,
  system text not null check (system in ('vedic','western')),
  period text not null check (period in ('daily','weekly','monthly')),
  calendar text not null check (calendar in ('bs','gregorian')),
  period_window jsonb not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  constraint miti_rashifal_id_sha256 check (id ~ '^[0-9a-f]{64}$'),
  constraint miti_rashifal_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint miti_rashifal_window_object check (jsonb_typeof(period_window) = 'object')
);
alter table public.miti_rashifal_publications enable row level security;
revoke all on table public.miti_rashifal_publications from anon, authenticated;
grant select, insert, update, delete on table public.miti_rashifal_publications to service_role;
create index if not exists miti_rashifal_window_idx on public.miti_rashifal_publications(window_key, system);
create index if not exists miti_rashifal_created_idx on public.miti_rashifal_publications(created_at desc);
comment on table public.miti_rashifal_publications is
'Public universal Rashifal publication batches only. Birth details and personalized readings must never be stored here.';


-- ============================================================================
-- 20260928040059_astronomical_sync_apod_cache
-- recovered from live Supabase migration history
-- ============================================================================

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


-- ============================================================================
-- 20260928042229_astronomical_sync_calendar_map
-- recovered from live Supabase migration history
-- ============================================================================

create table if not exists public.astronomy_calendar_map (
  ad_date date primary key,
  payload jsonb not null,
  source_version text not null default 'patro-archive-v1',
  created_at timestamptz not null default now()
);

alter table public.astronomy_calendar_map enable row level security;

create index if not exists astronomy_calendar_map_source_idx
  on public.astronomy_calendar_map (source_version);

comment on table public.astronomy_calendar_map is
  'Private server-side AD/BS/Nepal-Sambat/Panchang synchronization map migrated from the existing Patro archive for the single router Edge Function.';


-- ============================================================================
-- 20260928043644_fix_apod_cache_date_constraint
-- recovered from live Supabase migration history
-- ============================================================================

alter table public.nasa_apod_cache
  drop constraint if exists nasa_apod_cache_date_format_chk;

alter table public.nasa_apod_cache
  add constraint nasa_apod_cache_date_format_chk
  check (date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');


-- ============================================================================
-- 20260928043932_remove_unused_calendar_map_source_index
-- recovered from live Supabase migration history
-- ============================================================================
drop index if exists public.astronomy_calendar_map_source_idx;

-- ============================================================================
-- 20260928065511_ensure_nasa_apod_cache_for_router
-- recovered from live Supabase migration history
-- ============================================================================
create table if not exists public.nasa_apod_cache (
  date text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.nasa_apod_cache enable row level security;

comment on table public.nasa_apod_cache is
  'Server-side NASA APOD cache used by the Supabase Edge Function router. Service-role access only.';

-- ============================================================================
-- 20260928081314_astronomy_cosmic_cache
-- recovered from live Supabase migration history
-- ============================================================================

create table if not exists public.nasa_cosmic_cache (
  cache_key text primary key,
  source text not null,
  request_date date,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nasa_cosmic_cache_expires_at_idx
  on public.nasa_cosmic_cache (expires_at);

alter table public.nasa_cosmic_cache enable row level security;

drop policy if exists "nasa cosmic cache deny anon" on public.nasa_cosmic_cache;
create policy "nasa cosmic cache deny anon"
  on public.nasa_cosmic_cache
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "nasa cosmic cache deny authenticated" on public.nasa_cosmic_cache;
create policy "nasa cosmic cache deny authenticated"
  on public.nasa_cosmic_cache
  for all
  to authenticated
  using (false)
  with check (false);

comment on table public.nasa_cosmic_cache is
  'Server-only NASA/astronomy upstream response cache. Client roles are explicitly denied; Edge Functions use service-role access.';


-- ============================================================================
-- 20260928125934_market_snapshots_nepse_metadata
-- recovered from live Supabase migration history
-- ============================================================================

alter table public.market_snapshots
  add column if not exists change numeric,
  add column if not exists percent_change numeric,
  add column if not exists source_label text,
  add column if not exists source_updated_at timestamptz;

comment on column public.market_snapshots.change is 'Absolute movement for index-like market snapshots.';
comment on column public.market_snapshots.percent_change is 'Percent movement for index-like market snapshots.';
comment on column public.market_snapshots.source_label is 'Human-readable provenance label shown in UI.';
comment on column public.market_snapshots.source_updated_at is 'Timestamp reported by the upstream source, when available.';


-- ============================================================================
-- 20260928150008_security_least_privilege_and_rls_hardening
-- recovered from live Supabase migration history
-- ============================================================================

-- Security hardening: remove broad client table privileges, then grant only operations
-- that are explicitly permitted by row-level-security policies.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Public read-only datasets.
GRANT SELECT ON TABLE
  public.app_flags,
  public.calendar_coverage_tiers,
  public.calendar_reference_sources,
  public.fm_stations,
  public.holiday_coverage,
  public.holidays,
  public.market_snapshots,
  public.nepal_sambat_facts,
  public.nepal_sambat_months,
  public.nepal_sambat_observances,
  public.nepal_sambat_tithi_names,
  public.news_category_keywords,
  public.news_clusters,
  public.news_items,
  public.news_source_health,
  public.np_districts,
  public.official_panchang_facts,
  public.time_machine_moments,
  public.weekly_off_rules
TO anon, authenticated;

-- Authenticated user-owned / membership-controlled tables.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.astrology_chart_cache,
  public.astrology_profiles,
  public.calendar_space_events,
  public.calendar_space_members,
  public.calendar_spaces,
  public.family_invites,
  public.shared_events,
  public.user_calendar_state
TO authenticated;

GRANT SELECT, INSERT ON TABLE
  public.audit_log,
  public.correction_reports
TO authenticated;

GRANT SELECT, UPDATE, DELETE ON TABLE
  public.families,
  public.family_members
TO authenticated;

GRANT INSERT ON TABLE public.fm_reports TO authenticated;
GRANT SELECT ON TABLE public.notification_jobs TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.personal_ics_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, DELETE ON TABLE public.push_subscriptions TO authenticated;

-- Admin writes remain gated by existing RLS admin policies.
GRANT INSERT, UPDATE, DELETE ON TABLE
  public.holiday_coverage,
  public.holidays,
  public.official_panchang_facts,
  public.weekly_off_rules
TO authenticated;

-- Rewrite the FM report insert policy so auth.uid() is evaluated once per statement.
DROP POLICY IF EXISTS "signed-in users can report" ON public.fm_reports;
CREATE POLICY "signed-in users can report"
ON public.fm_reports
FOR INSERT
TO authenticated
WITH CHECK (((SELECT auth.uid()) = user_id) AND (status = 'pending'::text));

-- Cover the FK paths flagged by the database advisor to reduce scan amplification.
CREATE INDEX IF NOT EXISTS fm_reports_station_id_idx ON public.fm_reports (station_id);
CREATE INDEX IF NOT EXISTS fm_reports_user_id_idx ON public.fm_reports (user_id);
CREATE INDEX IF NOT EXISTS fm_stream_candidates_station_id_idx ON public.fm_stream_candidates (station_id);


-- ============================================================================
-- 20260928150257_security_hardening_client_privileges
-- recovered from live Supabase migration history
-- ============================================================================

-- Remove privileges that browser roles never need. PostgreSQL RLS does not
-- govern TRUNCATE/REFERENCES/TRIGGER, so these should not be granted to clients.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- Server-only state remains available to service_role but not directly to browser roles.
revoke all privileges on table public.astronomy_calendar_map from anon, authenticated;
revoke all privileges on table public.nasa_apod_cache from anon, authenticated;
revoke all privileges on table public.nasa_cosmic_cache from anon, authenticated;
revoke all privileges on table public.api_rate_buckets from anon, authenticated;
revoke all privileges on table public.api_rate_limit_buckets from anon, authenticated;
revoke all privileges on table public.fm_stream_candidates from anon, authenticated;
revoke all privileges on table public.miti_rashifal_publications from anon, authenticated;
revoke all privileges on table public.on_this_day_events from anon, authenticated;

-- Secure defaults: future objects are private until a migration explicitly grants access.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete, truncate, references, trigger on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke usage, select, update on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- Preserve FM report behavior while avoiding per-row auth.uid() reevaluation.
drop policy if exists "signed-in users can report" on public.fm_reports;
create policy "signed-in users can report"
on public.fm_reports
for insert
to authenticated
with check ((select auth.uid()) = user_id and status = 'pending');

-- Cover the FKs used by report/candidate lookups and deletes.
create index if not exists fm_reports_station_id_idx on public.fm_reports(station_id);
create index if not exists fm_reports_user_id_idx on public.fm_reports(user_id);
create index if not exists fm_stream_candidates_station_id_idx on public.fm_stream_candidates(station_id);


-- ============================================================================
-- 20260928151106_security_revoke_postgres_client_default_privileges
-- recovered from live Supabase migration history
-- ============================================================================

    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
      REVOKE ALL ON TABLES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
      REVOKE ALL ON SEQUENCES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
      REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
      REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
  

-- ============================================================================
-- 20260928160337_restore_preexisting_bbc_cin_fm_entries
-- recovered from live Supabase migration history
-- ============================================================================

insert into public.fm_stations
  (slug,name_ne,name_en,frequency_mhz,district_id,city,languages,website,stream_url,stream_format,stream_status,stream_evidence_url,listing_source,category,last_checked_at,last_ok_at,updated_at)
values
  (
    'bbc-nepali','बीबीसी नेपाली','BBC Nepali',null,null,'London',
    array['नेपाली']::text[],'https://www.bbc.com/nepali',
    'https://stream.live.vc.bbcmedia.co.uk/bbc_nepali_radio','mp3','verified',
    'https://www.bbc.com/nepali','restored from prior Patro media catalog',
    'समाचार',now(),now(),now()
  ),
  (
    'cin-khabar','सीआईएन खबर','CIN Khabar',null,'kathmandu','Kathmandu',
    array['नेपाली']::text[],'https://www.cin.org.np/',
    'https://streaming.softnep.net:10996/;stream.mp3','aac','verified',
    'https://www.cin.org.np/','restored from prior Patro media catalog',
    'समाचार तथा Community',now(),now(),now()
  )
on conflict (slug) do update set
  name_ne=excluded.name_ne,
  name_en=excluded.name_en,
  city=excluded.city,
  languages=excluded.languages,
  website=excluded.website,
  stream_url=excluded.stream_url,
  stream_format=excluded.stream_format,
  stream_status=excluded.stream_status,
  stream_evidence_url=excluded.stream_evidence_url,
  listing_source=excluded.listing_source,
  category=excluded.category,
  updated_at=now();


-- ============================================================================
-- 20260929123610_community_suites_schema
-- recovered from live Supabase migration history
-- ============================================================================

create table if not exists public.community_festivals (
  suite text not null, id text not null, dev text not null, roman text, en text, rule jsonb not null,
  start_offset smallint default 0, span_days smallint default 1, regions jsonb, communities text[], summary text,
  details text[], places text[], holiday text, announced boolean default false, status text not null, sources text[],
  primary key (suite, id)
);
create table if not exists public.community_dates (
  suite text not null, festival_id text not null, region text, year smallint not null,
  main date not null, start_ad date not null, end_ad date not null, confidence text not null,
  primary key (suite, festival_id, year, main)
);
create index if not exists community_dates_start on public.community_dates(start_ad);
create table if not exists public.community_overrides (
  suite text not null, festival_id text not null, year smallint not null, start_ad date not null, end_ad date, note text,
  created_by text, created_at timestamptz default now(), primary key (suite, festival_id, year)
);

create table if not exists public.ns_months (
  n smallint primary key, amanta_index smallint not null, dev text not null, newa text not null, roman text not null,
  dev_variants text[] not null default '{}', lunar_sanskrit text, full_moon_dev text, full_moon_newa text, full_moon_roman text,
  gregorian text, status text not null, sources text[] not null
);
create table if not exists public.ns_festivals (
  id text primary key, dev text not null, newa text not null, roman text not null, en text not null, aliases text[] not null default '{}',
  anchor jsonb not null, span_days smallint not null default 1, tradition text not null, places text[] not null default '{}',
  summary text, is_new_year boolean default false, public_holiday text, declared_annually boolean default false,
  status text not null, sources text[] not null default '{}', updated_at timestamptz default now()
);
create table if not exists public.ns_festival_dates (
  ns_year smallint not null, festival_id text not null references public.ns_festivals(id), start_ad date not null, end_ad date not null,
  confidence text not null check (confidence in ('computed','confirmed')), confirmed_by text, note text,
  primary key (ns_year, festival_id)
);
create index if not exists ns_festival_dates_start on public.ns_festival_dates(start_ad);
create table if not exists public.ns_days (
  ad date primary key, ns_year smallint not null, ns_month smallint not null, ns_adhik boolean not null,
  ns_paksha text not null, ns_tithi smallint not null, ns_label text not null, ns_label_newa text not null,
  solar_year smallint not null, solar_month smallint not null, solar_day smallint not null
);

alter table public.community_festivals enable row level security;
alter table public.community_dates enable row level security;
alter table public.community_overrides enable row level security;
alter table public.ns_months enable row level security;
alter table public.ns_festivals enable row level security;
alter table public.ns_festival_dates enable row level security;
alter table public.ns_days enable row level security;

do $$
declare t text;
begin
  foreach t in array array['community_festivals','community_dates','community_overrides','ns_months','ns_festivals','ns_festival_dates','ns_days']
  loop
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename=t and policyname='public_read'
    ) then
      execute format('create policy public_read on public.%I for select to anon, authenticated using (true)', t);
    end if;
  end loop;
end $$;

grant select on public.community_festivals, public.community_dates, public.community_overrides,
  public.ns_months, public.ns_festivals, public.ns_festival_dates, public.ns_days to anon, authenticated;
revoke insert, update, delete on public.community_festivals, public.community_dates, public.community_overrides,
  public.ns_months, public.ns_festivals, public.ns_festival_dates, public.ns_days from anon, authenticated;


-- ============================================================================
-- 20260929230258_community_preferences_and_admin
-- recovered from live Supabase migration history
-- ============================================================================

create table if not exists public.user_community_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  communities text[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint user_community_preferences_allowed check (
    communities <@ array['nepal-sambat','lhosar','tharu','mithila','kirat','hijri']::text[]
  )
);
alter table public.user_community_preferences enable row level security;
grant select, insert, update, delete on public.user_community_preferences to authenticated;
do $$
begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='user_community_preferences' and policyname='own_preferences_select') then
    create policy own_preferences_select on public.user_community_preferences for select to authenticated using (auth.uid()=user_id);
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='user_community_preferences' and policyname='own_preferences_insert') then
    create policy own_preferences_insert on public.user_community_preferences for insert to authenticated with check (auth.uid()=user_id);
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='user_community_preferences' and policyname='own_preferences_update') then
    create policy own_preferences_update on public.user_community_preferences for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='user_community_preferences' and policyname='own_preferences_delete') then
    create policy own_preferences_delete on public.user_community_preferences for delete to authenticated using (auth.uid()=user_id);
  end if;
end $$;

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"admin"}'::jsonb
where email='aprashna.suraj@gmail.com';


-- ============================================================================
-- 20260929232419_add_bhoto_jatra_declared_event
-- recovered from live Supabase migration history
-- ============================================================================
insert into public.ns_festivals
(id,dev,newa,roman,en,aliases,anchor,span_days,tradition,places,summary,is_new_year,public_holiday,declared_annually,status,sources)
values
('bhoto-jatra','भोटो जात्रा','', 'Bhoto Jātrā','Bhoto Jatra',
 array['bhoto jatra','भोटो देखाउने जात्रा']::text[],
 '{"kind":"declared-annually"}'::jsonb,1,'both',
 array['Jawalakhel, Lalitpur']::text[],
 'रातो मच्छिन्द्रनाथ जात्राको समापनमा जावलाखेलमा भोटो देखाइने दिन; वास्तविक मिति प्रत्येक वर्ष आधिकारिक घोषणाबाट पुष्टि गरिन्छ।',
 false,'valley',true,'review',array[]::text[])
on conflict(id) do update set declared_annually=true, anchor=excluded.anchor, status='review';

-- ============================================================================
-- 20260930012901_doctor_community_rls_and_ns_fk_index
-- recovered from live Supabase migration history
-- ============================================================================

create index if not exists ns_festival_dates_festival_id_idx
  on public.ns_festival_dates(festival_id);

drop policy if exists own_preferences_select on public.user_community_preferences;
create policy own_preferences_select
  on public.user_community_preferences
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists own_preferences_insert on public.user_community_preferences;
create policy own_preferences_insert
  on public.user_community_preferences
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists own_preferences_update on public.user_community_preferences;
create policy own_preferences_update
  on public.user_community_preferences
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists own_preferences_delete on public.user_community_preferences;
create policy own_preferences_delete
  on public.user_community_preferences
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

