/** Deployment markers avoid replaying DDL in every cold Worker isolate.
 * A missing/older marker retains the existing idempotent bootstrap and recovery path.
 * Bump the component version whenever its schema or compatibility repair changes.
 */
export const ADMIN_SCHEMA_VERSION = "20261030.1";
export const AUTH_SCHEMA_VERSION = "20261030.1";
const MARKERS = "CREATE TABLE IF NOT EXISTS runtime_schema_versions (component TEXT PRIMARY KEY, version TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')))";

export async function withSchemaVersion(db: any, component: string, version: string, bootstrap: () => Promise<void>) {
  try {
    const row = await db.prepare("SELECT version FROM runtime_schema_versions WHERE component=?1").bind(component).first();
    if (row?.version === version) return;
  } catch (error) {
    // Only an absent marker table is an upgrade case. Transport/auth errors must retry.
    if (!/no such table:\s*runtime_schema_versions/i.test(String(error))) throw error;
  }
  await bootstrap();
  await db.prepare(MARKERS).bind().run();
  await db.prepare("INSERT INTO runtime_schema_versions(component,version) VALUES(?1,?2) ON CONFLICT(component) DO UPDATE SET version=excluded.version,updated_at=datetime('now')").bind(component, version).run();
}
