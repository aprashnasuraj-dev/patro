// @ts-nocheck
import {bounded,rows,webURL,xml,intIn} from '../_vendor/guards.js';
const MAX_BYTES=50*1024*1024;
const head='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n',tail='\n</urlset>\n';
const sizeOf=s=>new TextEncoder().encode(s).length;
const xmlPage=group=>head+group.map(v=>'  '+v.xml).join('\n')+tail;
export function compute(x){
 const chunk=intIn(x.chunk||'50000',1,50000),prefix=String(x.base||'').trim();
 const raw=bounded(x.urls,8000000);if(/<!DOCTYPE|<!ENTITY/i.test(raw))throw Error('XML with DTD or entity declarations is not supported.');
 let list=[];
 if(/^\s*(?:<\?xml|<urlset\b)/i.test(raw)){
  const doc=new DOMParser().parseFromString(raw,'application/xml');if(doc.querySelector('parsererror'))throw Error('Malformed XML input.');
  if(doc.documentElement.localName!=='urlset'||doc.documentElement.namespaceURI!=='http://www.sitemaps.org/schemas/sitemap/0.9')throw Error('Expected the standard XML urlset namespace.');
  const children=Array.from(doc.documentElement.children);if(children.length>80000)throw Error('Maximum 80,000 URLs per run.');
  list=children.map(n=>{if(n.localName!=='url'||n.namespaceURI!=='http://www.sitemaps.org/schemas/sitemap/0.9')throw Error('Unexpected element under urlset.');const loc=[...n.children].find(c=>c.localName==='loc'&&c.namespaceURI===n.namespaceURI);if(!loc)throw Error('URL entry missing loc.');return {raw:loc.textContent.trim(),element:n};});
 }else list=rows(raw,80000,8000000).map(raw=>({raw}));
 if(!list.length)throw Error('Provide at least one sitemap URL.');
 const accepted=[],seen=new Set(),warnings=[];let origin='';
 for(const item of list){const u=webURL(item.raw),loc=new URL(u);if(loc.hash)throw Error('Sitemap URLs cannot include fragments.');if(!origin)origin=loc.origin;if(origin!==loc.origin)throw Error('Sitemap URLs must share one origin.');if(seen.has(u)){if(warnings.length<5)warnings.push('Repeated URL omitted: '+u);continue;}seen.add(u);
  // For parsed sitemap XML preserve lastmod, image, video and custom extension content by serializing each URL element.
  const xmlContent=item.element?new XMLSerializer().serializeToString(item.element):'<url><loc>'+xml(u)+'</loc></url>';
  if(sizeOf(xmlContent)+sizeOf(head+tail)>MAX_BYTES)throw Error('One entry exceeds 50 MiB.');accepted.push({loc:u,xml:xmlContent});
 }
 if(Math.ceil(accepted.length/chunk)>99)throw Error('More than 99 XML parts would be created. Increase maximum URLs per part or split into separate runs.');
 const files=[];let group=[],bytes=sizeOf(head+tail);
 for(const entry of accepted){const n=sizeOf('  '+entry.xml+'\n');if(group.length&&(group.length>=chunk||bytes+n>MAX_BYTES)){files.push({name:`sitemap-${String(files.length+1).padStart(3,'0')}.xml`,text:xmlPage(group),mime:'application/xml'});if(files.length>99)throw Error('More than 99 XML parts required; split input into separate runs.');group=[];bytes=sizeOf(head+tail);}group.push(entry);bytes+=n;}
 if(group.length)files.push({name:`sitemap-${String(files.length+1).padStart(3,'0')}.xml`,text:xmlPage(group),mime:'application/xml'});
 let index='';if(prefix){const base=webURL(prefix);if(!base.endsWith('/'))throw Error('Published sitemap folder prefix must end in /.');index='<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+files.map(f=>'  <sitemap><loc>'+xml(new URL(f.name,base).href)+'</loc></sitemap>').join('\n')+'\n</sitemapindex>\n';files.push({name:'sitemap-index.xml',text:index,mime:'application/xml'});}
 return {summary:`${accepted.length.toLocaleString()} unique URLs → ${files.length-(index?1:0)} sitemap XML parts`,metrics:[['Unique URLs',accepted.length],['XML parts',files.length-(index?1:0)],['Duplicates',list.length-accepted.length]],files,text:(index||files[0].text).slice(0,250000),warnings:[...warnings, ...(index?[]:['Add the deployed sitemap folder URL to create a useful index file.']),'Existing URL-element metadata is preserved from standard XML; unrecognized root-level metadata and XML comments are not preserved.','Only URLs on the same site are supported; validate index upload locations after publishing.']};
}
