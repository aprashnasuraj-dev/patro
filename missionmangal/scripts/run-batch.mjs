#!/usr/bin/env node
// Deadline-aware, resumable shard runner (one GitHub Actions job, <=360 min).
// reserved -> evidence -> draft -> grounding gate -> image (rights-allowlisted) -> automated approval policy -> approved | review | blocked.
// usage: node missionmangal/scripts/run-batch.mjs --shard 0 --shards 20 --deadline-minutes 335 [--limit N] [--auto-approve] [--allow-ymyl]
import {readFile,writeFile,mkdir,appendFile} from 'node:fs/promises';import {join,resolve} from 'node:path';import {createHash} from 'node:crypto';
import {loadRegistry} from '../core/engine.mjs';
import {loadApis,makeClient} from '../research/api-client.mjs';
import {candidatesFrom,dedupeByHost} from '../research/candidates.mjs';
import {snapshot,cloudflareRenderer,excerptsFrom} from '../research/scraper.mjs';
import {makeLlm} from '../research/llm.mjs';
import {checkGrounding} from '../research/grounding.mjs';
import {loadAdapters} from '../core/provider-router.mjs';
import {auditArticle} from '../core/quality.mjs';
import {decide} from '../core/auto-approve.mjs';
import {findImage} from '../research/images.mjs';
import {BYLINE} from '../core/portfolio.mjs';
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i<0?d:process.argv[i+1];};
const EVIDENCE_APIS=['wikipedia-search','openalex','crossref','europepmc'];
const FORMATS={
 'Deep-Dive Article':'A deep-dive explainer: short intro, then sections covering mechanism, history, evidence, and the distinct perspectives or open questions found in the sources.',
 'Quick Facts':'Ten numbered facts, each one or two sentences, each backed by a claim; then a one-paragraph takeaway.',
 'Myth-Buster':'State the common myth, then what the sources actually show, point by point, with a clear verdict section.',
 'Perspectives Roundup':'Compare the different viewpoints or schools of thought present in the sources fairly; end with where they agree.',
 'Data Story':'Explain what the figures in the sources show, define the units, and say what the numbers do and do not prove.'};
