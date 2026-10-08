-- Idempotent additive rollup migration. The Worker may already have added
-- aap_pageviews.weight on first request. The release reconciler verifies/adds
-- REAL NOT NULL DEFAULT 1 after migrations apply, for old and new databases.
CREATE TABLE IF NOT EXISTS aap_pageview_daily(day TEXT NOT NULL,dimension TEXT NOT NULL,key TEXT NOT NULL,views REAL NOT NULL,visitors INTEGER NOT NULL,PRIMARY KEY(day,dimension,key));
CREATE TABLE IF NOT EXISTS aap_pageview_rollup_days(day TEXT PRIMARY KEY,completed_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS aap_pageview_daily_dimension_day_idx ON aap_pageview_daily(dimension,day);
CREATE INDEX IF NOT EXISTS aap_pageviews_path_ts_idx ON aap_pageviews(path,ts);
CREATE INDEX IF NOT EXISTS aap_pageviews_visitor_ts_idx ON aap_pageviews(visitor,ts);
CREATE INDEX IF NOT EXISTS aap_pageviews_country_ts_idx ON aap_pageviews(country,ts);
CREATE INDEX IF NOT EXISTS aap_pageviews_device_ts_idx ON aap_pageviews(device,ts);
CREATE INDEX IF NOT EXISTS aap_pageviews_browser_ts_idx ON aap_pageviews(browser,ts);
CREATE INDEX IF NOT EXISTS aap_pageviews_referrer_ts_idx ON aap_pageviews(referrer,ts);
