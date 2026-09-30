import { createHash } from "node:crypto";
import { mkdir, open, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const snapshotDir = resolve(root, "migration/data/public/astronomy_calendar_map");
const legacySeedDir = resolve(root, "cloudflare/d1/migrations");
const outputDir = resolve(root, ".cloudflare/d1-import");
const outputSql = resolve(outputDir, "content-snapshot.sql");
const outputManifest = resolve(outputDir, "manifest.json");
const VERIFY_ONLY = process.argv.includes("--verify-only");

const EXPECTED_PARTS = 78;
const EXPECTED_ROWS = 77070;
const EXPECTED_FIRST = "1826-04-11";
const EXPECTED_LAST = "2037-04-13";
const MAX_STATEMENT_BYTES = 100_000;

function sqlString(value) {
  if (value == null) return "NULL";
  return "'" + String(value).replaceAll("'", "''") + "'";
}

function stripTransactions(sql, source) {
  const clean = sql
    .replace(/^\s*BEGIN(?:\s+TRANSACTION)?;\s*$/gim, "")
    .replace(/^\s*COMMIT;\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim() + "\n";
  if (/\bBEGIN\s+(?:TRANSACTION\s*)?;/i.test(clean) || /^\s*COMMIT;/im.test(clean)) {
    throw new Error(`Transaction wrapper remained in ${source}; D1 bulk imports must not contain BEGIN/COMMIT wrappers.`);
  }
  return clean;
}

function validateStatements(sql, source) {
  for (const [index, line] of sql.split("\n").entries()) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("--") || !trimmed.endsWith(";")) continue;
    const bytes = Buffer.byteLength(trimmed, "utf8");
    if (bytes > MAX_STATEMENT_BYTES) {
      throw new Error(`${source} line ${index + 1} is ${bytes} bytes; D1 maximum is ${MAX_STATEMENT_BYTES} bytes per statement.`);
    }
  }
}

function nextDay(date) {
  return new Date(Date.parse(date + "T00:00:00Z") + 86_400_000).toISOString().slice(0, 10);
}

// Reuse the checked-in public/reference seed SQL, but exclude the partial astronomy
// migrations because the complete 77,070-row astronomy import is regenerated below.
const seedFiles = (await readdir(legacySeedDir))
  .filter((name) => /^\d+_seed_.*\.sql$/.test(name))
  .filter((name) => !/_seed_astronomy_calendar_/.test(name))
  .sort();

const partFiles = (await readdir(snapshotDir))
  .filter((name) => /^part-\d{3}\.json$/.test(name))
  .sort();

if (partFiles.length !== EXPECTED_PARTS) {
  throw new Error(`Expected ${EXPECTED_PARTS} astronomy snapshot parts, found ${partFiles.length}.`);
}

let output;
let hash;
let bytesWritten = 0;
if (!VERIFY_ONLY) {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  output = await open(outputSql, "w");
  hash = createHash("sha256");
}

async function emit(text) {
  if (VERIFY_ONLY) return;
  await output.write(text);
  hash.update(text, "utf8");
  bytesWritten += Buffer.byteLength(text, "utf8");
}

await emit("-- Patro Cloudflare D1 deterministic content import.\n");
await emit("-- Generated only from checked-in public/reference snapshots; private/user tables are excluded.\n");
await emit("-- No BEGIN TRANSACTION / COMMIT wrappers: this file is for wrangler d1 execute --file.\n\n");

for (const name of seedFiles) {
  const raw = await readFile(resolve(legacySeedDir, name), "utf8");
  const clean = stripTransactions(raw, name);
  validateStatements(clean, name);
  await emit(`-- Source seed: cloudflare/d1/migrations/${name}\n`);
  await emit(clean + "\n");
}

let totalRows = 0;
let firstDate = null;
let lastDate = null;
let previousDate = null;
let sourceVersion = "patro-archive-v79";
let maxGeneratedStatementBytes = 0;

