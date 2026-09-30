-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260919001127
-- Name: nepal_sambat_reference_facts
-- Recovered 2026-09-30


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

