#!/usr/bin/env node
// Compact fail-closed release gate. Checks every automatically approved v2 candidate before staging.
import {readdir,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {auditArticle} from '../core/quality.mjs';
import {lint} from '../core/voice.mjs';
import {validateInlineCitations} from './write-compact.mjs';
const root=resolve('missionmangal/state');
const dirs=(await readdir(root).catch(()=>[])).filter(x=>/^v2-\d+$/.test(x));
let checked=0,failed=0,review=0;
const failures=[];
for(const dir of dirs){
 const folder=join(root,dir,'content');
 for(const name of (await readdir(folder).catch(()=>[])).filter(x=>x.endsWith('.json'))){
  let a;try{a=JSON.parse(await readFile(join(folder,name),'utf8'));}catch{failed++;failures.push({file:dir+'/'+name,code:'INVALID_JSON'});continue;}
  if(a.status!=='approved'){review++;continue;}
  checked++;
  const sourceIds=new Set((a.sources||[]).map(s=>s.id).filter(Boolean));
  const problems=[...auditArticle(a),...lint(a.body_md||''),...validateInlineCitations(a.body_md||'',sourceIds)];
  if(problems.length){failed++;failures.push({id:a.id,code:'APPROVED_CANDIDATE_FAILED',problems:problems.slice(0,8)});}
 }
}
console.log(JSON.stringify({gate:'missionmangal-v2-release',checked,failed,review,failures:failures.slice(0,50)}));
if(failed)process.exit(1);
