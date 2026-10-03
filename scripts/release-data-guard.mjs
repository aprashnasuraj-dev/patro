import { readdir, rm, stat } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");
const bulkCalendarDir = resolve(dist, "data/calendar");

// The raw archive may exist in the repository for build/data work, but it must
// never be published as a static asset. Runtime calendar reads belong behind
// the Worker/D1 API and the service worker keeps only a small bounded window.
await rm(bulkCalendarDir, { recursive: true, force: true });

const forbiddenExtensions = new Set([".sql", ".sqlite", ".sqlite3", ".db", ".dump", ".bak", ".map"]);
const forbiddenNames = new Set([".env", ".env.local", ".env.production", ".env.development"]);
const violations = [];

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
  }
}

await walk(dist);
if (violations.length) {
  throw new Error(`release-data-guard: forbidden deploy artifacts found: ${violations.join(", ")}`);
}

console.log(JSON.stringify({
  ok: true,
  removed_bulk_calendar_archive: "dist/data/calendar",
  forbidden_artifact_count: 0
}, null, 2));
