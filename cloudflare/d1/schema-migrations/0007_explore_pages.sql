-- Explore page families (worker/explore). Additive only: new tables, no change to existing tables.
-- One row per public page. id is the SQLite rowid: it stays stable across re-imports (UPSERT on path keeps it),
-- which lets sitemap shards be addressed by id range instead of OFFSET.
CREATE TABLE IF NOT EXISTS explore_pages(
  id INTEGER PRIMARY KEY,
  family TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  parent_path TEXT,
  sort_key REAL NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  title_ne TEXT,
  description TEXT NOT NULL,
  body_json TEXT NOT NULL,
  facts_count INTEGER NOT NULL DEFAULT 0,
  source_name TEXT,
  source_url TEXT,
  indexable INTEGER NOT NULL DEFAULT 0,
  lastmod TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  import_gen INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS explore_pages_family_idx ON explore_pages(family, indexable, id);
CREATE INDEX IF NOT EXISTS explore_pages_parent_idx ON explore_pages(parent_path, sort_key, title);
CREATE INDEX IF NOT EXISTS explore_pages_gen_idx ON explore_pages(family, import_gen);

-- Sitemap shards: rebuilt after every import by scripts/explore/sql/rebuild-shards.sql.
CREATE TABLE IF NOT EXISTS explore_shards(
  family TEXT NOT NULL,
  shard INTEGER NOT NULL,
  min_id INTEGER NOT NULL,
  max_id INTEGER NOT NULL,
  url_count INTEGER NOT NULL,
  lastmod TEXT,
  PRIMARY KEY(family, shard)
);
