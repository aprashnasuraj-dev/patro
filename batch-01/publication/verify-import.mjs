#!/usr/bin/env node
/** Mission Mangal 530-tool ten-folder import verification; no network, no commits, no deployments. */
import {readFile, stat, access, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,'../..');
const argv=new Set(process.argv.slice(2));
const mode=argv.has('--hash')?'hash':argv.has('--compile')?'compile':argv.has('--collisions')?'collisions':'quick';
let failures=[], warnings=[],rows=[],batchCount=[];
const readJson=async p=>JSON.parse(await readFile(p,'utf8'));
const exists=async p=>{try{await access(p);return true}catch{return false}};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=(kind,message)=>failures.push({kind,message});
const warn=(kind,message)=>warnings.push({kind,message});

for(let batch=1;batch<=10;batch++){
 const b=String(batch).padStart(2,'0'),root=path.join(repo,`batch-${b}`);
 if(!await exists(root)){fail('missing_batch',`batch-${b}`);continue}
 try{
  const catalog=await readJson(path.join(root,'catalog.json'));
  const receipt=await readJson(path.join(root,'RECONCILIATION.json'));
  if(catalog.length!==53)fail('bad_batch_count',`${b}: ${catalog.length}`);
  if(receipt.tools.length!==catalog.length)fail('bad_reconciliation_count',b);
  batchCount.push({batch:b,tools:catalog.length,unresolved:receipt.unresolved_dependency_count,conflicts:receipt.source_conflict_count});
  for(const t of catalog){
   const n=Number(t.id.replace('TOOL-',''));
   if(!/^TOOL-\d{4}$/.test(t.id)||n<1||n>530||Math.ceil(n/53)!==batch)fail('wrong_id_or_batch',t.id);
   const folder=path.join(root,'tool-products',t.id);
   if(!await exists(folder))fail('missing_source',t.id);
   if(!await exists(path.join(folder,'tool.json')))fail('missing_tool_json',t.id);
   if(!await exists(path.join(folder,'page.html')))warn('missing_page_html',t.id);
   if(!await exists(path.join(folder,'qa','acceptance.json')))warn('missing_qa_receipt',t.id);
   rows.push(t);
  }
  if(receipt.unresolved_dependency_count>0)fail('unresolved_shared_dependency',`batch ${b}`);
  if(receipt.source_conflict_count>0)fail('conflicting_tool_source',`batch ${b}`);
  if(mode==='hash'){
   for(const t of receipt.tools){
    for(const [sub,want] of Object.entries(t.result_sha256_by_file)){
     const p=path.join(root,'tool-products',t.id,sub);
     try{const got=sha(await readFile(p));if(got!==want)fail('modified_source_file',`${t.id}/${sub}`)}
     catch(e){fail('missing_file_for_hash',`${t.id}/${sub}: ${e.message}`)}
    }
   }
  }
 }catch(e){fail('broken_batch',`${b}: ${e.message}`)}
}
const registry=await readJson(path.join(here,'route-catalog-530.json'));
if(rows.length!==530||registry.length!==530)fail('not_530',`catalogs=${rows.length}, master=${registry.length}`);
const seenIds=new Set(),seenPaths=new Set();
for(const r of registry){
 if(seenIds.has(r.id))fail('duplicate_id',r.id);seenIds.add(r.id);
 if(!/^\/[a-z]+\/[a-z0-9]+(?:-[a-z0-9]+)+$/.test(r.canonical_proposed))fail('invalid_hyphenated_route',r.id+': '+r.canonical_proposed);
 if(seenPaths.has(r.canonical_proposed))fail('duplicate_route',r.canonical_proposed);seenPaths.add(r.canonical_proposed);
 if(!rows.some(a=>a.id===r.id&&a.canonical_proposed===r.canonical_proposed))fail('registry_disagreement',r.id);
 if(!r.related_tool_ids?.length)warn('missing_related_links',r.id);
 for(const related of r.related_tool_ids||[])if(related===r.id||!registry.some(k=>k.id===related))fail('invalid_related_link',r.id+' -> '+related);
}
if(mode==='collisions'){
 const candidates=['seo/published-url-baseline.json','public/sitemap-utilities.xml'];
 const p=path.join(repo,candidates[0]);
 if(!await exists(p))warn('collision_check_unavailable','Existing published URL baseline missing; compare routes with Patro in its separate repository before any publication.');
 else try{
  const baseline=await readJson(p);const current=new Set(baseline.paths||[]);
  for(const r of registry){
   if(current.has(r.canonical_proposed))fail('existing_live_url_collision',`${r.id} ${r.canonical_proposed}`);
   if(current.has(r.reserved_legacy_route))warn('legacy_url_exists_review_before_redirect',`${r.id} ${r.reserved_legacy_route}`);
  }
 }catch(e){fail('collision_parser',e.message)}
}
if(mode==='compile'){
 let esbuild=null;
 try{const req=createRequire(path.join(repo,'package.json'));esbuild=req('esbuild')}catch{}
 if(!esbuild){warn('compile_not_run','esbuild is not already installed in the imported repository. No network installation performed.');}
 else{
  const jobs=registry.filter(r=>seenIds.has(r.id));let cursor=0;
  async function worker(){for(;;){let i=cursor++;if(i>=jobs.length)break;const t=jobs[i];const dir=path.join(repo,`batch-${t.batch.split('-')[1]}`,'tool-products',t.id);
    const entries=[];for(const name of ['core.ts','ui.ts']){const f=path.join(dir,'src',name);if(await exists(f))entries.push(f)}
    if(!entries.length){warn('compile_entry_missing',t.id);continue}
    for(const f of entries){try{await esbuild.build({entryPoints:[f],bundle:true,format:'esm',platform:'browser',write:false,logLevel:'silent',target:'es2022',packages:'external',loader:{'.svg':'text'}})}catch(e){fail('compile_failure',`${t.id}/${path.basename(f)}: ${String(e.errors?.[0]?.text||e.message).slice(0,260)}`)}}
   }}
  await Promise.all(Array.from({length:6},worker));
 }
}
const result={test:'MISSION_MANGAL_IMPORT',stage:mode,checked_at:new Date().toISOString(),repo,tools_seen:rows.length,expected_tools:530,unique_canonical_paths:seenPaths.size,batches:batchCount,status:failures.length?'FAIL':mode==='compile'&&warnings.some(w=>w.kind==='compile_not_run')?'NOT_RUN':'STATIC_CHECK_PASS',
 disclaimer:'STATIC_CHECK_PASS never means runtime QA or publication readiness',failures,warnings};
console.log(JSON.stringify(result,null,2));
if(failures.length)process.exitCode=1;
