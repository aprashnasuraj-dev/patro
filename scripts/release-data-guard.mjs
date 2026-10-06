import { access, readdir, stat } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");
const bulkCalendarDir = resolve(dist, "data/calendar");
const adCalendarDir = resolve(bulkCalendarDir, "ad");
const bsCalendarDir = resolve(bulkCalendarDir, "bs");

// Calendar year shards are intentional immutable release assets. They are the
// availability floor when ARCHIVE is missing or R2 is temporarily unavailable.
async function exists(target) {
  try { await access(target); return true; } catch { return false; }
}
async function jsonCount(dir) {
  if (!(await exists(dir))) return 0;
  return (await readdir(dir, { withFileTypes: true })).filter((entry) => entry.isFile() && entry.name.endsWith(".json")).length;
}
const [adCount, bsCount] = await Promise.all([jsonCount(adCalendarDir), jsonCount(bsCalendarDir)]);
if (adCount < 1 || bsCount < 1) {
  throw new Error(`release-data-guard: packaged calendar fallback missing (ad=${adCount}, bs=${bsCount}); run cloudflare:calendar-r2 before packaging`);
}

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
    if (forbiddenNames.has(lower) || forbiddenExtensions.has(extname(lower))) violations.push(relative(dist, full));
  }
}

await walk(dist);
if (violations.length) throw new Error(`release-data-guard: forbidden deploy artifacts found: ${violations.join(", ")}`);

console.log(JSON.stringify({
  ok: true,
  packaged_calendar_fallback: true,
  calendar_year_shards: adCount + bsCount,
  ad_year_shards: adCount,
  bs_year_shards: bsCount,
  forbidden_artifact_count: 0
}, null, 2));
