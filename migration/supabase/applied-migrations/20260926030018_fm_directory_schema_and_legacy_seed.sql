-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260926030018
-- Name: fm_directory_schema_and_legacy_seed
-- Recovered 2026-09-30


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

