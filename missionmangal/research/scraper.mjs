// Polite evidence scraper. Purpose: capture a hashed snapshot + short verifying passages. It NEVER stores or republishes full page text.
import {createHash} from 'node:crypto';
import {isIP} from 'node:net';
const UA='AafnaiPatroResearchBot/1.0 (+https://aafnaipatro.com/editorial-guidelines/)';
export function assertPublicUrl(u){
 const url=new URL(u);if(!['https:','http:'].includes(url.protocol))throw Error('Only http(s)');
 const h=url.hostname.toLowerCase();
 if(h==='localhost'||h.endsWith('.local')||h.endsWith('.internal'))throw Error('Blocked host');
 if(isIP(h)&&/^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|::1$|fc|fd|fe80)/i.test(h))throw Error('Blocked private address');
 return url;
}
export function robotsAllows(robotsTxt,path,agent='aafnaipatroresearchbot'){
 let applies=false,rules=[],star=[],mine=[],cur=null;
 for(const raw of String(robotsTxt).split(/\r?\n/)){const line=raw.replace(/#.*/,'').trim();if(!line)continue;const i=line.indexOf(':');if(i<0)continue;const k=line.slice(0,i).trim().toLowerCase(),v=line.slice(i+1).trim();
  if(k==='user-agent'){cur=v.toLowerCase();continue;}
  if(k==='allow'||k==='disallow'){if(cur==='*')star.push([k,v]);else if(cur&&agent.includes(cur))mine.push([k,v]);}}
 rules=mine.length?mine:star;let best=null;
 for(const [k,v] of rules){if(!v){continue;}if(path.startsWith(v.replace(/\*.*$/,''))&&(!best||v.length>=best[1].length))best=[k,v];}
 return !best||best[0]==='allow';
}
const strip=h=>h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<footer[\s\S]*?<\/footer>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
export function excerptsFrom(text,{max=12,min=60,cap=300}={}){return text.split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(s=>s.length>=min&&s.length<=cap&&/[a-z]/i.test(s)&&!/cookie|subscribe|sign up|privacy policy/i.test(s)).slice(0,max);}
// Optional JS-rendering tier (Cloudflare Browser Rendering REST) used ONLY when a plain fetch yields too little text.
export function cloudflareRenderer({accountId,token,fetchImpl=fetch}){return async url=>{const r=await fetchImpl('https://api.cloudflare.com/client/v4/accounts/'+accountId+'/browser-rendering/content',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({url})});if(!r.ok)throw Error('render HTTP '+r.status);const j=await r.json();return j.result||'';};}
export async function snapshot(urlStr,{fetchImpl=fetch,now=()=>new Date(),maxBytes=3_000_000,passages=[],renderer=null,minChars=800}={}){
 const url=assertPublicUrl(urlStr);
 const rb=await fetchImpl(url.origin+'/robots.txt',{headers:{'user-agent':UA}}).then(r=>r.ok?r.text():'').catch(()=>'');
 if(!robotsAllows(rb,url.pathname))throw Error('Disallowed by robots.txt');
 const res=await fetchImpl(url.href,{headers:{'user-agent':UA,accept:'text/html'},redirect:'follow'});
 if(!res.ok)throw Error('HTTP '+res.status);
 if(/noindex|noai|none/i.test(res.headers?.get?.('x-robots-tag')||''))throw Error('Page opts out via X-Robots-Tag');
 let html=await res.text();if(html.length>maxBytes)throw Error('Page too large');
 let rendered=false;if(renderer&&strip(html).length<minChars){html=await renderer(url.href);rendered=true;}
 if(/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*(noai|noarchive)/i.test(html))throw Error('Page opts out via meta robots');
 const text=strip(html);
 const found=passages.map(p=>({passage:p,present:text.toLowerCase().includes(String(p).toLowerCase())}));
 return {url:url.href,retrieved_at:now().toISOString(),sha256:createHash('sha256').update(html).digest('hex'),title:(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]?.trim()||null,canonical:(html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)||[])[1]||null,published:(html.match(/article:published_time["'][^>]+content=["']([^"']+)/i)||[])[1]||null,chars:text.length,rendered,excerpts:excerptsFrom(text),passage_checks:found,license:'unknown - verify before reuse'};
}
