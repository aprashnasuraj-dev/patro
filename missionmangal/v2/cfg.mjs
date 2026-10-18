// Resolve run config: dispatch inputs win, else missionmangal/v2/run-request.json, else defaults. Emits GitHub step outputs.
import {readFileSync,appendFileSync,existsSync} from 'node:fs';
const f=existsSync('missionmangal/v2/run-request.json')?JSON.parse(readFileSync('missionmangal/v2/run-request.json','utf8')):{};
const e=process.env,pick=(a,b,d)=>(e[a]!==undefined&&e[a]!==''?e[a]:(f[b]!==undefined?String(f[b]):d));
const o={source_run_id:pick('IN_SOURCE','source_run_id','39137761297'),resume_run_id:pick('IN_RESUME','resume_run_id',''),workers:pick('IN_WORKERS','workers','8'),deadline:pick('IN_DEADLINE','deadline_minutes','330'),allow_ymyl:pick('IN_YMYL','allow_ymyl','false'),limit:pick('IN_LIMIT','limit_per_worker','')};
if(!/^\d+$/.test(o.source_run_id)||(o.resume_run_id&&!/^\d+$/.test(o.resume_run_id))||!(+o.workers>=1&&+o.workers<=25))throw Error('bad config '+JSON.stringify(o));
o.list=JSON.stringify(Array.from({length:+o.workers},(_,i)=>i));
appendFileSync(process.env.GITHUB_OUTPUT||'/dev/null',Object.entries(o).map(([k,v])=>k+'='+v).join('\n')+'\n');console.log(o);
