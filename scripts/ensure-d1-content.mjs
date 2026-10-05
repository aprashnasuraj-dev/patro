import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const expectedPath = resolve(root, "cloudflare/d1/expected-public-counts.json");

function commandResult(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
    ...options,
  });
  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? 1}`);
  }
  return result;
}

function parseWranglerJson(stdout, label) {
  try {
    return JSON.parse(stdout || "null");
  } catch (error) {
    throw new Error(`Unable to parse Wrangler D1 ${label} output as JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function findResultRows(value) {
  if (Array.isArray(value)) {
    if (value.every((item) => item && typeof item === "object" && "table_name" in item && "row_count" in item)) return value;
    for (const item of value) {
      const found = findResultRows(item);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  for (const child of Object.values(value)) {
    const found = findResultRows(child);
    if (found) return found;
  }
  return null;
}

function extractRowCount(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractRowCount(item);
      if (found !== null) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  if (Object.prototype.hasOwnProperty.call(value, "row_count")) {
    const count = Number(value.row_count);
    return Number.isFinite(count) ? count : null;
  }
  for (const child of Object.values(value)) {
    const found = extractRowCount(child);
    if (found !== null) return found;
  }
  return null;
}

function expectedTableCounts() {
  const manifest = JSON.parse(readFileSync(expectedPath, "utf8"));
  const tables = manifest?.tables;
  if (!tables || typeof tables !== "object") throw new Error("Expected D1 table-count manifest is missing tables.");
  return tables;
}

export function remoteContentRowCount(config = "wrangler.jsonc") {
  const result = commandResult("npx", [
    "wrangler", "d1", "execute", "DB", "--remote",
    "--command", "SELECT COUNT(*) AS row_count FROM content_records;",
    "--json",
    "--config", config,
  ]);
  const count = extractRowCount(parseWranglerJson(result.stdout, "count"));
  if (!Number.isInteger(count) || count < 0) {
    throw new Error("Wrangler D1 count output did not contain a valid non-negative row_count.");
  }
  return count;
}

export function remotePublicTableCounts(config = "wrangler.jsonc") {
  const result = commandResult("npx", [
    "wrangler", "d1", "execute", "DB", "--remote",
    "--command", "SELECT table_name, COUNT(*) AS row_count FROM content_records GROUP BY table_name ORDER BY table_name;",
    "--json",
    "--config", config,
  ]);
  const rows = findResultRows(parseWranglerJson(result.stdout, "table-count"));
  if (!rows) throw new Error("Wrangler D1 table-count output did not contain a valid result set.");
  return Object.fromEntries(rows.map((row) => [String(row.table_name), Number(row.row_count)]));
}

function parityGaps(actual, expected) {
  const gaps = [];
  for (const [table, expectedRowsRaw] of Object.entries(expected)) {
    const expectedRows = Number(expectedRowsRaw);
    const actualRows = Number(actual[table] ?? 0);
    if (actualRows !== expectedRows) gaps.push({ table, expected: expectedRows, actual: actualRows });
  }
  return gaps;
}

export function ensureRemoteD1Content({ config = "wrangler.jsonc", snapshot = ".cloudflare/d1-import/content-snapshot.sql" } = {}) {
  const expected = expectedTableCounts();
  const beforeTotal = remoteContentRowCount(config);
  const beforeCounts = remotePublicTableCounts(config);
  const beforeGaps = parityGaps(beforeCounts, expected);

  if (!beforeGaps.length) {
    console.log(`[d1] Canonical public snapshot already present (${beforeTotal} content_records rows across ${Object.keys(expected).length} required tables). Seed import skipped.`);
    return { seeded: false, before: beforeTotal, after: beforeTotal, gaps: [] };
  }

  console.log(`[d1] Remote D1 is partial/stale: ${beforeGaps.length} required table(s) differ from the canonical snapshot.`);
  for (const gap of beforeGaps.slice(0, 12)) console.log(`[d1]  - ${gap.table}: expected ${gap.expected}, found ${gap.actual}`);
  if (beforeGaps.length > 12) console.log(`[d1]  - ...and ${beforeGaps.length - 12} more table mismatch(es)`);
  console.log("[d1] Importing canonical snapshot with idempotent INSERT OR REPLACE statements.");

  commandResult("npx", [
    "wrangler", "d1", "execute", "DB", "--remote",
    `--file=${snapshot}`,
    "--yes",
    "--config", config,
  ], { stdio: "inherit", encoding: undefined });

  const afterTotal = remoteContentRowCount(config);
  const afterCounts = remotePublicTableCounts(config);
  const afterGaps = parityGaps(afterCounts, expected);
  if (afterGaps.length) {
    const detail = afterGaps.slice(0, 8).map((gap) => `${gap.table} expected ${gap.expected}, found ${gap.actual}`).join("; ");
    throw new Error(`D1 canonical snapshot import completed but parity is still incomplete: ${detail}`);
  }

  console.log(`[d1] Canonical snapshot verified after repair (${afterTotal} content_records rows across ${Object.keys(expected).length} required tables).`);
  return { seeded: true, before: beforeTotal, after: afterTotal, gaps: beforeGaps };
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const config = process.argv[2] || "wrangler.jsonc";
  try {
    ensureRemoteD1Content({ config });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
