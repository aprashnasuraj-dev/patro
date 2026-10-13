// Worker side of the Nepali dictionary: server-rendered word/English pages from static shards,
// variant redirects, 404s, and the signed-in saved-words API on D1. Needs `npm run dict:build` first.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {existsSync} from 'node:fs';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const root=process.cwd(),data=resolve(root,'public/data/dict/v1');
const ready=existsSync(join(data,'manifest.json'));
const tmp=await mkdtemp(join(tmpdir(),'patro-dict-'));
test.after(()=>rm(tmp,{recursive:true,force:true}));
const entry=join(tmp,'entry.ts');
await writeFile(entry,`export * from ${JSON.stringify(resolve(root,'worker/dictionary.ts'))};\nexport { sha256, ensureAuthSchema } from ${JSON.stringify(resolve(root,'worker/auth.ts'))};\nexport { buildShell } from ${JSON.stringify(resolve(root,'src/lib/dictionary-core/index.ts'))};`);
await build({entryPoints:[entry],outfile:join(tmp,'dict.mjs'),bundle:true,platform:'node',format:'esm',logLevel:'silent'});
const w=await import(pathToFileURL(join(tmp,'dict.mjs')));

const origin='https://aafnaipatro.com',BASE='/tool/nepalidictionary';
const shell=w.buildShell('<!doctype html><html lang="en"><head><title>App</title><meta name="description" content="x"><link rel="canonical" href="https://aafnaipatro.com/"></head><body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>');
const ASSETS={async fetch(req){const p=decodeURIComponent(new URL(req.url).pathname);
  if(p==='/data/dict/v1/shell.html')return new Response(shell,{headers:{'content-type':'text/html'}});
  if(p.startsWith('/data/dict/v1/')){const f=join(data,p.slice('/data/dict/v1/'.length));return existsSync(f)?new Response(await readFile(f),{headers:{'content-type':'application/json'}}):new Response('',{status:404});}
  return new Response('',{status:404});}};
