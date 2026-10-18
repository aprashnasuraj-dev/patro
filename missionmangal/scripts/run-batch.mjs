#!/usr/bin/env node
// Deadline-aware, resumable shard runner (designed for one GitHub Actions job, <=360 min).
// reserved -> researching -> review (draft + evidence) | blocked(reason).  NEVER sets approved/published.
// usage: node missionmangal/scripts/run-batch.mjs --shard 0 --shards 12 --deadline-minutes 335 [--limit N]
import {readFile,writeFile,mkdir,appendFile} from 'node:fs/promises';import {join,resolve} from 'node:path';import {createHash} from 'node:crypto';
import {loadRegistry} from '../core/engine.mjs';
import {loadApis,makeClient} from '../research/api-client.mjs';
import {candidatesFrom,dedupeByHost} from '../research/candidates.mjs';
import {snapshot,cloudflareRenderer} from '../research/scraper.mjs';
import {makeLlm} from '../research/llm.mjs';
import {checkGrounding} from '../research/grounding.mjs';
import {loadAdapters} from '../core/provider-router.mjs';
import {auditArticle} from '../core/quality.mjs';
import {BYLINE} from '../core/portfolio.mjs';
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i<0?d:process.argv[i+1];};
export async function runBatch({root=resolve('missionmangal'),shard=0,shards=1,deadlineMs=Date.now()+335*60_000,limit=Infinity,client,llm,render,fetchImpl,now=()=>new Date(),log=console.log}){
 const registry=await loadRegistry(join(root,'config','portfolio.json'));
 const mine=registry.filter(r=>r.status==='reserved'&&parseInt(createHash('sha256').update(r.id).digest('hex').slice(0,8),16)%shards===shard).slice(0,limit);
 const out=join(root,'state','shard-'+shard);await mkdir(join(out,'content'),{recursive:true});await mkdir(join(out,'evidence'),{recursive:true});
 const ledger=join(out,'ledger.jsonl'),stats={queued:mine.length,review:0,blocked:0,stopped_for_deadline:0};
 const note=async(r,status,extra={})=>{await appendFile(ledger,JSON.stringify({id:r.id,status,at:now().toISOString(),...extra})+'\n');stats[status==='review'?'review':'blocked']++;};
 if(!llm.available()){log('No approved LLM adapter: shard '+shard+' will research only; drafts stay blocked (NO_PROVIDER).');}
 for(const r of mine){
  if(Date.now()>deadlineMs){stats.stopped_for_deadline=mine.length-stats.review-stats.blocked;log('Deadline reached; remaining records stay reserved for the next run.');break;}
  try{
   const title=r.intent.replace(/^Answer:\s*/,'');let cands=[];
   for(const api of client.apis.filter(a=>['crossref','openalex','europepmc','wikipedia'].includes(a.id))){try{const q=await client.query(api.id,title);cands.push(...candidatesFrom(api.id,q.data));}catch(e){log('  '+api.id+': '+e.message);}}
   cands=dedupeByHost(cands,2).slice(0,30);const evidence=[];
   for(const c of cands){if(evidence.length>=12)break;try{const s=await snapshot(c.url,{fetchImpl,renderer:render,now});if(s.excerpts.length>=2)evidence.push({id:'s'+(evidence.length+1),...c,url:s.canonical||s.url,retrieved_at:s.retrieved_at,sha256:s.sha256,rendered:s.rendered,excerpts:s.excerpts});}catch{}}
   await writeFile(join(out,'evidence',r.id+'.json'),JSON.stringify({id:r.id,evidence},null,2));
   if(evidence.length<5){await note(r,'blocked',{reason:'NEEDS_RESEARCH: '+evidence.length+' usable sources (<5)'});continue;}
   if(!llm.available()){await note(r,'blocked',{reason:'NO_PROVIDER: evidence ready, drafting waits for an approved adapter'});continue;}
   const sys='You write for a general audience using ONLY the numbered evidence excerpts provided. Return JSON {title,description,body_md,claims:[{id,text,source_id,passage}],faq:[{question,answer}]}. Every claim must quote a passage VERBATIM from the cited source excerpts. No outside facts, numbers, or quotes. Write original prose; do not copy excerpts.';
   const user='Topic: '+title+'\nEvidence:\n'+evidence.map(e=>'['+e.id+'] '+e.title+' ('+e.publisher+')\n'+e.excerpts.map(x=>'- '+x).join('\n')).join('\n\n');
   const {value:d,provider,model}=await llm.json(sys,user);
   const problems=checkGrounding(d,evidence);
   if(problems.length){await note(r,'blocked',{reason:'GROUNDING_FAILED: '+problems.slice(0,5).join('; ')});continue;}
   const used=[...new Set(d.claims.map(c=>c.source_id))];
   const article={id:r.id,type:r.type,slug:r.slug,title:d.title,description:d.description,intent:r.intent,author:BYLINE,status:'review',original_contribution:'Synthesis of '+used.length+' independently retrieved sources; see claim ledger.',body_md:d.body_md,faq:d.faq,
    claims:d.claims.map(c=>({id:c.id,text:c.text,source_ids:[c.source_id],passage:c.passage})),
    sources:evidence.filter(e=>used.includes(e.id)).map(e=>({id:e.id,url:e.url,title:e.title,publisher:e.publisher,author:e.author||undefined,published_at:e.published_at||undefined,retrieved_at:e.retrieved_at,sha256:e.sha256,verified:false,claim_ids:d.claims.filter(c=>c.source_id===e.id).map(c=>c.id)})),
    media:[],generation:{provider,model,at:now().toISOString()}};
   await writeFile(join(out,'content',r.id+'.json'),JSON.stringify(article,null,2));
   await note(r,'review',{provider,problems_to_clear:auditArticle(article)});
  }catch(e){await note(r,'blocked',{reason:(e.code||'ERROR')+': '+e.message.slice(0,200)});}
 }
 await writeFile(join(out,'summary.json'),JSON.stringify({shard,shards,...stats,finished_at:now().toISOString()},null,2));
 return stats;
}
if(import.meta.url===new URL(process.argv[1],'file:///').href||process.argv[1]?.endsWith('run-batch.mjs')){
 const root=resolve('missionmangal');
 const apis=await loadApis(join(root,'config','research-apis.json'));
 const adapters=await loadAdapters(join(root,'config','adapter-allowlist.json'));
 const render=process.env.CF_ACCOUNT_ID&&process.env.CF_BROWSER_TOKEN?cloudflareRenderer({accountId:process.env.CF_ACCOUNT_ID,token:process.env.CF_BROWSER_TOKEN}):null;
 const stats=await runBatch({root,shard:+arg('shard',0),shards:+arg('shards',1),deadlineMs:Date.now()+(+arg('deadline-minutes',335))*60_000,limit:+arg('limit',Infinity),client:makeClient({apis}),llm:makeLlm({adapters}),render});
 console.log(JSON.stringify(stats));
}
