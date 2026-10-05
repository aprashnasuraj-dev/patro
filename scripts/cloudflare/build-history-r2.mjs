import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const HISTORY_ROOT = join(ROOT, "migration", "data", "public", "on_this_day_events");
const MANIFEST_PATH = join(ROOT, "cloudflare", "d1", "expected-public-counts.json");
const OUT_ROOT = join(ROOT, ".cloudflare", "history-r2");
const TABLE = "on_this_day_events";
const PREFIX = "datasets/on-this-day/v1";
const FORMAT_VERSION = "on-this-day-r2-month-v1";

async function walk(dir) {
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...await walk(path));
    else if (ent.isFile() && ent.name.endsWith(".json")) out.push(path);
  }
  return out.sort();
}

function dateParts(row) {
  const text = [row?.ad_date, row?.ad, row?.date].find((value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value));
  const parsed = text ? String(text).slice(0, 10).split("-").map(Number) : [null, null, null];
  const month = Number(row?.ad_month ?? row?.month ?? parsed[1]);
  const day = Number(row?.ad_day ?? row?.day ?? parsed[2]);
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error(`Invalid history month for row ${row?.id ?? "unknown"}`);
  const maxDay = new Date(Date.UTC(2000, month, 0)).getUTCDate();
  if (!Number.isInteger(day) || day < 1 || day > maxDay) throw new Error(`Invalid history day for row ${row?.id ?? "unknown"}`);
  return { month, day };
}

function compareRows(a, b) {
  const highlight = Number(Boolean(b?.highlight)) - Number(Boolean(a?.highlight));
  if (highlight) return highlight;
  const importance = Number(b?.importance || 0) - Number(a?.importance || 0);
  if (importance) return importance;
  return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
}

async function main() {
  const files = await walk(HISTORY_ROOT);
  if (!files.length) throw new Error("No On This Day snapshot files found");

  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  const expectedRows = Number(manifest?.tables?.[TABLE] || 0);
  if (!expectedRows) throw new Error("Expected On This Day row count missing from manifest");

  const hash = createHash("sha256");
  hash.update(FORMAT_VERSION);
  hash.update("\0");

  const months = new Map();
  let rowCount = 0;
  for (const file of files) {
    const raw = await readFile(file);
    hash.update(relative(ROOT, file));
    hash.update("\0");
    hash.update(raw);
    hash.update("\0");

    const doc = JSON.parse(raw.toString("utf8"));
    if (doc?.table !== TABLE || !Array.isArray(doc?.rows)) {
      throw new Error(`Invalid On This Day snapshot: ${relative(ROOT, file)}`);
    }
    for (const row of doc.rows) {
      const { month, day } = dateParts(row);
      if (!months.has(month)) months.set(month, new Map());
      const days = months.get(month);
      if (!days.has(day)) days.set(day, []);
      days.get(day).push(row);
      rowCount++;
    }
  }

  if (rowCount !== expectedRows) {
    throw new Error(`On This Day R2 source row mismatch: ${rowCount} != ${expectedRows}`);
  }

  const sourceVersion = `sha256:${hash.digest("hex")}`;
  await rm(OUT_ROOT, { recursive: true, force: true });
  await mkdir(OUT_ROOT, { recursive: true });

  const monthFiles = [];
  let emittedRows = 0;
  for (let month = 1; month <= 12; month++) {
    const days = months.get(month) || new Map();
    const dayObject = {};
    let monthRows = 0;
    const maxDay = new Date(Date.UTC(2000, month, 0)).getUTCDate();
    for (let day = 1; day <= maxDay; day++) {
      const rows = [...(days.get(day) || [])].sort(compareRows);
      dayObject[String(day).padStart(2, "0")] = rows;
      monthRows += rows.length;
    }
    emittedRows += monthRows;
    const name = `month-${String(month).padStart(2, "0")}.json`;
    const payload = {
      schema: 1,
      format: FORMAT_VERSION,
      table: TABLE,
      month,
      row_count: monthRows,
      source_version: sourceVersion,
      days: dayObject,
    };
    await writeFile(join(OUT_ROOT, name), JSON.stringify(payload));
    monthFiles.push({ name, key: `${PREFIX}/${name}`, month, row_count: monthRows });
  }

  if (emittedRows !== expectedRows) throw new Error(`R2 shard output mismatch: ${emittedRows} != ${expectedRows}`);

  const outputManifest = {
    schema: 1,
    format: FORMAT_VERSION,
    table: TABLE,
    prefix: PREFIX,
    source_version: sourceVersion,
    row_count: rowCount,
    files: monthFiles,
  };
  await writeFile(join(OUT_ROOT, "manifest.json"), JSON.stringify(outputManifest, null, 2));
  console.log(JSON.stringify({ ok: true, out: relative(ROOT, OUT_ROOT), ...outputManifest }, null, 2));
}

await main();
