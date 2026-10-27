#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {policyFor} from './policy.mjs';
import {externalImports,declaredDependencies,identityFindings,canonicalLeaf,browserProfile,normalizedFamily,classifyTestFramework,metadataId,normalizedTitle} from './inventory-lib.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=path.join(root,'reports','mm530-inventory');
const read=async p=>fs.readFile(p,'utf8');
const json=async p=>JSON.parse(await read(p));
const exists=async p=>fs.access(p).then(()=>true,()=>false);
const rel=p=>path.relative(root,p).replaceAll(path.sep,'/');
const walk=async dir=>{
 const result=[];if(!await exists(dir))return result;
 for(const d of await fs.readdir(dir,{withFileTypes:true})){
  const p=path.join(dir,d.name);
  if(d.isDirectory())result.push(...await walk(p));else result.push(p);
 }
 return result.sort();
};
const masterRows=await json(path.join(root,'batch-01','publication','route-catalog-530.json'));
const masters=new Map(),masterDuplicates=[];
for(const x of masterRows){if(masters.has(x.id))masterDuplicates.push(x.id);else masters.set(x.id,x)}
const batchMaps=new Map(),batchDuplicateIds=[],batchCounts={};
for(let n=1;n<=10;n++){
 const bn='BATCH-'+String(n).padStart(2,'0'),rows=await json(path.join(root,'batch-'+String(n).padStart(2,'0'),'catalog.json'));
 batchCounts[bn]=rows.length;
 const m=new Map();
 for(const x of rows){if(m.has(x.id)||batchMaps.has(x.id))batchDuplicateIds.push(x.id);m.set(x.id,x);batchMaps.set(x.id,x)}
}
let qaById=new Map(),phase1Summary=null;
try{const q=await json(path.join(root,'reports','mm530-qa','all-tools.json'));phase1Summary=q.summary;qaById=new Map(q.tools.map(x=>[x.id,x]))}catch{}
const records=[],globalIssues=[];
for(let n=1;n<=530;n++){
 const id='TOOL-'+String(n).padStart(4,'0'),batchNo=String(Math.ceil(n/53)).padStart(2,'0'),expectedBatch='BATCH-'+batchNo;
 const master=masters.get(id)||null,batchRow=batchMaps.get(id)||null,dir=path.join(root,'batch-'+batchNo,'tool-products',id);
 const metaPath=path.join(dir,'tool.json'),pagePath=path.join(dir,'page.html'),srcDir=path.join(dir,'src'),testDir=path.join(dir,'tests');
 let meta=null,metaError=null;
 try{meta=await json(metaPath)}catch(e){metaError=String(e.message||e)}
 const srcFiles=await walk(srcDir),testFiles=await walk(testDir);
 const sourceTexts=[];
 for(const p of srcFiles)if(/\.(?:[cm]?[jt]sx?)$/.test(p))try{sourceTexts.push({path:p,text:await read(p)})}catch{}
 const imports=[...new Set(sourceTexts.flatMap(x=>externalImports(x.text,x.path)))].sort();
 const declared=declaredDependencies(meta||{});
 const declaredAll=new Set([...declared.runtime,...declared.test]);
 const undeclared=imports.filter(x=>!declaredAll.has(x));
 const testFrameworks={},testList=[];
 for(const p of testFiles)if(/\.(?:[cm]?[jt]sx?)$/.test(p)){
   let s='';try{s=await read(p)}catch{}
   const f=classifyTestFramework(path.basename(p),s);testFrameworks[f]=(testFrameworks[f]||0)+1;
   testList.push({path:rel(p),framework:f});
 }
 const identity=identityFindings({expectedId:id,expectedBatch,master,batchRow,meta:meta||{}});
 if(metaError)identity.push('tool_json_unreadable');
 const files={
   source_dir_exists:await exists(dir), tool_json:await exists(metaPath), page_html:await exists(pagePath),
   source_entries:srcFiles.map(rel), tests:testList,
   has_worker:srcFiles.some(p=>/\/worker\.(?:[cm]?[jt]s)$/.test(p.replaceAll(path.sep,'/'))),
   has_browser_test:testList.some(x=>x.framework==='browser')
 };
 const sourceState=meta?.source_state||meta?.sourceState||null;
 const qaStatus=meta?.qa_status||meta?.qaStatus||null;
 const publicationStatus=master?.publication_status||batchRow?.publication_status||meta?.publication||meta?.publication_gate||null;
 const titleVariants=[master?.title,batchRow?.title,batchRow?.name,meta?.title,meta?.name].filter(x=>typeof x==='string'&&x.trim());
 const rawTitles=[...new Set(titleVariants)],semanticTitles=[...new Set(rawTitles.map(normalizedTitle))];
 const titleConflicts=semanticTitles.length>1?rawTitles:[];
 const routeMeta=meta?.reserved_route||meta?.route||null,canonical=master?.canonical_proposed||batchRow?.canonical_proposed||null;
 const legacy=master?.reserved_legacy_route||batchRow?.reserved_legacy_route||routeMeta||null;
 const risk=policyFor(master||batchRow||meta||{}).map(x=>x.kind);
 const phase1=qaById.get(id)||null;
 const issues=[];
 if(identity.length)issues.push(...identity.map(x=>'identity:'+x));
 if(!files.source_dir_exists)issues.push('missing:source_dir');
 if(!files.tool_json)issues.push('missing:tool_json');
 if(!files.page_html)issues.push('missing:page_html');
 if(!srcFiles.length)issues.push('missing:source_entries');
 if(titleConflicts.length)issues.push('review:title_variants');
 if(undeclared.length)issues.push('review:undeclared_external_imports');
 if(!declared.runtime.length&&imports.length)issues.push('review:no_runtime_dependency_declaration');
 records.push({
  schema_version:'MM530_TOOL_INVENTORY_V1',id,sequence:n,title:master?.title||batchRow?.title||batchRow?.name||meta?.title||meta?.name||null,
  title_variants:titleConflicts,batch:expectedBatch,source_dir:rel(dir),
  primary_group:master?.primary_group||batchRow?.primary_group||null,
  topic_group:master?.topic_group||batchRow?.topic_group||null,
  engineering_family:normalizedFamily(master||{},meta||{}),
  routes:{canonical_proposed:canonical,canonical_leaf:canonicalLeaf(canonical),legacy_reserved:legacy,metadata_route:routeMeta},
  dependencies:{declared_runtime:declared.runtime,declared_test:declared.test,inferred_external_imports:imports,undeclared_external_imports:undeclared},
  tests:{framework_counts:testFrameworks,files:testList},
  browser:browserProfile(meta||{},files),
  policy:{risk_classes:risk,license_review_required:id==='TOOL-0527'},
  qa:{source_state:sourceState,qa_status:qaStatus,publication_status:publicationStatus,published:meta?.published??false,git_imported:meta?.git_imported??null,phase1_checks:phase1?.checks||null},
  identity:{normalized_metadata_id:metadataId(meta||{}),findings:identity},
  files:{source_dir_exists:files.source_dir_exists,tool_json:files.tool_json,page_html:files.page_html,source_entries:files.source_entries},
  inventory_issues:issues
 });
}
const groupBy=(items,keyFn)=>{const m=new Map();for(const x of items){const k=keyFn(x);if(!k)continue;const a=m.get(k)||[];a.push(x.id);m.set(k,a)}return [...m].filter(([,ids])=>ids.length>1).map(([value,ids])=>({value,ids}));};
const duplicateCanonicals=groupBy(records,x=>x.routes.canonical_proposed);
const duplicateLegacy=groupBy(records,x=>x.routes.legacy_reserved);
const duplicateSlugs=groupBy(records,x=>x.routes.canonical_leaf);
const missing={
 source_dirs:records.filter(x=>!x.files.source_dir_exists).map(x=>x.id),
 tool_json:records.filter(x=>!x.files.tool_json).map(x=>x.id),
 page_html:records.filter(x=>!x.files.page_html).map(x=>x.id),
 source_entries:records.filter(x=>!x.files.source_entries.length).map(x=>x.id)
};
const identityAmbiguities=records.filter(x=>x.identity.findings.length).map(x=>({id:x.id,findings:x.identity.findings}));
const expectedIds=Array.from({length:530},(_,i)=>'TOOL-'+String(i+1).padStart(4,'0'));
const actualIds=records.map(x=>x.id),uniqueIds=new Set(actualIds);
const exactIds=expectedIds.every((x,i)=>actualIds[i]===x)&&uniqueIds.size===530;
const issueCounts={};
for(const r of records)for(const issue of r.inventory_issues)issueCounts[issue]=(issueCounts[issue]||0)+1;
const summary={
 schema_version:'MM530_INVENTORY_SUMMARY_V1',generated_at:new Date().toISOString(),
 records:records.length,unique_ids:uniqueIds.size,exact_expected_id_sequence:exactIds,
 master_rows:masterRows.length,master_duplicate_ids:masterDuplicates,batch_counts:batchCounts,batch_duplicate_ids:batchDuplicateIds,
 identity_ambiguity_count:identityAmbiguities.length,duplicate_canonical_count:duplicateCanonicals.length,
 duplicate_legacy_count:duplicateLegacy.length,duplicate_canonical_leaf_count:duplicateSlugs.length,
 missing,issue_counts:issueCounts,
 phase1_source:phase1Summary?{tested:phase1Summary.tested,failed:phase1Summary.failed,at:phase1Summary.at}:null,
 hard_gate:{
  expected_530:records.length===530&&uniqueIds.size===530&&exactIds,
  identity_unambiguous:identityAmbiguities.length===0&&masterDuplicates.length===0&&batchDuplicateIds.length===0,
  canonical_unique:duplicateCanonicals.length===0,
  required_source_present:Object.values(missing).every(a=>a.length===0)
 }
};
summary.status=Object.values(summary.hard_gate).every(Boolean)?'PASS':'FAIL';
const issues={identity_ambiguities:identityAmbiguities,duplicate_canonicals:duplicateCanonicals,duplicate_legacy_routes:duplicateLegacy,duplicate_canonical_leaf_slugs:duplicateSlugs,missing,records_with_undeclared_imports:records.filter(x=>x.dependencies.undeclared_external_imports.length).map(x=>({id:x.id,imports:x.dependencies.undeclared_external_imports})),title_variants:records.filter(x=>x.title_variants.length).map(x=>({id:x.id,titles:x.title_variants}))};
await fs.mkdir(out,{recursive:true});
await fs.writeFile(path.join(out,'canonical-tools.json'),JSON.stringify({summary,tools:records},null,2));
await fs.writeFile(path.join(out,'inventory-summary.json'),JSON.stringify(summary,null,2));
await fs.writeFile(path.join(out,'inventory-issues.json'),JSON.stringify(issues,null,2));
const lines=[
 '# MM530 Phase 2 — canonical inventory',
 '',
 'Status: **'+summary.status+'**',
 '',
 '| Measure | Count |','|---|---:|',
 '| Canonical tool records | '+summary.records+' |',
 '| Unique IDs | '+summary.unique_ids+' |',
 '| Identity ambiguities | '+summary.identity_ambiguity_count+' |',
 '| Duplicate canonical URLs | '+summary.duplicate_canonical_count+' |',
 '| Duplicate legacy URLs | '+summary.duplicate_legacy_count+' |',
 '| Duplicate canonical leaf slugs | '+summary.duplicate_canonical_leaf_count+' |',
 '| Missing tool.json | '+missing.tool_json.length+' |',
 '| Missing page.html | '+missing.page_html.length+' |',
 '| Missing source entries | '+missing.source_entries.length+' |',
 '',
 'Hard gate: '+JSON.stringify(summary.hard_gate),
 '',
 'Dependency and title-variant findings are review queues, not silently treated as identity failures. The canonical inventory does not publish or integrate any tool.'
];
await fs.writeFile(path.join(out,'phase2-summary.md'),lines.join('\n'));
console.log(JSON.stringify(summary,null,2));
if(summary.status!=='PASS')process.exitCode=1;
