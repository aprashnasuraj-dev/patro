import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {Miniflare,WorkerOptionsSchema} from 'miniflare';
import {build} from 'esbuild';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

async function moduleFrom(entry){
  const result=await build({entryPoints:[entry],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
  return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text+'\n// '+crypto.randomUUID()).toString('base64'));
}
function d1(sqlite){
  const calls=[];
  function prepare(sql,params=[]){return {sql,params,bind(...p){return prepare(sql,p);},async first(){calls.push(sql);return sqlite.prepare(sql).get(...params)??null;},async all(){calls.push(sql);return {results:sqlite.prepare(sql).all(...params)};},async run(){calls.push(sql);sqlite.prepare(sql).run(...params);return {success:true};}};}
  return {calls,prepare,async batch(statements){const out=[];for(const statement of statements)out.push(await statement.run());return out;}};
}

test('real date and production asset routers bypass Worker for published assets while misses and private routes retain Worker',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'patro-quota-assets-'));
  let mf;
  try{
    for(const [path,text]of Object.entries({'date/2026-10-30.html':'complete date','robots.txt':'User-agent: *','sitemap.xml':'<urlset/>','aafnai-logo.png':'image','icons/calendar.svg':'<svg/>','fonts/calendar.woff2':'font','nepali-tools/core/roman.mjs':'export {};','aap/settings.js':'must remain dynamic','me/notes.html':'must remain private'})){
      await mkdir(join(directory,path,'..'),{recursive:true});await writeFile(join(directory,path),text);
    }
    const config=JSON.parse(await readFile('wrangler.jsonc','utf8'));
    assert.ok(config.assets.run_worker_first.length<=100,'Cloudflare routing rule limit');
    for(const [path,text]of Object.entries({'bali-calendar/icon.svg':'<svg/>','llms.txt':'discovery','llms-full.txt':'full discovery','ai.txt':'policy','.well-known/agents.json':'{}','favicon.ico':'ico','favicon.svg':'<svg/>','icon-192.png':'192','icon-512.png':'512','nepalmap/index.html':'map','nepalmap/nearby.html':'nearby','nepalmap-offline-sw.js':'map offline worker'})){
      await mkdir(join(directory,path,'..'),{recursive:true});await writeFile(join(directory,path),text);
    }
    const script="export default {fetch(){return new Response('dynamic',{headers:{'x-worker-invoked':'1'}})}}";
    const worker=WorkerOptionsSchema.shape?.config
      ? {config:{name:'quota-router',compatibilityDate:'2026-09-30',manifest:{mainModule:'index.mjs',modules:{'index.mjs':{type:'esm',contents:script}}},assets:{directory,hasUserWorker:true,runWorkerFirst:['/api/*','/aap/settings.js','/me/*','/nepali-tools/index.html'],notFoundHandling:'none'}}}
      : {name:'quota-router',modules:true,script,compatibilityDate:'2026-09-30',assets:{directory,binding:'ASSETS',run_worker_first:['/api/*','/aap/settings.js','/me/*','/nepali-tools/index.html'],assetConfig:{not_found_handling:'none'}}};
    mf=new Miniflare({workers:[worker]});
    for(const path of ['/date/2026-10-30','/robots.txt','/icons/calendar.svg','/nepali-tools/core/roman.mjs']){
      const response=await mf.dispatchFetch('https://aafnaipatro.com'+path,{redirect:'manual'});
      assert.equal(response.status,200,path);assert.equal(response.headers.get('location'),null,path);assert.equal(response.headers.get('x-worker-invoked'),null,path);
    }
    for(const path of ['/date/1940-01-01','/date/2026-2-30','/api/v1/me','/aap/settings.js','/me/notes','/nepali-tools/index.html']){
      const response=await mf.dispatchFetch('https://aafnaipatro.com'+path);assert.equal(response.headers.get('x-worker-invoked'),'1',path);
    }
    await mf.dispose();mf=undefined;
    const production=WorkerOptionsSchema.shape?.config
      ? {config:{name:'production-router',compatibilityDate:'2026-09-30',manifest:{mainModule:'index.mjs',modules:{'index.mjs':{type:'esm',contents:script}}},assets:{directory,hasUserWorker:true,runWorkerFirst:config.assets.run_worker_first,notFoundHandling:'none'}}}
      : {name:'production-router',modules:true,script,compatibilityDate:'2026-09-30',assets:{directory,binding:'ASSETS',run_worker_first:config.assets.run_worker_first,assetConfig:{not_found_handling:'none'}}};
    mf=new Miniflare({workers:[production]});
    for(const path of ['/robots.txt','/sitemap.xml','/aafnai-logo.png','/icons/calendar.svg','/fonts/calendar.woff2','/nepali-tools/core/roman.mjs','/bali-calendar/icon.svg','/llms.txt','/llms-full.txt','/ai.txt','/.well-known/agents.json','/favicon.ico','/favicon.svg','/icon-192.png','/icon-512.png','/nepalmap','/nepalmap/nearby','/nepalmap-offline-sw.js']){
      const response=await mf.dispatchFetch('https://aafnaipatro.com'+path);assert.equal(response.status,200,path);assert.equal(response.headers.get('x-worker-invoked'),null,path);
    }
    for(const path of ['/date/1940-01-01','/date/2026-2-30','/api/v1/me','/api/auth/me','/api/nepal/places','/bali-calendar/','/aap/settings.js','/me/notes','/nepali-tools/index.html']){
      const response=await mf.dispatchFetch('https://aafnaipatro.com'+path);assert.equal(response.headers.get('x-worker-invoked'),'1',path);
    }
  }finally{if(mf)await mf.dispose();await rm(directory,{recursive:true,force:true});}
});

