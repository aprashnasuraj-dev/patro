import {readFile,mkdir,writeFile,access} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {reserve,assertRegistry,canonical} from './portfolio.mjs';
import {assertPublishable} from './quality.mjs';
import {sitemapXml,assertSitemap,SITEMAP_NAME} from './sitemap.mjs';
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export async function loadRegistry(path){try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code==='ENOENT')return [];throw e;}}
export async function saveRegistry(path,registry){assertRegistry(registry);await mkdir(resolve(path,'../'),{recursive:true});await writeFile(path,JSON.stringify(registry,null,2)+'\n');}
export function registerArticle(registry,candidate){return reserve(registry,candidate);}
export function renderApproved(article,record){
 assertPublishable(article);
 if(article.id!==record.id||article.slug!==record.slug||record.url!==canonical(article.slug))throw Error('Article does not match reserved URL');
 if(!['approved','rendered','published'].includes(record.status))throw Error('Registry approval required');
 const refs=article.sources.map((s,i)=>'<li id="source-'+esc(s.id)+'"><a rel="noopener noreferrer" href="'+esc(s.url)+'">'+esc(s.title)+'</a> — '+esc(s.publisher)+'</li>').join('');
 const claimLedger='<h2>Verified claims</h2><ul>'+article.claims.map(c=>'<li>'+esc(c.text)+' '+c.source_ids.map(id=>'<a href="#source-'+esc(id)+'">['+esc(id)+']</a>').join(' ')+'</li>').join('')+'</ul>';\n const art=esc(article.body_md).replace(/\n\n/g,'</p><p>').replace(/\n/g,'<span> </span>');
 const image=article.media.find(m=>['image','chart','diagram'].includes(m.type));
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(article.title)+' | Aafnai Patro</title><link rel="canonical" href="'+esc(record.url)+'"><meta name="description" content="'+esc(article.description||article.intent)+'"></head><body><main><article><h1>'+esc(article.title)+'</h1><figure><img loading="lazy" src="'+esc(image.url)+'" alt="'+esc(image.alt)+'"><figcaption>'+esc(image.credit)+' · '+esc(image.license)+'</figcaption></figure><p>'+art+'</p>'+claimLedger+'<h2>Sources</h2><ol>'+refs+'</ol></article></main></body></html>';
}
export async function buildApproved({registry,articles,outDir,expectedCount}){
 assertRegistry(registry);
 if(expectedCount!==undefined && registry.length!==expectedCount)throw Error('Unexpected registry total');
 const rendered=new Set(), updated=registry.map(r=>({...r}));await mkdir(outDir,{recursive:true});
 for(const record of updated.filter(r=>r.status==='approved'||r.status==='rendered'||r.status==='published')){
  const a=articles.find(x=>x.id===record.id);
  if(!a)throw Error('Missing approved article '+record.id);
  const html=renderApproved(a,record);
  const dir=join(outDir,'blogs',record.slug);await mkdir(dir,{recursive:true});await writeFile(join(dir,'index.html'),html);
  rendered.add(record.slug);record.status='published';
 }
 const xml=sitemapXml(updated,rendered);assertSitemap(xml,updated,rendered);
 await writeFile(join(outDir,SITEMAP_NAME),xml);
 return {registry:updated,rendered:rendered.size,sitemap:SITEMAP_NAME};
}
