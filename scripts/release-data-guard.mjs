import { readdir, rm, stat } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");
const calendarDir = resolve(dist, "data/calendar");
const allowedCalendarRootEntries = new Set(["offline-window.json", "offline-24-months"]);
const MAX_OFFLINE_TOTAL_BYTES = 8 * 1024 * 1024;
const MAX_OFFLINE_FILES = 32;

// The raw calendar archive may exist during build/data work, but it must never be
// published. Preserve only the intentionally bounded offline payload:
//   - legacy 92-day compatibility window
//   - 12 BS months back + current + 12 BS months forward (25 month shards + index)
// Everything else under dist/data/calendar is removed before deployment.
let prunedCalendarEntries = 0;
try {
  for (const entry of await readdir(calendarDir, { withFileTypes: true })) {
    if (allowedCalendarRootEntries.has(entry.name)) continue;
    await rm(resolve(calendarDir, entry.name), { recursive: true, force: true });
    prunedCalendarEntries += 1;
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const forbiddenExtensions = new Set([".sql", ".sqlite", ".sqlite3", ".db", ".dump", ".bak", ".map"]);
const forbiddenNames = new Set([".env", ".env.local", ".env.production", ".env.development"]);
const violations = [];
let offlineFiles = 0;
let offlineBytes = 0;

async function walk(dir) {
  for (const name of await readdir(dir)) {
    const full = resolve(dir, name);
    const info = await stat(full);
    if (info.isDirectory()) {
      await walk(full);
      continue;
    }
    const lower = name.toLowerCase();
    if (forbiddenNames.has(lower) || forbiddenExtensions.has(extname(lower))) {
      violations.push(relative(dist, full));
    }
    const rel = relative(calendarDir, full).replaceAll("\\", "/");
    if (rel === "offline-window.json" || rel.startsWith("offline-24-months/")) {
      offlineFiles += 1;
      offlineBytes += info.size;
    }
  }
}

await walk(dist);
if (violations.length) {
  throw new Error(`release-data-guard: forbidden deploy artifacts found: ${violations.join(", ")}`);
}
if (offlineFiles > MAX_OFFLINE_FILES || offlineBytes > MAX_OFFLINE_TOTAL_BYTES) {
  throw new Error(`release-data-guard: bounded calendar payload exceeded limit (${offlineFiles} files, ${offlineBytes} bytes)`);
}

console.log(JSON.stringify({
  ok: true,
  pruned_bulk_calendar_entries: prunedCalendarEntries,
  preserved_bounded_calendar_files: offlineFiles,
  preserved_bounded_calendar_bytes: offlineBytes,
  forbidden_artifact_count: 0
}, null, 2));
