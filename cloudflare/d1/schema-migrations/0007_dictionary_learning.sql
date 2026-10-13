-- Nepali dictionary (/tool/nepalidictionary): a signed-in learner's saved words with
-- spaced-repetition state, and quiz history. Word data itself is static (/data/dict/v1).
-- Mirrored by ensureAuthSchema() in worker/auth.ts, because Cloudflare Builds does not apply migrations.
CREATE TABLE IF NOT EXISTS dict_saved_words (
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,                 -- word slug, or "en:<english word>"
  front TEXT NOT NULL,
  back TEXT NOT NULL DEFAULT '',
  dir TEXT NOT NULL DEFAULT 'ne-en' CHECK (dir IN ('ne-en','en-ne')),
  ease REAL NOT NULL DEFAULT 2.5,
  interval_d INTEGER NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  due_day INTEGER NOT NULL,              -- days since 1970-01-01 (UTC)
  added_day INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, card_id)
);
CREATE INDEX IF NOT EXISTS dict_saved_words_due_idx ON dict_saved_words(user_id, due_day);

CREATE TABLE IF NOT EXISTS dict_quiz_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  level TEXT,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS dict_quiz_results_user_idx ON dict_quiz_results(user_id, created_at);
