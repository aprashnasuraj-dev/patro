-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260919001255
-- Name: add_primary_nepal_sambat_sources
-- Recovered 2026-09-30


insert into public.calendar_reference_sources(topic,authority,url,source_role,source_level,metadata)
values
('nepal-sambat','Government of Nepal / MoFAGA-hosted document','https://www.mofaga.gov.np/notice-file/Notices-20240108125907641.pdf','Primary guidance on Nepal Sambat date writing, lunar year/month boundaries and tithi numbering','government-primary','{}'),
('nepal-sambat','Office of the President of Nepal','https://president.gov.np/','Current government notation and Nepal Sambat New Year examples','government-primary','{}')
on conflict(topic,url) do update set authority=excluded.authority,source_role=excluded.source_role,source_level=excluded.source_level,metadata=excluded.metadata;
