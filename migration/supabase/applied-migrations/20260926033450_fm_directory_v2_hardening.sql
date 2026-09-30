-- Production Supabase applied migration snapshot
-- Project: pxlsmxbpgdfzjzuqtict
-- Applied version: 20260926033450
-- Name: fm_directory_v2_hardening
-- Recovered 2026-09-30


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

