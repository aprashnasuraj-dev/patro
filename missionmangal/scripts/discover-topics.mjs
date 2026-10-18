#!/usr/bin/env node
// Writes CANDIDATE titles to missionmangal/queue/candidates.txt for HUMAN intent review; seed-topics.mjs queues the ones you keep.
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {join,resolve} from 'node:path';
import {loadApis,makeClient} from '../research/api-client.mjs';
export async function discover({client,plan,perSeed=25}){const out=[];for(const c of plan.clusters)for(const s of c.seeds){const r=await client.query('openalex-topics',s);for(const t of (r.data.results||[]).slice(0,perSeed))out.push({cluster:c.id,title:'What is '+t.display_name+' and why does it matter',source:'openalex:'+t.id});}
 const seen=new Set();return out.filter(o=>{const k=o.title.toLowerCase();if(seen.has(k))return false;seen.add(k);return true;});}
if(process.argv[1]?.endsWith('discover-topics.mjs')){const root=resolve('missionmangal');const plan=JSON.parse(await readFile(join(root,'config','plan-3000.json'),'utf8'));
 const client=makeClient({apis:await loadApis(join(root,'config','research-apis.json'))});const rows=await discover({client,plan});
 await mkdir(join(root,'queue'),{recursive:true});await writeFile(join(root,'queue','candidates.txt'),rows.map(r=>'# '+r.cluster+' '+r.source+'\n'+r.title).join('\n')+'\n');console.log(rows.length+' candidates written for human review');}
