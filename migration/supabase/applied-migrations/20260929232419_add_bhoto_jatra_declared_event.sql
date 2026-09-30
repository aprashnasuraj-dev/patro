-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260929232419
-- Name: add_bhoto_jatra_declared_event
-- Recovered 2026-09-30

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
