import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {reserve,assertRegistry,canonical,BYLINE,ROUTES,folderFor} from './portfolio.mjs';
import {assertPublishable} from './quality.mjs';
import {sitemapXml,assertSitemap,SITEMAP_NAME} from './sitemap.mjs';
import {structuredData,relatedHtml,editorialPage,metaTags} from './seo-enhancements.mjs';
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export async function loadRegistry(path){try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code==='ENOENT')return [];throw e;}}
export async function saveRegistry(path,registry){assertRegistry(registry);await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(registry,null,2)+'\n');}
export function registerArticle(registry,candidate){return reserve(registry,candidate);}
function apa(s){const author=esc(s.author||s.publisher),date=esc(s.published_at?s.published_at.slice(0,4):'n.d.');return author+'. ('+date+'). <cite>'+esc(s.title)+'</cite>. '+esc(s.publisher)+'. <a rel="noopener noreferrer" href="'+esc(s.url)+'">'+esc(s.url)+'</a>';}
export function renderApproved(article,record){
 assertPublishable(article);
 const type=record.type||'blog';
 if(article.id!==record.id||article.slug!==record.slug||(article.type||'blog')!==type||record.url!==canonical(type,article.slug))throw Error('Article does not match reserved URL');
 if(!['approved','rendered','published'].includes(record.status))throw Error('Registry approval required');
 const sources=[...article.sources].sort((a,b)=>String(a.author||a.publisher).localeCompare(String(b.author||b.publisher)));
 const refs=sources.map(s=>'<li id="source-'+esc(s.id)+'">'+apa(s)+'</li>').join('');
 const cite=ids=>' ('+ids.map(id=>'<a href="#source-'+esc(id)+'">'+esc(sources.find(s=>s.id===id)?.author||sources.find(s=>s.id===id)?.publisher||id)+', '+esc((sources.find(s=>s.id===id)?.published_at||'n.d.').slice(0,4))+'</a>').join('; ')+')';
 const claimLedger='<section aria-label="Evidence notes"><h2>Evidence notes</h2><ul>'+article.claims.map(c=>'<li>'+esc(c.text)+cite(c.source_ids)+'</li>').join('')+'</ul></section>';
 const body=esc(article.body_md).split(/\n\s*\n/).map(p=>'<p>'+p.replace(/\n/g,' ')+'</p>').join('');
 const media=article.media.map(m=>{const label='<figcaption style="font-size:.75em;opacity:.8">Image: '+esc(m.credit)+(m.provider?' via '+esc(m.provider):'')+' · '+esc(m.license)+(m.source_url?' · <a rel="noopener noreferrer" href="'+esc(m.source_url)+'">source</a>':'')+'</figcaption>';if(['image','chart','diagram'].includes(m.type))return '<figure><img loading="lazy" decoding="async" src="'+esc(m.url)+'" alt="'+esc(m.alt)+'">'+label+'</figure>';if(m.type==='video')return '<figure><video controls preload="none" aria-label="'+esc(m.alt)+'" src="'+esc(m.url)+'"></video>'+label+'</figure>';if(m.type==='audio')return '<figure><audio controls preload="none" aria-label="'+esc(m.alt)+'" src="'+esc(m.url)+'"></audio>'+label+'</figure>';return '';}).join('');
 const json=JSON.stringify(structuredData(article,record)).replace(/</g,'\\u003c');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(article.title)+' | Aafnai Patro</title><link rel="canonical" href="'+esc(record.url)+'"><meta name="description" content="'+esc((article.description||article.intent).slice(0,160))+'">'+metaTags(article,record)+'<script type="application/ld+json">'+json+'</script></head><body><main><article><header><h1>'+esc(article.title)+'</h1><p>By '+BYLINE+'</p><p>Article ID: '+esc(article.id)+'</p>'+(article.ai_assisted?'<p style="font-size:.85em"><em>Drafted with AI assistance from the cited sources and checked automatically against them; not individually reviewed by a human. Found an error? See our <a href="/editorial-guidelines/#corrections">corrections policy</a>.</em></p>':'')+(article.disclaimer?'<p style="font-size:.85em"><em>'+esc(article.disclaimer)+'</em></p>':'')+'</header>'+media+body+claimLedger+'<section><h2>References (APA style)</h2><ol>'+refs+'</ol></section>'+relatedHtml(article.related_links)+'</article></main></body></html>';
}
export async function buildApproved({registry,articles,outDir,expectedCount}){
 assertRegistry(registry);if(expectedCount!==undefined&&registry.length!==expectedCount)throw Error('Unexpected registry total');
 const rendered=new Set(),updated=registry.map(r=>({...r})),prepared=[];
 // Validate every page before writing anything (fail closed).
 for(const record of updated.filter(r=>['approved','rendered','published'].includes(r.status))){
  const a=articles.find(x=>x.id===record.id);if(!a)throw Error('Missing approved article '+record.id);
  prepared.push({record,html:renderApproved(a,record)});
 }
 await mkdir(outDir,{recursive:true});
 for(const {record,html} of prepared){const folder=folderFor(record.type||'blog');const dir=join(outDir,folder,record.slug);await mkdir(dir,{recursive:true});await writeFile(join(dir,'index.html'),html);rendered.add((record.type||'blog')+'/'+record.slug);record.status='published';}
 const xml=sitemapXml(updated,rendered);assertSitemap(xml,updated,rendered);await writeFile(join(outDir,SITEMAP_NAME),xml);
 if(prepared.length){const editorial=join(outDir,'editorial-guidelines');await mkdir(editorial,{recursive:true});await writeFile(join(editorial,'index.html'),editorialPage());}
 return {registry:updated,rendered:rendered.size,sitemap:SITEMAP_NAME};
}
