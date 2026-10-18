import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {licenceOk,findImage,relevance} from '../research/images.mjs';
import {decide,similarity} from '../core/auto-approve.mjs';
import {resolveModel,makeLlm} from '../research/llm.mjs';
import {loadAdapters} from '../core/provider-router.mjs';
import {editorialPage} from '../core/seo-enhancements.mjs';
import {parse,leads} from '../scripts/triage-catalog.mjs';
import {runBatch} from '../scripts/run-batch.mjs';
import {reserve} from '../core/portfolio.mjs';
test('licence allowlist accepts CC0/PD/BY/BY-SA and rejects NC/ND/unknown',()=>{for(const l of ['CC0','Public domain','CC BY 4.0','CC BY-SA 3.0','CC BY-SA 4.0'])assert(licenceOk(l),l);for(const l of ['CC BY-NC 4.0','CC BY-ND 2.0','CC BY-NC-SA','GFDL','All rights reserved','',undefined])assert(!licenceOk(l),String(l));});
test('image finder: picks relevant licensed image, skips used/NC, falls through providers, credits visibly',async()=>{
 const nasa=async()=>[{url:'https://img/used.jpg',title:'Grass green chlorophyll',text:'grass green chlorophyll',licence_raw:'public domain'}];
 const commons=async()=>[{url:'https://img/nc.jpg',title:'Grass green',text:'grass green chlorophyll',credit:'X',license:'CC BY-NC 4.0',licence_raw:'CC BY-NC 4.0'},{url:'https://img/ok.jpg',title:'Green grass leaf',text:'green grass chlorophyll leaf',credit:'Jane',license:'CC BY-SA 4.0',licence_raw:'CC BY-SA 4.0',provider:'Wikimedia Commons',source_url:'https://commons.wikimedia.org/x'}];
 const r=await findImage({query:'why grass is green chlorophyll',title:'Why grass is green'},{used:new Set(['https://img/used.jpg']),order:[nasa,commons]});
 assert.equal(r.media.url,'https://img/ok.jpg');assert.equal(r.media.credit,'Jane');assert(r.media.rights_verified&&r.media.source_url);
 assert.equal((await findImage({query:'zzz qqq',title:'t'},{order:[commons]})).media,null);});
const SENT=n=>'Surface wetting number '+n+' occurs when a liquid spreads across a solid surface because adhesion exceeds cohesion.';
const art=(body,cat)=>({id:'abc',slug:'abc',type:'topic',title:'A long enough title here',intent:'An intent that is long enough',original_contribution:'Synthesis of many sources, see ledger.',body_md:body,claims:[1,2,3,4,5].map(n=>({id:'c'+n,text:'claim '+n+' is supported by sources',source_ids:['s'+n],passage:SENT(n)})),sources:[1,2,3,4,5].map(n=>({id:'s'+n,url:'https://x'+n+'.example/p',title:'T'+n,publisher:'P',retrieved_at:'2026-10-18T00:00:00Z',verified:false,claim_ids:['c'+n]})),media:[{type:'image',url:'https://i/1.jpg',alt:'Alt text for image',credit:'NASA',license:'public domain',rights_verified:true}]});
const BODY='word '.repeat(400).replace(/word/g,(m,i)=>'w'+(i%97));
test('auto-approve: passes clean drafts with disclosure fields; holds YMYL, no-image, short, duplicate',()=>{
 const meta={category:'Nature & Plants',target_words:800,min_citations:5};
 const ok=decide(art(BODY),meta);assert(ok.ok);assert.equal(ok.article.status,'approved');assert(ok.article.ai_assisted);assert(ok.article.sources.every(s=>s.verified&&s.verification==='automated-grounding'));
 assert(/HELD_YMYL/.test(decide(art(BODY),{...meta,category:'Human Body & Health'}).why[0]));
 const dis=decide(art(BODY),{...meta,category:'Money & Economics'},{allowYmyl:true});assert(dis.ok&&/not professional advice/.test(dis.article.disclaimer));
 const noimg=art(BODY);noimg.media=[];assert(decide(noimg,meta).why.includes('NO_IMAGE'));
 assert(decide(art('too short'),meta).why.some(w=>/TOO_SHORT/.test(w)));
 assert(decide(art(BODY),meta,{seen:[{id:'other',body:BODY}]}).why.some(w=>/NEAR_DUPLICATE/.test(w)));assert(similarity('a b c d e f g','x y z')===0);});
test('model auto-discovery picks preferred non-audio model; falls back; adapters need a secret',async()=>{
 const f=async()=>({ok:true,json:async()=>({data:[{id:'whisper-large-v3'},{id:'llama-3.1-8b'},{id:'llama-3.3-70b-versatile'}]})});
 assert.equal(await resolveModel({endpoint:'https://x/v1/chat/completions',model:'auto',prefer:['llama-3\\.3-70b']},{fetchImpl:f,key:'k'}),'llama-3.3-70b-versatile');
 assert.equal(await resolveModel({endpoint:'https://x/v1/chat/completions',model:'auto',fallback_model:'openai'},{fetchImpl:async()=>({ok:false}),key:'k'}),'openai');
 const ad=await loadAdapters(new URL('../config/adapter-allowlist.json',import.meta.url).pathname);assert.equal(ad.length,5);assert(!makeLlm({adapters:ad,env:{}}).available());assert(makeLlm({adapters:ad,env:{GROQ_API_KEY:'x'}}).available());});