function d1(){const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');const stmt=(sql,args=[])=>({bind:(...a)=>stmt(sql,a),async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}}}});
  return {db,prepare:(sql)=>stmt(sql),async batch(list){db.exec('BEGIN');try{const out=[];for(const s of list)out.push(await s.run());db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}};}
const get=(path)=>w.dictionaryResponse(new Request(origin+path),{ASSETS,PUBLIC_SITE_URL:origin});
const enc=(s)=>encodeURIComponent(s);

test('word page is server-rendered from the shard with canonical head, crawlable body and boot data',{skip:!ready&&'run npm run dict:build'},async()=>{
  const res=await get(`${BASE}/${enc('घर')}`);
  assert.equal(res.status,200);
  const html=await res.text();
  assert.match(html,/<h1 class="dict-lemma">घर<\/h1>/);
  assert.match(html,/data-seo-prerender="true"/);
  assert.match(html,/<link rel="canonical" href="https:\/\/aafnaipatro\.com\/tool\/nepalidictionary\/%E0%A4%98%E0%A4%B0"/);
  assert.match(html,/<script id="__DICT__" type="application\/json">/);
  assert.equal((html.match(/<title>/g)||[]).length,1,'exactly one <title>');
  assert.match(html,/<script type="module" src="\/assets\/app.js">/,'app bundle kept so React boots');
  assert.equal(res.headers.get('x-robots-tag'),'index, follow');
});

test('variants and inflected forms redirect to the headword; unknown words are 404 noindex',{skip:!ready&&'run npm run dict:build'},async()=>{
  const r=await get(`${BASE}/ghar`);
  assert.equal(r.status,301);
  assert.equal(decodeURIComponent(new URL(r.headers.get('location')).pathname),`${BASE}/घर`);
  const miss=await get(`${BASE}/${enc('क्ष्ज्ञ्ञ्ञ')}`);
  assert.equal(miss.status,404);
  assert.equal(miss.headers.get('x-robots-tag'),'noindex, follow');
});

test('rich rhyme pages are server-rendered; thin ones fall back to the app',{skip:!ready&&'run npm run dict:build'},async()=>{
  const res=await get(`${BASE}/anupras/${enc('मन')}`);
  assert.equal(res.status,200);
  const html=await res.text();
  assert.match(html,/मनसँग मिल्ने शब्द/);
  assert.ok((html.match(/<li>/g)||[]).length>=8);
});

test('A–Z browse pages are server-rendered and paginated',{skip:!ready&&'run npm run dict:build'},async()=>{
  const res=await get(`${BASE}/akshar/${enc('क')}`);
  assert.equal(res.status,200);
  const html=await res.text();
  assert.match(html,/"क" बाट सुरु हुने शब्दहरू/);
  assert.match(html,/class="dict-pager"/);
  assert.equal((await get(`${BASE}/akshar/${enc('क')}/2`)).status,200);
  assert.equal((await get(`${BASE}/akshar/${enc('क')}/1`)).status,404,'page 1 has one canonical URL');
  assert.equal((await get(`${BASE}/akshar/${enc('क')}/999`)).status,404);
});

test('English page: house meaning in Nepali',{skip:!ready&&'run npm run dict:build'},async()=>{
  const res=await get(`${BASE}/en/house`);
  assert.equal(res.status,200);
  const html=await res.text();
  assert.match(html,/House meaning in Nepali/);
  assert.match(html,/घर/);
  assert.equal((await get(`${BASE}/en/House`)).status,301,'non-canonical case redirects');
});

test('fixed pages fall through to the prerendered assets',async()=>{
  for(const p of [BASE,`${BASE}/ukhan`,`${BASE}/sikau/ne-A1`,`${BASE}/pariksha`,'/tools/nepali-typing'])
    assert.equal(await get(p),null,p);
});

test('saved-words API: auth, same-origin, upsert, list, delete, quiz, account isolation',async()=>{
  const env={ASSETS,DB:d1()};
  await w.ensureAuthSchema(env);
  const mkUser=async(id)=>{const token='tok-'+id;env.DB.db.prepare("insert into app_users(id,provider,provider_subject) values(?,?,?)").run(id,'google',id);
    env.DB.db.prepare("insert into auth_sessions(id,user_id,token_hash,expires_at) values(?,?,?,?)").run('s-'+id,id,await w.sha256(token),new Date(Date.now()+864e5).toISOString());return 'mp_session='+token;};
  const a=await mkUser('user-a'),b=await mkUser('user-b');
  const call=(path,method='GET',body,cookie='',o=origin)=>w.dictionaryResponse(new Request(origin+path,{method,headers:{origin:o,cookie,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),env);
  assert.equal((await call('/api/v1/dictionary/cards')).status,401);
  const card={id:'घर',front:'घर',back:'house, home',dir:'ne-en',ease:2.5,interval:1,reps:1,due:20000,added:19999};
  assert.equal((await call('/api/v1/dictionary/cards','PUT',{cards:[card]},a,'https://evil.example')).status,403);
  assert.equal((await call('/api/v1/dictionary/cards','PUT',{cards:[card,{id:'en:water',front:'water',back:'पानी',dir:'en-ne',due:20000,added:19999}]},a)).status,200);
  assert.equal((await call('/api/v1/dictionary/cards','PUT',{cards:[{...card,reps:2,interval:3}]},a)).status,200);
  const list=await (await call('/api/v1/dictionary/cards','GET',null,a)).json();
  assert.equal(list.cards.length,2);
  assert.equal(list.cards.find(c=>c.id==='घर').reps,2);
  assert.equal((await (await call('/api/v1/dictionary/cards','GET',null,b)).json()).cards.length,0,'other users see nothing');
  assert.equal((await call('/api/v1/dictionary/cards?id='+enc('घर'),'DELETE',null,a)).status,200);
  assert.equal((await (await call('/api/v1/dictionary/cards','GET',null,a)).json()).cards.length,1);
  assert.equal((await call('/api/v1/dictionary/quiz','POST',{mode:'synonym',level:'A2',score:8,total:10},a)).status,200);
  assert.equal(env.DB.db.prepare('select count(*) n from dict_quiz_results where user_id=?').get('user-a').n,1);
  assert.equal((await call('/api/v1/dictionary/quiz','POST',{mode:'<script>',score:1,total:1},a)).status,400);
});
