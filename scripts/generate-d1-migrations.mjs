import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const snapshotDir = resolve(root, "migration/data/public/astronomy_calendar_map");
const baseMigrationDir = resolve(root, "cloudflare/d1/migrations");
const outputDir = resolve(root, ".cloudflare/d1-migrations");
const EXPECTED_ROWS = 77070;
const PREGENERATED_PARTS = 10;

function sqlString(value) {
  if (value == null) return "NULL";
  return "'" + String(value).replaceAll("'", "''") + "'";
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await cp(baseMigrationDir, outputDir, { recursive: true });

const files = (await readdir(snapshotDir))
  .filter((name) => /^part-\d{3}\.json$/.test(name))
  .sort();

if (files.length !== 78) {
  throw new Error(`Expected 78 astronomy snapshot parts, found ${files.length}. Full D1 deployment is blocked until the snapshot is complete.`);
}

let totalRows = 0;
for (let i = 0; i < files.length; i++) {
  const expectedPart = i + 1;
  const file = files[i];
  const parsed = JSON.parse(await readFile(resolve(snapshotDir, file), "utf8"));

  if (parsed.part !== expectedPart || parsed.offset !== i * 1000 || !Array.isArray(parsed.rows)) {
    throw new Error(`Invalid astronomy snapshot sequence at ${file}`);
  }

  const expectedRows = expectedPart === 78 ? 70 : 1000;
  if (parsed.rows.length !== expectedRows) {
    throw new Error(`${file} has ${parsed.rows.length} rows; expected ${expectedRows}`);
  }

  totalRows += parsed.rows.length;
  if (expectedPart <= PREGENERATED_PARTS) continue;

  const migrationNumber = String(800 + (expectedPart - PREGENERATED_PARTS - 1)).padStart(4, "0");
  const migrationName = `${migrationNumber}_seed_astronomy_calendar_${String(expectedPart).padStart(3, "0")}.sql`;
  const lines = [
    `-- Generated from migration/data/public/astronomy_calendar_map/${file}`,
    `-- Calendar archive part ${expectedPart}; offset ${parsed.offset}`,
    "BEGIN TRANSACTION;"
  ];

  for (const row of parsed.rows) {
    const adDate = String(row.ad_date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(adDate)) {
      throw new Error(`Invalid ad_date in ${file}: ${adDate}`);
    }
    const [year, month, day] = adDate.split("-").map(Number);
    const payload = JSON.stringify(row);
    lines.push(
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
        sqlString(payload),
        sqlString(row.created_at ?? null)
      ].join(",") +
      ");"
    );
  }

  if (expectedPart === 78) {
    lines.push(
      "INSERT OR REPLACE INTO migration_state(source,source_version,row_count,imported_at) VALUES(" +
      [
        sqlString("supabase:astronomy_calendar_map"),
        sqlString(parsed.rows.at(-1)?.source_version || "patro-archive-v79"),
        EXPECTED_ROWS,
        sqlString("2026-09-30T00:00:00Z")
      ].join(",") +
      ");"
    );
  }

  lines.push("COMMIT;", "");
  await writeFile(resolve(outputDir, migrationName), lines.join("\n"), "utf8");
}

if (totalRows !== EXPECTED_ROWS) {
  throw new Error(`Astronomy snapshot row count is ${totalRows}; expected ${EXPECTED_ROWS}`);
}

const generated = (await readdir(outputDir)).filter((name) => name.endsWith(".sql")).sort();
console.log(`Prepared ${generated.length} D1 migration files from a verified ${totalRows}-row astronomy snapshot.`);
