import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,readFile,mkdir,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {classify} from '../v2/classify.mjs';import {makeLlmV2} from '../v2/llm.mjs';import {decideV2} from '../v2/gate.mjs';
import {isTrusted,wikiTitles,wikipediaSearchTitles,discoverEvidence,searchWebLinks,isRelevantEvidence} from '../v2/discover.mjs';
import {lint,fix} from '../core/voice.mjs';import {buildPlan,loadState} from '../v2/plan.mjs';import {candidateModels,preflight} from '../v2/preflight.mjs';
import {runV2} from '../v2/run-v2.mjs';import {auditArticle} from '../core/quality.mjs';
const config=JSON.parse(await readFile(new URL('../v2/config.json',import.meta.url),'utf8'));
const rec=(category,question,primary_api)=>({id:'t',status:'reserved',intent:'Answer: '+question,meta:{category,question,title:question,primary_api}});

test('classifier: general / structured / ymyl / research, and open-data statistics are NOT held as ymyl',()=>{
 assert.equal(classify(rec('Nature & Plants','Why grass is green')).route,'general');
 assert.equal(classify(rec('Demographics, Economics & Open Data','GDP growth vs quality of life metrics','World Bank Open Data')).route,'structured');
 assert.equal(classify(rec('Global Health & Clinical Medicine','Hypertension prevalence','WHO GHO API')).route,'ymyl');
 assert.equal(classify(rec('Specific FDA Drug Side-Effect & Interaction Telemetry','Drug interaction X','OpenFDA')).route,'ymyl');
 assert.equal(classify(rec('Money & Economics','Why do banks charge interest')).route,'ymyl');
 assert.equal(classify(rec('Art History & Cultural Heritage','Baroque painting techniques')).route,'research');
});
test('discover: trusted-domain filter blocks social/doi/wikipedia and extracts wiki titles',()=>{
 const d=config.discovery;assert.ok(isTrusted('https://www.nasa.gov/a',d));assert.ok(isTrusted('https://data.cdc.gov/x',d));
 for(const u of ['https://twitter.com/x','https://doi.org/10.1/x','https://en.wikipedia.org/wiki/A','http://nasa.gov/a','http://random-blog.example/x'])assert.equal(isTrusted(u,d),false,u);
 assert.deepEqual(wikiTitles([{url:'https://en.wikipedia.org/wiki/Grass_green',publisher:'Wikipedia',title:'Grass green'}]),['Grass green']);
});
test('research relevance rejects topical keyword collisions and requires question-specific evidence',()=>{
 assert.equal(isRelevantEvidence('Why the Himalayas are still rising',{title:'China',url:'https://example.org/china',excerpts:['Nepal is mainly situated in the Himalayas.']}),false);
 assert.equal(isRelevantEvidence('Why the Himalayas are still rising',{title:'Himalayan tectonic uplift',url:'https://example.org/geology',excerpts:['The Indian plate collides with the Eurasian plate, driving continued uplift of the Himalayas.']}),true);
});
test('search fallback extracts independent HTTPS results even when href precedes class',async()=>{
 const html='<a href="https://www.nasa.gov/himalayas" class="result__a">NASA</a><a class="result__a" href="https://www.usgs.gov/tectonics">USGS</a>';
 const got=await searchWebLinks('why Himalayas rise',{fetchImpl:async()=>({ok:true,text:async()=>html}),env:{},max:5});
 assert.deepEqual(got,['https://www.nasa.gov/himalayas','https://www.usgs.gov/tectonics']);
});
test('discovery ladder: wikipedia extlinks -> scrapling extraction (injected), trusted hosts only, excerpts+hash only',async()=>{
 const fetchImpl=async()=>({ok:true,json:async()=>({query:{pages:{1:{extlinks:[{'*':'https://www.nasa.gov/grass'},{'*':'https://twitter.com/x'},{'*':'https://www.usgs.gov/g'}]}}}})});
 const text='Chlorophyll absorbs red and blue light most strongly, which is why leaves look green to us. Plants reflect green wavelengths instead of absorbing them. ';
 const got=await discoverEvidence({evidence:[{url:'https://en.wikipedia.org/wiki/Grass',publisher:'Wikipedia',title:'Grass'}],disc:config.discovery,need:3,fetchImpl,extract:async urls=>urls.map(u=>({url:u,ok:true,title:'T',text:text.repeat(3)}))});
 assert.equal(got.length,2);assert.ok(got.every(e=>e.method==='scrapling'&&e.sha256.length===64&&e.excerpts.length>=2&&!('text' in e)));
});
test('llm router: skips unhealthy provider, splits budget per worker, stops cleanly with NO_BUDGET, disables on 402',async()=>{
 const adapters=[{id:'a',endpoint:'https://a/x',secret_env:'A_KEY'},{id:'b',endpoint:'https://b/x',secret_env:'B_KEY'},{id:'c',endpoint:'https://c/x',secret_env:'C_KEY'}];
 const health={providers:[{id:'a',ok:true,model:'m'},{id:'b',ok:true,model:'m'},{id:'c',ok:false}]};
 const calls=[];const fetchImpl=async url=>{calls.push(url);if(url.startsWith('https://a'))return {ok:false,status:402,headers:{get:()=>null}};return {ok:true,status:200,json:async()=>({choices:[{message:{content:'{"x":1}'}}]})};};
 const cfg={budget_safety:1,providers:{a:{rpm:6000,daily:10},b:{rpm:6000,daily:4},c:{rpm:6000,daily:99}}};
 const llm=makeLlmV2({adapters,health,config:cfg,workers:2,env:{A_KEY:'k',B_KEY:'k',C_KEY:'k'},fetchImpl,sleep:async()=>{},});
 assert.equal((await llm.json('s','u')).provider,'b');assert.ok(!calls.some(u=>u.startsWith('https://c')));
 assert.equal(llm.stats().find(s=>s.id==='a').dead,true);
 await llm.json('s','u');await assert.rejects(()=>llm.json('s','u'),e=>e.code==='NO_BUDGET');  // b budget = 4/2 = 2 calls
});
test('preflight: finds the working model for a provider whose first model 404s; reports 402 as payment required',async()=>{
 const adapters=[{id:'g',endpoint:'https://g/v1/chat/completions',model:'auto',prefer:['flash'],secret_env:'G'},{id:'s',endpoint:'https://s/v1/chat/completions',model:'auto',secret_env:'S'}];
 const fetchImpl=async(url,init)=>{if(url.endsWith('/models'))return {ok:true,json:async()=>({data:[{id:'models/gemini-old-flash'},{id:'models/gemini-new-flash'}]})};
  const m=JSON.parse(init.body).model;if(url.startsWith('https://s'))return {ok:false,status:402};if(m==='gemini-old-flash')return {ok:false,status:404};return {ok:true,status:200,json:async()=>({choices:[{message:{content:'{"ok":true}'}}]})};};
 const h=await preflight({adapters,env:{G:'k',S:'k'},fetchImpl,log:()=>{}});
 assert.deepEqual(h.healthy,['g']);assert.equal(h.providers[0].model,'gemini-new-flash');assert.equal(h.providers[1].reason,'payment required');
 assert.ok(candidateModels({prefer:['flash']},['a-flash','b']).includes('a-flash'));
});
test('policy-aware audit: v1 articles keep the strict 5-source + image rule; v2 route policy allows 3 sources and no image',()=>{
 const mk=(n,pol)=>{const sources=[],claims=[];for(let i=1;i<=n;i++){claims.push({id:'c'+i,text:'A grounded claim '+i,source_ids:['s'+i],passage:'p'});sources.push({id:'s'+i,url:'https://source'+i+'.gov/'+i,title:'T'+i,publisher:'P',retrieved_at:'2026-10-19T00:00:00Z',verified:true,claim_ids:['c'+i]});}
  return {id:'abc',title:'A long enough title',intent:'Answer: something',original_contribution:'x'.repeat(40),sources,claims,media:[],body_md:'b'.repeat(200),quality_policy:pol};};
 assert.ok(auditArticle(mk(3)).length>0);assert.ok(auditArticle(mk(5)).some(p=>/image/i.test(p)));
 assert.deepEqual(auditArticle(mk(3,{min_sources:3,require_media:false})),[]);
 assert.ok(auditArticle(mk(1,{min_sources:1,require_media:false})).length>0,'floor of 2 sources cannot be lowered by a policy');
});
test('plan: cached evidence goes straight to writing; thin evidence needs research; ymyl held; done topics skipped',()=>{
 const reg=[{...rec('Nature','Why is the sky blue'),id:'a'},{...rec('Nature','Why is grass green'),id:'b'},{...rec('Global Health & Clinical Medicine','X prevalence','WHO GHO API'),id:'c'},{...rec('Nature','Why do cats purr'),id:'d'}];
 const ev=n=>Array.from({length:n},(_,i)=>({id:'s'+i}));
 const {rows,tally}=buildPlan(reg,{latest:new Map([['d',{status:'approved'}]]),evidence:new Map([['a',ev(4)],['b',ev(1)],['c',ev(9)]])},{config});
 assert.deepEqual(rows.map(r=>r.id+':'+r.stage),['a:write_from_cache','b:research_then_write']);assert.equal(tally.ymyl_held,1);
});
test('gate: approves a grounded article with independent sources and zero images; holds ymyl, short and duplicate',()=>{
 const body=Array.from({length:60},(_,i)=>['Leaves','Chlorophyll','Sunlight','Pigments','Plants'][i%5]+' detail '+i+' explains one separate fact about leaves and light.').join(' ');
 const base=()=>{const sources=[1,2,3].map(i=>({id:'s'+i,url:'https://source'+i+'.gov/'+i,title:'T'+i,publisher:'P',retrieved_at:'2026-10-19T00:00:00Z',verified:false,claim_ids:['c'+i]}));
  return {id:'abc',title:'A long enough title',intent:'Answer: something',original_contribution:'x'.repeat(40),sources,claims:[1,2,3].map(i=>({id:'c'+i,text:'A grounded claim '+i,source_ids:['s'+i],passage:'p'})),media:[],body_md:body};};
 const policy={min_sources:3,min_words:400};
 assert.equal(decideV2(base(),{route:'general',policy}).ok,true);
 const aggregatorOnly=base();aggregatorOnly.sources.forEach((s,i)=>s.url=['https://en.wikipedia.org/wiki/A','https://openalex.org/W1','https://doi.org/10.1234/x'][i]);
 assert.ok(decideV2(aggregatorOnly,{route:'general',policy}).why.some(x=>x.startsWith('SOURCE_INDEPENDENCE')),'aggregators must not count as independent publishers');
 assert.deepEqual(decideV2(base(),{route:'ymyl',policy}).why,['HELD_YMYL']);
 assert.ok(decideV2({...base(),body_md:'short'},{route:'general',policy}).why[0].startsWith('TOO_SHORT'));
 assert.ok(decideV2(base(),{route:'general',policy,seen:[{id:'z',body}]}).why[0].startsWith('NEAR_DUPLICATE'));
 assert.equal(decideV2(base(),{route:'ymyl',policy,allowYmyl:true}).article.disclaimer.includes('not professional advice'),true);
});
test('runner e2e: writes from cached evidence with 2 LLM calls and approves with zero images; stops on NO_BUDGET without burning topics',async()=>{
 const root=await mkdtemp(join(tmpdir(),'mmv2-'));
 const excerpt=(k,n)=>'Chlorophyll in leaf '+k+' reflects green light while absorbing red and blue wavelengths, number '+n+'.';
 const evidence=[1,2,3].map(i=>({id:'s'+i,title:'Source '+i,publisher:'nasa.gov',url:'https://source'+i+'.gov/'+i,retrieved_at:'2026-10-19T00:00:00Z',sha256:'h'.repeat(64),excerpts:[excerpt(i,1),excerpt(i,2),excerpt(i,3)]}));
 const mkReg=id=>({id,type:'topic',slug:'why-grass-is-green-'+id,url:'https://aafnaipatro.com/why-grass-is-green-'+id+'/',intent:'Answer: Why grass is green',status:'reserved',meta:{category:'Nature & Plants',title:'Why Grass Is Green? The Full Story',question:'Why grass is green'}});
 const registry=[mkReg('mm-01'),mkReg('mm-02')];let n=0;const body=Array.from({length:70},(_,i)=>['Leaves','Sunlight','Chlorophyll','Pigments','Grass'][i%5]+' detail '+i+' shows one more separate fact about how leaves treat sunlight each day.').join(' ');
 const llm={available:()=>true,stats:()=>[],async json(){n++;if(n===1)return {value:{title:'Why grass looks green to us',description:'d',sections:[1,2,3].map(s=>({heading:'H'+s,purpose:'p',claims:[{id:'a',text:'Leaf '+s+' reflects green light',source_id:'s'+s,passage:excerpt(s,1)},{id:'b',text:'Leaf '+s+' absorbs red and blue',source_id:'s'+s,passage:excerpt(s,2)}]}))}};
   if(n===2)return {value:{markdown:body,faq:[{question:'q',answer:'a'}]}};throw Object.assign(new Error('NO_BUDGET: spent'),{code:'NO_BUDGET'});}};
 const plan={rows:[{id:'mm-01',route:'general'},{id:'mm-02',route:'general'}]};
 const stats=await runV2({root,worker:0,workers:1,llm,config,plan,evidenceByTopic:new Map([['mm-01',evidence],['mm-02',evidence]]),registry,log:()=>{}});
 assert.equal(n,3);assert.equal(stats.approved,1);assert.equal(stats.stopped_for_budget,1);
 const led=(await readFile(join(root,'state','v2-0','ledger.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);assert.equal(led.length,1);assert.equal(led[0].status,'approved');
 const art=JSON.parse(await readFile(join(root,'state','v2-0','content','mm-01.json'),'utf8'));assert.equal(art.media.length,0);assert.equal(art.quality_policy.route,'general');assert.deepEqual(auditArticle(art),[]);
});

test('plan: review-held articles remain eligible for recovery; approved ones do not',()=>{
 const registry=[{...rec('Nature','Why is grass green'),id:'reviewed'},{...rec('Nature','Why is the sky blue'),id:'approved'}];
 const state={latest:new Map([['reviewed',{status:'review'}],['approved',{status:'approved'}]]),evidence:new Map()};
 const result=buildPlan(registry,state,{config});
 assert.deepEqual(result.rows.map(r=>r.id),['reviewed']);
});

test('discovery: no cached Wikipedia seed searches by topic before citation expansion',async()=>{
 const urls=[];const fetchImpl=async u=>{urls.push(String(u));return {ok:true,json:async()=>String(u).includes('srsearch=')?{query:{search:[{title:'Grass'}]}}:{query:{pages:{1:{extlinks:[{'*':'https://www.nasa.gov/grass'}]}}}}};};
 const body='Leaves contain chlorophyll which absorbs red and blue wavelengths while reflecting green light in visible sunlight. '.repeat(5);
 const got=await discoverEvidence({evidence:[],topic:'Why is grass green',disc:config.discovery,need:2,fetchImpl,extract:async urls=>urls.map(url=>({url,ok:true,text:body,title:'NASA'}))});
 assert.ok(urls.some(u=>u.includes('srsearch=')));assert.ok(urls.some(u=>u.includes('prop=extlinks')));assert.equal(got.length,1);assert.equal(got[0].scraped,true);
});
test('recovery: union complementary evidence caches by URL and renumber source IDs',async()=>{
 const root=await mkdtemp(join(tmpdir(),'mmv2-cache-'));
 for(const [dir,items] of [['shard-0',[{url:'https://nasa.gov/a',id:'s1',excerpts:['a']}]],['rescue-0',[{url:'https://nasa.gov/a',id:'s9',excerpts:['a','b']},{url:'https://usgs.gov/b',id:'s1',excerpts:['c']}]]]){
 await mkdir(join(root,dir,'evidence'),{recursive:true});await writeFile(join(root,dir,'evidence','x.json'),JSON.stringify({id:'x',evidence:items}));
 }
 const state=await loadState(root);assert.equal(state.evidence.get('x').length,2);assert.deepEqual(state.evidence.get('x').map(e=>e.id),['s1','s2']);assert.equal(state.evidence.get('x')[0].excerpts.length,2);
});

test('editorial voice gate rejects em dashes and repeated sentences; fix removes both',()=>{
 const sentence='Plants reflect green wavelengths, which helps explain their visible colour.';
 const draft=sentence+' '+sentence+' This final sentence adds a distinct, evidence-based detail about chlorophyll.';
 assert.ok(lint(draft).some(p=>p.startsWith('repeated sentence')));
 const repaired=fix(draft+' Leaves contain pigments that absorb different wavelengths.');
 assert.equal(repaired.includes('—'),false);
 assert.equal(lint(repaired).some(p=>p.startsWith('repeated sentence')),false);
 assert.ok(lint('This sentence has an em dash — and it should fail.').some(p=>p.startsWith('em dash prohibited')));
});
test('open-web discovery accepts public HTTPS domains outside the legacy allowlist',()=>{
 assert.equal(isTrusted('https://museum.example.org/exhibit',config.discovery),true);
 assert.equal(isTrusted('https://localhost/private',config.discovery),false);
 assert.equal(isTrusted('http://museum.example.org/exhibit',config.discovery),false);
 assert.equal(isTrusted('https://www.wikipedia.org/wiki/Plants',config.discovery),false);
});
test('Brave web search links are discovered without restricting results to a small allowlist',async()=>{
 const fetchImpl=async()=>({ok:true,json:async()=>({web:{results:[{url:'https://museum.example.org/page'},{url:'https://research.example.net/report'}]}})});
 const links=await searchWebLinks('plant pigments',{fetchImpl,env:{BRAVE_SEARCH_API_KEY:'test-key'},max:10});
 assert.deepEqual(links,['https://museum.example.org/page','https://research.example.net/report']);
});
