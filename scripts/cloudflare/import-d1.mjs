import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const DATA_ROOT = join(ROOT, "migration", "data", "public");
const MANIFEST_PATH = join(ROOT, "cloudflare", "d1", "expected-public-counts.json");
const LEGACY_RASHIFAL = join(ROOT, "cloudflare", "d1", "migrations", "0600_seed_rashifal_publications.sql");

const PK = {
  app_flags:["key"], astronomy_calendar_map:["ad_date"], calendar_coverage_tiers:["id"],
  calendar_reference_sources:["id"], community_dates:["suite","festival_id","year","main"],
  community_festivals:["suite","id"], fm_stations:["id"], holiday_coverage:["bs_year","audience"],
  holidays:["id"], market_snapshots:["provider","asset","as_of"], miti_rashifal_publications:["id"],
  nasa_apod_cache:["date"], nasa_cosmic_cache:["cache_key"], nepal_sambat_facts:["fact_key"],
  nepal_sambat_months:["month_no"], nepal_sambat_observances:["id"], nepal_sambat_tithi_names:["tithi_no"],
  news_category_keywords:["category","keyword"], news_clusters:["id"], news_items:["id"],
  news_source_health:["source_id"], np_districts:["id"], ns_days:["ad"],
  ns_festival_dates:["ns_year","festival_id"], ns_festivals:["id"], ns_months:["n"],
  official_panchang_facts:["id"], on_this_day_events:["id"], time_machine_moments:["id"],
  tool_catalog:["tool_id"], tool_release_plan:["release_id"], weekly_off_rules:["id"]
};

const PRIVATE_DENYLIST = new Set([
  "profiles","user_calendar_state","calendar_spaces","calendar_space_members","calendar_space_events",
  "correction_reports","astrology_profiles","astrology_chart_cache","api_rate_buckets",
  "api_rate_limit_buckets","preview_feedback","audit_log","push_subscriptions","notification_jobs",
  "families","family_members","family_invites","shared_events","personal_ics_tokens",
  "contact_messages","fm_reports","fm_stream_candidates","community_overrides","user_community_preferences"
]);

const args = new Set(process.argv.slice(2));
const REMOTE = args.has("--remote");
const TABLE_ARG = process.argv.find(x => x.startsWith("--table="))?.slice(8) || null;
const MAX_BATCH_QUERIES = 40;
const MAX_REQUEST_BYTES = 1_500_000;
const ROWS_PER_QUERY = 10;

function keyPart(v) {
  if (v === true) return "1";
  if (v === false) return "0";
  if (v == null) throw new Error("primary-key component is null");
  return String(v);
}

function recordKey(table, row) {
  const cols = PK[table];
  if (!cols) throw new Error(`No primary-key mapping for ${table}`);
  return cols.map(c => keyPart(row[c])).join(":");
}

function dateOnly(value) {
  if (typeof value !== "string") return null;
  const m = value.match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : null;
}

function toRecord(table, row) {
  if (PRIVATE_DENYLIST.has(table)) throw new Error(`Refusing private table: ${table}`);
  const ad = dateOnly(row.ad_date) || dateOnly(row.ad) || dateOnly(row.date) || dateOnly(row.as_of);
  const [py,pm,pd] = ad ? ad.split("-").map(Number) : [null,null,null];
  return {
    table_name: table,
    record_key: recordKey(table,row),
    ad_date: ad,
    year: row.year ?? row.ad_year ?? py,
    month: row.month ?? row.ad_month ?? pm,
    day: row.day ?? row.ad_day ?? pd,
    category: typeof row.category === "string" ? row.category : null,
    sort_order: row.sort_order ?? row.priority ?? null,
    payload: JSON.stringify(row),
    updated_at: row.updated_at ?? row.created_at ?? row.published_at ?? null
  };
}

async function walk(dir) {
  const out = [];
  for (const ent of await readdir(dir,{withFileTypes:true})) {
    const p = join(dir,ent.name);
    if (ent.isDirectory()) out.push(...await walk(p));
    else if (ent.isFile() && ent.name.endsWith(".json")) out.push(p);
  }
  return out.sort();
}

