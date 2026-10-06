-- Guest subscriptions use a device secret; no account or password is required.
CREATE TABLE IF NOT EXISTS morning_subscriptions (
  device_id TEXT PRIMARY KEY,
  secret_hash TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  keys TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  next_due_at TEXT NOT NULL,
  last_sent_date TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  claim_until TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS morning_push_due_idx ON morning_subscriptions(next_due_at);
