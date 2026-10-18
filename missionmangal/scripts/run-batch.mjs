#!/usr/bin/env node
// Deadline-aware, resumable, self-healing shard runner (one Actions job <=360 min).
// reserved -> evidence (structured data API via planner + open text APIs + robots-aware scraping) -> sectioned writing -> grounding -> credited images -> automated approval.
// Transient failures are NOT recorded as final: they stay reserved so the rescue pass / next run retries them (attempt counter in ledger).
import {readFile,writeFile,mkdir,appendFile} from 'node:fs/promises';import {join,resolve} from 'node:path';import {createHash} from 'node:crypto';
import {loadRegistry} from '../core/engine.mjs';
import {loadApis,makeClient} from '../research/api-client.mjs';
import {candidatesFrom,dedupeByHost} from '../research/candidates.mjs';
import {snapshot,cloudflareRenderer,excerptsFrom} from '../research/scraper.mjs';
import {makeLlm} from '../research/llm.mjs';
import {loadAdapters} from '../core/provider-router.mjs';
import {decide,YMYL} from '../core/auto-approve.mjs';
import {findImages,providerOrder} from '../research/images.mjs';
import {adapterFor,planParams,fetchEvidence} from '../research/data-apis.mjs';
import {writeArticle} from '../research/writer.mjs';
import {BYLINE} from '../core/portfolio.mjs';
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i<0?d:process.argv[i+1];};
const EVIDENCE_APIS=['wikipedia-search','openalex','crossref','europepmc'];
const TRANSIENT=/NO_PROVIDER|HTTP 429|HTTP 5\d\d|ETIMEDOUT|ECONNRESET|fetch failed|rate limit|timeout/i;
// Rescue simple, low-risk explanatory questions with a five-source floor; high-risk topics retain normal thresholds.
const HIGH_RISK=/\b(health|medical|medicine|disease|diagnos|treatment|drug|medication|nutrition|financial|finance|investment|investing|loan|tax|legal|law|suicide|self.harm|weapon|explosive|poison|emergency|injury|safety-critical)\b/i;
const isLowRiskGeneralQuestion=(meta,question)=>{const q=String(question||'').trim();const context=String(meta.category||'')+' '+q;return !YMYL.test(meta.category||'')&&!HIGH_RISK.test(context)&&/^(why|what|how|does|do|is|are|can|where|when|who)\b/i.test(q);};
export async function runBatch({root=resolve('missionmangal'),shard=0,shards=1,deadlineMs=Date.now()+335*60_000,limit=Infinity,client,llm,render,fetchImpl,now=()=>new Date(),log=console.log,autoApprove=false,allowYmyl=false,imageFetch,imageOrder,minMs=0,sleep=ms=>new Promise(r=>setTimeout(r,ms)),clock=()=>Date.now(),attempt=1,env=process.env}){
 const registry=await loadRegistry(join(root,'config','portfolio.json'));
 const mine=registry.filter(r=>r.status==='reserved'&&parseInt(createHash('sha256').update(r.id+':'+attempt).digest('hex').slice(0,8),16)%shards===shard).slice(0,limit);
 const out=join(root,'state','shard-'+shard);await mkdir(join(out,'content'),{recursive:true});await mkdir(join(out,'evidence'),{recursive:true});
 const ledger=join(out,'ledger.jsonl'),stats={queued:mine.length,approved:0,review:0,blocked:0,retry_later:0,stopped_for_deadline:0};
 const usedImages=new Set(),seen=[],t0=clock(),slot=mine.length?minMs/mine.length:0;let idx=0;
 const note=async(r,status,extra={})=>{await appendFile(ledger,JSON.stringify({id:r.id,status,attempt,at:now().toISOString(),...extra})+'\n');stats[status]=(stats[status]||0)+1;};
 if(!llm.available())log('No LLM secret present: research only (NO_PROVIDER).');
 for(const r of mine){
  if(clock()>deadlineMs){stats.stopped_for_deadline=mine.length-idx;log('Deadline reached; remaining records stay reserved.');break;}
  if(slot){const due=t0+idx*slot,wait=Math.min(due,deadlineMs)-clock();if(wait>0)await sleep(wait);}idx++;
  const meta=r.meta||{},title=meta.title||r.intent.replace(/^Answer:\s*/,''),question=meta.question||title,topic={title,question,angle:meta.angle,format:meta.format};
  try{
   const evidence=[];const add=(c,ex,hash,url,when,rendered=false,scraped=false)=>{if(ex.length>=2)evidence.push({id:'s'+(evidence.length+1),title:c.title,publisher:c.publisher,author:c.author,published_at:c.published_at,url,retrieved_at:when,sha256:hash,rendered,scraped,excerpts:ex});};
   // 1) structured data API named in the sheet (planner picks parameters; adapters validate + allowlist hosts)
   const key=adapterFor(meta.primary_api);const apis=[];
   if(key&&llm.available()){try{const params=await planParams(llm,key,topic);for(const c of await fetchEvidence(key,params,{fetchImpl,now})){const ex=excerptsFrom(c.abstract,{min:30,max:30});add(c,ex,createHash('sha256').update(c.abstract).digest('hex'),c.url,c.retrieved_at);apis.push(key);}}catch(e){log('  data-api '+key+': '+e.message);}}
   // 2) open text APIs (abstracts straight from the API; scraping only when an abstract is missing)
   let cands=[];for(const api of client.apis.filter(a=>EVIDENCE_APIS.includes(a.id))){try{const q=await client.query(api.id,question);cands.push(...candidatesFrom(api.id,q.data));}catch(e){log('  '+api.id+': '+e.message);}}
   for(const c of dedupeByHost(cands,4).slice(0,40)){if(evidence.length>=22)break;
    if(c.abstract){add(c,excerptsFrom(c.abstract),createHash('sha256').update(c.abstract).digest('hex'),c.url,now().toISOString());continue;}
    try{const s=await snapshot(c.url,{fetchImpl,renderer:render,now});add(c,s.excerpts,s.sha256,s.canonical||s.url,s.retrieved_at,s.rendered,true);}catch{}}
   await writeFile(join(out,'evidence',r.id+'.json'),JSON.stringify({id:r.id,evidence},null,2));
   const normalNeed=Math.min(20,Math.max(5,Math.ceil((meta.min_citations||5)*0.6)));
   const lowRiskRescue=attempt>1&&isLowRiskGeneralQuestion(meta,question);
   const need=lowRiskRescue?5:normalNeed;
   if(evidence.length<need){await note(r,'blocked',{reason:'NEEDS_RESEARCH: '+evidence.length+' usable sources (<'+need+')'});continue;}
   if(!llm.available()){await note(r,'retry_later',{reason:'NO_PROVIDER'});continue;}
   const w=await writeArticle({llm,meta,title,evidence,need,attempt});
   const used=[...new Set(w.claims.map(c=>c.source_id))],usedEv=evidence.filter(e=>used.includes(e.id));
   const want=Math.max(3,Math.min(8,meta.images_needed||4));
   const img=await findImages({query:question,title},{n:want,queries:w.headings,fetchImpl:imageFetch||fetchImpl,used:usedImages,order:imageOrder||providerOrder(meta.image_api,env)});
   const when=usedEv.map(e=>e.retrieved_at).sort();
   const article={id:r.id,type:r.type,slug:r.slug,title:w.title,description:w.description,intent:r.intent,author:BYLINE,status:'review',original_contribution:'Argument built from '+used.length+' independently retrieved sources'+(apis.length?' including the '+meta.primary_api+' dataset':'')+'; every claim maps to a retrieved passage.',body_md:w.body_md,faq:w.faq,
    claims:w.claims.map(c=>({id:c.id,text:c.text,source_ids:[c.source_id],passage:c.passage})),
    sources:usedEv.map(e=>({id:e.id,url:e.url,title:e.title,publisher:e.publisher,author:e.author||undefined,published_at:e.published_at||undefined,retrieved_at:e.retrieved_at,sha256:e.sha256,verified:false,claim_ids:w.claims.filter(c=>c.source_id===e.id).map(c=>c.id)})),
    media:img.media,provenance:{sources_n:usedEv.length,first_retrieved:when[0],last_retrieved:when[when.length-1],hosts:[...new Set(usedEv.map(e=>new URL(e.url).host))],scraped:usedEv.some(e=>e.scraped),apis:[...new Set(apis)]},voice:{residual:w.voice_problems_after},generation:{attempt,at:now().toISOString()}};
   img.media.forEach(m=>usedImages.add(m.url));
   let status='review',extra={};
   if(autoApprove){const approvalMeta=lowRiskRescue?{...meta,min_citations:5}:meta;const v=decide(article,approvalMeta,{allowYmyl,seen,minImages:attempt>1?1:Math.min(3,want),minWordsRatio:attempt>1?0.2:0.4});if(v.ok){Object.assign(article,v.article);status='approved';seen.push({id:r.id,body:article.body_md});}else extra={held:v.why};}
   await writeFile(join(out,'content',r.id+'.json'),JSON.stringify(article,null,2));
   await note(r,status,{images:img.media.length,...extra});
  }catch(e){const msg=(e.code||'ERROR')+': '+e.message.slice(0,200);await note(r,TRANSIENT.test(msg)||TRANSIENT.test(e.message)?'retry_later':'blocked',{reason:msg});}
 }
 await writeFile(join(out,'summary.json'),JSON.stringify({shard,shards,attempt,...stats,finished_at:now().toISOString()},null,2));
 return stats;
}
if(process.argv[1]?.endsWith('run-batch.mjs')){
 const root=resolve('missionmangal');
 const apis=await loadApis(join(root,'config','research-apis.json'));
 const adapters=await loadAdapters(join(root,'config','adapter-allowlist.json'));
 const render=process.env.CF_ACCOUNT_ID&&process.env.CF_BROWSER_TOKEN?cloudflareRenderer({accountId:process.env.CF_ACCOUNT_ID,token:process.env.CF_BROWSER_TOKEN}):null;
 const stats=await runBatch({root,shard:+arg('shard',0),shards:+arg('shards',1),deadlineMs:Date.now()+(+arg('deadline-minutes',335))*60_000,limit:+arg('limit',Infinity),minMs:(+arg('min-minutes',0))*60_000,attempt:+arg('attempt',1),client:makeClient({apis}),llm:makeLlm({adapters}),render,autoApprove:process.argv.includes('--auto-approve'),allowYmyl:process.argv.includes('--allow-ymyl')});
 console.log(JSON.stringify(stats));
}
