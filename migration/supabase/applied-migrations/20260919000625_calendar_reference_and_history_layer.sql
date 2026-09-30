-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260919000625
-- Name: calendar_reference_and_history_layer
-- Recovered 2026-09-30


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

