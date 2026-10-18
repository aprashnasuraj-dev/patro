#!/usr/bin/env node
// Reconcile every prior state dir (pass-1 shards, rescue-N, checkpoint branches, earlier v2 output) into ONE view, classify all topics,
// and emit plan.json: what is done, what can be written straight from cached evidence, and what truly needs more research.
import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';import {join,resolve} from 'node:path';
import {classify,ROUTE_ORDER} from './classify.mjs';
const rank={approved:3,review:2,blocked:1,retry_later:0};
export async function loadState(stateDir){
 const latest=new Map(),evidence=new Map(),content=new Map();
 for(const d of await readdir(stateDir).catch(()=>[])){
  const base=join(stateDir,d);
  for(const l of (await readFile(join(base,'ledger.jsonl'),'utf8').catch(()=>'')).split('\n').filter(Boolean)){let j;try{j=JSON.parse(l);}catch{continue;}
   const p=latest.get(j.id);if(!p||(rank[j.status]??0)>(rank[p.status]??0)||((rank[j.status]??0)===(rank[p.status]??0)&&j.at>p.at))latest.set(j.id,{...j,_dir:d});}
  for(const f of await readdir(join(base,'evidence')).catch(()=>[])){try{const e=JSON.parse(await readFile(join(base,'evidence',f),'utf8'));const prev=evidence.get(e.id);if(!prev||(e.evidence||[]).length>prev.length)evidence.set(e.id,e.evidence||[]);}catch{}}
 }
 return {latest,evidence};
}
export function buildPlan(registry,{latest,evidence},{allowYmyl=false,config}){
 const rows=[];const tally={};
 for(const r of registry){
  if(r.status!=='reserved')continue;
  const prior=latest.get(r.id);if(prior?.status==='approved')continue; // Review is unfinished and must remain recoverable.
  const {route}=classify(r),floor=config.routes[route].min_sources,ev=(evidence.get(r.id)||[]).length;
  if(route==='ymyl'&&!allowYmyl){tally.ymyl_held=(tally.ymyl_held||0)+1;continue;}
  const stage=ev>=floor?'write_from_cache':'research_then_write';
  rows.push({id:r.id,route,evidence:ev,floor,stage,prior:prior?.status||'none',priority:config.routes[route].priority*10+(stage==='write_from_cache'?0:5)});
  const k=route+'/'+stage;tally[k]=(tally[k]||0)+1;
 }
 rows.sort((a,b)=>a.priority-b.priority||(b.evidence-a.evidence)||a.id.localeCompare(b.id));
 return {rows,tally};
}
if(process.argv[1]?.endsWith('plan.mjs')){
 const root=resolve('missionmangal'),config=JSON.parse(await readFile(join(root,'v2','config.json'),'utf8'));
 const registry=JSON.parse(await readFile(join(root,'config','portfolio.json'),'utf8'));
 const state=await loadState(join(root,'state'));
 const plan=buildPlan(registry,state,{allowYmyl:process.argv.includes('--allow-ymyl'),config});
 await mkdir(join(root,'v2-work'),{recursive:true});await writeFile(join(root,'v2-work','plan.json'),JSON.stringify(plan));
 const done={};for(const j of state.latest.values())done[j.status]=(done[j.status]||0)+1;
 console.log(JSON.stringify({registry:registry.length,already:done,to_do:plan.rows.length,breakdown:plan.tally},null,1));
}
