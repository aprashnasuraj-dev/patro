-- Isolated proposed migration. NOT applied to existing production D1.
-- GitHub runners must call one authenticated quota coordinator; they must never
-- create a separate local SQLite quota db per runner.
CREATE TABLE IF NOT EXISTS mangal_provider_quota (
 provider TEXT NOT NULL, window_key TEXT NOT NULL, request_limit INTEGER NOT NULL CHECK(request_limit>0),
 used INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(provider,window_key));
CREATE TABLE IF NOT EXISTS mangal_quota_reservation (
 request_key TEXT PRIMARY KEY, provider TEXT NOT NULL, window_key TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('reserved','completed','ambiguous')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS mangal_quota_provider ON mangal_quota_reservation(provider,window_key);
-- Atomic guarded reservation: coordinator runs BEGIN IMMEDIATE then INSERT OR IGNORE,
-- UPDATE ... WHERE used < request_limit RETURNING used, then INSERT unique request_key,
-- COMMIT. Roll back on conflict/no capacity. Preserve uncertain sends as consumed.