function parseSqlValues(s) {
  const vals=[]; let i=0;
  while (i < s.length) {
    while (/[\s,]/.test(s[i]||"")) i++;
    if (s[i] === "'") {
      i++; let v="";
      while (i < s.length) {
        if (s[i] === "'" && s[i+1] === "'") { v += "'"; i += 2; continue; }
        if (s[i] === "'") { i++; break; }
        v += s[i++];
      }
      vals.push(v);
    } else {
      let j=i; while (j<s.length && s[j]!==",") j++;
      const raw=s.slice(i,j).trim();
      vals.push(/^null$/i.test(raw) ? null : /^-?\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : raw);
      i=j;
    }
  }
  return vals;
}

async function legacyRashifalRecords() {
  const sql = await readFile(LEGACY_RASHIFAL,"utf8");
  const rows=[];
  for (const line of sql.split(/\r?\n/)) {
    if (!line.startsWith("INSERT OR REPLACE INTO content_records")) continue;
    const marker="VALUES(";
    const start=line.indexOf(marker);
    if (start<0 || !line.endsWith(");")) continue;
    const v=parseSqlValues(line.slice(start+marker.length,-2));
    if (v.length!==10 || v[0]!=="miti_rashifal_publications") continue;
    rows.push({
      table_name:v[0], record_key:String(v[1]), ad_date:v[2], year:v[3], month:v[4], day:v[5],
      category:v[6], sort_order:v[7], payload:String(v[8]), updated_at:v[9]
    });
  }
  if (!rows.length) throw new Error("Could not recover Rashifal rows from retained legacy seed");
  return rows;
}

async function collectSources() {
  if (TABLE_ARG && !PK[TABLE_ARG]) throw new Error(`Unknown or unapproved table: ${TABLE_ARG}`);
  const byTable = new Map();
  for (const file of await walk(DATA_ROOT)) {
    const doc=JSON.parse(await readFile(file,"utf8"));
    if (!doc.table || !Array.isArray(doc.rows)) throw new Error(`Invalid snapshot ${relative(ROOT,file)}`);
    if (PRIVATE_DENYLIST.has(doc.table)) throw new Error(`Private table found in snapshot: ${doc.table}`);
    if (!PK[doc.table]) throw new Error(`Unapproved table in snapshot: ${doc.table}`);
    if (TABLE_ARG && doc.table!==TABLE_ARG) continue;
    if (!byTable.has(doc.table)) byTable.set(doc.table,[]);
    byTable.get(doc.table).push({file,rows:doc.rows});
  }
  if ((!TABLE_ARG || TABLE_ARG==="miti_rashifal_publications") && !byTable.has("miti_rashifal_publications")) {
    byTable.set("miti_rashifal_publications",[{file:LEGACY_RASHIFAL,records:await legacyRashifalRecords()}]);
  }
  if (TABLE_ARG && !byTable.has(TABLE_ARG)) throw new Error(`No migration source found for requested table: ${TABLE_ARG}`);
  return byTable;
}

function sqlForRows(n) {
  const tuple="(?,?,?,?,?,?,?,?,?,?)";
  return `INSERT OR REPLACE INTO content_records(table_name,record_key,ad_date,year,month,day,category,sort_order,payload,updated_at) VALUES ${Array(n).fill(tuple).join(",")}`;
}

function paramsFor(records) {
  return records.flatMap(r => [
    r.table_name,r.record_key,r.ad_date,r.year,r.month,r.day,r.category,r.sort_order,r.payload,r.updated_at
  ]);
}

async function d1(body) {
  const account=process.env.CLOUDFLARE_ACCOUNT_ID;
  const db=process.env.CLOUDFLARE_D1_DATABASE_ID || process.env.CF_D1_DATABASE_ID;
  const token=process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !db || !token) throw new Error("Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID and CLOUDFLARE_API_TOKEN");
  const url=`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${db}/query`;
  let last;
  for (let attempt=0; attempt<5; attempt++) {
    const res=await fetch(url,{method:"POST",headers:{"authorization":`Bearer ${token}`,"content-type":"application/json"},body:JSON.stringify(body)});
    const json=await res.json().catch(()=>({}));
    if (res.ok && json.success!==false && (!json.result || json.result.every(x=>x.success!==false))) return json;
    last=new Error(`D1 HTTP ${res.status}: ${JSON.stringify(json).slice(0,1000)}`);
    if (![429,500,502,503,504].includes(res.status)) break;
    await new Promise(r=>setTimeout(r,500*(2**attempt)));
  }
  throw last;
}

