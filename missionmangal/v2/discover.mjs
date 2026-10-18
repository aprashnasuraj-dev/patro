// Evidence discovery that does NOT depend on the research APIs that rate-limited v1.
//   1) cached evidence (free)  2) Wikipedia article -> its cited external links (MediaWiki, generous limits)  3) trusted-domain filter
//   4) extraction: Scrapling worker (robots-aware, polite) -> fallback to the v1 snapshot() -> optional Cloudflare render (inside snapshot)
import {spawn} from 'node:child_process';import {createHash} from 'node:crypto';
import {snapshot,excerptsFrom} from '../research/scraper.mjs';
const UA='AafnaiPatroResearchBot/1.0 (+https://aafnaipatro.com/editorial-guidelines/)';
export const hostOf=u=>{try{return new URL(u).hostname.replace(/^www\./,'');}catch{return '';}};
export function isTrusted(url,disc){const h=hostOf(url);if(!h||!url.startsWith('https://'))return false;
 if(disc.blocked_suffixes.some(s=>h===s||h.endsWith('.'+s)))return false;
 return disc.trusted_suffixes.some(s=>s.startsWith('.')?h.endsWith(s):(h===s||h.endsWith('.'+s)));}
export function wikiTitles(evidence){const t=new Set();for(const e of evidence)if(/wikipedia\.org\/wiki\//.test(e.url||'')){try{t.add(decodeURIComponent(new URL(e.url).pathname.replace('/wiki/','')).replace(/_/g,' '));}catch{}}
 for(const e of evidence)if(e.publisher==='Wikipedia'&&e.title)t.add(e.title);return [...t].slice(0,3);}
export async function wikipediaLinks(titles,{fetchImpl=fetch,max=40}={}){
 const links=[];for(const title of titles){
  try{const u='https://en.wikipedia.org/w/api.php?'+new URLSearchParams({action:'query',prop:'extlinks',titles:title,ellimit:String(max),redirects:'1',format:'json'});
   const r=await fetchImpl(u,{headers:{'user-agent':UA}});if(!r.ok)continue;const j=await r.json();
   for(const p of Object.values(j.query?.pages||{}))for(const l of p.extlinks||[])links.push(l['*']||l.url);}catch{}}
 return [...new Set(links.filter(Boolean))];
}
export function scraplingExtract(urls,{python='python3',script,delayMs=1200,timeoutMs=120_000}={}){
 return new Promise(resolve=>{if(!urls.length)return resolve([]);
  const p=spawn(python,[script,String(delayMs/1000)],{stdio:['pipe','pipe','ignore']});let out='';const t=setTimeout(()=>{p.kill();resolve([]);},timeoutMs);
  p.stdout.on('data',d=>out+=d);p.on('error',()=>{clearTimeout(t);resolve([]);});
  p.on('close',()=>{clearTimeout(t);try{resolve(JSON.parse(out));}catch{resolve([]);}});p.stdin.end(JSON.stringify(urls));});
}
// Returns NEW evidence items (ids assigned by caller). Never stores page text: excerpts + sha256 only.
export async function discoverEvidence({evidence,disc,need,fetchImpl=fetch,extract=scraplingExtract,scriptPath,render=null,now=()=>new Date(),log=()=>{}}){
 const have=new Set(evidence.map(e=>e.url)),titles=wikiTitles(evidence);if(!titles.length)return [];
 const links=(await wikipediaLinks(titles,{fetchImpl,max:disc.max_links_per_topic})).filter(u=>isTrusted(u,disc)&&!have.has(u));
 const perHost=new Map(),pick=[];for(const u of links){const h=hostOf(u);if((perHost.get(h)||0)>=2)continue;perHost.set(h,(perHost.get(h)||0)+1);pick.push(u);if(pick.length>=disc.max_fetches_per_topic)break;}
 const found=[];const add=(url,title,text,published,method)=>{const ex=excerptsFrom(text,{max:10});if(ex.length>=2)found.push({title:title||hostOf(url),publisher:hostOf(url),author:null,published_at:published?String(published).slice(0,10):null,url,retrieved_at:now().toISOString(),sha256:createHash('sha256').update(text).digest('hex'),rendered:false,scraped:true,method,excerpts:ex});};
 const rows=await extract(pick,{script:scriptPath,delayMs:disc.domain_delay_ms});const ok=new Set();
 for(const r of rows)if(r.ok&&r.text){ok.add(r.url);add(r.url,r.title,r.text,r.published,'scrapling');}
 for(const u of pick){if(found.length+evidence.length>=need+2)break;if(ok.has(u))continue;
  try{const s=await snapshot(u,{fetchImpl,renderer:render,now});if(s.excerpts.length>=2)found.push({title:s.title||hostOf(u),publisher:hostOf(u),author:null,published_at:s.published?String(s.published).slice(0,10):null,url:s.canonical||s.url,retrieved_at:s.retrieved_at,sha256:s.sha256,rendered:s.rendered,scraped:true,method:'snapshot',excerpts:s.excerpts});}catch(e){log('  snapshot '+hostOf(u)+': '+e.message);}}
 return found;
}
