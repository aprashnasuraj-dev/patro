-- Cloudflare-native runtime state. No Supabase dependency.
CREATE TABLE IF NOT EXISTS runtime_rate_buckets (
  scope TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (scope,key_hash,window_start)
);
CREATE INDEX IF NOT EXISTS idx_runtime_rate_buckets_window
  ON runtime_rate_buckets(window_start);
