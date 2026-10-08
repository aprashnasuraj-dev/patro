// Reconcile the column that production's idempotent Worker bootstrap may have
// added before D1 migration 0006 was first applied. SQLite has no portable
// ALTER TABLE ADD COLUMN IF NOT EXISTS, so inspect instead of ignoring 7500.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const COLUMN_SQL='ALTER TABLE aap_pageviews ADD COLUMN weight REAL NOT NULL DEFAULT 1';
const COLUMN_INFO='PRAGMA table_info(aap_pageviews)';
const TABLES=['aap_pageview_daily','aap_pageview_rollup_days'];
const INDEXES=[
  'aap_pageview_daily_dimension_day_idx',
  ...['path','visitor','country','device','browser','referrer'].map(x=>'aap_pageviews_'+x+'_ts_idx')
];
const missing=(actual,wanted)=>wanted.filter(x=>!actual.has(x));

/** The caller executes statements on ONE D1 database; throws on drift. */
export async function ensureAnalyticsWeight(query){
  let columns=await query(COLUMN_INFO);
  if(!Array.isArray(columns)||!columns.some(x=>x.name==='id')||!columns.some(x=>x.name==='ts'))
    throw Error('analytics migration: aap_pageviews is missing or has an unexpected shape');
  const originallyPresent=columns.some(x=>x.name==='weight');
  if(!originallyPresent){
    try{await query(COLUMN_SQL);}
    catch(error){
      // Another Worker isolate may have added it after our PRAGMA query.
      if(!/duplicate column name:\s*weight/i.test(String(error)))throw error;
    }
    columns=await query(COLUMN_INFO);
  }
  const weight=columns.find(x=>x.name==='weight');
  if(!weight||String(weight.type||'').toUpperCase()!=='REAL'||
     Number(weight.notnull)!==1||
     !/^\(?\s*1(?:\.0+)?\s*\)?$/.test(String(weight.dflt_value??'')))
    throw Error('analytics migration: weight must be REAL NOT NULL DEFAULT 1; stopping on schema drift');
  const tableRows=await query("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('aap_pageview_daily','aap_pageview_rollup_days')");
  const indexRows=await query("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'aap_pageview_%'");
  const absentTables=missing(new Set(tableRows.map(x=>x.name)),TABLES);
  const absentIndexes=missing(new Set(indexRows.map(x=>x.name)),INDEXES);
  if(absentTables.length||absentIndexes.length)throw Error(
    'analytics migration: missing D1 rollup objects: '+[...absentTables,...absentIndexes].join(', ')
  );
  return {column:originallyPresent?'already-present':'added',rollupTables:TABLES.length,indexes:INDEXES.length};
}

async function runRemote(){
  const account=process.env.CLOUDFLARE_ACCOUNT_ID;
  const token=process.env.CLOUDFLARE_D1_API_TOKEN||process.env.CLOUDFLARE_API_TOKEN;
  const cfg=JSON.parse(await readFile(resolve('wrangler.generated.jsonc'),'utf8'));
  const database=cfg.d1_databases?.find(x=>x.binding==='DB')?.database_id;
  if(!account||!token||!database)throw Error('analytics migration: D1 account, token or DB binding missing');
  const endpoint='https://api.cloudflare.com/client/v4/accounts/'+account+'/d1/database/'+database+'/query';
  async function query(sql){
    const response=await fetch(endpoint,{
      method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},
      body:JSON.stringify({sql}),signal:AbortSignal.timeout(30000)
    });
    const body=await response.json().catch(()=>null);
    const item=body?.result?.[0];
    if(!response.ok||body?.success!==true||item?.success===false||!Array.isArray(item?.results)){
      const reason=body?.errors?.map(x=>String(x?.message||'')).join('; ')||'unexpected D1 response';
      throw Error('D1 query failed (HTTP '+response.status+'): '+reason.slice(0,350));
    }
    return item.results;
  }
  const report=await ensureAnalyticsWeight(query);
  console.log('D1 analytics reconciliation verified: '+JSON.stringify(report));
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  runRemote().catch(error=>{console.error(String(error?.message||error));process.exitCode=1;});
}
