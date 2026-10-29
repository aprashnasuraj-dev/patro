-- The external growth monitor uses these tables. Mirror its schema on new databases.
CREATE TABLE IF NOT EXISTS growth_gate_runs (
  run_id TEXT PRIMARY KEY, started_at TEXT NOT NULL, finished_at TEXT NOT NULL,
  trigger_type TEXT NOT NULL, overall_status TEXT NOT NULL, passed INTEGER NOT NULL,
  failed INTEGER NOT NULL, result_json TEXT NOT NULL CHECK(json_valid(result_json))
);
CREATE TABLE IF NOT EXISTS growth_gate_checks (
  run_id TEXT NOT NULL, check_key TEXT NOT NULL, url TEXT NOT NULL, status_code INTEGER,
  passed INTEGER NOT NULL, detail TEXT, checked_at TEXT NOT NULL,
  PRIMARY KEY(run_id,check_key), FOREIGN KEY(run_id) REFERENCES growth_gate_runs(run_id)
);
-- (passed,checked_at) cannot efficiently answer the timestamp-only retention query.
CREATE INDEX IF NOT EXISTS idx_growth_gate_checks_checked_at ON growth_gate_checks(checked_at);
CREATE INDEX IF NOT EXISTS idx_growth_gate_runs_started_at ON growth_gate_runs(started_at);
CREATE TABLE IF NOT EXISTS runtime_schema_versions (
  component TEXT PRIMARY KEY, version TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Markers are written only after the component's complete bootstrap succeeds.
