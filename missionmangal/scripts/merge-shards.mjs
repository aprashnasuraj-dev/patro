#!/usr/bin/env node
// Merge shard outputs (disjoint ids) into content/ + registry. Moves records reserved->review only; blocked reasons go to reports/.
import {readFile,writeFile,readdir,mkdir,cp} from 'node:fs/promises';import {join,resolve} from 'node:path';
import {loadRegistry,saveRegistry} from '../core/engine.mjs';
const root=resolve('missionmangal'),stateDir=join(root,'state');
const reg=await loadRegistry(join(root,'config','portfolio.json'));const byId=new Map(reg.map(r=>[r.id,r]));
let review=0,approved=0,dupImages=0,blocked={};const imgs=new Set();await mkdir(join(root,'content'),{recursive:true});await mkdir(join(root,'reports'),{recursive:true});
for(const d of await readdir(stateDir).catch(()=>[])){
 const led=await readFile(join(stateDir,d,'ledger.jsonl'),'utf8').catch(()=>'');
 const latest=new Map();for(const l of led.split('\n').filter(Boolean)){const j=JSON.parse(l);latest.set(j.id,j);}
 for(const [id,j] of latest){const r=byId.get(id);if(!r||r.status!=='reserved')continue;
  if(j.status==='review'||j.status==='approved'){const src=join(stateDir,d,'content',id+'.json'),a=JSON.parse(await readFile(src,'utf8'));let st=j.status;
   const u=a.media?.[0]?.url;if(st==='approved'&&u){if(imgs.has(u)){st='review';a.status='review';a.media=[];dupImages++;}else imgs.add(u);}
   await writeFile(join(root,'content',id+'.json'),JSON.stringify(a,null,2)+'\n');r.status=st;r.updated_at=a.review?.at||new Date().toISOString();r.published_at=st==='approved'?r.updated_at:undefined;st==='approved'?approved++:review++;}
  else{const k=(j.reason||'unknown').split(':')[0];blocked[k]=(blocked[k]||0)+1;}}
}
await saveRegistry(join(root,'config','portfolio.json'),[...byId.values()]);
await writeFile(join(root,'reports','last-merge.json'),JSON.stringify({approved,review,dupImages,blocked,at:new Date().toISOString()},null,2));
console.log(JSON.stringify({approved,review,dupImages,blocked}));
