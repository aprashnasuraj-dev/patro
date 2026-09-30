PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS content_records (
  table_name TEXT NOT NULL,
  record_key TEXT NOT NULL,
  ad_date TEXT,
  year INTEGER,
  month INTEGER,
  day INTEGER,
  category TEXT,
  sort_order INTEGER,
  payload TEXT NOT NULL CHECK (json_valid(payload)),
  updated_at TEXT,
  PRIMARY KEY (table_name, record_key)
);

CREATE INDEX IF NOT EXISTS idx_content_table_date ON content_records(table_name, ad_date);
CREATE INDEX IF NOT EXISTS idx_content_table_month_day ON content_records(table_name, month, day);
CREATE INDEX IF NOT EXISTS idx_content_table_year ON content_records(table_name, year);
CREATE INDEX IF NOT EXISTS idx_content_table_category_sort ON content_records(table_name, category, sort_order);

CREATE TABLE IF NOT EXISTS migration_state (
  source TEXT PRIMARY KEY,
  source_version TEXT,
  row_count INTEGER NOT NULL DEFAULT 0,
  imported_at TEXT NOT NULL
);
