#!/usr/bin/env node
// v2 worker: takes its round-robin slice of plan.json (priority-ordered), reuses cached evidence, discovers more only when needed,
// writes with the compact 2-call writer under a per-worker provider budget, and applies the route gate. Resumable: anything not finished stays queued.
import {readFile,writeFile,mkdir,appendFile} from 'node:fs/promises';import {join,resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';
import {loadRegistry} from '../core/engine.mjs';import {loadAdapters} from '../core/provider-router.mjs';
import {adapterFor,planParams,fetchEvidence} from '../research/data-apis.mjs';import {excerptsFrom} from '../research/scraper.mjs';
import {BYLINE} from '../core/portfolio.mjs';import {cloudflareRenderer} from '../research/scraper.mjs';
import {createHash} from 'node:crypto';
import {makeLlmV2} from './llm.mjs';import {writeCompact} from './write-compact.mjs';import {decideV2} from './gate.mjs';import {discoverEvidence,isRelevantEvidence} from './discover.mjs';import {loadState} from './plan.mjs';
const here=dirname(fileURLToPath(import.meta.url));
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i<0?d:process.argv[i+1];};
const TRANSIENT=/NO_PROVIDER|HTTP 429|HTTP 5\d\d|ETIMEDOUT|ECONNRESET|fetch failed|rate limit|timeout/i;
const independentHost=e=>{try{const h=new URL(e.url).hostname.toLowerCase().replace(/^www\./,'');if(['wikipedia.org','openalex.org','doi.org','crossref.org','semanticscholar.org'].some(x=>h===x||h.endsWith('.'+x)))return '';return h;}catch{return '';}};
const independentEvidenceHosts=ev=>new Set(ev.map(independentHost).filter(Boolean));
const pickEvidence=(ev,cap=12)=>{const seen=new Map();return [...ev].sort((a,b)=>(b.excerpts||[]).length-(a.excerpts||[]).length).filter(e=>{const h=(()=>{try{return new URL(e.url).host;}catch{return e.url;}})();seen.set(h,(seen.get(h)||0)+1);return seen.get(h)<=3;}).slice(0,cap).map(e=>({...e,excerpts:(e.excerpts||[]).slice(0,6)}));};
export async function runV2({root=resolve('missionmangal'),worker=0,workers=1,deadlineMs=Date.now()+335*60_000,limit=Infinity,llm,config,plan,evidenceByTopic,registry,allowYmyl=false,fetchImpl=fetch,extract,render=null,scriptPath=join(here,'scrapling_worker.py'),now=()=>new Date(),log=console.log,clock=()=>Date.now()}){
 const byId=new Map(registry.map(r=>[r.id,r]));
 const mine=plan.rows.filter((_,i)=>i%workers===worker).slice(0,limit);
 const out=join(root,'state','v2-'+worker);await mkdir(join(out,'content'),{recursive:true});await mkdir(join(out,'evidence'),{recursive:true});
 const ledger=join(out,'ledger.jsonl'),stats={queued:mine.length,approved:0,review:0,blocked:0,retry_later:0,stopped_for_budget:0,stopped_for_deadline:0,discovered_sources:0};const seen=[];
 const note=async(id,status,extra={})=>{await appendFile(ledger,JSON.stringify({id,status,attempt:3,engine:'v2',at:now().toISOString(),...extra})+'\n');stats[status]=(stats[status]||0)+1;};
 let i=0;
 for(const row of mine){
  if(clock()>deadlineMs){stats.stopped_for_deadline=mine.length-i;break;}
  i++;const r=byId.get(row.id);if(!r)continue;
  const meta=r.meta||{},title=meta.title||r.intent.replace(/^Answer:\s*/,''),question=meta.question||title,policyCfg=config.routes[row.route];
  const policy={min_sources:policyCfg.min_sources,min_words:policyCfg.min_words};const need=policy.min_sources;
  try{
   let evidence=(evidenceByTopic.get(r.id)||[]).map(e=>({...e})).filter(e=>isRelevantEvidence(question,e));let changed=false;
   const addAll=items=>{const urls=new Set(evidence.map(e=>e.url));for(const it of items){if(!it?.url||urls.has(it.url)||!(it.excerpts||[]).length)continue;urls.add(it.url);evidence.push({...it,id:'s'+(evidence.length+1)});changed=true;stats.discovered_sources++;}};
   // structured topics: official dataset first (deterministic for REST Countries; planner call otherwise)
   const key=row.route==='structured'?adapterFor(meta.primary_api):null;
   if(key&&evidence.length<need&&(llm.available()||key==='restcountries')&&!evidence.some(e=>e.dataset===key)){
    try{const params=await planParams(llm,key,{title,question,angle:meta.angle,format:meta.format});for(const c of await fetchEvidence(key,params,{fetchImpl,now})){const ex=excerptsFrom(c.abstract,{min:30,max:30});if(ex.length>=2)addAll([{title:c.title,publisher:c.publisher,author:c.author,published_at:c.published_at,url:c.url,retrieved_at:c.retrieved_at,sha256:createHash('sha256').update(c.abstract).digest('hex'),rendered:false,scraped:false,dataset:key,excerpts:ex}]);}}
    catch(e){if(e.code==='NO_BUDGET')throw e;log('  dataset '+key+': '+e.message);}
   }
   if(row.route!=='general'&&(evidence.length<need||independentEvidenceHosts(evidence).size<Math.min(3,need))){addAll(await discoverEvidence({evidence,topic:question,disc:config.discovery,need,fetchImpl,extract,scriptPath,render,now,log}));}
   if(changed)await writeFile(join(out,'evidence',r.id+'.json'),JSON.stringify({id:r.id,evidence},null,2));
   if(evidence.length<need||independentEvidenceHosts(evidence).size<Math.min(3,need)){await note(r.id,'blocked',{route:row.route,reason:'NEEDS_RESEARCH: '+evidence.length+' usable sources; '+independentEvidenceHosts(evidence).size+' independent publisher domains (need '+need+' sources and '+Math.min(3,need)+' domains) after cache + discovery'});continue;}
   if(!llm.available()){await note(r.id,'retry_later',{route:row.route,reason:'NO_PROVIDER: no healthy LLM at preflight; evidence_sources='+evidence.length});continue;}
   const use=pickEvidence(evidence);
   const w=await writeCompact({llm,meta,title,evidence:use,need:Math.min(need,use.length),targetWords:policyCfg.target_words,minWords:policyCfg.min_words});
   const used=[...new Set(w.claims.map(c=>c.source_id))],usedEv=use.filter(e=>used.includes(e.id)),when=usedEv.map(e=>e.retrieved_at).sort();
   const article={id:r.id,type:r.type,slug:r.slug,title:w.title,description:w.description,intent:r.intent,author:BYLINE,status:'review',original_contribution:'Argument built from '+used.length+' independently retrieved sources; every claim maps to a retrieved passage.',body_md:w.body_md,faq:w.faq,
    claims:w.claims.map(c=>({id:c.id,text:c.text,source_ids:[c.source_id],passage:c.passage})),
    sources:usedEv.map(e=>({id:e.id,url:e.url,title:e.title,publisher:e.publisher,author:e.author||undefined,published_at:e.published_at||undefined,retrieved_at:e.retrieved_at,sha256:e.sha256,verified:false,claim_ids:w.claims.filter(c=>c.source_id===e.id).map(c=>c.id)})),
    media:[],provenance:{sources_n:usedEv.length,first_retrieved:when[0],last_retrieved:when[when.length-1],hosts:[...new Set(usedEv.map(e=>new URL(e.url).host))],scraped:usedEv.some(e=>e.scraped),route:row.route,engine:'v2'},voice:{residual:w.voice_problems_after},generation:{engine:'v2',writer:'compact',llm:w.provider,at:now().toISOString()}};
   const v=decideV2(article,{route:row.route,policy,allowYmyl,seen,now});let status='blocked',extra={};
   if(v.ok){Object.assign(article,v.article);status='approved';seen.push({id:r.id,body:article.body_md});}else extra={held:v.why,reason:'AUTOMATED_QUALITY_GATE_FAILED'};
   await writeFile(join(out,'content',r.id+'.json'),JSON.stringify(article,null,2));await note(r.id,status,{route:row.route,...extra});
  }catch(e){
   if(e.code==='NO_BUDGET'){stats.stopped_for_budget=mine.length-i+1;log('Provider budget spent; remaining topics stay queued for the next run.');break;}
   const msg=(e.code||'ERROR')+': '+String(e.message).slice(0,200);await note(r.id,TRANSIENT.test(msg)?'retry_later':'blocked',{route:row.route,reason:msg});
  }
 }
 await writeFile(join(out,'summary.json'),JSON.stringify({worker,workers,engine:'v2',...stats,providers:llm.stats?.()||[],finished_at:now().toISOString()},null,2));
 return stats;
}
if(process.argv[1]?.endsWith('run-v2.mjs')){
 const root=resolve('missionmangal'),config=JSON.parse(await readFile(join(root,'v2','config.json'),'utf8'));
 const registry=await loadRegistry(join(root,'config','portfolio.json'));
 const plan=JSON.parse(await readFile(arg('plan',join(root,'v2-work','plan.json')),'utf8'));
 const health=JSON.parse(await readFile(arg('health',join(root,'v2-work','health.json')),'utf8').catch(()=>'{"providers":[]}'));
 const adapters=await loadAdapters(join(root,'config','adapter-allowlist.json'));
 const workers=+arg('workers',1),state=await loadState(join(root,'state'));
 const llm=makeLlmV2({adapters,health,config,workers});
 const render=process.env.CF_ACCOUNT_ID&&process.env.CF_BROWSER_TOKEN?cloudflareRenderer({accountId:process.env.CF_ACCOUNT_ID,token:process.env.CF_BROWSER_TOKEN}):null;
 const stats=await runV2({root,worker:+arg('worker',0),workers,deadlineMs:Date.now()+(+arg('deadline-minutes',335))*60_000,limit:+arg('limit',Infinity),llm,config,plan,evidenceByTopic:state.evidence,registry,allowYmyl:process.argv.includes('--allow-ymyl'),render});
 console.log(JSON.stringify(stats));
}