export async function runBatch({root=resolve('missionmangal'),shard=0,shards=1,deadlineMs=Date.now()+335*60_000,limit=Infinity,client,llm,render,fetchImpl,now=()=>new Date(),log=console.log,autoApprove=false,allowYmyl=false,imageFetch,imageOrder,minMs=0,sleep=ms=>new Promise(r=>setTimeout(r,ms)),clock=()=>Date.now()}){
 const registry=await loadRegistry(join(root,'config','portfolio.json'));
 const mine=registry.filter(r=>r.status==='reserved'&&parseInt(createHash('sha256').update(r.id).digest('hex').slice(0,8),16)%shards===shard).slice(0,limit);
 const out=join(root,'state','shard-'+shard);await mkdir(join(out,'content'),{recursive:true});await mkdir(join(out,'evidence'),{recursive:true});
 const ledger=join(out,'ledger.jsonl'),stats={queued:mine.length,approved:0,review:0,blocked:0,stopped_for_deadline:0};
 const usedImages=new Set(),seen=[],t0=clock(),slot=mine.length?minMs/mine.length:0;let idx=0;
 const note=async(r,status,extra={})=>{await appendFile(ledger,JSON.stringify({id:r.id,status,at:now().toISOString(),...extra})+'\n');stats[status]=(stats[status]||0)+1;};
 if(!llm.available())log('No LLM secret present: shard '+shard+' will research only (NO_PROVIDER).');
 for(const r of mine){
  if(Date.now()>deadlineMs){stats.stopped_for_deadline=mine.length-stats.approved-stats.review-stats.blocked;log('Deadline reached; remaining records stay reserved.');break;}
  if(slot){const due=t0+idx*slot,wait=Math.min(due,deadlineMs)-clock();if(wait>0)await sleep(wait);}idx++;
  const meta=r.meta||{},title=meta.title||r.intent.replace(/^Answer:\s*/,''),question=meta.question||title;
  try{
   let cands=[];
   for(const api of client.apis.filter(a=>EVIDENCE_APIS.includes(a.id))){try{const q=await client.query(api.id,question);cands.push(...candidatesFrom(api.id,q.data));}catch(e){log('  '+api.id+': '+e.message);}}
   cands=dedupeByHost(cands,4).slice(0,40);const evidence=[];
   for(const c of cands){if(evidence.length>=20)break;
    let ex=c.abstract?excerptsFrom(c.abstract):[],hash=c.abstract?createHash('sha256').update(c.abstract).digest('hex'):null,url=c.url,when=now().toISOString(),rendered=false;
    if(ex.length<2){try{const s=await snapshot(c.url,{fetchImpl,renderer:render,now});ex=s.excerpts;hash=s.sha256;url=s.canonical||s.url;when=s.retrieved_at;rendered=s.rendered;}catch{continue;}}
    if(ex.length>=2)evidence.push({id:'s'+(evidence.length+1),title:c.title,publisher:c.publisher,author:c.author,published_at:c.published_at,url,retrieved_at:when,sha256:hash,rendered,excerpts:ex});}
   await writeFile(join(out,'evidence',r.id+'.json'),JSON.stringify({id:r.id,evidence},null,2));
   const need=Math.min(20,Math.max(5,Math.ceil((meta.min_citations||5)*0.6)));
   if(evidence.length<need){await note(r,'blocked',{reason:'NEEDS_RESEARCH: '+evidence.length+' usable sources (<'+need+')'});continue;}
   if(!llm.available()){await note(r,'blocked',{reason:'NO_PROVIDER: evidence ready, drafting waits for an LLM secret'});continue;}
   const fmt=FORMATS[meta.format]||FORMATS['Deep-Dive Article'];
   const sys='You write for a general audience using ONLY the numbered evidence excerpts provided. Return JSON {title,description,body_md,claims:[{id,text,source_id,passage}],faq:[{question,answer}]}. Format: '+fmt+' Aim for about '+(meta.target_words||1200)+' words of original prose in Markdown with ## headings. Every claim must quote a passage VERBATIM from the cited source excerpts. Use at least '+need+' different sources. No outside facts, numbers or quotes. Do not copy excerpts; paraphrase. Include 2-4 FAQ items answerable from the evidence.';
   const user='Topic: '+title+'\nCore question: '+question+'\nEvidence:\n'+evidence.map(e=>'['+e.id+'] '+e.title+' ('+e.publisher+')\n'+e.excerpts.map(x=>'- '+x).join('\n')).join('\n\n');
   const {value:d,provider,model}=await llm.json(sys,user);
   const problems=checkGrounding(d,evidence,{minSources:need});
   if(problems.length){await note(r,'blocked',{reason:'GROUNDING_FAILED: '+problems.slice(0,5).join('; ')});continue;}
   const used=[...new Set(d.claims.map(c=>c.source_id))];
   const img=await findImage({query:question,title},{fetchImpl:imageFetch||fetchImpl,used:usedImages,order:imageOrder});
   const article={id:r.id,type:r.type,slug:r.slug,title:d.title||title,description:d.description,intent:r.intent,author:BYLINE,status:'review',original_contribution:'Synthesis of '+used.length+' independently retrieved sources; see claim ledger.',body_md:d.body_md,faq:d.faq,
    claims:d.claims.map(c=>({id:c.id,text:c.text,source_ids:[c.source_id],passage:c.passage})),
    sources:evidence.filter(e=>used.includes(e.id)).map(e=>({id:e.id,url:e.url,title:e.title,publisher:e.publisher,author:e.author||undefined,published_at:e.published_at||undefined,retrieved_at:e.retrieved_at,sha256:e.sha256,verified:false,claim_ids:d.claims.filter(c=>c.source_id===e.id).map(c=>c.id)})),
    media:img.media?[img.media]:[],generation:{provider,model,at:now().toISOString()}};
   if(img.media)usedImages.add(img.media.url);
   let status='review',extra={};
   if(autoApprove){const v=decide(article,meta,{allowYmyl,seen});if(v.ok){Object.assign(article,v.article);status='approved';seen.push({id:r.id,body:article.body_md});}else extra={held:v.why};}
   await writeFile(join(out,'content',r.id+'.json'),JSON.stringify(article,null,2));
   await note(r,status,{provider,image:img.media?.provider||null,...extra});
  }catch(e){await note(r,'blocked',{reason:(e.code||'ERROR')+': '+e.message.slice(0,200)});}
 }
 await writeFile(join(out,'summary.json'),JSON.stringify({shard,shards,...stats,finished_at:now().toISOString()},null,2));
 return stats;
}
if(process.argv[1]?.endsWith('run-batch.mjs')){
 const root=resolve('missionmangal');
 const apis=await loadApis(join(root,'config','research-apis.json'));
 const adapters=await loadAdapters(join(root,'config','adapter-allowlist.json'));
 const render=process.env.CF_ACCOUNT_ID&&process.env.CF_BROWSER_TOKEN?cloudflareRenderer({accountId:process.env.CF_ACCOUNT_ID,token:process.env.CF_BROWSER_TOKEN}):null;
 const stats=await runBatch({root,shard:+arg('shard',0),shards:+arg('shards',1),deadlineMs:Date.now()+(+arg('deadline-minutes',335))*60_000,limit:+arg('limit',Infinity),minMs:(+arg('min-minutes',0))*60_000,client:makeClient({apis}),llm:makeLlm({adapters}),render,autoApprove:process.argv.includes('--auto-approve'),allowYmyl:process.argv.includes('--allow-ymyl')});
 console.log(JSON.stringify(stats));
}