test('editorial page truthfully discloses AI assistance and automated checking',()=>{const t=editorialPage();assert(/AI assistance/.test(t)&&/without individual human review/.test(t)&&/id="corrections"/.test(t));assert(!/require editorial approval before publication/.test(t));});
test('catalog triage keeps only keyless HTTPS leads in useful categories',()=>{const md='### Animals\n| API | Description | Auth | HTTPS | CORS |\n|---|---|---|---|---|\n| [Cats](https://cats.example) | cats | No | Yes | Yes |\n| [Dogs](https://dogs.example) | dogs | `apiKey` | Yes | Yes |\n### Cryptocurrency\n| [Coin](https://c.example) | coin | No | Yes | Yes |';const L=leads(parse(md));assert.deepEqual(L.map(x=>x.name),['Cats']);});
test('full run with auto-approve: sourced, grounded, imaged, approved; 2nd near-duplicate topic is held',async()=>{
 const root=mkdtempSync(join(tmpdir(),'mmauto-'));try{mkdirSync(join(root,'config'),{recursive:true});let reg=[];for(let i=0;i<2;i++){reg=reserve(reg,{id:'mm-'+i,type:'topic',slug:'t-'+i,title:'T'+i,intent:'Answer: Why surfaces get wet '+i});reg[i].meta={category:'Nature & Plants',format:'Deep-Dive Article',title:'Why surfaces get wet '+i,question:'why surfaces get wet',target_words:800,min_citations:5};}writeFileSync(join(root,'config','portfolio.json'),JSON.stringify(reg));
 const abs=n=>SENT(n)+' Contact angles below ninety degrees indicate that surface '+n+' is wetted by the liquid.';
 const client={apis:[{id:'openalex'}],async query(){return {data:{results:Array.from({length:8},(_,i)=>({doi:'https://src'+i+'.example/p',display_name:'Paper '+i,publication_date:'2024-01-01',abstract_inverted_index:abs(i+1).split(' ').reduce((o,w,p)=>{(o[w]=o[w]||[]).push(p);return o;},{})}))}};}};
 const body=Array.from({length:420},(_,i)=>'term'+(i*7%211)).join(' ');
 const llm={available:()=>true,async json(){return {provider:'mock',model:'m',value:{title:'Why surfaces get wet',description:'d',body_md:body,claims:[1,2,3,4,5].map(n=>({id:'c'+n,text:'Liquids wet surfaces when adhesion exceeds cohesion',source_id:'s'+n,passage:SENT(n)})),faq:[]}};}};
 const img=async()=>[{url:'https://img/'+Math.random()+'.jpg',title:'Why surfaces get wet',text:'why surfaces get wet',credit:'NASA',license:'public domain',licence_raw:'public domain',provider:'NASA'}];
 const s=await runBatch({root,client,llm,fetchImpl:async()=>({ok:false}),autoApprove:true,imageOrder:[img],log:()=>{}});
 assert.equal(s.approved,1);assert.equal(s.review,1);const led=readFileSync(join(root,'state','shard-0','ledger.jsonl'),'utf8');assert(/NEAR_DUPLICATE/.test(led));
 const a=JSON.parse(readFileSync(join(root,'state','shard-0','content','mm-0.json'),'utf8'));assert.equal(a.status,'approved');assert(a.media[0].credit==='NASA');assert(a.sources.length>=5);}finally{rmSync(root,{recursive:true,force:true});}});
test('pacing spreads topics across the minimum run time instead of rushing',async()=>{
 const root=mkdtempSync(join(tmpdir(),'mmpace-'));try{mkdirSync(join(root,'config'),{recursive:true});let reg=[];for(let i=0;i<4;i++)reg=reserve(reg,{id:'mm-'+i,type:'topic',slug:'p-'+i,title:'T'+i,intent:'Answer: Why surfaces get wet '+i});writeFileSync(join(root,'config','portfolio.json'),JSON.stringify(reg));
 let now=1_000_000;const waits=[];const s=await runBatch({root,client:{apis:[],async query(){return {data:{}};}},llm:{available:()=>false},fetchImpl:async()=>({ok:false}),minMs:100*60_000,deadlineMs:now+200*60_000,clock:()=>now,sleep:async ms=>{waits.push(ms);now+=ms;},log:()=>{}});
 assert.equal(s.blocked,4);assert.deepEqual(waits,[25*60_000,25*60_000,25*60_000]);assert(now-1_000_000>=75*60_000);}finally{rmSync(root,{recursive:true,force:true});}});