async function flush(batch) {
  if (!batch.length) return;
  await d1({batch});
  batch.length=0;
}

async function importTable(table, sources) {
  let batch=[], batchBytes=0, count=0;
  for (const source of sources) {
    const records = source.records || source.rows.map(row=>toRecord(table,row));
    for (let i=0;i<records.length;i+=ROWS_PER_QUERY) {
      const chunk=records.slice(i,i+ROWS_PER_QUERY);
      const q={sql:sqlForRows(chunk.length),params:paramsFor(chunk)};
      const bytes=Buffer.byteLength(JSON.stringify(q));
      if (batch.length && (batch.length>=MAX_BATCH_QUERIES || batchBytes+bytes>MAX_REQUEST_BYTES)) {
        await flush(batch); batchBytes=0;
      }
      batch.push(q); batchBytes+=bytes; count+=chunk.length;
    }
  }
  await flush(batch);
  const now=new Date().toISOString();
  await d1({sql:"INSERT OR REPLACE INTO migration_state(source,source_version,row_count,imported_at) VALUES(?,?,?,?)",params:[table,"supabase-2026-09-30",String(count),now]});
  const check=await d1({sql:"SELECT COUNT(*) AS n FROM content_records WHERE table_name = ?",params:[table]});
  const remote=Number(check?.result?.[0]?.results?.[0]?.n ?? -1);
  if (remote!==count) throw new Error(`${table}: imported ${remote}, expected ${count}`);
  return count;
}

async function validate(byTable, manifest) {
  const report={}; let total=0;
  for (const [table,sources] of [...byTable.entries()].sort()) {
    if (TABLE_ARG && table!==TABLE_ARG) continue;
    const seen=new Set(); let count=0, first=null,last=null,maxPayload=0;
    for (const source of sources) {
      const records=source.records || source.rows.map(row=>toRecord(table,row));
      for (const r of records) {
        if (seen.has(r.record_key)) throw new Error(`${table}: duplicate key ${r.record_key}`);
        seen.add(r.record_key); count++;
        maxPayload=Math.max(maxPayload,Buffer.byteLength(r.payload));
        if (table==="astronomy_calendar_map") {
          first=first||r.ad_date; last=r.ad_date;
          const doc=JSON.parse(r.payload);
          if (!doc?.payload?.bs?.formatted) throw new Error(`astronomy_calendar_map: missing BS mapping at ${r.record_key}`);
          if (!doc?.payload?.ns?.formatted) throw new Error(`astronomy_calendar_map: missing Nepal Sambat mapping at ${r.record_key}`);
          if (!doc?.payload?.panchang?.tithi) throw new Error(`astronomy_calendar_map: missing Panchang/tithi at ${r.record_key}`);
        }
      }
    }
    const expected=manifest.tables[table];
    if (expected==null) throw new Error(`${table}: missing from manifest`);
    if (count!==expected) throw new Error(`${table}: source rows ${count}, manifest ${expected}`);
    report[table]={rows:count,max_payload_bytes:maxPayload};
    if (first) Object.assign(report[table],{first_ad_date:first,last_ad_date:last});
    total+=count;
  }
  const expectedTotal = Object.values(manifest.tables).reduce((sum,n)=>sum+Number(n),0);
  if (!TABLE_ARG && total!==expectedTotal) throw new Error(`total rows ${total}, expected ${expectedTotal}`);
  const astro=report.astronomy_calendar_map;
  const spec=manifest.critical_features?.main_calendar;
  if (astro && spec && (astro.first_ad_date!==spec.first_ad_date || astro.last_ad_date!==spec.last_ad_date || astro.rows!==spec.rows)) throw new Error("astronomy coverage/count mismatch");
  return {total_rows:total,tables:report};
}

const manifest=JSON.parse(await readFile(MANIFEST_PATH,"utf8"));
const sources=await collectSources();
const report=await validate(sources,manifest);
console.log(JSON.stringify({mode:REMOTE?"remote":"dry-run",...report},null,2));

if (REMOTE) {
  for (const [table,files] of [...sources.entries()].sort()) {
    if (TABLE_ARG && table!==TABLE_ARG) continue;
    const count=await importTable(table,files);
    console.log(`Imported ${table}: ${count}`);
  }
}
