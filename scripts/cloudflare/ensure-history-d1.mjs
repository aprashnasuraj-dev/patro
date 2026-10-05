import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const ROOT = process.cwd();
const HISTORY_ROOT = join(ROOT, "migration", "data", "public", "on_this_day_events");
const IMPORTER = join(ROOT, "scripts", "cloudflare", "import-d1.mjs");
const MANIFEST = join(ROOT, "cloudflare", "d1", "expected-public-counts.json");
const MARKER = "release:on_this_day_events";

async function filesUnder(dir) {
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...await filesUnder(path));
    else if (ent.isFile()) out.push(path);
  }
  return out.sort();
}

async function sourceVersion() {
  const hash = createHash("sha256");
  const files = [...await filesUnder(HISTORY_ROOT), IMPORTER];
  for (const file of files) {
    hash.update(relative(ROOT, file));
    hash.update("\0");
    hash.update(await readFile(file));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

async function d1(sql, params = []) {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const database = process.env.CLOUDFLARE_D1_DATABASE_ID || process.env.CF_D1_DATABASE_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !database || !token) {
    throw new Error("Cloudflare account, D1 database and API token are required");
  }
  const url = `https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ sql, params }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false || json.result?.some?.((row) => row.success === false)) {
    throw new Error(`D1 query failed (${res.status}): ${JSON.stringify(json).slice(0, 800)}`);
  }
  return json;
}

function firstResult(json) {
  return json?.result?.[0]?.results?.[0] || null;
}

const version = await sourceVersion();
const state = firstResult(await d1(
  "SELECT source_version, row_count FROM migration_state WHERE source=?1 LIMIT 1",
  [MARKER],
));

const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
const expectedRows = Number(manifest?.tables?.on_this_day_events || 0);
if (!expectedRows) throw new Error("on_this_day_events expected row count is missing");

if (state?.source_version === version && Number(state?.row_count) === expectedRows) {
  console.log(`On This Day D1 snapshot unchanged (${expectedRows} rows); skipping ${expectedRows} redundant writes.`);
  process.exit(0);
}

console.log("On This Day source changed or has no release marker; importing once.");
const child = spawnSync(
  process.execPath,
  ["scripts/cloudflare/import-d1.mjs", "--remote", "--table=on_this_day_events"],
  { cwd: ROOT, stdio: "inherit", env: process.env },
);
if (child.status !== 0) process.exit(child.status ?? 1);

const importedAt = new Date().toISOString();
await d1(
  "INSERT INTO migration_state(source,source_version,row_count,imported_at) VALUES(?1,?2,?3,?4) ON CONFLICT(source) DO UPDATE SET source_version=excluded.source_version,row_count=excluded.row_count,imported_at=excluded.imported_at",
  [MARKER, version, expectedRows, importedAt],
);
console.log(`On This Day D1 snapshot synchronized: ${expectedRows} rows; marker=${version.slice(0, 22)}…`);
