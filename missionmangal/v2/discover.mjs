// Broad, policy-aware discovery. Search providers surface relevant sources across many domains;
// citation trails remain a fallback. Every factual claim must still pass the evidence-grounding gate.
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {snapshot,excerptsFrom} from '../research/scraper.mjs';
const UA='AafnaiPatroResearchBot/1.0 (+https://aafnaipatro.com/editorial-guidelines/)';
export const hostOf=u=>{try{return new URL(u).hostname.toLowerCase().replace(/^www\./,'');}catch{return '';}};
export function isTrusted(url,disc={}){
 try{
  const u=new URL(url),h=u.hostname.toLowerCase().replace(/^www\./,'');
  if(u.protocol!=='https:'||!h||u.username||u.password)return false;
  if(h==='localhost'||h.endsWith('.localhost')||h.endsWith('.local')||/^\d{1,3}(\.\d{1,3}){3}$/.test(h)||h.includes(':'))return false;
  if((disc.blocked_suffixes||[]).some(s=>h===s||h.endsWith('.'+s)))return false;
  // Broad discovery is intentional. A public HTTPS URL is a candidate, not proof of authority.
  return true;
 }catch{return false;}
}
export function wikiTitles(evidence){const t=new Set();for(const e of evidence)if(/wikipedia\.org\/wiki\//.test(e.url||'')){try{t.add(decodeURIComponent(new URL(e.url).pathname.replace('/wiki/','')).replace(/_/g,' '));}catch{}}
 for(const e of evidence)if(e.publisher==='Wikipedia'&&e.title)t.add(e.title);return [...t].slice(0,3);}
export async function wikipediaLinks(titles,{fetchImpl=fetch,max=40}={}){
 const links=[];for(const title of titles){try{const u='https://en.wikipedia.org/w/api.php?'+new URLSearchParams({action:'query',prop:'extlinks',titles:title,ellimit:String(max),redirects:'1',format:'json'});
  const r=await fetchImpl(u,{headers:{'user-agent':UA}});if(!r.ok)continue;const j=await r.json();
  for(const p of Object.values(j.query?.pages||{}))for(const l of p.extlinks||[])links.push(l['*']||l.url);}catch{}}
 return [...new Set(links.filter(Boolean))];
}
export async function wikipediaSearchTitles(topic,{fetchImpl=fetch,max=3}={}){
 if(!topic?.trim())return [];
 try{const u='https://en.wikipedia.org/w/api.php?'+new URLSearchParams({action:'query',list:'search',srsearch:topic,srlimit:String(max),format:'json'});
  const r=await fetchImpl(u,{headers:{'user-agent':UA}});if(!r.ok)return [];
  const j=await r.json();return (j.query?.search||[]).map(x=>x.title).filter(Boolean).slice(0,max);
 }catch{return [];}
}
export async function searchWebLinks(topic,{fetchImpl=fetch,env=process.env,max=20}={}){
 if(!topic?.trim())return [];
 const out=[];
 if(env.BRAVE_SEARCH_API_KEY){try{
  const u='https://api.search.brave.com/res/v1/web/search?'+new URLSearchParams({q:topic,count:String(Math.min(max,20)),safesearch:'moderate'});
  const r=await fetchImpl(u,{headers:{accept:'application/json','x-subscription-token':env.BRAVE_SEARCH_API_KEY,'user-agent':UA}});
  if(r.ok){const j=await r.json();for(const x of j.web?.results||[])if(x.url)out.push(x.url);}
 }catch{}}
 if(env.TAVILY_API_KEY&&out.length<max){try{
  const r=await fetchImpl('https://api.tavily.com/search',{method:'POST',headers:{'content-type':'application/json','user-agent':UA},body:JSON.stringify({api_key:env.TAVILY_API_KEY,query:topic,search_depth:'basic',max_results:Math.min(max-out.length,10),include_answer:false})});
  if(r.ok){const j=await r.json();for(const x of j.results||[])if(x.url)out.push(x.url);}
 }catch{}}
 // Public search fallback when no paid search credentials are configured. No CAPTCHA or anti-bot bypass.
 if(out.length===0){try{
  const u='https://html.duckduckgo.com/html/?'+new URLSearchParams({q:topic});
  const r=await fetchImpl(u,{headers:{'user-agent':UA,'accept':'text/html'}});
  if(r.ok){const html=await r.text();for(const m of html.matchAll(/<a\\b(?=[^>]*\\bclass=["'][^"']*\\bresult__a\\b[^"']*["'])[^>]*\\bhref=["']([^"']+)["'][^>]*>/gi)){
   try{const href=m[1].replace(/&amp;/g,'&');const parsed=new URL(href,'https://html.duckduckgo.com');const target=parsed.searchParams.get('uddg');const resolved=target?decodeURIComponent(target):parsed.href;if(/^https:\\/\\//i.test(resolved))out.push(resolved);}catch{}
  }}
 }catch{}}
 return [...new Set(out)].filter(u=>isTrusted(u,{blocked_suffixes:[]})).slice(0,max);
}
export function scraplingExtract(urls,{python='python3',script,delayMs=1500,timeoutMs=120_000}={}){
 return new Promise(resolve=>{if(!urls.length)return resolve([]);
  const p=spawn(python,[script,String(delayMs/1000)],{stdio:['pipe','pipe','ignore']});let out='';const t=setTimeout(()=>{p.kill();resolve([]);},timeoutMs);
  p.stdout.on('data',d=>out+=d);p.on('error',()=>{clearTimeout(t);resolve([]);});
  p.on('close',()=>{clearTimeout(t);try{resolve(JSON.parse(out));}catch{resolve([]);}});p.stdin.end(JSON.stringify(urls));});
}
// Raw text stays transient. Persist excerpts, retrieval metadata, and a hash only.
export async function discoverEvidence({evidence,topic='',disc,need,fetchImpl=fetch,extract=scraplingExtract,scriptPath,render=null,now=()=>new Date(),log=()=>{}}){
 const have=new Set(evidence.map(e=>e.url));
 const searchLinks=await searchWebLinks(topic,{fetchImpl,max:disc.max_links_per_topic});
 let titles=wikiTitles(evidence);if(!titles.length)titles=await wikipediaSearchTitles(topic,{fetchImpl});
 const wikiLinks=titles.length?await wikipediaLinks(titles,{fetchImpl,max:disc.max_links_per_topic}):[];
 const links=[...new Set([...searchLinks,...wikiLinks])].filter(u=>isTrusted(u,disc)&&!have.has(u));
 const perHost=new Map(),pick=[];
 for(const u of links){const h=hostOf(u);if((perHost.get(h)||0)>=2)continue;perHost.set(h,(perHost.get(h)||0)+1);pick.push(u);if(pick.length>=disc.max_fetches_per_topic)break;}
 const found=[];const add=(url,title,text,published,method)=>{const ex=excerptsFrom(text,{max:10});if(ex.length>=2)found.push({title:title||hostOf(url),publisher:hostOf(url),author:null,published_at:published?String(published).slice(0,10):null,url,retrieved_at:now().toISOString(),sha256:createHash('sha256').update(text).digest('hex'),rendered:false,scraped:true,method,excerpts:ex});};
 const rows=await extract(pick,{script:scriptPath,delayMs:disc.domain_delay_ms});const ok=new Set(),policyBlocked=new Set();
 for(const r of rows){if(r.ok&&r.text){ok.add(r.url);add(r.url,r.title,r.text,r.published,'scrapling');}
  else if(/robots|redirect|non-public|local host|DNS resolution|opt-out|policy unknown/i.test(r.error||''))policyBlocked.add(r.url);}
 for(const u of pick){if(found.length+evidence.length>=need+2)break;if(ok.has(u)||policyBlocked.has(u))continue;
  try{const s=await snapshot(u,{fetchImpl,renderer:render,now});if(s.excerpts.length>=2)found.push({title:s.title||hostOf(u),publisher:hostOf(u),author:null,published_at:s.published?String(s.published).slice(0,10):null,url:s.canonical||s.url,retrieved_at:s.retrieved_at,sha256:s.sha256,rendered:s.rendered,scraped:true,method:'snapshot',excerpts:s.excerpts});}catch(e){log('  snapshot '+hostOf(u)+': '+e.message);}}
 return found;
}