test('retention index changes a real SQLite scan into a range search and preserves records',async()=>{
  const db=new DatabaseSync(':memory:');
  try{
    db.exec("CREATE TABLE growth_gate_runs(run_id TEXT PRIMARY KEY,started_at TEXT NOT NULL,finished_at TEXT NOT NULL,trigger_type TEXT NOT NULL,overall_status TEXT NOT NULL,passed INTEGER NOT NULL,failed INTEGER NOT NULL,result_json TEXT NOT NULL);CREATE TABLE growth_gate_checks(run_id TEXT NOT NULL,check_key TEXT NOT NULL,url TEXT NOT NULL,status_code INTEGER,passed INTEGER NOT NULL,detail TEXT,checked_at TEXT NOT NULL,PRIMARY KEY(run_id,check_key));CREATE INDEX idx_growth_gate_checks_failed ON growth_gate_checks(passed,checked_at);");
    db.exec("INSERT INTO growth_gate_checks VALUES('run','old','/',200,1,NULL,'2000-01-01');INSERT INTO growth_gate_checks VALUES('run','new','/',200,1,NULL,'2999-01-01');");
    const sql="SELECT check_key FROM growth_gate_checks WHERE checked_at < datetime('now','-30 days')";
    const before=db.prepare(sql).all();assert.match(db.prepare('EXPLAIN QUERY PLAN '+sql).all().map(r=>r.detail).join(),/SCAN/);
    const migration=await readFile('cloudflare/d1/schema-migrations/0009_quota_runtime_indexes.sql','utf8');db.exec(migration);db.exec(migration);
    assert.deepEqual(db.prepare(sql).all(),before);assert.match(db.prepare('EXPLAIN QUERY PLAN '+sql).all().map(r=>r.detail).join(),/SEARCH.*idx_growth_gate_checks_checked_at/);
    assert.equal(db.prepare('SELECT count(*) AS n FROM growth_gate_checks').get().n,2);
  }finally{db.close();}
});

