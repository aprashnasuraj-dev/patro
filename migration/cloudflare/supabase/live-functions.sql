-- accept_family_invite
CREATE OR REPLACE FUNCTION public.accept_family_invite(p_token_hash text, p_display_name text DEFAULT NULL::text, p_timezone text DEFAULT 'Asia/Kathmandu'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
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
end $function$


-- consume_api_quota
CREATE OR REPLACE FUNCTION public.consume_api_quota(p_bucket_key text, p_route text, p_window_start timestamp with time zone, p_limit integer)
 RETURNS TABLE(allowed boolean, request_count integer, quota_limit integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$


-- consume_public_api_rate
CREATE OR REPLACE FUNCTION public.consume_public_api_rate(p_key_hash text, p_limit integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
$function$


-- create_family
CREATE OR REPLACE FUNCTION public.create_family(p_name text, p_display_name text DEFAULT NULL::text, p_timezone text DEFAULT 'Asia/Kathmandu'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  insert into public.families (name, created_by) values (p_name, auth.uid()) returning id into fid;
  insert into public.family_members (family_id, user_id, role, display_name, timezone) values (fid, auth.uid(), 'owner', p_display_name, p_timezone);
  return fid;
end $function$


-- fm_reports_rate_limit
CREATE OR REPLACE FUNCTION public.fm_reports_rate_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$


-- my_data_delete
CREATE OR REPLACE FUNCTION public.my_data_delete()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  delete from public.families f where exists (select 1 from public.family_members m where m.family_id = f.id and m.user_id = auth.uid() and m.role = 'owner');
  delete from public.family_members where user_id = auth.uid();
  delete from public.push_subscriptions where user_id = auth.uid();
  delete from public.personal_ics_tokens where user_id = auth.uid();
  update public.shared_events set created_by = null where created_by = auth.uid();
  update public.shared_events set updated_by = null where updated_by = auth.uid();
end $function$


-- my_data_export
CREATE OR REPLACE FUNCTION public.my_data_export()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'auth'
AS $function$
  select jsonb_build_object(
    'user_id', auth.uid(),
    'families', coalesce((select jsonb_agg(f) from public.families f where public.is_family_member(f.id)), '[]'::jsonb),
    'memberships', coalesce((select jsonb_agg(m) from public.family_members m where m.user_id = auth.uid()), '[]'::jsonb),
    'shared_events_created', coalesce((select jsonb_agg(e) from public.shared_events e where e.created_by = auth.uid()), '[]'::jsonb),
    'push_subscriptions', coalesce((select jsonb_agg(jsonb_build_object('device_id', s.device_id, 'user_agent_family', s.user_agent_family, 'timezone', s.timezone, 'quiet_hours', s.quiet_hours, 'created_at', s.created_at, 'last_success_at', s.last_success_at)) from public.push_subscriptions s where s.user_id = auth.uid()), '[]'::jsonb),
    'notification_jobs', coalesce((select jsonb_agg(jsonb_build_object('fire_at_utc', j.fire_at_utc, 'category', j.category, 'status', j.status)) from public.notification_jobs j join public.push_subscriptions s using (device_id) where s.user_id = auth.uid()), '[]'::jsonb),
    'personal_ics', coalesce((select jsonb_agg(jsonb_build_object('created_at', t.created_at)) from public.personal_ics_tokens t where t.user_id = auth.uid()), '[]'::jsonb)
  )
$function$


-- nm_runtime_secret
CREATE OR REPLACE FUNCTION public.nm_runtime_secret(secret_name text)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'vault', 'pg_catalog'
AS $function$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = secret_name
  limit 1
$function$


-- nm_store_runtime_secret
CREATE OR REPLACE FUNCTION public.nm_store_runtime_secret(secret_name text, secret_value text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'vault', 'pg_catalog'
AS $function$
begin
  if exists(select 1 from vault.decrypted_secrets where name=secret_name) then
    update vault.secrets
       set secret = secret_value,
           updated_at = now()
     where id = (select id from vault.decrypted_secrets where name=secret_name limit 1);
  else
    perform vault.create_secret(secret_value, secret_name);
  end if;
end
$function$


-- update_shared_event
CREATE OR REPLACE FUNCTION public.update_shared_event(p_id uuid, p_expected_updated_at timestamp with time zone, p_patch jsonb)
 RETURNS shared_events
 LANGUAGE plpgsql
 SET search_path TO 'public', 'auth'
AS $function$
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
end $function$

