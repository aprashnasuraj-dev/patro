#!/usr/bin/env node
// Aggregate v2 worker summaries + ledgers into reports/v2-summary.json (outcomes by route, provider usage, what is still queued).
import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';import {join,resolve} from 'node:path';
const root=resolve('missionmangal'),st=join(root,'state'),by={},prov={},tot={};
for(const d of (await readdir(st).catch(()=>[])).filter(x=>x.startsWith('v2-'))){
 for(const l of (await readFile(join(st,d,'ledger.jsonl'),'utf8').catch(()=>'')).split('\n').filter(Boolean)){const j=JSON.parse(l);const k=(j.route||'?')+'/'+j.status;by[k]=(by[k]||0)+1;}
 const s=JSON.parse(await readFile(join(st,d,'summary.json'),'utf8').catch(()=>'{}'));
 for(const k of ['queued','approved','review','blocked','retry_later','stopped_for_budget','stopped_for_deadline','discovered_sources'])tot[k]=(tot[k]||0)+(s[k]||0);
 for(const p of s.providers||[]){prov[p.id]=prov[p.id]||{used:0,dead:false};prov[p.id].used+=p.used;prov[p.id].dead=prov[p.id].dead||p.dead;}
}
await mkdir(join(root,'reports'),{recursive:true});
const out={at:new Date().toISOString(),totals:tot,outcomes_by_route:by,providers:prov};
await writeFile(join(root,'reports','v2-summary.json'),JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,1));
