#!/usr/bin/env node
// HUMAN-ONLY gate. usage: node missionmangal/scripts/approve.mjs <id> --reviewer "Name" [--sources-checked] [--media-checked]
// Refuses unless the article already passes every deterministic audit; sources become verified only by this explicit sign-off.
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {join,resolve} from 'node:path';
import {loadRegistry,saveRegistry} from '../core/engine.mjs';import {auditArticle} from '../core/quality.mjs';
const [id,...r]=process.argv.slice(2);const get=k=>r.includes('--'+k)?r[r.indexOf('--'+k)+1]:null;
const reviewer=get('reviewer');if(!id||!reviewer||!r.includes('--sources-checked')||!r.includes('--media-checked'))throw Error('id, --reviewer, --sources-checked and --media-checked are required');
const root=resolve('missionmangal'),cpath=join(root,'content',id+'.json');const a=JSON.parse(await readFile(cpath,'utf8'));
a.sources=a.sources.map(s=>({...s,verified:true}));a.status='approved';
const problems=auditArticle(a);if(problems.length)throw Error('Cannot approve: '+problems.join('; '));
await writeFile(cpath,JSON.stringify(a,null,2)+'\n');
const reg=await loadRegistry(join(root,'config','portfolio.json'));const rec=reg.find(x=>x.id===id);if(!rec)throw Error('Unknown id');rec.status='approved';rec.updated_at=new Date().toISOString();await saveRegistry(join(root,'config','portfolio.json'),reg);
await mkdir(join(root,'review'),{recursive:true});await writeFile(join(root,'review',id+'.signoff.json'),JSON.stringify({id,reviewer,at:rec.updated_at},null,2)+'\n');
console.log('approved '+id+' by '+reviewer);
