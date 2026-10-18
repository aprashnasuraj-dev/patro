#!/usr/bin/env node
// Merge shard outputs (disjoint ids) into content/ + registry. Moves records reserved->review only; blocked reasons go to reports/.
import {readFile,writeFile,readdir,mkdir,cp} from 'node:fs/promises';import {join,resolve} from 'node:path';
import {loadRegistry,saveRegistry} from '../core/engine.mjs';
const root=resolve('missionmangal'),stateDir=join(root,'state');
const reg=await loadRegistry(join(root,'config','portfolio.json'));const byId=new Map(reg.map(r=>[r.id,r]));
let review=0,blocked={};await mkdir(join(root,'content'),{recursive:true});await mkdir(join(root,'reports'),{recursive:true});
for(const d of await readdir(stateDir).catch(()=>[])){
 const led=await readFile(join(stateDir,d,'ledger.jsonl'),'utf8').catch(()=>'');
 const latest=new Map();for(const l of led.split('\n').filter(Boolean)){const j=JSON.parse(l);latest.set(j.id,j);}
 for(const [id,j] of latest){const r=byId.get(id);if(!r||r.status!=='reserved')continue;
  if(j.status==='review'){await cp(join(stateDir,d,'content',id+'.json'),join(root,'content',id+'.json'));r.status='review';review++;}
  else{const k=(j.reason||'unknown').split(':')[0];blocked[k]=(blocked[k]||0)+1;}}
}
await saveRegistry(join(root,'config','portfolio.json'),[...byId.values()]);
await writeFile(join(root,'reports','last-merge.json'),JSON.stringify({review,blocked,at:new Date().toISOString()},null,2));
console.log(JSON.stringify({review,blocked}));
