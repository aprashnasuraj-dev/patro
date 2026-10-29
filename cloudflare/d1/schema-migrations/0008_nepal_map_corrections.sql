-- Nepal Map end-user correction workflow.
-- No reporter email, IP address, user-agent or precise browser location is stored.
CREATE TABLE IF NOT EXISTS nepal_map_corrections (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  place_id TEXT,
  reason TEXT NOT NULL CHECK (reason IN (
    'wrong_name','wrong_location','wrong_category','wrong_admin','closed_or_removed','duplicate','missing_detail','other'
  )),
  detail TEXT NOT NULL DEFAULT '',
  page_path TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN (
    'reported','upstream_corrected','verified','queued_for_build','published','rejected','expired'
  )),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_nepal_map_corrections_source
  ON nepal_map_corrections(source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nepal_map_corrections_status
  ON nepal_map_corrections(status, created_at DESC);
