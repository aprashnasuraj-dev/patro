import path from 'node:path';
import {classifyTestFramework,metadataId} from './harness-lib.mjs';

export function packageRoot(spec){
 if(typeof spec!=='string'||!spec||spec.startsWith('.')||spec.startsWith('/')||spec.startsWith('node:')||/^(?:https?:|data:|blob:)/.test(spec))return null;
 const parts=spec.split('/');
 return spec.startsWith('@')?parts.slice(0,2).join('/'):parts[0];
}
export function externalImports(source=''){
 const specs=new Set();
 for(const re of [
   /\bfrom\s*['"]([^'"]+)['"]/g,
   /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
   /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
   /^\s*import\s*['"]([^'"]+)['"]/gm
 ])for(const m of source.matchAll(re)){const p=packageRoot(m[1]);if(p)specs.add(p)}
 return [...specs].sort();
}
function addDeps(set,value){
 if(!value)return;
 if(Array.isArray(value)){
   for(const x of value)if(typeof x==='string')set.add(x);
 }else if(typeof value==='object'){
   for(const k of Object.keys(value))set.add(k);
 }
}
export function declaredDependencies(meta={}){
 const runtime=new Set(),test=new Set();
 addDeps(runtime,meta.dependencies);
 addDeps(runtime,meta.requirements?.dependencies);
 addDeps(runtime,meta.runtime_dependencies);
 addDeps(test,meta.devDependencies);
 addDeps(test,meta.dev_dependencies);
 addDeps(test,meta.test_dependencies);
 addDeps(test,meta.requirements?.test_dev_dependencies);
 return {runtime:[...runtime].sort(),test:[...test].sort()};
}
export function identityFindings({expectedId,expectedBatch,master,batchRow,meta}){
 const issues=[],mid=metadataId(meta);
 if(!master)issues.push('missing_master_registry_row');
 else if(master.id!==expectedId)issues.push('master_id_mismatch');
 if(!batchRow)issues.push('missing_batch_catalog_row');
 else if(batchRow.id!==expectedId)issues.push('batch_catalog_id_mismatch');
 if(mid!==expectedId)issues.push(mid?'metadata_id_mismatch:'+mid:'metadata_id_unresolved');
 const mb=master?.batch,bb=batchRow?.batch;
 if(mb&&mb!==expectedBatch.toUpperCase().replace('BATCH-','BATCH-'))issues.push('master_batch_mismatch:'+mb);
 if(bb&&bb!==expectedBatch.toUpperCase().replace('BATCH-','BATCH-'))issues.push('batch_row_batch_mismatch:'+bb);
 if(master?.canonical_proposed&&batchRow?.canonical_proposed&&master.canonical_proposed!==batchRow.canonical_proposed)issues.push('canonical_registry_disagreement');
 return issues;
}
export function canonicalLeaf(route=''){return String(route).replace(/\/+$/,'').split('/').filter(Boolean).at(-1)||''}
export function browserProfile(meta={},files={}){
 return {
  browser_first:meta.browser_first??null,
  declared_runtime:meta.requirements?.runtime||meta.runtime||null,
  normal_usage_network_requests:meta.normal_usage_network_requests??null,
  runtime_network:meta.privacy?.runtime_network??null,
  has_worker:!!files.has_worker,
  has_browser_test:!!files.has_browser_test,
  has_page_html:!!files.has_page_html
 };
}
export function normalizedFamily(master={},meta={}){
 return {
  id:master.engineering_family||meta.engineering_family_id||meta.family_id||null,
  name:meta.engineering_family||null
 };
}
export {classifyTestFramework,metadataId};