test('long-tail date fallback reuses public output while credentials and private responses stay isolated',async()=>{
  const {default:worker}=await moduleFrom('extensions/date-pages/worker.mjs');
  const previous=globalThis.caches,store=new Map();let calls=0;
  globalThis.caches={default:{async match(key){return store.get(key.url)?.clone();},async put(key,value){store.set(key.url,value.clone());}}};
  // A native fetch response has immutable headers, just like a real service binding.
  // Returning a newly constructed Response here used to hide the production failure.
  const env={ORIGIN:{async fetch(request){calls++;return request.headers.has('cookie')?new Response('private',{headers:{'cache-control':'private, no-store'}}):fetch('data:text/plain,panchang');}}};
  try{
    const url='https://aafnaipatro.com/date/1950-01-01';
    assert.equal(await(await worker.fetch(new Request(url),env)).text(),'panchang');
    assert.equal(await(await worker.fetch(new Request(url),env)).text(),'panchang');assert.equal(calls,1);
    assert.equal(await(await worker.fetch(new Request(url,{headers:{cookie:'session=private'}}),env)).text(),'private');assert.equal(calls,2);
    const head=await worker.fetch(new Request(url,{method:'HEAD'}),env);assert.equal(await head.text(),'');assert.equal(calls,2);
    await worker.fetch(new Request(url,{headers:{authorization:'Bearer private'}}),env);assert.equal(calls,3);
    assert.equal(store.size,1);assert.equal([...store.values()][0].headers.get('cache-control'),'public, max-age=240, s-maxage=240');
  }finally{globalThis.caches=previous;}
});

test('admin and auth schema initialize once; a cold isolate uses one version lookup instead of replaying DDL',async()=>{
  const sqlite=new DatabaseSync(':memory:'),DB=d1(sqlite);
  try{
    const admin=await moduleFrom('worker/admin-console/db.ts'),auth=await moduleFrom('worker/auth.ts');
    await Promise.all([admin.ensureSchema({DB}),admin.ensureSchema({DB})]);await auth.ensureAuthSchema({DB});
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM runtime_schema_versions').get().n,2);
    DB.calls.length=0;
    await (await moduleFrom('worker/admin-console/db.ts')).ensureSchema({DB});await (await moduleFrom('worker/auth.ts')).ensureAuthSchema({DB});
    assert.equal(DB.calls.length,2);assert.ok(DB.calls.every(sql=>sql.startsWith('SELECT version')));
    const other=new DatabaseSync(':memory:');try{await admin.ensureSchema({DB:d1(other)});assert.ok(other.prepare("SELECT name FROM sqlite_master WHERE name='aap_admins'").get());}finally{other.close();}
  }finally{sqlite.close();}
});

test('failed schema bootstrap never publishes a ready marker',async()=>{
  const sqlite=new DatabaseSync(':memory:'),DB=d1(sqlite);
  try{
    const {withSchemaVersion}=await moduleFrom('worker/schema-version.ts');
    await assert.rejects(withSchemaVersion(DB,'broken','v1',async()=>{throw Error('interrupted migration');}),/interrupted migration/);
    assert.equal(sqlite.prepare("SELECT name FROM sqlite_master WHERE name='runtime_schema_versions'").get(),undefined);
    await withSchemaVersion(DB,'broken','v1',async()=>{});assert.equal(sqlite.prepare("SELECT version FROM runtime_schema_versions WHERE component='broken'").get().version,'v1');
  }finally{sqlite.close();}
});

test('archive fallback retains Atlas timing, birth references, discovery and date identity',async()=>{
  const {publicArchivePageResponse}=await moduleFrom('worker/public-archive-pages.ts');
  const {enrichDate}=await moduleFrom('extensions/day-atlas/worker.mjs');
  const env={PUBLIC_SITE_URL:'https://aafnaipatro.com',ASSETS:{
    async fetch(request){
      try{return new Response(await readFile('public'+new URL(request.url).pathname),{headers:{'content-type':'application/json'}});}
      catch{return new Response(null,{status:404});}
    }
  }};
  for(const date of ['1950-01-01','2025-10-10','2026-10-30']){
    const response=await publicArchivePageResponse(new Request('https://aafnaipatro.com/date/'+date),env);assert.equal(response.status,200);
    const html=await response.text();assert.ok(html.includes('id="local-panchang"'));assert.ok(html.includes('href="https://aafnaipatro.com/date/'+date+'"'));assert.ok(html.includes('data-patro-discovery-v2'));
    if(date<='2025-12-31')assert.ok(html.includes('id="birth-date-reference"'));
    // The old Atlas layer recognizes the enrichment and never duplicates it.
    const oldLayer=await enrichDate(new Request('https://aafnaipatro.com/date/'+date),{ORIGIN:{fetch:async()=>new Response(html,{headers:{'content-type':'text/html'}})}},date);
    assert.equal(await oldLayer.text(),html);
  }
});
