#!/usr/bin/env node
/** All 530 separately tested, then one aggregate verdict; never deploy. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {policyFor,policyHtml} from './policy.mjs';
import {metadataId,classifyTestFramework,browserBuildOptions,nodeTestBuildOptions} from './harness-lib.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),out=path.join(root,'reports','mm530-qa');
const rp=(...p)=>path.join(root,...p),read=p=>fs.readFile(p,'utf8');
const exists=async p=>fs.access(p).then(()=>true,()=>false);
const err=e=>String(e?.errors?.[0]?.text||e?.message||e).replace(/\s+/g,' ').slice(0,350);
const results=[],globalErrors=[],master=new Map(),catalog=new Map();
const flag=(t,k,state,note='')=>t.checks[k]={state,note};
const command=(cmd,args,ms=12000)=>new Promise(resolve=>{
 let ended=false,msg='',timedOut=false;const p=spawn(cmd,args,{cwd:root,stdio:['ignore','pipe','pipe'],env:{...process.env,NODE_OPTIONS:'--no-warnings'}});
 const timer=setTimeout(()=>{timedOut=true;p.kill('SIGKILL')},ms);
 p.stdout.on('data',d=>msg=(msg+d.toString()).slice(-800));p.stderr.on('data',d=>msg=(msg+d.toString()).slice(-800));
 const finish=(ok,note)=>{if(ended)return;ended=true;clearTimeout(timer);resolve({ok,note:err(note)})};
 p.on('error',e=>finish(false,e));p.on('close',code=>finish(code===0&&!timedOut,timedOut?'Timeout':msg||'Exit '+code));
});
async function bootstrap(){
 try{const rows=JSON.parse(await read(rp('batch-01','publication','route-catalog-530.json')));for(const x of rows){if(master.has(x.id))globalErrors.push('Duplicate master ID: '+x.id);master.set(x.id,x)}}
 catch(e){globalErrors.push('Master registry: '+err(e))}
 for(let b=1;b<=10;b++)try{const rows=JSON.parse(await read(rp('batch-'+String(b).padStart(2,'0'),'catalog.json')));
  if(rows.length!==53)globalErrors.push('Batch '+b+' has '+rows.length+' rows');
  for(const x of rows){if(catalog.has(x.id))globalErrors.push('Duplicate catalog ID: '+x.id);catalog.set(x.id,x)}
 }catch(e){globalErrors.push('Batch '+b+': '+err(e))}
 for(let n=1;n<=530;n++){const id='TOOL-'+String(n).padStart(4,'0'),x=master.get(id)||{};
  const t={id,title:x.title||'',url:x.canonical_proposed||'',batch:'batch-'+String(Math.ceil(n/53)).padStart(2,'0'),checks:{},risks:[],priority:3};
  t.dir=rp(t.batch,'tool-products',id);results.push(t);
  flag(t,'registry',catalog.get(id)?.canonical_proposed===t.url&&t.title?'PASS':'FAIL',t.title?'Cross-check master and batch catalog':'Missing catalog identity');
 }
}
async function scan(t){
 const x=catalog.get(t.id)||master.get(t.id)||{};
 try{
  const data=JSON.parse(await read(path.join(t.dir,'tool.json'))),found=metadataId(data);
  if(found!==t.id)throw Error(found?'Metadata identifies '+found+' instead of '+t.id:'No recognized tool identity field');
  flag(t,'metadata','PASS','Normalized identity: '+found)
 }catch(e){flag(t,'metadata','FAIL',err(e))}
 try{const h=await read(path.join(t.dir,'page.html'));if(!/<h1(?:\s|>)/i.test(h))throw Error('Missing H1');if(!/<title(?:\s|>)/i.test(h))throw Error('Missing title');flag(t,'html','PASS')}
 catch(e){flag(t,'html','FAIL',err(e))}
 t.risks=policyFor(x).map(x=>x.kind);
 const notice=policyHtml(x);flag(t,'notice',t.risks.length&&(!notice.includes('lang="en"')||!notice.includes('lang="ne"'))?'FAIL':'PASS','Bilingual source-preview notice; publication adapter must also render it');
 if(t.risks.length){flag(t,'jurisdiction_review','NEEDS_REVIEW','Verify current rate/rule, jurisdiction and effective-year official source');t.priority=1}
 if(t.id==='TOOL-0527'){flag(t,'license_review','NEEDS_REVIEW','NPF formula licensing/permission review before commercial use');t.priority=1}
 t.source=[];const staticDeps=new Set();
 for(const n of ['core.ts','core.tsx','ui.ts','ui.tsx','worker.ts']){
  const p=path.join(t.dir,'src',n);if(await exists(p)){t.source.push(p);
   try{const s=await read(p);for(const m of s.matchAll(/['"]((?:\/vendor|\/assets|\/fonts)\/[^'"]+)['"]/g))staticDeps.add(m[1])}catch{}
  }
 }
 flag(t,'source',t.source.length?'PASS':'FAIL',t.source.length+' source entries');
 if(staticDeps.size)flag(t,'site_static_dependency','NEEDS_REVIEW','Bare source compile externalizes site-root assets: '+[...staticDeps].slice(0,5).join(', '));
}
async function compile(t,esbuild){
 if(!esbuild){flag(t,'compile','NOT_RUN','esbuild unavailable');return}
 if(!t.source.length){flag(t,'compile','BLOCKED','No source entry');return}
 try{
  for(const p of t.source)await esbuild.build(browserBuildOptions(p));
  flag(t,'compile','PASS','Syntax/bundle preflight passed with CSS emitted in-memory and site-root assets externalized; production integration still separate')
 }catch(e){flag(t,'compile','FAIL',err(e));t.priority=1}
}
async function unit(t,esbuild){
 let files=[];try{files=(await fs.readdir(path.join(t.dir,'tests'))).filter(x=>/\.(?:test|spec)\.(?:ts|tsx|mjs|cjs|js)$/.test(x)&&!x.toLowerCase().includes('browser')).sort()}catch{}
 const classified=[];
 for(const file of files){let contents='';try{contents=await read(path.join(t.dir,'tests',file))}catch{};classified.push({file,framework:classifyTestFramework(file,contents),contents})}
 t.unitFiles=classified.map(x=>({file:x.file,framework:x.framework}));
 if(!files.length){flag(t,'unit','NOT_RUN','No unit fixture supplied');return}
 if(!esbuild){flag(t,'unit','NOT_RUN','esbuild unavailable');return}
 const nodeFiles=classified.filter(x=>x.framework==='node-test'),deferred=classified.filter(x=>x.framework!=='node-test');
 let passed=0,failed=[];
 for(const item of nodeFiles)try{
  const input=path.join(t.dir,'tests',item.file),compiled=rp('.mm530-qa-temp',t.id,item.file.replace(/\.(?:ts|tsx|mjs|cjs|js)$/,'')+'.mjs');
  await fs.mkdir(path.dirname(compiled),{recursive:true});
  await esbuild.build(nodeTestBuildOptions(input,compiled));
  const r=await command(process.execPath,['--test',compiled],15000);
  if(r.ok)passed++;else failed.push(item.file+': '+r.note);
 }catch(e){failed.push(item.file+': '+err(e))}
 if(failed.length){flag(t,'unit','FAIL',failed.join(' | ').slice(0,700));t.priority=1;return}
 if(deferred.length){
  const counts={};for(const x of deferred)counts[x.framework]=(counts[x.framework]||0)+1;
  flag(t,'unit','NOT_RUN',(passed?passed+' node-test file(s) passed; ':'')+'deferred frameworks for Phase 4: '+Object.entries(counts).map(([k,v])=>k+'='+v).join(', '));
 }else flag(t,'unit','PASS',passed+'/'+files.length+' node-test files passed');
}
async function auditRoutes(){
 const names=['src/PatroRouter.tsx','src/tool-directory.ts','public/sitemap.xml'];
 const texts=await Promise.all(names.map(x=>read(rp(x)).catch(()=>'')));
 const known=new Set();for(const t of texts)for(const m of t.matchAll(/['"](\/(?:tools|calculators|converters|validators|generators|editors|utilities|planners|timers|analyzers|comparisons|extractors|formatters)(?:\/[a-z0-9-]+)*)['"]/g))known.add(m[1]);
 for(const m of texts[2].matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g))known.add(m[1].replace(/\/$/,'')||'/');
 const owners=new Map();
 for(const t of results){
  if(!t.url||owners.has(t.url)||known.has(t.url)){flag(t,'route_collision','FAIL','Missing, repeated or currently owned URL');t.priority=1}
  else{owners.set(t.url,t.id);flag(t,'route_collision','PASS','No exact local Vite route, tool-directory or sitemap collision')}
  if(known.has(catalog.get(t.id)?.reserved_legacy_route))flag(t,'legacy_alias','NEEDS_REVIEW','Already owned /tools route; do not overwrite/redirect');
  flag(t,'integration','BLOCKED','No Vite lazy route, Cloudflare/prerender asset, actual computation or sitemap verified; no publishing');
 }
 let urls=null,warn='';const origin=(process.env.MM530_LIVE_ORIGIN||'https://aafnaipatro.com').replace(/\/$/,'');
 try{const get=async u=>{const x=await fetch(u,{signal:AbortSignal.timeout(10000)});if(!x.ok)throw Error('HTTP '+x.status);return x.text()};
  const index=await get(origin+'/sitemap.xml');urls=new Set();const refs=[...index.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(m=>m[1]);
  const add=u=>{try{const x=new URL(u);if(x.origin===origin)urls.add(x.pathname.replace(/\/$/,'')||'/')}catch{}};refs.forEach(add);
  for(const url of refs.filter(x=>x.endsWith('.xml')).slice(0,12))try{const sub=await get(url);for(const x of sub.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g))add(x[1])}catch(e){warn='Incomplete child sitemap coverage: '+err(e)}
 }catch(e){warn='Live sitemap unavailable: '+err(e)}
 for(const t of results)if(!urls)flag(t,'live_sitemap_collision','NOT_RUN',warn);
 else if(urls.has(t.url)){flag(t,'live_sitemap_collision','FAIL','Current live sitemap owns proposed canonical');t.priority=1}
 else flag(t,'live_sitemap_collision','PASS','No exact match within probed live sitemaps; dynamic URLs unverified');
 return {localRoutes:known.size,liveSitemapPaths:urls?.size||0,liveWarning:warn};
}
function previewServer(){
 return createServer(async(req,res)=>{try{
  const m=new URL(req.url,'http://127.0.0.1').pathname.match(/^\/review\/(TOOL-\d{4})(?:\/(.*))?$/);
  if(!m){res.writeHead(404);return res.end()}
  const t=results.find(x=>x.id===m[1]);if(!t){res.writeHead(404);return res.end()}
  const rel=m[2]||'page.html',dest=path.resolve(t.dir,rel);
  if(!dest.startsWith(t.dir+path.sep)||!await exists(dest)){res.writeHead(404);return res.end()}
  let bytes=await fs.readFile(dest),type=rel.endsWith('.css')?'text/css':rel.endsWith('.js')?'text/javascript':'text/html';
  if(rel==='page.html'){
   let html=bytes.toString('utf8');html=html.replace(/<head(?:\s[^>]*)?>/i,x=>x+'<base href="/review/'+t.id+'/">');
   const notice=policyHtml(catalog.get(t.id)||master.get(t.id)||{});
   if(notice)html=html.replace(/<\/body>/i,notice+'</body>');bytes=Buffer.from(html);
  }else if(!/\.(?:css|js|json|svg|png|jpg|woff2?)$/.test(rel)){res.writeHead(403);return res.end()}
  res.writeHead(200,{'Content-Type':type,'X-Robots-Tag':'noindex, nofollow','Cache-Control':'no-store'});res.end(bytes);
 }catch(e){res.writeHead(500);res.end(err(e))}})
}
async function browserStage(){
 let chromium;try{({chromium}=await import('playwright'))}catch(e){globalErrors.push('Playwright: '+err(e))}
 if(!chromium){for(const t of results)flag(t,'browser_source','NOT_RUN','Playwright missing');return}
 let browser;try{browser=await chromium.launch({headless:true,args:['--no-sandbox']})}catch(e){globalErrors.push('Chromium: '+err(e))}
 if(!browser){for(const t of results)flag(t,'browser_source','NOT_RUN','Chromium unavailable');return}
 const server=previewServer();
 try{await new Promise(r=>server.listen(0,'127.0.0.1',r));const page=await browser.newPage({viewport:{width:375,height:812}});page.setDefaultTimeout(2400);
  const base='http://127.0.0.1:'+server.address().port;
  for(const t of results){const mistakes=[],onerror=e=>mistakes.push(err(e));page.on('pageerror',onerror);
   try{
    const response=await page.goto(base+'/review/'+t.id+'/page.html',{waitUntil:'domcontentloaded',timeout:8500});
    if(response?.status()!==200)mistakes.push('HTTP '+response?.status());
    if(!await page.locator('h1').count())mistakes.push('No H1 rendered');
    if(t.risks.length&&!await page.locator('[data-mm530-policy]').count())mistakes.push('Missing bilingual notice');
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+8))mistakes.push('375px horizontal overflow');
    flag(t,'browser_source',mistakes.length?'FAIL':'PASS',mistakes.join(' | ')||'Source preview rendered; functional output and Vite integration NOT proven');
    if(mistakes.length)t.priority=1;
   }catch(e){flag(t,'browser_source','FAIL',err(e));t.priority=1}
   page.off('pageerror',onerror);
  }
  await page.close();
 }finally{server.close();await browser.close()}
}
async function report(extra={}){
 await fs.mkdir(out,{recursive:true});const stage={};
 for(const t of results)for(const [k,v] of Object.entries(t.checks)){stage[k]??={};stage[k][v.state]=(stage[k][v.state]||0)+1}
 const safe=results.map(t=>{const {dir,source,...row}=t;return row});
 const failed=safe.filter(t=>Object.values(t.checks).some(v=>v.state==='FAIL')).sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id));
 const summary={at:new Date().toISOString(),expected:530,tested:safe.length,failed:failed.length,checks:stage,globalErrors,publication:'LOCKED',...extra};
 await fs.writeFile(path.join(out,'all-tools.json'),JSON.stringify({summary,tools:safe},null,2));
 await fs.writeFile(path.join(out,'failed-tools.json'),JSON.stringify({count:failed.length,tools:failed},null,2));
 const lines=['# MM530 aggregate QA and repair shortlist','All 530 tool IDs evaluated independently. NOT_RUN and BLOCKED are never PASS.','', '| Stage | PASS | FAIL | BLOCKED | NOT_RUN | NEEDS_REVIEW |','|---|---:|---:|---:|---:|---:|',...Object.entries(stage).map(([k,v])=>'| '+k+' | '+(v.PASS||0)+' | '+(v.FAIL||0)+' | '+(v.BLOCKED||0)+' | '+(v.NOT_RUN||0)+' | '+(v.NEEDS_REVIEW||0)+' |'),'','## Failed tools: first 100','| Tool | Proposed path | Individual failures |','|---|---|---|',...failed.slice(0,100).map(t=>'| '+t.id+' | '+t.url+' | '+Object.entries(t.checks).filter(([,v])=>v.state==='FAIL').map(([k,v])=>k+': '+v.note.replace(/\|/g,'/')).join('; ').slice(0,170)+' |'),'','Full unabridged results and all review-needed items are in all-tools.json.','Raw source-page smoke does NOT prove working calculations, production routing, accurate tax rules or legal compliance.'];
 await fs.writeFile(path.join(out,'repair-shortlist.md'),lines.join('\n'));
 if(process.env.GITHUB_STEP_SUMMARY)await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,lines.slice(0,17).join('\n')+'\n');
 console.log(JSON.stringify({tested:safe.length,failed:failed.length,checks:stage,globalErrors}));
}
async function main(){
 await bootstrap();let esbuild;try{esbuild=await import('esbuild')}catch(e){globalErrors.push('esbuild: '+err(e))}
 for(const t of results)try{await scan(t)}catch(e){flag(t,'source','FAIL',err(e))}
 const route=await auditRoutes();
 async function pool(fn,count,name){let i=0;await Promise.all(Array.from({length:count},async()=>{while(i<results.length){const t=results[i++];try{await fn(t,esbuild)}catch(e){flag(t,name,'FAIL',err(e))}}}))}
 await pool(compile,6,'compile');await pool(unit,4,'unit');await browserStage();await report(route);
 process.exitCode=globalErrors.length||results.some(t=>Object.values(t.checks).some(x=>x.state!=='PASS'))?1:0;
}
main().catch(async e=>{globalErrors.push('Fatal: '+err(e));try{await report({fatal:true})}catch{};console.error(e);process.exitCode=1});
