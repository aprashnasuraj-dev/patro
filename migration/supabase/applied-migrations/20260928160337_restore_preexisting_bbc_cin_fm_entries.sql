-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260928160337
-- Name: restore_preexisting_bbc_cin_fm_entries
-- Recovered 2026-09-30


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

