-- Legacy Rashifal bootstrap marker retained only for migration compatibility.
-- This migration is strictly additive: it must never delete or replace existing publications.
-- Canonical Rashifal publications are classified as required retained data and are populated
-- by the canonical D1 content snapshot, not by destructive migration-time reseeding.
BEGIN TRANSACTION;
INSERT OR IGNORE INTO content_records(table_name,record_key,ad_date,year,month,day,category,sort_order,payload,updated_at) VALUES('miti_rashifal_publications','cloudflare-bootstrap-marker',NULL,NULL,NULL,NULL,NULL,NULL,'{"id":"cloudflare-bootstrap-marker","engine_version":"bundle-v1.0.0-cloudflare-bootstrap","window_key":"bootstrap:2000-01-01","system":"vedic","period":"daily","calendar":"bs","period_window":{"start_date":"2000-01-01","end_date_exclusive":"2000-01-02"},"payload":{"schema_version":"1","engine_version":"bundle-v1.0.0-cloudflare-bootstrap","window":{"kind":"daily","calendar":"bs","start_date":"2000-01-01","end_date_exclusive":"2000-01-02"},"system":"vedic","readings":[],"notices":["Legacy bootstrap marker; canonical Rashifal publications are retained separately."],"generated_at":"2000-01-01T00:00:00Z"},"created_at":"2000-01-01T00:00:00Z"}','2000-01-01T00:00:00Z');
COMMIT;
