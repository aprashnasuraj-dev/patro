-- Security hardening applied to production on 2026-09-28.
-- Least-privilege grants complement RLS; RLS does not protect TRUNCATE.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

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

GRANT SELECT, INSERT ON TABLE public.audit_log, public.correction_reports TO authenticated;
GRANT SELECT, UPDATE, DELETE ON TABLE public.families, public.family_members TO authenticated;
GRANT INSERT ON TABLE public.fm_reports TO authenticated;
GRANT SELECT ON TABLE public.notification_jobs TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.personal_ics_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, DELETE ON TABLE public.push_subscriptions TO authenticated;

GRANT INSERT, UPDATE, DELETE ON TABLE
  public.holiday_coverage,
  public.holidays,
  public.official_panchang_facts,
  public.weekly_off_rules
TO authenticated;

DROP POLICY IF EXISTS "signed-in users can report" ON public.fm_reports;
CREATE POLICY "signed-in users can report"
ON public.fm_reports
FOR INSERT
TO authenticated
WITH CHECK (((SELECT auth.uid()) = user_id) AND (status = 'pending'::text));

CREATE INDEX IF NOT EXISTS fm_reports_station_id_idx ON public.fm_reports (station_id);
CREATE INDEX IF NOT EXISTS fm_reports_user_id_idx ON public.fm_reports (user_id);
CREATE INDEX IF NOT EXISTS fm_stream_candidates_station_id_idx ON public.fm_stream_candidates (station_id);
