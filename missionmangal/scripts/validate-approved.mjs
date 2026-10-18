#!/usr/bin/env node
// Final merge-readiness gate: every approved article must render and pass publish checks; failures are demoted to 'review' (never shipped).
import {readFile,writeFile,readdir} from 'node:fs/promises';import {join,resolve} from 'node:path';
import {loadRegistry,saveRegistry,renderApproved} from '../core/engine.mjs';
const root=resolve('missionmangal'),rp=join(root,'config','portfolio.json');const reg=await loadRegistry(rp);let ok=0,demoted=[];
const files=new Set(await readdir(join(root,'content')).catch(()=>[]));
for(const r of reg.filter(x=>x.status==='approved')){try{const a=JSON.parse(await readFile(join(root,'content',r.id+'.json'),'utf8'));renderApproved(a,r);ok++;}catch(e){r.status='review';demoted.push({id:r.id,why:e.message.slice(0,160)});}}
await saveRegistry(rp,reg);
const by={};for(const r of reg)by[r.status]=(by[r.status]||0)+1;
await writeFile(join(root,'reports','final-report.json'),JSON.stringify({total:reg.length,by_status:by,render_ok:ok,demoted,at:new Date().toISOString()},null,2));
console.log(JSON.stringify({render_ok:ok,demoted:demoted.length,by_status:by}));
