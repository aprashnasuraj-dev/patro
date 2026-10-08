import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ensureAnalyticsWeight} from '../scripts/cloudflare/ensure-analytics-weight-d1.mjs';

const column=(name,type='REAL',notnull=1,dflt_value='1')=>({name,type,notnull,dflt_value});
const tableNames=['aap_pageview_daily','aap_pageview_rollup_days'];
const indexNames=['aap_pageview_daily_dimension_day_idx',...['path','visitor','country','device','browser','referrer'].map(x=>'aap_pageviews_'+x+'_ts_idx')];
function fixture({weighted=false,bad=false,race=false,missingIndex=false}={}){
  const cols=[column('id','INTEGER',0,null),column('ts','INTEGER',1,null)];
  if(weighted)cols.push(bad?column('weight','TEXT',0,null):column('weight'));
  const calls=[];
  const query=async sql=>{
    calls.push(sql);
    if(sql.startsWith('PRAGMA'))return cols;
    if(sql.startsWith('ALTER TABLE')){
      cols.push(column('weight'));
      if(race)throw Error('duplicate column name: weight');
      return [];
    }
    if(sql.includes("type='table'"))return tableNames.map(name=>({name}));
    if(sql.includes("type='index'"))return (missingIndex?indexNames.slice(1):indexNames).map(name=>({name}));
    throw Error('unexpected SQL: '+sql);
  };
  return {query,calls};
}
test('migration 0006 has no unconditional non-idempotent ADD COLUMN',()=>{
  const src=readFileSync(new URL('../cloudflare/d1/schema-migrations/0006_weighted_analytics_rollup.sql',import.meta.url),'utf8');
  assert.doesNotMatch(src,/alter\s+table\s+aap_pageviews\s+add\s+column/i);
  assert.match(src,/CREATE TABLE IF NOT EXISTS aap_pageview_daily/i);
});
test('schema reconciliation is read-only when production already bootstrapped weight',async()=>{
  const f=fixture({weighted:true});const r=await ensureAnalyticsWeight(f.query);
  assert.equal(r.column,'already-present');
  assert.equal(f.calls.filter(x=>x.startsWith('ALTER')).length,0);
});
test('legacy schema gets REAL NOT NULL DEFAULT 1 exactly once',async()=>{
  const f=fixture();
  assert.equal((await ensureAnalyticsWeight(f.query)).column,'added');
  assert.equal((await ensureAnalyticsWeight(f.query)).column,'already-present');
  assert.equal(f.calls.filter(x=>x.startsWith('ALTER')).length,1);
});
test('concurrent Worker bootstrap is safe only with post-race verification',async()=>{
  const f=fixture({race:true});
  assert.equal((await ensureAnalyticsWeight(f.query)).column,'added');
});
test('wrong existing weight definition fails closed',async()=>{
  await assert.rejects(ensureAnalyticsWeight(fixture({weighted:true,bad:true}).query),/schema drift/);
});
test('missing rollup index fails closed',async()=>{
  await assert.rejects(ensureAnalyticsWeight(fixture({weighted:true,missingIndex:true}).query),/missing D1 rollup objects/);
});
test('missing table or unexpected query errors fail closed',async()=>{
  await assert.rejects(ensureAnalyticsWeight(async()=>[]),/missing or has an unexpected shape/);
  const f=fixture();
  await assert.rejects(ensureAnalyticsWeight(async sql=>{
    if(sql.startsWith('ALTER'))throw Error('access denied');
    return f.query(sql);
  }),/access denied/);
});