for (let i = 0; i < partFiles.length; i++) {
  const expectedPart = i + 1;
  const fileName = partFiles[i];
  const parsed = JSON.parse(await readFile(resolve(snapshotDir, fileName), "utf8"));

  if (parsed.table !== "astronomy_calendar_map" || parsed.part !== expectedPart || parsed.offset !== i * 1000 || !Array.isArray(parsed.rows)) {
    throw new Error(`Invalid astronomy snapshot metadata at ${fileName}.`);
  }

  const expectedRows = expectedPart === EXPECTED_PARTS ? 70 : 1000;
  if (parsed.rows.length !== expectedRows) {
    throw new Error(`${fileName} has ${parsed.rows.length} rows; expected ${expectedRows}.`);
  }

  await emit(`-- Astronomy snapshot part ${expectedPart}; offset ${parsed.offset}\n`);
  const lines = [];

  for (const row of parsed.rows) {
    const adDate = String(row.ad_date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(adDate)) throw new Error(`Invalid ad_date in ${fileName}: ${adDate}`);
    if (row.payload?.ad && row.payload.ad !== adDate) throw new Error(`Payload date mismatch in ${fileName}: ${adDate}`);
    if (previousDate && adDate !== nextDay(previousDate)) throw new Error(`Non-contiguous calendar snapshot: ${previousDate} -> ${adDate}`);

    firstDate ||= adDate;
    lastDate = adDate;
    previousDate = adDate;
    sourceVersion = row.source_version || sourceVersion;

    const [year, month, day] = adDate.split("-").map(Number);
    const statement =
      "INSERT OR REPLACE INTO content_records(table_name,record_key,ad_date,year,month,day,category,sort_order,payload,updated_at) VALUES(" +
      [
        sqlString("astronomy_calendar_map"),
        sqlString(adDate),
        sqlString(adDate),
        year,
        month,
        day,
        "NULL",
        "NULL",
        sqlString(JSON.stringify(row)),
        sqlString(row.created_at ?? null)
      ].join(",") +
      ");";

    const statementBytes = Buffer.byteLength(statement, "utf8");
    maxGeneratedStatementBytes = Math.max(maxGeneratedStatementBytes, statementBytes);
    if (statementBytes > MAX_STATEMENT_BYTES) {
      throw new Error(`Generated statement for ${adDate} is ${statementBytes} bytes; D1 maximum is ${MAX_STATEMENT_BYTES}.`);
    }
    lines.push(statement);
  }

  totalRows += parsed.rows.length;
  await emit(lines.join("\n") + "\n");
}

if (totalRows !== EXPECTED_ROWS || firstDate !== EXPECTED_FIRST || lastDate !== EXPECTED_LAST) {
  throw new Error(`Astronomy snapshot verification failed: rows=${totalRows}, coverage=${firstDate}..${lastDate}`);
}

const stateStatement =
  "INSERT OR REPLACE INTO migration_state(source,source_version,row_count,imported_at) VALUES(" +
  [
    sqlString("supabase:public.astronomy_calendar_map"),
    sqlString(sourceVersion),
    EXPECTED_ROWS,
    sqlString("2026-09-30T00:00:00Z")
  ].join(",") +
  ");\n";
validateStatements(stateStatement, "astronomy migration_state");
await emit(stateStatement);

if (!VERIFY_ONLY) {
  await output.close();
  const manifest = {
    format: 1,
    generated_at: new Date().toISOString(),
    source: "GitHub migration/data/public + sanitized legacy public/reference D1 seeds",
    private_user_data_included: false,
    seed_files: seedFiles,
    astronomy: {
      parts: EXPECTED_PARTS,
      rows: totalRows,
      first_date: firstDate,
      last_date: lastDate,
      source_version: sourceVersion
    },
    d1_limits_checked: {
      max_statement_bytes_allowed: MAX_STATEMENT_BYTES,
      max_generated_statement_bytes: maxGeneratedStatementBytes
    },
    output: {
      path: ".cloudflare/d1-import/content-snapshot.sql",
      bytes: bytesWritten,
      sha256: hash.digest("hex")
    }
  };
  await writeFile(outputManifest, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`Built D1 import: ${totalRows.toLocaleString()} astronomy rows + ${seedFiles.length} public/reference seed files; ${bytesWritten.toLocaleString()} bytes.`);
} else {
  console.log(`Verified D1 source snapshots: ${totalRows.toLocaleString()} astronomy rows, ${firstDate} through ${lastDate}; ${seedFiles.length} public/reference seed files.`);
}
