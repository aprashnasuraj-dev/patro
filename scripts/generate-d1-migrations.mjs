import { createHash } from "node:crypto";
import { mkdir, open, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const root = process.cwd();
const dataRoot = resolve(root, "migration/data/public");
const manifestPath = resolve(root, "cloudflare/d1/expected-public-counts.json");
const outputDir = resolve(root, ".cloudflare/d1-import");
const outputSql = resolve(outputDir, "content-snapshot.sql");
const outputManifest = resolve(outputDir, "manifest.json");
const VERIFY_ONLY = process.argv.includes("--verify-only");
const MAX_STATEMENT_BYTES = 100_000;
const PAYLOAD_CHUNK_BYTES = 32_000;
const IMPORT_CHUNK_TABLE = "__patro_import_payload_chunks";
const SNAPSHOT_VERSION = "supabase-2026-09-30";
const IMPORTED_AT = "2026-09-30T00:00:00Z";

const PK = {
  app_flags:["key"], astronomy_calendar_map:["ad_date"], calendar_coverage_tiers:["id"], calendar_reference_sources:["id"],
  community_dates:["suite","festival_id","year","main"], community_festivals:["suite","id"], fm_stations:["id"],
  holiday_coverage:["bs_year","audience"], holidays:["id"], nasa_apod_cache:["date"], nasa_cosmic_cache:["cache_key"],
  nepal_sambat_facts:["fact_key"], nepal_sambat_months:["month_no"], nepal_sambat_observances:["id"], nepal_sambat_tithi_names:["tithi_no"],
  news_category_keywords:["category","keyword"], news_clusters:["id"], news_items:["id"], news_source_health:["source_id"], np_districts:["id"],
  ns_days:["ad"], ns_festival_dates:["ns_year","festival_id"], ns_festivals:["id"], ns_months:["n"], official_panchang_facts:["id"],
  on_this_day_events:["id"], time_machine_moments:["id"], tool_catalog:["tool_id"], tool_release_plan:["release_id"], weekly_off_rules:["id"]
};

function sqlString(value) { if (value == null) return "NULL"; return "'" + String(value).replaceAll("'", "''") + "'"; }
function keyPart(value) { if (value === true) return "1"; if (value === false) return "0"; if (value == null) throw new Error("primary-key component is null"); return String(value); }
function recordKey(table,row) { const cols=PK[table]; if (!cols) throw new Error(`No primary-key mapping for ${table}`); return cols.map((col)=>keyPart(row[col])).join(":"); }
function dateOnly(value) { if (typeof value !== "string") return null; const match=value.match(/^\d{4}-\d{2}-\d{2}/); return match ? match[0] : null; }
function toRecord(table,row) {
  const adDate=dateOnly(row.ad_date)||dateOnly(row.ad)||dateOnly(row.date)||dateOnly(row.as_of);
  const [derivedYear,derivedMonth,derivedDay]=adDate?adDate.split("-").map(Number):[null,null,null];
  return { table_name:table, record_key:recordKey(table,row), ad_date:adDate, year:row.year??row.ad_year??derivedYear, month:row.month??derivedMonth,
    day:row.day??derivedDay, category:typeof row.category==="string"?row.category:null, sort_order:row.sort_order??row.priority??null,
    payload:JSON.stringify(row), updated_at:row.updated_at??row.created_at??row.published_at??null };
}
function validateStatement(statement,source) { const trimmed=statement.trim(); if (!trimmed||trimmed.startsWith("--")) return; if (!trimmed.endsWith(";")) throw new Error(`Unterminated SQL statement in ${source}`); const bytes=Buffer.byteLength(trimmed,"utf8"); if (bytes>MAX_STATEMENT_BYTES) throw new Error(`${source} statement is ${bytes} bytes; D1 maximum is ${MAX_STATEMENT_BYTES}`); }
function splitUtf8(value,maxBytes=PAYLOAD_CHUNK_BYTES) { const chunks=[]; let chunk="",bytes=0; for (const char of value) { const n=Buffer.byteLength(char,"utf8"); if (bytes&&bytes+n>maxBytes) { chunks.push(chunk); chunk=char; bytes=n; } else { chunk+=char; bytes+=n; } } if (chunk) chunks.push(chunk); return chunks; }
function directInsert(record) { return "INSERT OR REPLACE INTO content_records(table_name,record_key,ad_date,year,month,day,category,sort_order,payload,updated_at) VALUES(" + [sqlString(record.table_name),sqlString(record.record_key),sqlString(record.ad_date),record.year??"NULL",record.month??"NULL",record.day??"NULL",sqlString(record.category),record.sort_order??"NULL",sqlString(record.payload),sqlString(record.updated_at)].join(",") + ");"; }
function statementsForRecord(record,source) {
  const statement=directInsert(record); if (Buffer.byteLength(statement,"utf8")<=MAX_STATEMENT_BYTES) { validateStatement(statement,source); return [statement]; }
  const tempId=`${record.table_name}:${record.record_key}`; const chunks=splitUtf8(record.payload); const statements=[
    `INSERT OR REPLACE INTO ${IMPORT_CHUNK_TABLE}(id,payload) VALUES(${sqlString(tempId)},'');`,
    ...chunks.map((chunk)=>`UPDATE ${IMPORT_CHUNK_TABLE} SET payload = payload || ${sqlString(chunk)} WHERE id = ${sqlString(tempId)};`),
    "INSERT OR REPLACE INTO content_records(table_name,record_key,ad_date,year,month,day,category,sort_order,payload,updated_at) SELECT " + [sqlString(record.table_name),sqlString(record.record_key),sqlString(record.ad_date),record.year??"NULL",record.month??"NULL",record.day??"NULL",sqlString(record.category),record.sort_order??"NULL","payload",sqlString(record.updated_at)].join(",") + ` FROM ${IMPORT_CHUNK_TABLE} WHERE id = ${sqlString(tempId)};`,
    `DELETE FROM ${IMPORT_CHUNK_TABLE} WHERE id = ${sqlString(tempId)};`
  ]; for (const rewritten of statements) validateStatement(rewritten,source); return statements;
}
async function walk(dir) { const files=[]; for (const entry of await readdir(dir,{withFileTypes:true})) { const path=join(dir,entry.name); if (entry.isDirectory()) files.push(...await walk(path)); else if (entry.isFile()&&entry.name.endsWith(".json")) files.push(path); } return files.sort(); }
function nextDay(date) { return new Date(Date.parse(date+"T00:00:00Z")+86_400_000).toISOString().slice(0,10); }

const expected=JSON.parse(await readFile(manifestPath,"utf8")); const expectedTables=expected.tables||{}; const sourceFiles=await walk(dataRoot);
if ("miti_rashifal_publications" in expectedTables) throw new Error("Rashifal must not be a mandatory D1 bootstrap table; it is served by the native/bundle runtime.");
if ("market_snapshots" in expectedTables) throw new Error("market_snapshots/NEPSE must not be a mandatory D1 bootstrap table.");
if (Number(expected.critical_features?.time_machine?.rows)!==706 || Number(expectedTables.time_machine_moments)!==706) throw new Error("Time Machine canonical D1 requirement must remain exactly 706 records.");
if (expected.critical_features?.rashifal?.mode!=="native_bundle" || expected.critical_features?.rashifal?.d1_bootstrap_required!==false) throw new Error("Rashifal release contract must use the native/bundle runtime with no mandatory D1 bootstrap.");

let output=null,hash=null,bytesWritten=0,maxStatementBytes=0,oversizedRows=0;
if (!VERIFY_ONLY) { await rm(outputDir,{recursive:true,force:true}); await mkdir(outputDir,{recursive:true}); output=await open(outputSql,"w"); hash=createHash("sha256"); }
async function emit(text) { if (VERIFY_ONLY) return; await output.write(text); hash.update(text,"utf8"); bytesWritten+=Buffer.byteLength(text,"utf8"); }
async function emitRecord(record,source) { const statements=statementsForRecord(record,source); if (statements.length>1) oversizedRows++; for (const statement of statements) { maxStatementBytes=Math.max(maxStatementBytes,Buffer.byteLength(statement,"utf8")); await emit(statement+"\n"); } }
await emit("-- Patro Cloudflare D1 deterministic public/reference content import.\n");
await emit("-- Canonical source: migration/data/public snapshots only. Rashifal is native/bundle runtime; NEPSE is not a release dependency.\n");
await emit("-- Private/user tables are intentionally excluded.\n");
await emit(`CREATE TABLE IF NOT EXISTS ${IMPORT_CHUNK_TABLE}(id TEXT PRIMARY KEY,payload TEXT NOT NULL);\n`); await emit(`DELETE FROM ${IMPORT_CHUNK_TABLE};\n\n`);
const stats=Object.fromEntries(Object.keys(expectedTables).map((table)=>[table,{rows:0,seen:new Set(),max_payload_bytes:0,first_ad_date:null,last_ad_date:null,previous_ad_date:null,bs_rows:0,ns_rows:0,panchang_rows:0}]));
for (const file of sourceFiles) {
  const doc=JSON.parse(await readFile(file,"utf8")); const table=doc.table; if (!table||!Array.isArray(doc.rows)) throw new Error(`Invalid snapshot ${relative(root,file)}`);
  if (!(table in expectedTables)) { if (table==="miti_rashifal_publications"||table==="market_snapshots") continue; throw new Error(`Snapshot table not approved for D1 bootstrap: ${table}`); }
  if (!PK[table]) throw new Error(`No D1 key mapping for snapshot table ${table}`); const stat=stats[table];
  for (const row of doc.rows) {
    const record=toRecord(table,row); if (stat.seen.has(record.record_key)) throw new Error(`${table}: duplicate key ${record.record_key}`); stat.seen.add(record.record_key); stat.rows++; stat.max_payload_bytes=Math.max(stat.max_payload_bytes,Buffer.byteLength(record.payload,"utf8"));
    if (table==="astronomy_calendar_map") { const adDate=record.ad_date; if (!adDate) throw new Error(`astronomy_calendar_map: missing AD date for ${record.record_key}`); if (stat.previous_ad_date&&adDate!==nextDay(stat.previous_ad_date)) throw new Error(`astronomy_calendar_map: non-contiguous date ${stat.previous_ad_date} -> ${adDate}`); stat.first_ad_date||=adDate; stat.last_ad_date=adDate; stat.previous_ad_date=adDate; if (row?.payload?.bs?.formatted) stat.bs_rows++; if (row?.payload?.ns?.formatted) stat.ns_rows++; if (row?.payload?.panchang?.tithi) stat.panchang_rows++; }
    await emitRecord(record,relative(root,file));
  }
}
const failures=[]; for (const [table,expectedRows] of Object.entries(expectedTables)) { const actualRows=stats[table]?.rows??0; if (actualRows!==Number(expectedRows)) failures.push(`${table}: expected ${expectedRows}, found ${actualRows}`); }
const calendarSpec=expected.critical_features?.main_calendar; const calendar=stats.astronomy_calendar_map;
if (!calendarSpec||!calendar) failures.push("main calendar parity specification missing"); else { if (calendar.first_ad_date!==calendarSpec.first_ad_date) failures.push(`calendar first date: expected ${calendarSpec.first_ad_date}, found ${calendar.first_ad_date}`); if (calendar.last_ad_date!==calendarSpec.last_ad_date) failures.push(`calendar last date: expected ${calendarSpec.last_ad_date}, found ${calendar.last_ad_date}`); if (calendar.bs_rows!==calendarSpec.rows) failures.push(`calendar BS rows: expected ${calendarSpec.rows}, found ${calendar.bs_rows}`); if (calendar.ns_rows!==calendarSpec.rows) failures.push(`calendar NS rows: expected ${calendarSpec.rows}, found ${calendar.ns_rows}`); if (calendar.panchang_rows!==calendarSpec.rows) failures.push(`calendar Panchang rows: expected ${calendarSpec.rows}, found ${calendar.panchang_rows}`); }
if (stats.time_machine_moments?.rows!==706) failures.push(`time_machine_moments: expected exactly 706, found ${stats.time_machine_moments?.rows??0}`);
if (failures.length) { console.error("D1 canonical snapshot verification failed:"); for (const failure of failures) console.error(" - "+failure); process.exit(1); }
for (const [table,stat] of Object.entries(stats)) { const state="INSERT OR REPLACE INTO migration_state(source,source_version,row_count,imported_at) VALUES("+[sqlString("supabase:public."+table),sqlString(table==="astronomy_calendar_map"?"patro-archive-v79":SNAPSHOT_VERSION),stat.rows,sqlString(IMPORTED_AT)].join(",")+");"; validateStatement(state,`migration_state:${table}`); maxStatementBytes=Math.max(maxStatementBytes,Buffer.byteLength(state,"utf8")); await emit(state+"\n"); }
await emit(`DROP TABLE IF EXISTS ${IMPORT_CHUNK_TABLE};\n`);
const totalRows=Object.values(stats).reduce((sum,stat)=>sum+stat.rows,0); const summary=Object.fromEntries(Object.entries(stats).map(([table,stat])=>[table,{rows:stat.rows,max_payload_bytes:stat.max_payload_bytes,...(table==="astronomy_calendar_map"?{first_ad_date:stat.first_ad_date,last_ad_date:stat.last_ad_date,bs_rows:stat.bs_rows,ns_rows:stat.ns_rows,panchang_rows:stat.panchang_rows}:{})}]));
if (!VERIFY_ONLY) { await output.close(); const manifest={format:3,generated_at:new Date().toISOString(),canonical_source:"migration/data/public",rashifal_runtime:"native_bundle",market_nepse_release_dependency:false,private_user_data_included:false,tables:summary,total_rows:totalRows,oversized_rows_rewritten:oversizedRows,d1_limits_checked:{max_statement_bytes_allowed:MAX_STATEMENT_BYTES,max_emitted_statement_bytes:maxStatementBytes},output:{path:".cloudflare/d1-import/content-snapshot.sql",bytes:bytesWritten,sha256:hash.digest("hex")}}; await writeFile(outputManifest,JSON.stringify(manifest,null,2)+"\n","utf8"); console.log(`Built canonical D1 import: ${Object.keys(summary).length} tables, ${totalRows.toLocaleString()} rows, Time Machine 706, ${oversizedRows} oversized rows chunk-rewritten, ${bytesWritten.toLocaleString()} bytes.`); }
else console.log(`Verified canonical D1 source: ${Object.keys(summary).length} tables, ${totalRows.toLocaleString()} rows; AD/BS/NS calendar ${calendar.rows.toLocaleString()} rows (${calendar.first_ad_date}..${calendar.last_ad_date}); Time Machine ${stats.time_machine_moments.rows}; Rashifal=native/bundle; NEPSE=not-required; Tools ${stats.tool_catalog.rows} + ${stats.tool_release_plan.rows}.`);
