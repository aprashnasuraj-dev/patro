-- Rashifal D1 bootstrap marker.
-- Current publications remain available through worker/entry.ts Supabase compatibility fallback
-- while Cloudflare progressively takes over the public dataset. The marker is intentionally
-- outside the normal production date range so it can never be returned as a live reading.
BEGIN TRANSACTION;
DELETE FROM content_records WHERE table_name='miti_rashifal_publications';
INSERT OR REPLACE INTO content_records(table_name,record_key,ad_date,year,month,day,category,sort_order,payload,updated_at) VALUES('miti_rashifal_publications','cloudflare-bootstrap-marker',NULL,NULL,NULL,NULL,NULL,NULL,'{"id":"cloudflare-bootstrap-marker","engine_version":"bundle-v1.0.0-cloudflare-bootstrap","window_key":"bootstrap:2000-01-01","system":"vedic","period":"daily","calendar":"bs","period_window":{"start_date":"2000-01-01","end_date_exclusive":"2000-01-02"},"payload":{"schema_version":"1","engine_version":"bundle-v1.0.0-cloudflare-bootstrap","window":{"kind":"daily","calendar":"bs","start_date":"2000-01-01","end_date_exclusive":"2000-01-02"},"system":"vedic","readings":[],"notices":["Cloudflare bootstrap marker; live Rashifal is served through the compatibility path until public publication hydration completes."],"generated_at":"2000-01-01T00:00:00Z"},"created_at":"2000-01-01T00:00:00Z"}','2000-01-01T00:00:00Z');
COMMIT;
