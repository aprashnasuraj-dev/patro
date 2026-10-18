// Page renderer: seeded layout variant, "Article Spotlight" summary box, interleaved credited figures, provenance block rendered from evidence.
import {BYLINE} from './portfolio.mjs';
import {structuredData,relatedHtml,metaTags,CONTACT} from './seo-enhancements.mjs';
import {seedOf,variantOf} from './voice.mjs';
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const inline=t=>t.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/(^|[^*])\*([^*\n]+)\*/g,'$1<em>$2</em>');
export function mdToSections(md){ // returns [{h:string|null, html}]
 const out=[];let cur={h:null,html:''},list=false;const close=()=>{if(list){cur.html+='</ul>';list=false;}};
 for(const block of esc(md).split(/\n\s*\n/)){for(const line of block.split('\n')){const m=line.match(/^(#{2,3})\s+(.*)/),li=line.match(/^\s*[-*]\s+(.*)/),n=line.match(/^\s*\d+[.)]\s+(.*)/);
  if(m){close();if(m[1]==='##'){if(cur.html||cur.h)out.push(cur);cur={h:m[2],html:'<h2>'+m[2]+'</h2>'};}else cur.html+='<h3>'+m[2]+'</h3>';}
  else if(li||n){if(!list){cur.html+='<ul>';list=true;}cur.html+='<li>'+inline((li||n)[1])+'</li>';}
  else if(line.trim()){close();cur.html+='<p>'+inline(line.trim())+'</p>';}}close();}
 if(cur.html||cur.h)out.push(cur);return out;
}
const fig=m=>{const cap='<figcaption>Image: '+esc(m.credit)+(m.provider?' via '+esc(m.provider):'')+' · '+esc(m.license)+(m.source_url?' · <a rel="noopener noreferrer" href="'+esc(m.source_url)+'">source</a>':'')+'</figcaption>';
 if(['image','chart','diagram'].includes(m.type))return '<figure><img loading="lazy" decoding="async" width="1200" height="800" src="'+esc(m.url)+'" alt="'+esc(m.alt)+'">'+cap+'</figure>';
 if(m.type==='video')return '<figure><video controls preload="none" aria-label="'+esc(m.alt)+'" src="'+esc(m.url)+'"></video>'+cap+'</figure>';
 if(m.type==='audio')return '<figure><audio controls preload="none" aria-label="'+esc(m.alt)+'" src="'+esc(m.url)+'"></audio>'+cap+'</figure>';return '';};
const CSS=`:root{--h:{H};--bg:#fff;--fg:#1d2733;--mut:#5b6877;--ln:#e3e8ee;--ac:hsl(var(--h) 55% 32%);--measure:{M};--r:{R}px;--s:{S}}
@media(prefers-color-scheme:dark){:root{--bg:#10161d;--fg:#e6ebf1;--mut:#9aa7b5;--ln:#26303b;--ac:hsl(var(--h) 60% 68%)}}
body{margin:0;background:var(--bg);color:var(--fg);font:calc(1.0625rem*var(--s))/1.7 Georgia,'Times New Roman',serif}main{padding:1.25rem}
article{max-width:var(--measure);margin:0 auto}h1{font:700 clamp(1.8rem,5vw,2.6rem)/1.15 system-ui,sans-serif;margin:.4em 0}h2{font:700 1.45rem/1.25 system-ui,sans-serif;margin:2em 0 .5em;color:var(--ac)}h3{font:700 1.15rem system-ui,sans-serif}
.by{color:var(--mut);font:.9rem system-ui,sans-serif}a{color:var(--ac)}figure{margin:1.6em 0}figure img{width:100%;height:auto;border-radius:var(--r)}figcaption{font:.75rem system-ui,sans-serif;color:var(--mut);margin-top:.4em}
.spot{position:relative;overflow:hidden;background:hsl(var(--h) 55% 17%);color:#fff;border-radius:var(--r);padding:1.4rem 1.5rem;margin:1.2rem 0;font-family:system-ui,Arial,sans-serif}
.spot:before{content:"";position:absolute;right:-90px;top:-120px;width:320px;height:320px;border-radius:50%;background:hsl(calc(var(--h) + 25) 45% 30%);opacity:.6}
.spot>*{position:relative}.spot .k{color:#f4bd65;font-weight:700;letter-spacing:.22em;font-size:.72rem;text-transform:uppercase}.spot .t{font-size:clamp(1.15rem,3.4vw,1.55rem);line-height:1.35;font-weight:700;margin:.5rem 0 .8rem}
.spot ul{margin:0;padding-left:1.1rem;color:#c2dce7;font-size:.95rem;line-height:1.55}.spot .f{margin-top:.9rem;font-size:.75rem;color:#c2dce7;opacity:.85}
.l-b figure:not(.hero){max-width:100%}@media(min-width:900px){.l-b figure:not(.hero){float:right;width:44%;margin:.3em 0 1em 1.4em}.l-b h2{clear:both}.l-d .spot{max-width:none}}
.l-c p:first-of-type:first-letter{font-size:3em;float:left;line-height:.9;padding-right:.08em;color:var(--ac)}.l-d h2{border-bottom:1px solid var(--ln);padding-bottom:.25em}
details.prov{font:.78rem/1.5 system-ui,sans-serif;color:var(--mut);margin:2rem 0 0;border-top:1px solid var(--ln);padding-top:.8rem}.cite{font:600 .8em system-ui,sans-serif;text-decoration:none;margin-left:.12em}ol{padding-left:1.2rem}ol li{padding:.7rem 0;border-bottom:1px solid var(--ln);overflow-wrap:anywhere}ol li div{color:var(--mut);font:.82rem system-ui,sans-serif}ol li p{margin:.25rem 0}footer{font:.75rem system-ui,sans-serif;color:var(--mut);margin-top:1.5rem}`;
export function renderPage(article,record){
 const v=variantOf(seedOf(article.id,article.slug));
 const sources=[...article.sources].sort((a,b)=>String(a.author||a.publisher).localeCompare(String(b.author||b.publisher)));
 const sm=id=>sources.find(s=>s.id===id);
 const sourceNumber=new Map(sources.map((s,i)=>[s.id,i+1]));
 const cite=ids=>' '+ids.map(id=>'<a class="cite" href="#source-'+esc(id)+'" aria-label="Source '+(sourceNumber.get(id)||'?')+'">['+(sourceNumber.get(id)||'?')+']</a>').join(' ');
 const refs=sources.map((s,i)=>'<li id="source-'+esc(s.id)+'"><strong>'+esc(s.title||'Untitled source')+'</strong><div>'+esc(s.author||s.publisher||'Publisher not listed')+(s.published_at?' · Published '+esc(s.published_at.slice(0,10)):'')+(s.retrieved_at?' · Accessed '+esc(s.retrieved_at.slice(0,10)):'')+'</div><p><a rel="noopener noreferrer" href="'+esc(s.url)+'">Read source '+(i+1)+'</a></p></li>').join('');
 const ledger='<section aria-label="Evidence notes"><h2>Evidence notes</h2><ul>'+article.claims.map(c=>'<li>'+esc(c.text)+cite(c.source_ids)+'</li>').join('')+'</ul></section>';
 const secs=mdToSections(article.body_md),media=article.media||[];
 const take=(article.takeaways&&article.takeaways.length?article.takeaways:article.claims.filter((c,i,a)=>i===a.findIndex(x=>x.source_ids[0]===c.source_ids[0])).slice(0,3).map(c=>c.text));
 const spot='<aside class="spot" aria-label="Article summary"><div class="k">Article spotlight</div><div class="t">'+esc((article.description||take[0]||article.title).slice(0,170))+'</div><ul>'+take.slice(0,3).map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul><div class="f">Checked against '+sources.length+' cited sources'+(article.provenance?.last_retrieved?' · sources retrieved '+esc(article.provenance.last_retrieved.slice(0,10)):'')+'</div></aside>';
 const hero=media[0]?fig(media[0]).replace('<figure>','<figure class="hero">'):'';let rest=media.slice(1),body='';
 secs.forEach((s,i)=>{body+=s.html;if(i===0&&v.summary==='after-intro')body+=spot;if(rest.length&&i<secs.length-1&&(i%1===0))body+=fig(rest.shift());});body+=rest.map(fig).join('');
 const faq=(article.faq||[]).length?'<section><h2>Questions readers ask</h2>'+article.faq.map(f=>'<details><summary>'+esc(f.question)+'</summary><p>'+esc(f.answer)+'</p></details>').join('')+'</section>':'';
 const p=article.provenance;const prov='<details class="prov"><summary>How this page was made</summary><p>Written by '+esc(BYLINE)+' with AI assistance. '+(p?esc(p.sources_n+' sources were retrieved between '+(p.first_retrieved||'').slice(0,10)+' and '+(p.last_retrieved||'').slice(0,10)+' from '+p.hosts.slice(0,6).join(', ')+(p.hosts.length>6?' and others':'')+'. '+(p.scraped?'Pages fetched directly were only used where robots.txt allowed. ':'')):'')+'Every claim below links to the passage it relies on; images carry their licence and credit. Contact: '+esc(CONTACT)+'.</p></details>';
 const json=JSON.stringify(structuredData(article,record)).replace(/</g,'\\u003c');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(article.title)+' | Aafnai Patro</title><link rel="canonical" href="'+esc(record.url)+'"><meta name="description" content="'+esc((article.description||article.intent).slice(0,160))+'">'+metaTags(article,record)+'<style>'+CSS.replace('{H}',v.hue).replace('{M}',v.measure).replace('{R}',v.radius).replace('{S}',v.scale)+'</style><script type="application/ld+json">'+json+'</script></head><body><main><article class="l-'+v.layout+'"><header><h1>'+esc(article.title)+'</h1><p class="by">By '+esc(BYLINE)+', with AI assistance</p>'+(article.disclaimer?'<p class="by"><em>'+esc(article.disclaimer)+'</em></p>':'')+'</header>'+(v.summary==='top'?spot:'')+hero+body+faq+ledger+'<section aria-label="Sources and further reading"><h2>Sources &amp; further reading</h2><p class="by">Numbered links connect evidence notes to the source entries below.</p><ol>'+refs+'</ol></section>'+relatedHtml(article.related_links)+prov+'<footer>Sources checked automatically · Contact: '+esc(CONTACT)+'</footer></article></main></body></html>';
}
