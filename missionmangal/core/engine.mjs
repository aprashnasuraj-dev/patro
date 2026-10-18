import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {reserve,assertRegistry,canonical,BYLINE,ROUTES,folderFor} from './portfolio.mjs';
import {assertPublishable} from './quality.mjs';
import {renderPage} from './render.mjs';
import {sitemapXml,assertSitemap,SITEMAP_NAME} from './sitemap.mjs';
import {structuredData,relatedHtml,editorialPage,metaTags,CONTACT} from './seo-enhancements.mjs';
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
 return renderPage(article,record);
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
